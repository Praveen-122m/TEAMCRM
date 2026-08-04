import { createContext, useState, useEffect } from 'react';
import api from '../services/api';
import { deviceService } from '../services/deviceService';
import { requestForToken } from '../firebase';

export const AuthContext = createContext();

// ─── Tab-Isolated Auth Storage ───────────────────────────────────────────────
// Uses sessionStorage (native per-tab isolated storage) so that
// opening a new tab (Ctrl+T) starts with a fresh session, while
// page reloads within the same tab preserve the session.

const authStorage = {
  get: (key) => sessionStorage.getItem(key),
  set: (key, value) => sessionStorage.setItem(key, value),
  remove: (key) => sessionStorage.removeItem(key),
  clearAll: () => {
    sessionStorage.removeItem('userInfo');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('activeWorkspace');
    sessionStorage.removeItem('activeWorkspaceName');
    localStorage.clear();
    sessionStorage.clear();
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [activeWorkspace, setActiveWorkspaceState] = useState(authStorage.get('activeWorkspace'));
  const [loading, setLoading] = useState(true);

  const setupFCMToken = async (apiInstance) => {
    try {
      const token = await requestForToken();
      if (token) {
        await apiInstance.post('/notifications/save-token', { fcmToken: token });
        console.log('[FCM] Token saved to backend successfully.');
      }
    } catch (err) {
      console.error('[FCM] Failed to register token with backend:', err);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      const userInfo = authStorage.get('userInfo');
      const token = authStorage.get('token');

      if (userInfo && token) {
        try {
          const res = await api.get('/auth/verify');
          const parsedUser = res.data.user;
          setUser(parsedUser);
          authStorage.set('userInfo', JSON.stringify(parsedUser));

          if (parsedUser.workspaces?.length > 0) {
            const wsIds = parsedUser.workspaces.map((w) => w.toString());
            const preferred =
              parsedUser.role === 'Client'
                ? (parsedUser.activeWorkspace || parsedUser.workspaces[0]).toString()
                : activeWorkspace && wsIds.includes(activeWorkspace.toString())
                  ? activeWorkspace.toString()
                  : wsIds[0];
            setActiveWorkspaceState(preferred);
            authStorage.set('activeWorkspace', preferred);
          } else {
            setActiveWorkspaceState(null);
            authStorage.remove('activeWorkspace');
          }

          // Register FCM token
          setupFCMToken(api);
        } catch (err) {
          console.error('[AUTH_INIT_ERROR]', err);
          setUser(null);
          authStorage.clearAll();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const setActiveWorkspace = async (wpId, wpName) => {
    try {
      const { data } = await api.post('/auth/switch-workspace', { workspaceId: wpId });
      if (data && data.token) {
        authStorage.set('token', data.token);
        api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      }
    } catch (err) {
      console.error('[SWITCH_WORKSPACE_ERR]', err);
    }
    setActiveWorkspaceState(wpId);
    authStorage.set('activeWorkspace', wpId);
    if (wpName) authStorage.set('activeWorkspaceName', wpName);
  };

  const login = async (email, password, secretCode = null, selectedRole = null) => {
    try {
      const payload = secretCode ? { secretCode, password, selectedRole } : { email, password, selectedRole };
      const { data } = await api.post('/auth/login', payload);
      setUser(data);
      authStorage.set('userInfo', JSON.stringify(data));
      authStorage.set('token', data.token);

      const wsId = data.activeWorkspace || data.workspaces?.[0];
      if (wsId) {
        const wsIdStr = wsId.toString();
        setActiveWorkspaceState(wsIdStr);
        authStorage.set('activeWorkspace', wsIdStr);
        if (data.role === 'Client' && data.workspacesMeta?.[0]?.name) {
          authStorage.set('activeWorkspaceName', data.workspacesMeta[0].name);
        }
      }

      // Register FCM token
      setupFCMToken(api);

      return { success: true, role: data.role };
    } catch (error) {
      const errorMsg = error.response?.data?.message || (error.message === 'Network Error' ? 'Cannot connect to server.' : 'Login failed');
      return { success: false, message: errorMsg };
    }
  };

  const register = async (name, email, password, role = 'Member', confirmPassword = '', inviteCode = '') => {
    try {
      const { data } = await api.post('/auth/register', { name, email, password, confirmPassword, role, inviteCode });
      setUser(data);
      authStorage.set('userInfo', JSON.stringify(data));
      authStorage.set('token', data.token);

      if (data.workspaces?.length > 0) {
        const wsId = data.workspaces[0].toString();
        setActiveWorkspaceState(wsId);
        authStorage.set('activeWorkspace', wsId);
      }

      // Register FCM token
      setupFCMToken(api);

      return { success: true, role: data.role };
    } catch (error) {
      const errorMsg = error.response?.data?.message || (error.message === 'Network Error' ? 'Cannot connect to server.' : 'Registration failed');
      return { success: false, message: errorMsg };
    }
  };

  const refreshUser = async () => {
    try {
      const { data } = await api.get('/auth/profile');
      const updatedUser = {
        ...user,
        ...data,
        workspaces: data.workspaces ?? user?.workspaces,
        workspacesMeta: data.workspacesMeta ?? user?.workspacesMeta,
      };
      setUser(updatedUser);
      authStorage.set('userInfo', JSON.stringify(updatedUser));
      return { success: true, data: updatedUser };
    } catch (error) {
      return { success: false };
    }
  };

  const logout = async () => {
    try {
      const token = await requestForToken();
      if (token) {
        await deviceService.unregister(token).catch(e => console.error('Device unregister error', e));
      }
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error', error);
    }
    setUser(null);
    authStorage.clearAll();
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, register, logout, refreshUser, activeWorkspace, setActiveWorkspace, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
