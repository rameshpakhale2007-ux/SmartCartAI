import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ReviewAnalysis from '../pages/ReviewAnalysis';
import productApi from '../api/productApi';
import reviewApi from '../api/reviewApi';

vi.mock('../api/productApi');
vi.mock('../api/reviewApi');

const mockProduct = {
  id: 1,
  name: 'Apple iPhone 15 (128 GB)',
  brand: 'Apple',
  category: 'Smartphones',
  base_mrp: 79900,
  source_type: 'demo',
};

const mockSuccessAnalysis = {
  product_info: mockProduct,
  data_source: 'catalog_seed',
  total_reviews_count: 7,
  usable_reviews_count: 7,
  integrity_score: 82.5,
  classification: 'HIGH_PATTERN_CONSISTENCY',
  classification_label: 'High Pattern Consistency',
  confidence: 'HIGH',
  summary: 'Observed review patterns demonstrate strong textual diversity, consistent sentiment alignment, and normal distribution.',
  weights_applied: {
    text_originality: 0.45,
    sentiment_alignment: 0.35,
    temporal_dispersion: 0.20,
  },
  available_metrics: ['text_originality', 'sentiment_alignment', 'temporal_dispersion'],
  excluded_metrics: [],
  metric_scores: {
    text_originality_score: 88.0,
    sentiment_alignment_score: 85.0,
    temporal_dispersion_score: 75.0,
  },
  duplicate_analysis: {
    similarity_threshold: 0.85,
    duplicate_groups: [
      {
        group_id: 1,
        review_ids: [4, 5],
        size: 2,
        representative_snippet: 'Amazing deal best phone ever fast delivery and excellent packaging...',
        average_similarity: 0.95,
        note: '2 reviews share near-identical phrasing (similarity >= 85%).',
      },
    ],
    flagged_reviews_count: 2,
    duplicate_ratio: 0.286,
    text_originality_score: 88.0,
  },
  sentiment_analysis: {
    divergent_reviews: [
      {
        review_id: 6,
        rating: 4.0,
        sentiment_polarity: -0.6,
        sentiment_label: 'NEGATIVE',
        divergence_type: 'POSITIVE_RATING_NEGATIVE_TEXT',
        summary: 'High rating of 4.0★ accompanied by negative review text.',
        snippet: 'The phone screen arrived completely cracked and battery drain is terrible...',
      },
    ],
    divergent_count: 1,
    divergence_ratio: 0.143,
    sentiment_alignment_score: 85.0,
    rating_distribution: { '1': 0, '2': 0, '3': 1, '4': 2, '5': 4 },
    sentiment_distribution: { POSITIVE: 5, NEUTRAL: 1, NEGATIVE: 1 },
  },
  temporal_analysis: {
    temporal_analysis_available: true,
    calendar_span_days: 20,
    average_reviews_per_day: 0.35,
    has_burst_detected: true,
    temporal_dispersion_score: 75.0,
    daily_volume_timeline: [
      { date: '2026-09-01', count: 1 },
      { date: '2026-09-08', count: 2 },
      { date: '2026-09-15', count: 1 },
    ],
    burst_periods: [
      {
        date: '2026-09-08',
        review_count: 2,
        note: 'Review spike of 2 reviews on 2026-09-08 exceeds baseline.',
      },
    ],
  },
  verified_distribution: {
    verified_count: 4,
    unverified_count: 3,
    unknown_count: 0,
    verified_proportion_pct: 57.1,
    unverified_proportion_pct: 42.9,
    unknown_proportion_pct: 0.0,
  },
  sample_reviews: [
    {
      id: 1,
      author: 'Aarav Sharma',
      rating: 5.0,
      title: 'Superb build quality',
      content: 'The battery life and Dynamic Island are great improvements. Display is bright and cameras capture natural skin tones.',
      review_date: '2026-09-01T10:00:00Z',
      verified_purchase: true,
      sentiment_label: 'POSITIVE',
      sentiment_polarity: 0.8,
    },
    {
      id: 4,
      author: 'Reviewer_Delhi',
      rating: 5.0,
      title: 'Amazing deal',
      content: 'Amazing deal best phone ever. Fast delivery and excellent packaging. Highly recommended to everyone.',
      review_date: '2026-09-08T10:00:00Z',
      verified_purchase: false,
      sentiment_label: 'POSITIVE',
      sentiment_polarity: 0.9,
    },
    {
      id: 6,
      author: 'Rohan Mehta',
      rating: 4.0,
      title: 'Defective screen',
      content: 'The phone screen arrived completely cracked and battery drain is terrible. Highly disappointed with this seller.',
      review_date: '2026-09-15T10:00:00Z',
      verified_purchase: true,
      sentiment_label: 'NEGATIVE',
      sentiment_polarity: -0.6,
    },
  ],
  limitations: [
    'Analysis reflects observed text and date patterns; statistical anomalies do not constitute proof of seller fraud or bot coordination.',
    'Findings are bounded to the 7 analyzed reviews from source catalog_seed.',
  ],
};

const mockInsufficientAnalysis = {
  product_info: mockProduct,
  data_source: 'catalog_seed',
  total_reviews_count: 3,
  usable_reviews_count: 3,
  integrity_score: null,
  classification: 'INSUFFICIENT_EVIDENCE',
  classification_label: 'Insufficient Evidence',
  confidence: 'INSUFFICIENT',
  summary: 'Only 3 usable review(s) available. A minimum of 5 usable reviews is required to evaluate review pattern consistency.',
  limitations: [
    'Sample size (3 reviews) is too small to establish statistically sound pattern baselines.',
    'No aggregate score is generated to prevent misleading confidence.',
  ],
};

