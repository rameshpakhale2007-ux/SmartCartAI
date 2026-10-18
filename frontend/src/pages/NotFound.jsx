import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Compass } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import EmptyState from '../components/common/EmptyState';

export function NotFound() {
  const navigate = useNavigate();

  return (
    <div>
      <PageHeader
        title="404 — Page Not Found"
        subtitle="The requested view does not exist or has been relocated."
      />
      <EmptyState
        title="Resource Not Located"
        description="We couldn't find the page you were looking for. Return to the dashboard to browse products and pricing intelligence."
        action={
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            <Home size={15} />
            Return to Dashboard
          </button>
        }
      />
    </div>
  );
}

export default NotFound;
