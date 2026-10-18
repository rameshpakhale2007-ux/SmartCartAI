import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export function ErrorMessage({ title = 'Error Loading Data', message, onRetry }) {
  return (
    <div className="error-banner" role="alert">
      <AlertCircle size={22} style={{ flexShrink: 0, marginTop: '2px' }} />
      <div style={{ flex: 1 }}>
        <h4 style={{ fontWeight: 700, fontSize: '15px', marginBottom: '4px', color: '#f87171' }}>
          {title}
        </h4>
        <p style={{ fontSize: '13px', lineHeight: 1.5, color: '#fecaca' }}>
          {message || 'An unexpected error occurred while communicating with the service.'}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="btn btn-secondary"
            aria-label="Retry Request (Try again)"
            style={{
              marginTop: '12px',
              padding: '6px 12px',
              fontSize: '12px',
              borderColor: 'rgba(239, 68, 68, 0.4)',
              color: '#fee2e2',
            }}
          >
            <RefreshCw size={13} />
            Retry Request
          </button>
        )}
      </div>
    </div>
  );
}

export default ErrorMessage;
