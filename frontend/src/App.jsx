import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';

// Auth Pages
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';

// Admin Pages
import Dashboard from './pages/Dashboard';
import ClientsPage from './pages/admin/ClientsPage';
import MembersPage from './pages/admin/MembersPage';
import ReportsPage from './pages/admin/ReportsPage';
import OfficeWorkspaces from './pages/admin/OfficeWorkspaces';
import ClientWorkspaces from './pages/admin/ClientWorkspaces';
import WorkspaceDetails from './pages/admin/WorkspaceDetails';

// Member Pages
import MemberDashboard from './pages/member/MemberDashboard';
import MemberWorkspaces from './pages/member/MemberWorkspaces';

// Client Pages
import ClientDashboard from './pages/ClientDashboard';

// Shared Pages
import MetaAdsDashboard from './pages/MetaAdsDashboard';
import MetaAdsCampaigns from './pages/MetaAdsCampaigns';
import LeadCenter from './pages/LeadCenter';
import FileManager from './pages/FileManager';
import DirectMessages from './pages/DirectMessages';
import Settings from './pages/Settings';
import ChannelChat from './pages/ChannelChat';

import { useAuth } from './hooks/useAuth';
import { LoadingSpinner } from './components/LoadingSpinner';

const App = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  // Auto redirect root based on role
  const getRootRedirect = () => {
    if (!user) return '/login';
    if (user.role === 'Admin') return '/admin';
    if (user.role === 'Member') return '/member';
    if (user.role === 'Client') return '/client';
    return '/login';
  };

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={!user ? <Login /> : <Navigate to={getRootRedirect()} />} />
      <Route path="/register" element={!user ? <Register /> : <Navigate to={getRootRedirect()} />} />
      <Route path="/forgot-password" element={!user ? <ForgotPassword /> : <Navigate to={getRootRedirect()} />} />
      <Route path="/" element={<Navigate to={getRootRedirect()} replace />} />

      {/* Admin Routes */}
      <Route path="/admin" element={<Layout allowedRoles={['Admin']} />}>
        <Route index element={<Dashboard />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="members" element={<MembersPage />} />
        <Route path="office-workspaces" element={<OfficeWorkspaces />} />
        <Route path="office-workspaces/:id" element={<WorkspaceDetails type="office" />} />
        <Route path="client-workspaces" element={<ClientWorkspaces />} />
        <Route path="client-workspaces/:id" element={<WorkspaceDetails type="client" />} />
      </Route>

      {/* Member Routes */}
      <Route path="/member" element={<Layout allowedRoles={['Member', 'Admin']} />}>
        <Route index element={<MemberDashboard />} />
        <Route path="workspaces" element={<MemberWorkspaces />} />
      </Route>

      {/* Client Routes */}
      <Route path="/client" element={<Layout allowedRoles={['Client', 'Admin']} />}>
        <Route index element={<ClientDashboard />} />
      </Route>

      {/* Shared Routes (Accessible based on specific rules, handled in component or by having it under Layout) */}
      <Route element={<Layout allowedRoles={['Admin', 'Member', 'Client']} />}>
        <Route path="/meta-ads" element={<MetaAdsDashboard />} />
        <Route path="/meta-ads/campaigns" element={<MetaAdsCampaigns />} />
        <Route path="/leads" element={<LeadCenter />} />
        <Route path="/files" element={<FileManager />} />
        <Route path="/messages" element={<DirectMessages />} />
        <Route path="/dms" element={<Navigate to="/messages" replace />} />
        <Route path="/channels" element={<ChannelChat />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      
      {/* 404 Catch All */}
      <Route path="*" element={<Navigate to={getRootRedirect()} replace />} />
    </Routes>
  );
};

export default App;
