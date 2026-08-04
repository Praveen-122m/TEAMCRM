import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Layout } from './components/Layout';
import { NotificationToastHandler } from './components/NotificationToastHandler';

// Auth Pages
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';

// Admin Pages
import Dashboard from './pages/Dashboard';
import ClientsPage from './pages/admin/ClientsPage';
import MembersPage from './pages/admin/MembersPage';
import OfficeWorkspaces from './pages/admin/OfficeWorkspaces';
import WorkspaceDetails from './pages/admin/WorkspaceDetails';
import ClientWorkspaces from './pages/admin/ClientWorkspaces';
import AdminTasks from './pages/admin/AdminTasks';

// Member Pages
import MemberDashboard from './pages/member/MemberDashboard';
import MemberWorkspaces from './pages/member/MemberWorkspaces';

// Client Pages
import ClientDashboard from './pages/ClientDashboard';

// Shared Pages
import MetaAdsDashboard from './pages/MetaAdsDashboard';
import MetaAdsCampaigns from './pages/MetaAdsCampaigns';
import FileManager from './pages/FileManager';
import DirectMessages from './pages/DirectMessages';
import Settings from './pages/Settings';
import ChannelChat from './pages/ChannelChat';
import MyTasks from './pages/MyTasks';
import NotificationSettings from './pages/NotificationSettings';
import NotificationCenter from './pages/NotificationCenter';
import { useAuth } from './hooks/useAuth';
import { LoadingSpinner } from './components/LoadingSpinner';

// RequireRole: waits for auth to load, then checks role
const RequireRole = ({ allowedRoles }) => {
  const { user, loading } = useAuth();

  // Still loading session — show spinner, don't redirect yet
  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  // Not logged in → go to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Wrong role → go to correct dashboard
  if (!allowedRoles.includes(user.role)) {
    let fallback = '/login';
    if (['Admin', 'SuperAdmin', 'super_admin', 'admin'].includes(user.role)) fallback = '/admin';
    else if (['Member', 'employee', 'intern'].includes(user.role)) fallback = '/member';
    else if (user.role === 'Client') fallback = '/client';
    return <Navigate to={fallback} replace />;
  }

  return <Outlet />;
};

const App = () => {
  const { user, loading } = useAuth();
  // Auto redirect root based on role
  const getRootRedirect = () => {
    if (loading) return null; // still loading, don't redirect yet
    if (!user) return '/login';
    if (['Admin', 'SuperAdmin', 'super_admin', 'admin'].includes(user.role)) return '/admin';
    if (['Member', 'employee', 'intern'].includes(user.role)) return '/member';
    if (user.role === 'Client') return '/client';
    return '/login';
  };

  // Show full-screen loader while session is being checked
  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  const rootTarget = getRootRedirect();

  return (
    <>
    <Routes>
      {/* Public Routes — redirect to dashboard if already logged in */}
      <Route path="/login" element={!user ? <Login /> : <Navigate to={getRootRedirect()} replace />} />
      <Route path="/register" element={!user ? <Register /> : <Navigate to={getRootRedirect()} replace />} />
      <Route path="/forgot-password" element={!user ? <ForgotPassword /> : <Navigate to={getRootRedirect()} replace />} />

      {/* Root redirect */}
      <Route path="/" element={<Navigate to={rootTarget} replace />} />

      {/* Main Dashboard Layout Shell */}
      <Route element={<Layout />}>
        {/* Admin Routes */}
        <Route element={<RequireRole allowedRoles={['Admin', 'SuperAdmin', 'super_admin', 'admin']} />}>
          <Route path="/admin" element={<Dashboard />} />
          <Route path="/admin/tasks" element={<AdminTasks />} />
          <Route path="/admin/clients" element={<ClientsPage />} />
          <Route path="/admin/members" element={<MembersPage />} />
          <Route path="/admin/office-workspaces" element={<OfficeWorkspaces />} />
          <Route path="/admin/office-workspaces/:id" element={<WorkspaceDetails type="office" />} />
          <Route path="/admin/client-workspaces" element={<ClientWorkspaces />} />
          <Route path="/admin/client-workspaces/:id" element={<WorkspaceDetails type="client" />} />
        </Route>

        {/* Member Routes */}
        <Route element={<RequireRole allowedRoles={['Member', 'employee', 'intern', 'Admin', 'SuperAdmin', 'super_admin', 'admin']} />}>
          <Route path="/member" element={<MemberDashboard />} />
          <Route path="/member/workspaces" element={<MemberWorkspaces />} />
        </Route>

        {/* Client Routes */}
        <Route element={<RequireRole allowedRoles={['Client', 'Admin']} />}>
          <Route path="/client" element={<ClientDashboard />} />
        </Route>

        {/* Shared Routes */}
        {/* Meta Ads Routes (Admins and Clients only) */}
        <Route element={<RequireRole allowedRoles={['Admin', 'SuperAdmin', 'super_admin', 'admin', 'Client']} />}>
          <Route path="/meta-ads" element={<MetaAdsDashboard />} />
          <Route path="/meta-ads/campaigns" element={<MetaAdsCampaigns />} />
        </Route>

        {/* Shared Routes */}
        <Route element={<RequireRole allowedRoles={['Admin', 'SuperAdmin', 'super_admin', 'admin', 'Member', 'employee', 'intern', 'Client']} />}>
          <Route path="/files" element={<FileManager />} />
          <Route path="/messages" element={<DirectMessages />} />
          <Route path="/dms" element={<Navigate to="/messages" replace />} />
          <Route path="/channels" element={<ChannelChat />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/notifications" element={<NotificationSettings />} />
          <Route path="/notifications" element={<NotificationCenter />} />
          <Route path="/my-tasks" element={<MyTasks />} />
        </Route>
      </Route>

      {/* 404 Catch All */}
      <Route path="*" element={<Navigate to={rootTarget} replace />} />
    </Routes>
    <NotificationToastHandler />
    </>
  );
};

export default App;
