import React from 'react';
import { Copy, Layers, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

export function DuplicatePhrasesCard({ duplicateAnalysis }) {
  if (!duplicateAnalysis) return null;

  const {
    duplicate_groups = [],
    flagged_reviews_count = 0,
    duplicate_ratio = 0.0,
    similarity_threshold = 0.85,
    text_originality_score = 100.0,
  } = duplicateAnalysis;

  return (
    <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 2px', color: 'var(--text-main)' }}>
            Textual Similarity & Template Repetition
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
            TF-IDF cosine similarity detection across reviews (threshold: {Math.round(similarity_threshold * 100)}%)
          </p>
        </div>

        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '11px',
            fontWeight: 700,
            background: flagged_reviews_count > 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
            color: flagged_reviews_count > 0 ? '#fbbf24' : '#34d399',
            border: `1px solid ${flagged_reviews_count > 0 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
          }}
        >
          {flagged_reviews_count > 0 ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
          {flagged_reviews_count > 0
            ? `${flagged_reviews_count} Reviews in ${duplicate_groups.length} Similar Group(s)`
            : '100% Unique Text'}
        </span>
      </div>

      {duplicate_groups.length === 0 ? (
        <div
          style={{
            padding: '16px',
            background: 'rgba(16, 185, 129, 0.05)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: '#10b981',
            fontSize: '13px',
          }}
        >
          <CheckCircle2 size={18} />
          <span>No repetitive phrasing or near-duplicate review templates were identified above the {Math.round(similarity_threshold * 100)}% threshold.</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {duplicate_groups.map((group) => (
            <div
              key={group.group_id}
              style={{
                padding: '14px',
                background: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase' }}>
                  Similarity Group #{group.group_id} • {group.size} Matching Reviews
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Similarity: ~{Math.round(group.average_similarity * 100)}%
                </span>
              </div>

              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--text-main)',
                  fontStyle: 'italic',
                  background: '#f8fafc',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid #e2e8f0',
                  borderLeft: '3px solid #f59e0b',
                  marginBottom: '8px',
                }}
              >
                "{group.representative_snippet}"
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-dim)' }}>
                <span>Affects Review IDs: {group.review_ids.join(', ')}</span>
                <span>{group.note}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default DuplicatePhrasesCard;
