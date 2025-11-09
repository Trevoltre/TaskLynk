"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

export type User = {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'client' | 'freelancer';
  approved: boolean;
  balance: number;
  rating: number | null;
  phone: string;
  status: 'active' | 'suspended' | 'blacklisted';
  suspendedUntil: string | null;
  suspensionReason: string | null;
  blacklistReason: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  totalEarned: number;
  totalSpent: number;
  completedJobs: number;
  completionRate: number | null;
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  lastLoginDevice: string | null;
  loginCount: number;
};

type AuthContextType = {
  user: User | null;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string, name: string, role: string, phone: string) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check localStorage for existing user session (client-side only)
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    }
    setLoading(false);
  }, []);

  const refreshUser = async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/users/${user.id}`);
      if (response.ok) {
        const updatedUser = await response.json();
        setUser(updatedUser);
        if (typeof window !== 'undefined') {
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  const login = async (email: string, password: string): Promise<User> => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const userData = await response.json();
    setUser(userData);
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(userData));
    }
    return userData;
  };

  const register = async (email: string, password: string, name: string, role: string, phone: string): Promise<User> => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name, role, phone }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registration failed');
    }

    const userData = await response.json();
    setUser(userData);
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(userData));
    }
    return userData;
  };

  const logout = () => {
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user');
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, refreshUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}