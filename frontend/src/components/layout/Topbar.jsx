import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Menu, Shield, Settings, User } from 'lucide-react';

export function Topbar({ onToggleMobile }) {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={onToggleMobile}
          className="action-icon-btn mobile-menu-btn"
          aria-label="Toggle Navigation Menu"
        >
          <Menu size={18} />
        </button>

        <form onSubmit={handleSearchSubmit} className="topbar-search">
          <Search size={16} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search products, brands, models..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Global product search"
          />
        </form>
      </div>

      <div className="topbar-actions">
        {/* Status Pill Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: 'var(--text-muted)',
            fontWeight: 600,
            background: '#ecfdf5',
            padding: '5px 12px',
            borderRadius: 'var(--radius-full)',
            border: '1px solid #d1fae5',
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 6px rgba(16, 185, 129, 0.6)',
            }}
          />
          <Shield size={13} style={{ color: '#059669' }} />
          <span style={{ color: '#065f46' }}>Honesty Engine Active</span>
        </div>

        {/* Notifications Button */}
        <button
          className="action-icon-btn"
          aria-label="Price Alert Notifications"
          onClick={() => navigate('/alerts')}
          title="Active Alerts"
        >
          <Bell size={17} />
          <span className="notification-badge" />
        </button>

        {/* Settings Button */}
        <button
          className="action-icon-btn"
          aria-label="Application Settings"
          onClick={() => navigate('/settings')}
          title="Settings & System Status"
        >
          <Settings size={17} />
        </button>

        {/* User Avatar Circle */}
        <div
          onClick={() => navigate('/settings')}
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #111827 0%, #374151 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
            border: '2px solid #ffffff',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
          }}
          title="User Profile"
        >
          SC
        </div>
      </div>
    </header>
  );
}

export default Topbar;
