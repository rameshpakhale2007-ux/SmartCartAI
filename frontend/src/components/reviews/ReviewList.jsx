import React, { useState } from 'react';
import {
  Search,
  Star,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  User,
  Calendar,
  Filter,
} from 'lucide-react';

export function ReviewList({ reviews = [], duplicateGroupMap = {}, divergentIdSet = new Set() }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRating, setSelectedRating] = useState('ALL');
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const filteredReviews = reviews.filter((r) => {
    // 1. Text Search Filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchContent = (r.content || '').toLowerCase().includes(q);
      const matchAuthor = (r.author || '').toLowerCase().includes(q);
      if (!matchContent && !matchAuthor) return false;
    }

    // 2. Rating Filter
    if (selectedRating !== 'ALL') {
      const targetRating = parseInt(selectedRating, 10);
      if (Math.round(r.rating) !== targetRating) return false;
    }

    // 3. Verified Purchase Filter
    if (verifiedOnly && !r.verified_purchase) {
      return false;
    }

    return true;
  });

  return (
    <div className="card" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 2px', color: 'var(--text-main)' }}>
            Analyzed Review Corpus ({filteredReviews.length} / {reviews.length})
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
            Inspect individual review texts, sentiment classifications, and pattern flags
          </p>
        </div>

        {/* Search Bar */}
        <div style={{ position: 'relative', minWidth: '240px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search reviews by keyword..."
            className="form-input"
            style={{ width: '100%', paddingLeft: '32px', fontSize: '12px' }}
          />
        </div>
      </div>

      {/* Filter Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600 }}>Filter by:</span>
        {['ALL', '5', '4', '3', '2', '1'].map((val) => (
          <button
            key={val}
            onClick={() => setSelectedRating(val)}
            className={selectedRating === val ? 'btn btn-primary' : 'btn btn-secondary'}
            style={{ padding: '4px 10px', fontSize: '11px' }}
          >
            {val === 'ALL' ? 'All Ratings' : `${val} ★`}
          </button>
        ))}

        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-main)', cursor: 'pointer', marginLeft: '8px' }}>
          <input
            type="checkbox"
            checked={verifiedOnly}
            onChange={(e) => setVerifiedOnly(e.target.checked)}
          />
          <span>Verified Purchases Only</span>
        </label>
      </div>

      {/* Reviews List */}
      {filteredReviews.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
          No reviews matched the current keyword or rating filters.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredReviews.map((rev) => {
            const isDivergent = divergentIdSet.has(rev.id);
            const duplicateGroupId = duplicateGroupMap[rev.id];

            return (
              <div
                key={rev.id}
                style={{
                  padding: '14px',
                  background: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-md)',
                  border: isDivergent ? '1px solid rgba(239, 68, 68, 0.4)' : duplicateGroupId ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#fbbf24', fontSize: '13px', fontWeight: 800 }}>
                      <Star size={13} fill="#fbbf24" />
                      <span>{rev.rating !== null && rev.rating !== undefined ? `${rev.rating}★` : 'No Rating'}</span>
                    </div>

                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)' }}>
                      {rev.author || 'Anonymous'}
                    </span>

                    {rev.verified_purchase === true ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '2px 6px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '10px',
                          fontWeight: 700,
                          background: 'rgba(16, 185, 129, 0.15)',
                          color: '#34d399',
                        }}
                      >
                        <ShieldCheck size={11} />
                        Verified Purchase
                      </span>
                    ) : rev.verified_purchase === false ? (
                      <span style={{ fontSize: '10px', color: 'var(--text-dim)', padding: '2px 6px' }}>
                        Unverified
                      </span>
                    ) : null}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {/* Sentiment Tag */}
                    {rev.sentiment_label && (
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 'var(--radius-sm)',
                          background: rev.sentiment_label === 'POSITIVE' ? 'rgba(16, 185, 129, 0.1)' : rev.sentiment_label === 'NEGATIVE' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(148, 163, 184, 0.1)',
                          color: rev.sentiment_label === 'POSITIVE' ? '#10b981' : rev.sentiment_label === 'NEGATIVE' ? '#f87171' : '#94a3b8',
                        }}
                      >
                        Sentiment: {rev.sentiment_label}
                      </span>
                    )}

                    {rev.review_date && (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {rev.review_date.slice(0, 10)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Review Text */}
                <p style={{ fontSize: '13px', color: 'var(--text-main)', margin: '0 0 8px', lineHeight: 1.5 }}>
                  {rev.content}
                </p>

                {/* Flags Callout */}
                {(isDivergent || duplicateGroupId) && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                    {isDivergent && (
                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#f87171', background: 'rgba(239, 68, 68, 0.1)', padding: '2px 6px', borderRadius: 'var(--radius-sm)' }}>
                        Contradictory Rating vs Sentiment
                      </span>
                    )}
                    {duplicateGroupId && (
                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#fbbf24', background: 'rgba(245, 158, 11, 0.1)', padding: '2px 6px', borderRadius: 'var(--radius-sm)' }}>
                        Near-Duplicate Template (Group #{duplicateGroupId})
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ReviewList;
