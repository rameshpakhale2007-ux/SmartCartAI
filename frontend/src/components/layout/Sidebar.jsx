import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Search,
  Scale,
  LineChart,
  BellRing,
  Tag,
  Shuffle,
  ShoppingBag,
  ShieldAlert,
  MessageSquareText,
  Calculator,
  TrendingUp,
  Settings,
  ShoppingCart,
} from 'lucide-react';

const navItems = [
  {
    category: 'Core Navigation',
    items: [
      { name: 'Dashboard', path: '/', icon: LayoutDashboard },
      { name: 'Product Search', path: '/products', icon: Search },
      { name: 'Price Comparison', path: '/compare', icon: Scale },
      { name: 'Price History', path: '/history', icon: LineChart },
      { name: 'Target Alerts', path: '/alerts', icon: BellRing },
    ],
  },
  {
    category: 'Intelligence Engines',
    items: [
      { name: 'Honesty Index', path: '/honesty', icon: ShieldAlert },
      { name: 'Basket Optimizer', path: '/basket', icon: ShoppingBag },
      { name: 'Coupons & Promos', path: '/coupons', icon: Tag },
      { name: 'Alternatives', path: '/alternatives', icon: Shuffle },
      { name: 'TCO & Resale', path: '/tco', icon: Calculator },
      { name: 'Review Integrity', path: '/reviews', icon: MessageSquareText },
      { name: 'Price Forecast', path: '/forecast', icon: TrendingUp },
    ],
  },
  {
    category: 'Configuration',
    items: [
      { name: 'Settings & Status', path: '/settings', icon: Settings },
    ],
  },
];

export function Sidebar({ mobileOpen, onCloseMobile }) {
  return (
    <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`} aria-label="Sidebar Navigation">
      <div className="sidebar-header">
        <div className="sidebar-brand-icon">
          <ShoppingCart size={20} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span className="sidebar-brand-title">SmartCart</span>
          <span className="sidebar-brand-badge">AI</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((section) => (
          <div key={section.category} style={{ marginBottom: '12px' }}>
            <div className="sidebar-section-title">{section.category}</div>
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  onClick={onCloseMobile}
                >
                  <Icon size={17} />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="system-status-indicator">
          <span className="status-dot" />
          <span>Local Engine: Operational</span>
        </div>
        <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
          SmartCart v1.0 • React + Flask
        </span>
      </div>
    </aside>
  );
}

export default Sidebar;
