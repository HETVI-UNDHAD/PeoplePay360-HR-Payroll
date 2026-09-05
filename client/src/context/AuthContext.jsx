import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  const showToast = (message, type = 'info') => {
    setNotification({ message, type, id: Date.now() });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Load user profile on mount if token exists
  useEffect(() => {
    async function loadUser() {
      const token = localStorage.getItem('peoplepay360_token');
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.getMe();
        if (res.success && res.user) {
          setUser(res.user);
        } else {
          localStorage.removeItem('peoplepay360_token');
        }
      } catch (err) {
        console.error('Session load error:', err);
        localStorage.removeItem('peoplepay360_token');
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, []);

  const login = async (email, password) => {
    const res = await api.login(email, password);
    if (res.success && res.token) {
      localStorage.setItem('peoplepay360_token', res.token);
      setUser(res.user);
      showToast(`Welcome back, ${res.user.firstName}! (${res.user.roleName})`, 'success');
      return res.user;
    }
    throw new Error(res.message || 'Login failed');
  };

  const logout = () => {
    localStorage.removeItem('peoplepay360_token');
    setUser(null);
    showToast('Logged out successfully', 'info');
  };

  // Quick switch role for Hackathon demo & evaluation
  const switchDemoRole = async (roleCode) => {
    try {
      const res = await api.switchDemoRole(roleCode);
      if (res.success && res.token) {
        localStorage.setItem('peoplepay360_token', res.token);
        setUser(res.user);
        showToast(`Switched view to ${res.user.roleName} (${res.user.firstName} ${res.user.lastName})`, 'success');
        return res.user;
      }
    } catch (err) {
      showToast(err.message || 'Failed to switch role', 'error');
    }
  };

  const role = user?.role || 'EMPLOYEE';
  const roleHelpers = {
    isAdmin: role === 'ADMIN',
    isHR: ['ADMIN', 'HR_MANAGER', 'PAYROLL_ADMIN', 'PAYROLL_USER'].includes(role),
    isPayrollAdmin: ['ADMIN', 'PAYROLL_ADMIN'].includes(role),
    isPayrollUser: role === 'PAYROLL_USER',
    isPayrollTeam: ['ADMIN', 'PAYROLL_ADMIN', 'PAYROLL_USER'].includes(role),
    isEmployee: role === 'EMPLOYEE'
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        notification,
        showToast,
        login,
        logout,
        switchDemoRole,
        ...roleHelpers
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: null,
      loading: true,
      notification: null,
      showToast: () => {},
      login: async () => {},
      logout: () => {},
      switchDemoRole: async () => {},
      isAdmin: false,
      isHR: false,
      isPayrollAdmin: false,
      isPayrollUser: false,
      isPayrollTeam: false,
      isEmployee: false
    };
  }
  return context;
}
