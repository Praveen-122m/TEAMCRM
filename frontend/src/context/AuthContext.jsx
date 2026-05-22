import { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [activeWorkspace, setActiveWorkspaceState] = useState(localStorage.getItem('activeWorkspace'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userInfo = localStorage.getItem('userInfo');
    const token = localStorage.getItem('token');
    
    if (userInfo && token) {
      const parsedUser = JSON.parse(userInfo);
      setUser(parsedUser);
      
      // Handle active workspace logic securely
      if (parsedUser.workspaces?.length > 0) {
        const wsIds = parsedUser.workspaces.map((w) => w.toString());
        const preferred =
          parsedUser.role === 'Client'
            ? (parsedUser.activeWorkspace || parsedUser.workspaces[0]).toString()
            : activeWorkspace && wsIds.includes(activeWorkspace.toString())
              ? activeWorkspace.toString()
              : wsIds[0];
        setActiveWorkspaceState(preferred);
        localStorage.setItem('activeWorkspace', preferred);
      } else {
        setActiveWorkspaceState(null);
        localStorage.removeItem('activeWorkspace');
      }
    }
    setLoading(false);
  }, []);

  const setActiveWorkspace = (wpId, wpName) => {
    setActiveWorkspaceState(wpId);
    localStorage.setItem('activeWorkspace', wpId);
    if (wpName) localStorage.setItem('activeWorkspaceName', wpName);
  };

  const login = async (email, password, secretCode = null) => {
    try {
      const payload = secretCode ? { secretCode, password } : { email, password };
      const { data } = await api.post('/auth/login', payload);
      setUser(data);
      localStorage.setItem('userInfo', JSON.stringify(data));
      localStorage.setItem('token', data.token);

      const wsId = data.activeWorkspace || data.workspaces?.[0];
      if (wsId) {
        const wsIdStr = wsId.toString();
        setActiveWorkspaceState(wsIdStr);
        localStorage.setItem('activeWorkspace', wsIdStr);
        if (data.role === 'Client' && data.workspacesMeta?.[0]?.name) {
          localStorage.setItem('activeWorkspaceName', data.workspacesMeta[0].name);
        }
      }

      return { success: true, role: data.role };
    } catch (error) {
      const errorMsg = error.response?.data?.message || (error.message === 'Network Error' ? 'Cannot connect to server. Is the backend running?' : 'Login failed');
      return { success: false, message: errorMsg };
    }
  };

  const register = async (name, email, password, role = 'Member', confirmPassword = '') => {
    try {
      const { data } = await api.post('/auth/register', {
        name,
        email,
        password,
        confirmPassword,
        role,
      });
      setUser(data);
      localStorage.setItem('userInfo', JSON.stringify(data));
      localStorage.setItem('token', data.token);

      if (data.workspaces?.length > 0) {
        const wsId = data.workspaces[0].toString();
        setActiveWorkspaceState(wsId);
        localStorage.setItem('activeWorkspace', wsId);
      }

      return { success: true, role: data.role };
    } catch (error) {
      const errorMsg = error.response?.data?.message || (error.message === 'Network Error' ? 'Cannot connect to server. Is the backend running?' : 'Registration failed');
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
      localStorage.setItem('userInfo', JSON.stringify(updatedUser));
      return { success: true, data: updatedUser };
    } catch (error) {
      return { success: false };
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error', error);
    }
    setUser(null);
    localStorage.removeItem('userInfo');
    localStorage.removeItem('token');
    localStorage.removeItem('activeWorkspace');
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, register, logout, refreshUser, activeWorkspace, setActiveWorkspace, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
