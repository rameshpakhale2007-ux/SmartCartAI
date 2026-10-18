import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  MessageSquareText,
  Search,
  Upload,
  RefreshCw,
  FileText,
  AlertTriangle,
  ShieldCheck,
  Database,
  ArrowRight,
  Info,
  CheckCircle2,
  Package,
} from 'lucide-react';

import PageHeader from '../components/layout/PageHeader';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import EmptyState from '../components/common/EmptyState';

import ReviewIntegrityScoreCard from '../components/reviews/ReviewIntegrityScoreCard';
import ReviewDistributionChart from '../components/reviews/ReviewDistributionChart';
import DuplicatePhrasesCard from '../components/reviews/DuplicatePhrasesCard';
import ReviewTemporalBurstChart from '../components/reviews/ReviewTemporalBurstChart';
import ReviewList from '../components/reviews/ReviewList';

import productApi from '../api/productApi';
import reviewApi from '../api/reviewApi';
import { formatINR } from '../utils/currency';

export function ReviewAnalysis() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlProductId = searchParams.get('id') || searchParams.get('product_id');

  const [productsList, setProductsList] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(urlProductId || '');

  // Active View Mode: 'catalog' vs 'custom_upload'
  const [activeMode, setActiveMode] = useState('catalog');

  // Analysis State
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Upload State
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [uploading, setUploading] = useState(false);

  // 1. Load catalog products on mount
  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const res = await productApi.getProducts({ per_page: 50 });
        if (res && res.success) {
          const items = res.data.items || [];
          setProductsList(items);
          if (!selectedProductId && items.length > 0) {
            const initialId = String(items[0].id);
            setSelectedProductId(initialId);
            setSearchParams({ id: initialId });
          } else if (!items.length) {
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load products for review workbench', err);
        setLoading(false);
      }
    };
    loadCatalog();
  }, []);

  // Sync when URL query param changes
  useEffect(() => {
    if (urlProductId && urlProductId !== selectedProductId) {
      setSelectedProductId(urlProductId);
    }
  }, [urlProductId]);

  // 2. Fetch Review Integrity Analysis for selected product
  const loadProductReviewAnalysis = async () => {
    if (!selectedProductId) return;

    try {
      setLoading(true);
      setError(null);
      const res = await reviewApi.getProductReviewIntegrity(selectedProductId);
      if (res && res.success) {
        setAnalysisData(res.data);
      } else {
        throw new Error(res.error?.message || 'Failed to analyze product review integrity.');
      }
    } catch (err) {
      setError(err.message || 'Unable to retrieve review integrity metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeMode === 'catalog' && selectedProductId) {
      loadProductReviewAnalysis();
    }
  }, [selectedProductId, activeMode]);

  const handleSelectProduct = (newId) => {
    setSelectedProductId(newId);
    setSearchParams({ id: newId });
  };

  // 3. Handle Ad-Hoc CSV / JSON Upload
  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError('Please select a valid .csv or .json review file to upload.');
      return;
    }

    try {
      setUploading(true);
      setUploadError(null);
      const formData = new FormData();
      formData.append('file', uploadFile);

      const res = await reviewApi.analyzeAdhocReviews(formData);
      if (res && res.success) {
        setAnalysisData(res.data);
        setActiveMode('custom_upload');
      } else {
        throw new Error(res.error?.message || 'Failed to parse and analyze uploaded reviews.');
      }
    } catch (err) {
      setUploadError(err.message || 'Error uploading reviews file.');
    } finally {
      setUploading(false);
    }
  };

  // Build lookup maps for duplicate and divergent reviews
  const duplicateGroupMap = {};
  if (analysisData?.duplicate_analysis?.duplicate_groups) {
    analysisData.duplicate_analysis.duplicate_groups.forEach((grp) => {
      grp.review_ids.forEach((rid) => {
        duplicateGroupMap[rid] = grp.group_id;
      });
    });
  }

  const divergentIdSet = new Set(
    (analysisData?.sentiment_analysis?.divergent_reviews || []).map((d) => d.review_id)
  );

  const selectedProduct = productsList.find((p) => String(p.id) === String(selectedProductId));

  return (
    <div>
      <PageHeader
        title="AI Review Integrity & Analysis Engine"
        subtitle="Detect repetitive phrases, rating-sentiment contradictions, temporal bursts, and verified buyer distributions"
      />

      {/* Mode Switcher Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveMode('catalog')}
          className={activeMode === 'catalog' ? 'btn btn-primary' : 'btn btn-secondary'}
          style={{ fontSize: '13px' }}
        >
          <Package size={14} />
          <span>Catalog Product Reviews</span>
        </button>

        <button
          onClick={() => setActiveMode('custom_upload')}
          className={activeMode === 'custom_upload' ? 'btn btn-primary' : 'btn btn-secondary'}
          style={{ fontSize: '13px' }}
        >
          <Upload size={14} />
          <span>Ad-Hoc CSV / JSON Inspection</span>
        </button>
      </div>

      {/* Mode A: Catalog Product Selector Bar */}
      {activeMode === 'catalog' && (
        <div
          className="card"
          style={{
            padding: '18px 24px',
            marginBottom: '24px',
            background: '#ffffff',
            border: '1px solid var(--border-card)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
            <div style={{ flex: '1 1 340px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                Select Catalog Product to Analyze Reviews:
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => handleSelectProduct(e.target.value)}
                className="form-select"
                style={{ width: '100%', fontSize: '14px', fontWeight: 600 }}
              >
                {productsList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.brand} — {p.category})
                  </option>
                ))}
              </select>
            </div>

            {selectedProduct && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Reference MRP</span>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>
                    {formatINR(selectedProduct.base_mrp)}
                  </div>
                </div>
                <Link
                  to={`/products/${selectedProduct.id}`}
                  className="btn btn-secondary"
                  style={{ fontSize: '12px', padding: '6px 12px' }}
                >
                  <span>View Product</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mode B: Ad-Hoc File Upload Box */}
      {activeMode === 'custom_upload' && (
        <div
          className="card"
          style={{
            padding: '24px',
            marginBottom: '24px',
            border: '1px dashed var(--border-focus)',
            background: 'rgba(99, 102, 241, 0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Upload size={18} style={{ color: 'var(--color-primary)' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>
              Inspect Custom Review Dataset (CSV or JSON)
            </h3>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Upload up to 1,000 customer reviews (max 5 MB). Expects columns: <code>content</code> (or <code>text</code>), <code>rating</code> (1-5), optional <code>date</code>, and <code>verified_purchase</code>.
          </p>

          <form onSubmit={handleFileUpload} style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <input
              type="file"
              accept=".csv,.json"
              onChange={(e) => setUploadFile(e.target.files[0])}
              className="form-input"
              style={{ fontSize: '12px', padding: '6px' }}
            />
            <button
              type="submit"
              disabled={uploading || !uploadFile}
              className="btn btn-primary"
              style={{ fontSize: '12px' }}
            >
              {uploading ? 'Analyzing Corpus...' : 'Upload & Analyze Reviews'}
            </button>
          </form>

          {uploadError && (
            <div style={{ marginTop: '12px', color: '#f87171', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertTriangle size={14} />
              <span>{uploadError}</span>
            </div>
          )}
        </div>
      )}

      {/* Results Rendering */}
      {loading ? (
        <LoadingSpinner message="Evaluating review textual similarity vectors, rating-sentiment harmony, and temporal velocity..." />
      ) : error ? (
        <ErrorMessage
          title="Review Analysis Error"
          message={error}
          onRetry={loadProductReviewAnalysis}
        />
      ) : !analysisData || analysisData.total_reviews_count === 0 ? (
        <div className="card">
          <EmptyState
            title="No Product Reviews Recorded"
            description="No customer reviews are currently available for this product in the catalog. You can test the NLP pipeline by uploading a sample CSV or choosing another product."
          />
        </div>
      ) : (
        <div>
          {/* Main 0-100 Score & Disclosures Card */}
          <ReviewIntegrityScoreCard analysis={analysisData} />

          {/* Breakdown Grids */}
          {analysisData.usable_reviews_count >= 5 && (
            <>
              {/* Rating Distribution & Sentiment Polarity */}
              <ReviewDistributionChart sentimentAnalysis={analysisData.sentiment_analysis} />

              {/* Textual Similarity & Duplicate Templates */}
              <DuplicatePhrasesCard duplicateAnalysis={analysisData.duplicate_analysis} />

              {/* Temporal Distribution & Burst Timeline */}
              <ReviewTemporalBurstChart temporalAnalysis={analysisData.temporal_analysis} />
            </>
          )}

          {/* Review List */}
          <ReviewList
            reviews={analysisData.sample_reviews || []}
            duplicateGroupMap={duplicateGroupMap}
            divergentIdSet={divergentIdSet}
          />
        </div>
      )}
    </div>
  );
}

export default ReviewAnalysis;
