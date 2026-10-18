import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="app-layout">
      <Sidebar
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {mobileOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.35)',
            backdropFilter: 'blur(3px)',
            zIndex: 35,
          }}
          aria-hidden="true"
        />
      )}

      <div className="main-wrapper">
        <Topbar onToggleMobile={() => setMobileOpen((prev) => !prev)} />
        <main className="page-container" id="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
