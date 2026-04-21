import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ApiRequestError,
  clearAuthToken,
  fetchCurrentUser,
  getAuthToken,
  loginUser,
  logoutUser,
  setAuthToken,
} from '@/lib/api';

interface AuthContextType {
  isAuthenticated: boolean;
  user: { email: string; name?: string } | null;
  login: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Initialize auth state from localStorage
function getInitialAuthState() {
  try {
    const storedUser = localStorage.getItem('user');
    const storedToken = getAuthToken();
    if (storedToken) {
      let parsedUser: { email: string; name?: string } | null = null;
      if (storedUser) {
        try {
          parsedUser = JSON.parse(storedUser) as { email: string; name?: string };
        } catch {
          parsedUser = null;
        }
      }
      return {
        isAuthenticated: true,
        user: parsedUser,
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

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    const restoreSession = async () => {
      try {
        const payload = await fetchCurrentUser();
        const userInfo = (
          "data" in payload && payload.data
            ? payload.data
            : payload
        ) as { email?: string; name?: string } | null;

        if (!userInfo?.email) {
          throw new Error("Unable to restore authenticated user");
        }

        setUser({
          email: userInfo.email,
          name: userInfo.name,
        });
        setIsAuthenticated(true);
        localStorage.setItem("user", JSON.stringify({
          email: userInfo.email,
          name: userInfo.name,
        }));
        localStorage.setItem("isAuthenticated", "true");
      } catch (error) {
        const status = error instanceof ApiRequestError ? error.status : null;
        if (status === 401 || status === 403) {
          clearAuthToken();
          localStorage.removeItem("user");
          localStorage.removeItem("isAuthenticated");
          setUser(null);
          setIsAuthenticated(false);
        }
      }
    };

    void restoreSession();
  }, []);

  const login = async (
    email: string,
    password: string,
  ): Promise<{ success: boolean; message?: string }> => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { success: false, message: 'Please enter a valid email address' };
    }
    if (password.length < 6) {
      return { success: false, message: 'Password must be at least 6 characters' };
    }

    try {
      const result = await loginUser(email, password);
      if (!result.token) {
        return {
          success: false,
          message: 'Login succeeded but no access token was returned by the backend.',
        };
      }

      const userInfo = {
        email: result.user?.email || email,
        name: result.user?.name,
      };
      setUser(userInfo);
      setIsAuthenticated(true);
      setAuthToken(result.token);
      localStorage.setItem('user', JSON.stringify(userInfo));
      localStorage.setItem('isAuthenticated', 'true');
      return { success: true, message: result.message };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to login. Please try again.';
      return { success: false, message };
    }
  };

  const logout = async () => {
    try {
      await logoutUser();
    } catch {
      // If logout endpoint fails, still clear local state.
    }
    setUser(null);
    setIsAuthenticated(false);
    clearAuthToken();
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
