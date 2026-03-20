import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  user: { email: string } | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Initialize auth state from localStorage
function getInitialAuthState() {
  try {
    const storedAuth = localStorage.getItem('isAuthenticated');
    const storedUser = localStorage.getItem('user');
    if (storedAuth === 'true' && storedUser) {
      return {
        isAuthenticated: true,
        user: JSON.parse(storedUser),
      };
    }
  } catch {
    localStorage.removeItem('user');
    localStorage.removeItem('isAuthenticated');
  }
  return {
    isAuthenticated: false,
    user: null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(
    getInitialAuthState().isAuthenticated
  );
  const [user, setUser] = useState(getInitialAuthState().user);

  const login = (email: string, password: string): boolean => {
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return false;
    }
    // Password minimum length
    if (password.length < 6) {
      return false;
    }
    
    setUser({ email });
    setIsAuthenticated(true);
    localStorage.setItem('user', JSON.stringify({ email }));
    localStorage.setItem('isAuthenticated', 'true');
    return true;
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('user');
    localStorage.removeItem('isAuthenticated');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
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
