import { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import NotificationPopup from './NotificationPopup';
import { useAuth } from '../hooks/useAuth';
import { LoadingSpinner } from './LoadingSpinner';


export const Layout = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check if route is a chat/workspace details route (must have an ID for workspace routes)
  const isWorkspaceDetailRoute = /\/workspaces\/([^\/]+)/.test(location.pathname);
  const isChatRoute = location.pathname.startsWith('/channels') || location.pathname.startsWith('/messages') || location.pathname.startsWith('/dms') || isWorkspaceDetailRoute;

  return (
    <div className="flex h-screen overflow-hidden bg-crm-dark relative">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopNav onMenuClick={() => setSidebarOpen(true)} />
        
        <main className={`flex-1 flex flex-col overflow-hidden ${isChatRoute ? 'bg-crm-dark' : 'overflow-y-auto p-4 lg:p-8 custom-scrollbar'}`}>
          <div className={isChatRoute ? 'flex-1 w-full mx-auto overflow-hidden flex flex-col bg-crm-card border-t border-crm-border' : 'flex-1 w-full mx-auto max-w-7xl flex flex-col min-h-full'}>
            <Outlet />
          </div>
        </main>
        <NotificationPopup />
      </div>

    </div>
  );
};

