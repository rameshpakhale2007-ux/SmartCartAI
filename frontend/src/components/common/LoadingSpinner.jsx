import React from 'react';

export function LoadingSpinner({ message = 'Loading pricing intelligence...' }) {
  return (
    <div className="state-container" role="status" aria-live="polite">
      <div className="spinner" aria-hidden="true" />
      <p style={{ marginTop: '16px', color: 'var(--text-muted)', fontSize: '14px' }}>
        {message}
      </p>
    </div>
  );
}

export default LoadingSpinner;
