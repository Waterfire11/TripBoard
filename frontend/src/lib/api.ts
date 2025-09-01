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
  full_name: string;  // Changed from first_name and last_name to full_name
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
  response?: any;
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

// --- Helper function to parse Django validation errors ---
const parseDjangoError = (errorData: any): string => {
  // Handle different Django error response formats
  
  // 1. Field validation errors (most common)
  // Format: { "field_name": ["error message 1", "error message 2"] }
  if (errorData && typeof errorData === 'object') {
    const errorMessages: string[] = [];
    
    // Check for field-specific errors
    Object.keys(errorData).forEach(field => {
      const fieldErrors = errorData[field];
      if (Array.isArray(fieldErrors)) {
        const fieldName = field.charAt(0).toUpperCase() + field.slice(1).replace('_', ' ');
        fieldErrors.forEach(error => {
          errorMessages.push(`${fieldName}: ${error}`);
        });
      } else if (typeof fieldErrors === 'string') {
        const fieldName = field.charAt(0).toUpperCase() + field.slice(1).replace('_', ' ');
        errorMessages.push(`${fieldName}: ${fieldErrors}`);
      }
    });
    
    if (errorMessages.length > 0) {
      return errorMessages.join('\n');
    }
  }
  
  // 2. Handle generic message fields
  if (errorData?.message) {
    return errorData.message;
  }
  
  // 3. Handle DRF detail field
  if (errorData?.detail) {
    return Array.isArray(errorData.detail) ? errorData.detail.join(', ') : errorData.detail;
  }
  
  // 4. Handle non_field_errors
  if (errorData?.non_field_errors) {
    const errors = Array.isArray(errorData.non_field_errors) 
      ? errorData.non_field_errors 
      : [errorData.non_field_errors];
    return errors.join(', ');
  }
  
  // 5. Handle direct error field
  if (errorData?.error) {
    return Array.isArray(errorData.error) ? errorData.error.join(', ') : errorData.error;
  }
  
  // 6. If errorData is a string
  if (typeof errorData === 'string') {
    return errorData;
  }
  
  // Default fallback
  return 'Request failed. Please try again.';
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

    // Always use Record<string, string> for headers
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

      // Handle 401 Unauthorized (token expired)
      if (response.status === 401 && token) {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          // Retry the original request with the new token
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
        let errorData: any = {};
        
        try {
          errorData = await response.json();
        } catch (parseError) {
          // If we can't parse the JSON, create a basic error object
          errorData = { 
            message: `HTTP ${response.status}: ${response.statusText}` 
          };
        }

        // Use the smart error parsing function
        const errorMessage = parseDjangoError(errorData);
        
        const error: ApiError = new Error(errorMessage);
        error.status = response.status;
        error.details = errorData;
        error.response = errorData; // Add response for useAuth error handling
        
        throw error;
      }

      return response.json() as Promise<T>;
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      
      // If it's already our enhanced ApiError, just re-throw it
      if (error instanceof Error && 'status' in error) {
        throw error;
      }
      
      // If it's a network error or other issue, wrap it
      const apiError: ApiError = new Error(
        error instanceof Error ? error.message : 'Network error. Please check your connection.'
      );
      apiError.details = error;
      throw apiError;
    }
  }

  // --- Authentication Methods ---
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

  // --- Health Check ---
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