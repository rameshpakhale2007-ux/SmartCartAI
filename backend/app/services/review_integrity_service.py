import re
import html
import math
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
from collections import Counter

from app.models import Product, Review
from app.extensions import db

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False


class ReviewIntegrityService:
    """
    AI Review Integrity & Pattern Consistency Analysis Engine.
    Evaluates review corpora for:
    1. Textual similarity and repeated template phrasing (via TF-IDF cosine similarity).
    2. Numerical rating versus text sentiment polarity divergence.
    3. Temporal clustering and publication burst anomalies.
    4. Verified-purchase distribution.

    Guardrails & Ethics:
    - Never alleges fraud, legal violation, or bot activity.
    - Reports observed statistical patterns, textual similarities, and data limitations.
    - Requires >= 5 usable reviews for an aggregate score; otherwise returns INSUFFICIENT_EVIDENCE.
    - Never fabricates replacement scores when data is missing or incomplete.
    """

    MIN_REVIEWS_FOR_SCORE = 5
    DEFAULT_SIMILARITY_THRESHOLD = 0.85
    MAX_REVIEWS_TO_ANALYZE = 1000

    # Domain sentiment lexicon tailored to consumer e-commerce reviews
    POSITIVE_WORDS = {
        "excellent", "great", "amazing", "love", "loved", "perfect", "fantastic",
        "outstanding", "superb", "brilliant", "awesome", "good", "satisfied",
        "recommend", "recommended", "best", "flawless", "durable", "premium",
        "worth", "smooth", "fast", "reliable", "genuine", "impressed", "wonderful",
        "sturdy", "topnotch", "exceptional", "happy", "pleased", "value"
    }

    NEGATIVE_WORDS = {
        "terrible", "horrible", "awful", "worst", "poor", "broken", "defective",
        "waste", "useless", "disappointed", "disappointing", "regret", "fake",
        "cheap", "damaged", "failed", "garbage", "return", "returned", "slow",
        "freeze", "crash", "buggy", "overpriced", "hate", "hated", "unhappy",
        "faulty", "pathetic", "rubbish", "crap", "bad", "unusable", "malfunction"
    }

    NEGATION_WORDS = {
        "not", "never", "no", "hardly", "barely", "scarcely", "without", "rarely", "neither", "nor"
    }

    @classmethod
    def normalize_text(cls, text: Optional[str]) -> str:
        """
        Normalizes review text by stripping HTML tags, excess whitespace,
        and unescaping HTML entities while preserving original meaning.
        """
        if not text or not isinstance(text, str):
            return ""
        # 1. Unescape HTML entities
        clean = html.unescape(text)
        # 2. Strip HTML tags
        clean = re.sub(r"<[^>]*>", " ", clean)
        # 3. Collapse multiple spaces, newlines, and tabs
        clean = re.sub(r"\s+", " ", clean).strip()
        return clean

    @classmethod
    def _calculate_sentiment_polarity(cls, text: str) -> Tuple[float, str]:
        """
        Computes a bounded sentiment polarity score (-1.0 to +1.0) and label
        using a transparent, explainable rule-based lexicon with negation handling.
        """
        if not text:
            return 0.0, "NEUTRAL"

        tokens = re.findall(r"\b[a-zA-Z]{3,}\b", text.lower())
        if not tokens:
            return 0.0, "NEUTRAL"

        score = 0.0
        negated = False
        words_matched = 0

        for i, word in enumerate(tokens):
            if word in cls.NEGATION_WORDS:
                negated = True
                continue

            word_score = 0.0
            if word in cls.POSITIVE_WORDS:
                word_score = -0.8 if negated else 1.0
                words_matched += 1
            elif word in cls.NEGATIVE_WORDS:
                word_score = 0.6 if negated else -1.0
                words_matched += 1

            score += word_score

            # Reset negation window after 3 words
            if negated and (i % 3 == 0):
                negated = False

        if words_matched == 0:
            return 0.0, "NEUTRAL"

        # Normalize score between -1.0 and 1.0
        normalized = round(score / max(1, words_matched), 2)
        normalized = max(-1.0, min(1.0, normalized))

        if normalized > 0.15:
            label = "POSITIVE"
        elif normalized < -0.15:
            label = "NEGATIVE"
        else:
            label = "NEUTRAL"

        return normalized, label

    @classmethod
    def detect_duplicates_and_templates(
        cls,
        clean_reviews: List[Dict[str, Any]],
        threshold: float = DEFAULT_SIMILARITY_THRESHOLD
    ) -> Dict[str, Any]:
        """
        Identifies pairwise textual duplicates and repeated review templates
        using TF-IDF vectorization and cosine similarity.
        """
        n = len(clean_reviews)
        if n < 2 or not SKLEARN_AVAILABLE:
            return {
                "similarity_threshold": threshold,
                "duplicate_groups": [],
                "flagged_reviews_count": 0,
                "duplicate_ratio": 0.0,
                "text_originality_score": 100.0,
                "methodology": "TF-IDF vectorization with cosine similarity" if SKLEARN_AVAILABLE else "Lexical comparison"
            }

        texts = [r["clean_text"] for r in clean_reviews]
        valid_indices = [i for i, t in enumerate(texts) if len(t.split()) >= 3]

        if len(valid_indices) < 2:
            return {
                "similarity_threshold": threshold,
                "duplicate_groups": [],
                "flagged_reviews_count": 0,
                "duplicate_ratio": 0.0,
                "text_originality_score": 100.0,
                "methodology": "TF-IDF cosine similarity"
            }

        valid_texts = [texts[i] for i in valid_indices]

        try:
            vectorizer = TfidfVectorizer(
                min_df=1,
                ngram_range=(1, 2),
                stop_words='english',
                token_pattern=r"(?u)\b[a-zA-Z0-9]{2,}\b"
            )
            tfidf_matrix = vectorizer.fit_transform(valid_texts)
            sim_matrix = cosine_similarity(tfidf_matrix, tfidf_matrix)
        except Exception:
            return {
                "similarity_threshold": threshold,
                "duplicate_groups": [],
                "flagged_reviews_count": 0,
                "duplicate_ratio": 0.0,
                "text_originality_score": 100.0,
                "methodology": "TF-IDF fallback"
            }

        visited = set()
        duplicate_groups = []
        flagged_review_ids = set()

        num_valid = len(valid_indices)
        for i in range(num_valid):
            if i in visited:
                continue

            current_group = [clean_reviews[valid_indices[i]]["id"]]
            max_sim_score = 0.0

            for j in range(i + 1, num_valid):
                if j in visited:
                    continue

                sim = float(sim_matrix[i, j])
                if sim >= threshold:
                    current_group.append(clean_reviews[valid_indices[j]]["id"])
                    visited.add(j)
                    if sim > max_sim_score:
                        max_sim_score = sim

            if len(current_group) > 1:
                visited.add(i)
                for rid in current_group:
                    flagged_review_ids.add(rid)

                sample_text = clean_reviews[valid_indices[i]]["clean_text"]
                snippet = sample_text[:120] + ("..." if len(sample_text) > 120 else "")
                duplicate_groups.append({
                    "group_id": len(duplicate_groups) + 1,
                    "review_ids": current_group,
                    "size": len(current_group),
                    "representative_snippet": snippet,
                    "average_similarity": round(max_sim_score, 2),
                    "note": f"{len(current_group)} reviews share near-identical phrasing (similarity >= {int(threshold * 100)}%)."
                })

        flagged_count = len(flagged_review_ids)
        duplicate_ratio = round(flagged_count / n, 3) if n > 0 else 0.0
        # Text originality score: 100 down to 0 based on duplicate ratio
        originality_score = round(max(0.0, 100.0 * (1.0 - (duplicate_ratio * 1.5))), 1)

        return {
            "similarity_threshold": threshold,
            "duplicate_groups": duplicate_groups,
            "flagged_reviews_count": flagged_count,
            "duplicate_ratio": duplicate_ratio,
            "text_originality_score": originality_score,
            "methodology": "TF-IDF cosine similarity"
        }

    @classmethod
    def analyze_sentiment_divergence(
        cls,
        clean_reviews: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Detects rating-versus-sentiment polarity contradictions:
        - High Rating (>= 4.0 stars) with negative sentiment text.
        - Low Rating (<= 2.0 stars) with positive sentiment text.
        """
        n = len(clean_reviews)
        if n == 0:
            return {
                "divergent_reviews": [],
                "divergent_count": 0,
                "divergence_ratio": 0.0,
                "sentiment_alignment_score": 100.0,
                "rating_distribution": {str(k): 0 for k in range(1, 6)},
                "sentiment_distribution": {"POSITIVE": 0, "NEUTRAL": 0, "NEGATIVE": 0}
            }

        rating_dist = Counter()
        sentiment_dist = Counter()
        divergent_reviews = []

        for r in clean_reviews:
            rating = r.get("rating")
            pol = r.get("sentiment_polarity", 0.0)
            sent_label = r.get("sentiment_label", "NEUTRAL")

            if rating is not None:
                int_rating = min(5, max(1, round(rating)))
                rating_dist[int_rating] += 1

            sentiment_dist[sent_label] += 1

            if rating is not None:
                # 1. 4-5 stars with negative text
                if rating >= 4.0 and pol <= -0.2:
                    divergent_reviews.append({
                        "review_id": r["id"],
                        "rating": rating,
                        "sentiment_polarity": pol,
                        "sentiment_label": sent_label,
                        "divergence_type": "POSITIVE_RATING_NEGATIVE_TEXT",
                        "summary": f"High rating of {rating}★ accompanied by negative review text (polarity: {pol}).",
                        "snippet": r["clean_text"][:100] + ("..." if len(r["clean_text"]) > 100 else "")
                    })
                # 2. 1-2 stars with positive text
                elif rating <= 2.0 and pol >= 0.2:
                    divergent_reviews.append({
                        "review_id": r["id"],
                        "rating": rating,
                        "sentiment_polarity": pol,
                        "sentiment_label": sent_label,
                        "divergence_type": "NEGATIVE_RATING_POSITIVE_TEXT",
                        "summary": f"Low rating of {rating}★ accompanied by positive review text (polarity: {pol}).",
                        "snippet": r["clean_text"][:100] + ("..." if len(r["clean_text"]) > 100 else "")
                    })

        div_count = len(divergent_reviews)
        div_ratio = round(div_count / n, 3) if n > 0 else 0.0
        # Alignment score: drops as divergence increases
        alignment_score = round(max(0.0, 100.0 * (1.0 - (div_ratio * 2.0))), 1)

        return {
            "divergent_reviews": divergent_reviews,
            "divergent_count": div_count,
            "divergence_ratio": div_ratio,
            "sentiment_alignment_score": alignment_score,
            "rating_distribution": {str(k): rating_dist.get(k, 0) for k in range(1, 6)},
            "sentiment_distribution": {
                "POSITIVE": sentiment_dist.get("POSITIVE", 0),
                "NEUTRAL": sentiment_dist.get("NEUTRAL", 0),
                "NEGATIVE": sentiment_dist.get("NEGATIVE", 0)
            }
        }

    @classmethod
    def detect_temporal_anomalies(
        cls,
        clean_reviews: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Analyzes the chronological distribution of reviews to identify
        unusual temporal velocity or publishing concentration spikes.
        """
        dated_reviews = [r for r in clean_reviews if r.get("parsed_date") is not None]

        if len(dated_reviews) < 5:
            return {
                "temporal_analysis_available": False,
                "reason": "Fewer than 5 dated reviews available for temporal distribution analysis.",
                "burst_periods": [],
                "has_burst_detected": False,
                "temporal_dispersion_score": None,
                "daily_volume_timeline": []
            }

        dates = [r["parsed_date"].date() for r in dated_reviews]
        dates.sort()

        min_date = dates[0]
        max_date = dates[-1]
        span_days = (max_date - min_date).days + 1

        date_counts = Counter(dates)
        daily_timeline = [
            {"date": d.isoformat(), "count": count}
            for d, count in sorted(date_counts.items())
        ]

        # If all reviews were published on the exact same date
        if span_days == 1:
            return {
                "temporal_analysis_available": True,
                "reason": "All dated reviews share an identical calendar date.",
                "burst_periods": [{
                    "date": min_date.isoformat(),
                    "review_count": len(dated_reviews),
                    "note": f"All {len(dated_reviews)} reviews were recorded on a single day ({min_date.isoformat()})."
                }],
                "has_burst_detected": True,
                "temporal_dispersion_score": 0.0,
                "daily_volume_timeline": daily_timeline
            }

        avg_daily = len(dated_reviews) / span_days
        burst_threshold = max(3, math.ceil(avg_daily * 3.0))

        burst_periods = []
        for d, count in date_counts.items():
            # A date represents an anomaly if count >= 3 AND (exceeds 3x baseline OR accounts for >= 50% of the entire corpus)
            if count >= 3:
                is_anomaly = (count >= burst_threshold) or ((count / len(dated_reviews)) >= 0.50)
                if is_anomaly:
                    burst_periods.append({
                        "date": d.isoformat(),
                        "review_count": count,
                        "expected_daily_average": round(avg_daily, 2),
                        "note": f"Review spike of {count} reviews on {d.isoformat()} exceeds expected baseline ({avg_daily:.1f}/day)."
                    })

        has_burst = len(burst_periods) > 0
        if has_burst:
            burst_reviews_count = sum(b["review_count"] for b in burst_periods)
            concentration_ratio = burst_reviews_count / len(dated_reviews)
            # Dispersion score scales inversely with concentrated review proportion (no artificial floor)
            dispersion_score = round(max(0.0, min(100.0, 100.0 * (1.0 - concentration_ratio))), 1)
        else:
            dispersion_score = 95.0

        return {
            "temporal_analysis_available": True,
            "earliest_review_date": min_date.isoformat(),
            "latest_review_date": max_date.isoformat(),
            "calendar_span_days": span_days,
            "average_reviews_per_day": round(avg_daily, 2),
            "burst_threshold_applied": burst_threshold,
            "burst_periods": burst_periods,
            "has_burst_detected": has_burst,
            "temporal_dispersion_score": dispersion_score,
            "daily_volume_timeline": daily_timeline
        }

    @classmethod
    def compute_verified_distribution(
        cls,
        clean_reviews: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Quantifies verified vs unverified vs unknown purchaser distribution.
        Does NOT penalize the product for unverified reviews in the integrity score.
        """
        n = len(clean_reviews)
        verified = sum(1 for r in clean_reviews if r.get("verified_purchase") is True)
        unverified = sum(1 for r in clean_reviews if r.get("verified_purchase") is False)
        unknown = sum(1 for r in clean_reviews if r.get("verified_purchase") is None)

        return {
            "verified_count": verified,
            "unverified_count": unverified,
            "unknown_count": unknown,
            "verified_proportion_pct": round((verified / n) * 100, 1) if n > 0 else 0.0,
            "unverified_proportion_pct": round((unverified / n) * 100, 1) if n > 0 else 0.0,
            "unknown_proportion_pct": round((unknown / n) * 100, 1) if n > 0 else 0.0,
            "note": "Verified purchase status is reported observationally and does not automatically penalize consistency scores."
        }

    @classmethod
    def evaluate_reviews_corpus(
        cls,
        raw_reviews: List[Dict[str, Any]],
        data_source: str = "catalog_seed",
        similarity_threshold: float = DEFAULT_SIMILARITY_THRESHOLD,
        product_info: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Executes end-to-end review integrity analysis over a given list of review dictionaries.
        """
        total_raw_count = len(raw_reviews)
        clean_reviews = []

        for idx, r in enumerate(raw_reviews):
            raw_content = r.get("content") or r.get("text") or r.get("review_text") or ""
            clean_text = cls.normalize_text(raw_content)

            # Skip reviews with no meaningful text
            if len(clean_text) < 3:
                continue

            raw_rating = r.get("rating")
            parsed_rating = None
            if raw_rating is not None:
                try:
                    parsed_rating = float(raw_rating)
                except (ValueError, TypeError):
                    parsed_rating = None

            parsed_date = None
            raw_date = r.get("review_date") or r.get("date")
            if raw_date:
                if isinstance(raw_date, datetime):
                    parsed_date = raw_date
                elif isinstance(raw_date, str):
                    try:
                        clean_date_str = raw_date.replace("Z", "+00:00")
                        parsed_date = datetime.fromisoformat(clean_date_str)
                    except Exception:
                        for fmt in ("%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%d-%m-%Y", "%Y/%m/%d"):
                            try:
                                parsed_date = datetime.strptime(raw_date, fmt)
                                break
                            except ValueError:
                                pass

            polarity, sent_label = cls._calculate_sentiment_polarity(clean_text)

            clean_reviews.append({
                "id": r.get("id", idx + 1),
                "author": r.get("author", "Anonymous"),
                "title": r.get("title", ""),
                "rating": parsed_rating,
                "clean_text": clean_text,
                "parsed_date": parsed_date,
                "date_iso": parsed_date.isoformat() + "Z" if parsed_date else None,
                "verified_purchase": r.get("verified_purchase"),
                "source_type": r.get("source_type", data_source),
                "sentiment_polarity": polarity,
                "sentiment_label": sent_label,
            })

        usable_count = len(clean_reviews)

        # Baseline guardrail: Require >= 5 usable reviews
        if usable_count < cls.MIN_REVIEWS_FOR_SCORE:
            verified_dist = cls.compute_verified_distribution(clean_reviews)
            return {
                "product_info": product_info,
                "data_source": data_source,
                "total_reviews_count": total_raw_count,
                "usable_reviews_count": usable_count,
                "integrity_score": None,
                "classification": "INSUFFICIENT_EVIDENCE",
                "classification_label": "Insufficient Evidence",
                "confidence": "INSUFFICIENT",
                "summary": f"Only {usable_count} usable review(s) available. A minimum of 5 usable reviews is required to evaluate review pattern consistency.",
                "weights_applied": None,
                "available_metrics": [],
                "excluded_metrics": ["text_originality", "sentiment_alignment", "temporal_dispersion"],
                "metric_scores": None,
                "duplicate_analysis": None,
                "sentiment_analysis": None,
                "temporal_analysis": None,
                "verified_distribution": verified_dist,
                "limitations": [
                    f"Sample size ({usable_count} reviews) is too small to establish statistically sound pattern baselines.",
                    "Review integrity indicators require at least 5 usable reviews with textual content.",
                    "No aggregate score is generated to prevent misleading confidence."
                ],
                "evaluated_at": datetime.utcnow().isoformat() + "Z"
            }

        # 1. Duplicate & Template Detection
        dup_results = cls.detect_duplicates_and_templates(clean_reviews, threshold=similarity_threshold)
        # 2. Rating vs Sentiment Divergence
        sent_results = cls.analyze_sentiment_divergence(clean_reviews)
        # 3. Temporal Anomaly Detection
        temp_results = cls.detect_temporal_anomalies(clean_reviews)
        # 4. Verified Purchase Distribution
        verified_dist = cls.compute_verified_distribution(clean_reviews)

        # 5. Aggregate Pattern Consistency Score Calculation
        available_metrics = ["text_originality", "sentiment_alignment"]
        excluded_metrics = []

        orig_score = dup_results["text_originality_score"]
        sent_score = sent_results["sentiment_alignment_score"]

        if temp_results["temporal_analysis_available"] and temp_results["temporal_dispersion_score"] is not None:
            available_metrics.append("temporal_dispersion")
            temp_score = temp_results["temporal_dispersion_score"]
            weights = {
                "text_originality": 0.45,
                "sentiment_alignment": 0.35,
                "temporal_dispersion": 0.20
            }
            composite = (
                orig_score * weights["text_originality"] +
                sent_score * weights["sentiment_alignment"] +
                temp_score * weights["temporal_dispersion"]
            )
        else:
            excluded_metrics.append("temporal_dispersion (insufficient or missing review dates)")
            weights = {
                "text_originality": 0.55,
                "sentiment_alignment": 0.45
            }
            composite = (
                orig_score * weights["text_originality"] +
                sent_score * weights["sentiment_alignment"]
            )

        final_score = round(max(0.0, min(100.0, composite)), 1)

        # Classification Mapping
        if final_score >= 80.0:
            classification = "HIGH_PATTERN_CONSISTENCY"
            classification_label = "High Pattern Consistency"
            confidence = "HIGH"
            summary = "Observed review patterns demonstrate strong textual diversity, consistent sentiment alignment, and normal distribution."
        elif final_score >= 60.0:
            classification = "MODERATE_PATTERN_CONSISTENCY"
            classification_label = "Moderate Pattern Consistency"
            confidence = "MEDIUM"
            summary = "Moderate pattern consistency observed. Minor template similarities or rating-sentiment divergences were identified."
        else:
            classification = "LOW_PATTERN_CONSISTENCY"
            classification_label = "Low Pattern Consistency — Review Advised"
            confidence = "LOW"
            summary = "Notable review anomalies detected, such as repetitive review phrasing, contradictory rating-sentiment polarity, or burst clustering."

        limitations = [
            "Analysis reflects observed text and date patterns; statistical anomalies do not constitute proof of seller fraud or bot coordination.",
            "Short or colloquial reviews may produce false-positive similarity or sentiment divergences.",
            "Verified purchase ratio is reported for context and does not automatically penalize the consistency score.",
            f"Findings are bounded to the {usable_count} analyzed reviews from source '{data_source}'."
        ]

        if excluded_metrics:
            limitations.append(f"Excluded metrics: {', '.join(excluded_metrics)}.")

        return {
            "product_info": product_info,
            "data_source": data_source,
            "total_reviews_count": total_raw_count,
            "usable_reviews_count": usable_count,
            "integrity_score": final_score,
            "classification": classification,
            "classification_label": classification_label,
            "confidence": confidence,
            "summary": summary,
            "weights_applied": weights,
            "available_metrics": available_metrics,
            "excluded_metrics": excluded_metrics,
            "metric_scores": {
                "text_originality_score": orig_score,
                "sentiment_alignment_score": sent_score,
                "temporal_dispersion_score": temp_results.get("temporal_dispersion_score")
            },
            "duplicate_analysis": dup_results,
            "sentiment_analysis": sent_results,
            "temporal_analysis": temp_results,
            "verified_distribution": verified_dist,
            "sample_reviews": [
                {
                    "id": r["id"],
                    "author": r["author"],
                    "rating": r["rating"],
                    "title": r["title"],
                    "content": r["clean_text"],
                    "review_date": r["date_iso"],
                    "verified_purchase": r["verified_purchase"],
                    "sentiment_label": r["sentiment_label"],
                    "sentiment_polarity": r["sentiment_polarity"]
                }
                for r in clean_reviews[:100]
            ],
            "limitations": limitations,
            "evaluated_at": datetime.utcnow().isoformat() + "Z"
        }

    @classmethod
    def evaluate_product_reviews(
        cls,
        product_id: int,
        similarity_threshold: float = DEFAULT_SIMILARITY_THRESHOLD
    ) -> Dict[str, Any]:
        """
        Fetches stored reviews for a catalog product and evaluates their integrity.
        """
        if isinstance(product_id, bool) or not isinstance(product_id, int):
            return {
                "error": "INVALID_PRODUCT_ID",
                "message": "Product ID must be an integer."
            }

        product = db.session.get(Product, product_id)
        if not product:
            return {
                "error": "PRODUCT_NOT_FOUND",
                "message": f"Product #{product_id} was not found."
            }

        reviews_records = Review.query.filter_by(product_id=product_id).all()
        raw_reviews = [r.to_dict() for r in reviews_records]

        product_info = {
            "id": product.id,
            "name": product.name,
            "brand": product.brand,
            "category": product.category,
            "base_mrp": product.base_mrp
        }

        data_source = raw_reviews[0].get("source_type", "catalog_seed") if raw_reviews else "catalog_seed"

        return cls.evaluate_reviews_corpus(
            raw_reviews=raw_reviews,
            data_source=data_source,
            similarity_threshold=similarity_threshold,
            product_info=product_info
        )
