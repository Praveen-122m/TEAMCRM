import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [activeWorkspace, setActiveWorkspaceState] = useState(localStorage.getItem('activeWorkspace'));
  const [loading, setLoading] = useState(true);

  // Configure axios base URL
  axios.defaults.baseURL = 'http://localhost:5005';

  useEffect(() => {
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      const parsedUser = JSON.parse(userInfo);
      setUser(parsedUser);
      axios.defaults.headers.common['Authorization'] = `Bearer ${parsedUser.token}`;
      
      // Load active workspace if not set
      if (!activeWorkspace && parsedUser.workspaces?.length > 0) {
        const defaultWp = parsedUser.workspaces[0];
        setActiveWorkspaceState(defaultWp);
        localStorage.setItem('activeWorkspace', defaultWp);
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
      const { data } = await axios.post('/api/auth/login', payload);
      setUser(data);
      localStorage.setItem('userInfo', JSON.stringify(data));
      axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Login failed' };
    }
  };

  const register = async (name, email, password) => {
    try {
      const { data } = await axios.post('/api/auth/register', { name, email, password });
      setUser(data);
      localStorage.setItem('userInfo', JSON.stringify(data));
      axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Registration failed' };
    }
  };

  const refreshUser = async () => {
    try {
      const { data } = await axios.get('/api/users/profile');
      // Merge new data with existing token
      const updatedUser = { ...user, ...data };
      setUser(updatedUser);
      localStorage.setItem('userInfo', JSON.stringify(updatedUser));
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('userInfo');
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, refreshUser, activeWorkspace, setActiveWorkspace, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
