import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useSession } from '@/store/useSession';
import { makeApiCall, getHeaders } from '@/features/boards/hooks';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://travel-kanban.onrender.com';

// --- Types ---
export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  created_at: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  tokens: AuthTokens;
}

export interface RegisterData {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  password_confirm: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface ApiError extends Error {
  status?: number;
  details?: any;
}

// --- Token Management ---
export const tokenManager = {
  getAccessToken: (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('access_token');
    }
    return null;
  },

  getRefreshToken: (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('refresh_token');
    }
    return null;
  },

  setTokens: (tokens: AuthTokens): void => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', tokens.access);
      localStorage.setItem('refresh_token', tokens.refresh);
    }
  },

  clearTokens: (): void => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  },
};

// --- API Client Class ---
class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const token = tokenManager.getAccessToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      let response = await fetch(url, config);

      if (response.status === 401 && token) {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          headers.Authorization = `Bearer ${tokenManager.getAccessToken()}`;
          response = await fetch(url, { ...config, headers });
        } else {
          tokenManager.clearTokens();
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
          throw new Error('Session expired. Please log in again.');
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error: ApiError = new Error(errorData.message || 'Request failed');
        error.status = response.status;
        error.details = errorData;
        throw error;
      }

      return response.json() as Promise<T>;
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    return this.request<AuthResponse>('/api/auth/register/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(data: LoginData): Promise<AuthResponse> {
    return this.request<AuthResponse>('/api/auth/login/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async logout(): Promise<void> {
    const refreshToken = tokenManager.getRefreshToken();
    if (refreshToken) {
      await this.request('/api/auth/logout/', {
        method: 'POST',
        body: JSON.stringify({ refresh: refreshToken }),
      });
    }
    tokenManager.clearTokens();
  }

  async getCurrentUser(): Promise<{ user: User }> {
    return this.request<{ user: User }>('/api/auth/me/');
  }

  async updateProfile(data: Partial<User>): Promise<{ user: User }> {
    return this.request<{ user: User }>('/api/auth/me/', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  private async refreshToken(): Promise<boolean> {
    const refreshToken = tokenManager.getRefreshToken();
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${this.baseURL}/api/auth/token/refresh/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh: refreshToken }),
      });

      if (response.ok) {
        const { access } = await response.json();
        tokenManager.setTokens({ access, refresh: refreshToken });
        return true;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
    return false;
  }

  async healthCheck(): Promise<{ status: string }> {
    return this.request<{ status: string }>('/api/health/');
  }
}

// --- Singleton Instance ---
export const apiClient = new ApiClient(API_BASE_URL);

// --- Convenience Functions for React Hooks ---
export const auth = {
  register: (data: RegisterData) => apiClient.register(data),
  login: (data: LoginData) => apiClient.login(data),
  logout: () => apiClient.logout(),
  getCurrentUser: () => apiClient.getCurrentUser(),
  updateProfile: (data: Partial<User>) => apiClient.updateProfile(data),
  isAuthenticated: (): boolean => !!tokenManager.getAccessToken(),
};

// --- React Hooks ---
export const useLogout = () => {
  const { clearUser } = useSession();

  const logout = useCallback(async () => {
    try {
      await auth.logout();
      clearUser();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('Logout failed:', error);
      tokenManager.clearTokens();
      clearUser();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  }, [clearUser]);

  return { logout };
};

export const useDeleteUser = () => {
  const { clearUser } = useSession();
  return useMutation<void, Error>({
    mutationFn: async () => {
      const token = tokenManager.getAccessToken();
      if (!token) {
        throw new Error('Authentication required');
      }
      return makeApiCall(() =>
        fetch(`${API_BASE_URL}/api/auth/me/delete/`, {
          method: 'DELETE',
          headers: getHeaders(token),
        })
      );
    },
    onSuccess: () => {
      clearUser();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    },
    onError: (error) => {
      console.error('Failed to delete user:', error);
    },
  });
};