describe('ReviewAnalysis Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    productApi.getProducts.mockResolvedValue({
      success: true,
      data: { items: [mockProduct] },
    });
  });

  it('renders loading state initially', async () => {
    let resolveReview;
    reviewApi.getProductReviewIntegrity.mockReturnValue(
      new Promise((resolve) => {
        resolveReview = resolve;
      })
    );

    render(
      <BrowserRouter>
        <ReviewAnalysis />
      </BrowserRouter>
    );

    expect(
      screen.getByText(/Evaluating review textual similarity vectors/i)
    ).toBeInTheDocument();

    resolveReview({
      success: true,
      data: mockSuccessAnalysis,
    });
  });

  it('renders successful review integrity analysis with score and breakdown metrics', async () => {
    reviewApi.getProductReviewIntegrity.mockResolvedValue({
      success: true,
      data: mockSuccessAnalysis,
    });

    render(
      <BrowserRouter>
        <ReviewAnalysis />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('High Pattern Consistency')).toBeInTheDocument();
    });

    // Score display
    const scoreContainer = screen.getByTestId('review-integrity-score-display');
    expect(within(scoreContainer).getByText('82.5')).toBeInTheDocument();
    expect(within(scoreContainer).getByText('/ 100')).toBeInTheDocument();

    // Metric cards
    expect(screen.getByText('Text Originality')).toBeInTheDocument();
    expect(screen.getByText('88%')).toBeInTheDocument();
    expect(screen.getByText('Sentiment Alignment')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('Temporal Dispersion')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('renders insufficient evidence state gracefully when sample size is below threshold', async () => {
    reviewApi.getProductReviewIntegrity.mockResolvedValue({
      success: true,
      data: mockInsufficientAnalysis,
    });

    render(
      <BrowserRouter>
        <ReviewAnalysis />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Inconclusive (< 5 reviews)')).toBeInTheDocument();
    });

    expect(screen.getByTestId('insufficient-evidence-banner')).toBeInTheDocument();
    expect(
      screen.getByText(/A minimum of 5 usable reviews is required to evaluate review pattern consistency/i)
    ).toBeInTheDocument();
  });

  it('renders duplicate template groups and representative snippets', async () => {
    reviewApi.getProductReviewIntegrity.mockResolvedValue({
      success: true,
      data: mockSuccessAnalysis,
    });

    render(
      <BrowserRouter>
        <ReviewAnalysis />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Textual Similarity & Template Repetition/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Similarity Group #1 • 2 Matching Reviews/i)).toBeInTheDocument();
    expect(screen.getByText(/Amazing deal best phone ever fast delivery and excellent packaging/i)).toBeInTheDocument();
  });

  it('displays rating-sentiment divergence callout and contradiction tags', async () => {
    reviewApi.getProductReviewIntegrity.mockResolvedValue({
      success: true,
      data: mockSuccessAnalysis,
    });

    render(
      <BrowserRouter>
        <ReviewAnalysis />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/1 Contradictory Review\(s\)/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Contradictory Rating vs Sentiment/i)).toBeInTheDocument();
  });

  it('filters reviews by keyword search and rating', async () => {
    reviewApi.getProductReviewIntegrity.mockResolvedValue({
      success: true,
      data: mockSuccessAnalysis,
    });

    render(
      <BrowserRouter>
        <ReviewAnalysis />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Aarav Sharma')).toBeInTheDocument();
    });

    // Search by keyword
    const searchInput = screen.getByPlaceholderText(/Search reviews by keyword/i);
    fireEvent.change(searchInput, { target: { value: 'Dynamic Island' } });

    expect(screen.getByText('Aarav Sharma')).toBeInTheDocument();
    expect(screen.queryByText('Rohan Mehta')).not.toBeInTheDocument();
  });

  it('displays data provenance disclosure clearly without unsupported fraud claims', async () => {
    reviewApi.getProductReviewIntegrity.mockResolvedValue({
      success: true,
      data: mockSuccessAnalysis,
    });

    render(
      <BrowserRouter>
        <ReviewAnalysis />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Provenance: catalog_seed/i)).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Statistical indicators evaluate observed text and date patterns and do not constitute proof of seller fraud/i)
    ).toBeInTheDocument();
  });

  it('allows switching to ad-hoc upload tab', async () => {
    reviewApi.getProductReviewIntegrity.mockResolvedValue({
      success: true,
      data: mockSuccessAnalysis,
    });

    render(
      <BrowserRouter>
        <ReviewAnalysis />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Ad-Hoc CSV / JSON Inspection')).toBeInTheDocument();
    });

    const uploadTabBtn = screen.getByText('Ad-Hoc CSV / JSON Inspection');
    fireEvent.click(uploadTabBtn);

    expect(screen.getByText(/Inspect Custom Review Dataset/i)).toBeInTheDocument();
    expect(screen.getByText('Upload & Analyze Reviews')).toBeInTheDocument();
  });

  it('handles API failure and allows retry', async () => {
    reviewApi.getProductReviewIntegrity.mockRejectedValue(
      new Error('Failed to analyze product review integrity.')
    );

    render(
      <BrowserRouter>
        <ReviewAnalysis />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Review Analysis Error')).toBeInTheDocument();
    });

    expect(screen.getByText(/Failed to analyze product review integrity/i)).toBeInTheDocument();
  });
});
