import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, NotificationItem, DailySessionStatus } from '../types';

export interface RegisterData {
  username: string;
  phoneNumber: string;
  password: string;
  confirmPassword?: string;
  withdrawalPin: string;
  confirmWithdrawalPin?: string;
  referralCode: string;
  email?: string;
  fullName?: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  dailyStatus: 'OPEN' | 'CLOSED';
  notifications: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  login: (identifier: string, passwordOrPin: string) => Promise<void>;
  register: (
    dataOrEmail: RegisterData | string,
    fullName?: string,
    password?: string,
    role?: string
  ) => Promise<void>;
  logout: () => void;
  quickSwitch: (role: 'WORKER' | 'FINANCIAL_DEPARTMENT', workerEmail?: string) => Promise<void>;
  refreshUserData: () => Promise<void>;
  refreshDailyStatus: () => Promise<void>;
  markNotificationAsRead: (id: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('terrkeet_token'));
  const [dailyStatus, setDailyStatus] = useState<'OPEN' | 'CLOSED'>('OPEN');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch current user details
  const refreshUserData = async () => {
    const currentToken = token || localStorage.getItem('terrkeet_token');
    if (!currentToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${currentToken}` },
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data);
        fetchNotifications(currentToken);
      } else {
        localStorage.removeItem('terrkeet_token');
        setToken(null);
        setUser(null);
      }
    } catch (e) {
      console.error('Failed to load user profile', e);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshDailyStatus = async () => {
    try {
      const res = await fetch('/api/tasks/status');
      if (res.ok) {
        const data: DailySessionStatus = await res.json();
        setDailyStatus(data.daily_task_status);
      }
    } catch (e) {
      console.error('Failed to load daily status', e);
    }
  };

  const fetchNotifications = async (authToken: string) => {
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (e) {
      console.error('Failed to fetch notifications', e);
    }
  };

  const markNotificationAsRead = async (id: number) => {
    const currentToken = token || localStorage.getItem('terrkeet_token');
    if (!currentToken) return;

    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (e) {
      console.error('Failed to mark notification read', e);
    }
  };

  const login = async (identifier: string, passwordOrPin: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password: passwordOrPin }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Login failed');
    }

    const data = await res.json();
    localStorage.setItem('terrkeet_token', data.access_token);
    setToken(data.access_token);
    await refreshUserData();
  };

  const register = async (
    dataOrEmail: RegisterData | string,
    fullName?: string,
    password?: string,
    role = 'WORKER'
  ) => {
    const payload =
      typeof dataOrEmail === 'object'
        ? dataOrEmail
        : {
            email: dataOrEmail,
            fullName,
            password,
            role,
          };

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Registration failed');
    }

    const data = await res.json();
    localStorage.setItem('terrkeet_token', data.access_token);
    setToken(data.access_token);
    await refreshUserData();
  };

  const logout = () => {
    localStorage.removeItem('terrkeet_token');
    setToken(null);
    setUser(null);
  };

  const quickSwitch = async (
    role: 'WORKER' | 'FINANCIAL_DEPARTMENT',
    workerEmail?: string
  ) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/demo-switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, workerEmail }),
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('terrkeet_token', data.access_token);
        setToken(data.access_token);
        await refreshUserData();
      }
    } catch (e) {
      console.error('Quick switch failed', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initial bootstrap: if token exists, load user profile; otherwise show landing page
    const init = async () => {
      const stored = localStorage.getItem('terrkeet_token');
      if (stored) {
        await refreshUserData();
      } else {
        setIsLoading(false);
      }
      await refreshDailyStatus();
    };
    init();

    const interval = setInterval(() => {
      refreshDailyStatus();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        dailyStatus,
        notifications,
        unreadCount,
        isLoading,
        login,
        register,
        logout,
        quickSwitch,
        refreshUserData,
        refreshDailyStatus,
        markNotificationAsRead,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
