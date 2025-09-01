import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { apiClient, tokenManager, User as ApiUser } from '@/lib/api';
import { useSession } from '@/store/useSession';

// --- Types ---
interface AuthState {
  user: ApiUser | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

interface AuthActions {
  login: (data: { email: string; password: string }) => Promise<void>;
  register: (data: { name: string; username: string; email: string; password: string; password_confirm: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

// --- Helper Functions ---
const mapApiUserToSessionUser = (apiUser: ApiUser) => ({
  id: apiUser.id.toString(),
  email: apiUser.email,
  name: `${apiUser.first_name} ${apiUser.last_name}`,
  createdAt: apiUser.created_at,
});

// Helper function to parse Django validation errors
const parseApiError = (error: any): string => {
  // If error has a response (fetch error)
  if (error?.response) {
    try {
      const errorData = error.response;
      
      // Handle Django validation errors
      if (errorData.errors && typeof errorData.errors === 'object') {
        const errorMessages = Object.entries(errorData.errors)
          .map(([field, messages]) => {
            const messageArray = Array.isArray(messages) ? messages : [messages];
            const fieldName = field.charAt(0).toUpperCase() + field.slice(1).replace('_', ' ');
            return `${fieldName}: ${messageArray.join(', ')}`;
          })
          .join('\n');
        return errorMessages;
      }
      
      // Handle single error message
      if (errorData.error) {
        return errorData.error;
      }
      
      // Handle message field
      if (errorData.message) {
        return errorData.message;
      }
      
      // Handle detail field (common in DRF)
      if (errorData.detail) {
        return errorData.detail;
      }
      
      // Handle non_field_errors (common in Django forms)
      if (errorData.non_field_errors) {
        const errors = Array.isArray(errorData.non_field_errors) 
          ? errorData.non_field_errors 
          : [errorData.non_field_errors];
        return errors.join(', ');
      }
      
    } catch (parseError) {
      console.error('Error parsing API error:', parseError);
    }
  }
  
  // If it's a direct error object with a message
  if (error?.message) {
    return error.message;
  }
  
  // If it's a string
  if (typeof error === 'string') {
    return error;
  }
  
  // Default fallback
  return 'An unexpected error occurred. Please try again.';
};

// Enhanced API call wrapper with better error handling
const makeApiCall = async <T>(apiCall: () => Promise<T>): Promise<T> => {
  try {
    return await apiCall();
  } catch (error: any) {
    // If it's a fetch error, try to parse the response
    if (error?.response || error?.status) {
      let errorData;
      
      // Handle different types of response errors
      if (error.response) {
        errorData = error.response;
      } else if (error.status && error.json) {
        // Some API clients return errors with .json() method
        try {
          errorData = await error.json();
        } catch {
          errorData = { message: `HTTP ${error.status}: ${error.statusText || 'Request failed'}` };
        }
      }
      
      // Create enhanced error with parsed data
      const enhancedError = new Error(parseApiError({ response: errorData }));
      enhancedError.name = 'ApiError';
      throw enhancedError;
    }
    
    // If it's already a proper error, enhance it
    if (error instanceof Error) {
      const enhancedError = new Error(parseApiError(error));
      enhancedError.name = error.name;
      throw enhancedError;
    }
    
    // Last resort - create new error
    throw new Error(parseApiError(error));
  }
};

// --- Main Hook ---
export function useAuth(): AuthState & AuthActions {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
    isAuthenticated: false,
  });
  const router = useRouter();
  const { setUser, clearUser } = useSession();
  const initializingRef = useRef(false);

  // Initialize auth state
  useEffect(() => {
    // Prevent multiple initialization calls
    if (initializingRef.current) return;
    initializingRef.current = true;

    const initializeAuth = async () => {
      try {
        const hasToken = !!tokenManager.getAccessToken();
        if (!hasToken) {
          setState((prev) => ({ ...prev, loading: false }));
          initializingRef.current = false;
          return;
        }

        const response = await makeApiCall(() => apiClient.getCurrentUser());
        setState({
          user: response.user,
          loading: false,
          error: null,
          isAuthenticated: true,
        });
        
        // Update session store
        const sessionUser = mapApiUserToSessionUser(response.user);
        setUser(sessionUser, tokenManager.getAccessToken()!);
      } catch (error) {
        console.error('Failed to get current user:', error);
        tokenManager.clearTokens();
        clearUser();
        setState({
          user: null,
          loading: false,
          error: null,
          isAuthenticated: false,
        });
      } finally {
        initializingRef.current = false;
      }
    };

    initializeAuth();
  }, [setUser, clearUser]); // Only depend on stable functions

  // --- Actions ---
  const login = useCallback(
    async (data: { email: string; password: string }) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const response = await makeApiCall(() => apiClient.login(data));
        tokenManager.setTokens(response.tokens);
        const sessionUser = mapApiUserToSessionUser(response.user);
        setUser(sessionUser, response.tokens.access);
        setState({
          user: response.user,
          loading: false,
          error: null,
          isAuthenticated: true,
        });
        toast.success('Welcome back!');
        
        // Use setTimeout to prevent navigation issues during render
        setTimeout(() => {
          router.push('/dashboard');
        }, 100);
      } catch (error: any) {
        const errorMessage = error.message || 'Login failed. Please check your credentials.';
        setState((prev) => ({ ...prev, loading: false, error: errorMessage }));
        toast.error('Login failed', { description: errorMessage });
        throw error;
      }
    },
    [router, setUser]
  );

  const register = useCallback(
    async (data: { name: string; username: string; email: string; password: string; password_confirm: string }) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        // Client-side validation
        if (data.password !== data.password_confirm) {
          throw new Error('Passwords do not match');
        }
        if (data.password.length < 8) {
          throw new Error('Password must be at least 8 characters long');
        }

        const response = await makeApiCall(() => 
          apiClient.register({
            username: data.username,
            email: data.email,
            full_name: data.name,
            password: data.password,
            password_confirm: data.password_confirm,
          })
        );

        tokenManager.setTokens(response.tokens);
        const sessionUser = mapApiUserToSessionUser(response.user);
        setUser(sessionUser, response.tokens.access);
        setState({
          user: response.user,
          loading: false,
          error: null,
          isAuthenticated: true,
        });
        toast.success('Account created successfully!');
        
        // Use setTimeout to prevent navigation issues during render
        setTimeout(() => {
          router.push('/dashboard');
        }, 100);
      } catch (error: any) {
        const errorMessage = error.message || 'Registration failed. Please try again.';
        setState((prev) => ({ ...prev, loading: false, error: errorMessage }));
        toast.error('Registration failed', { description: errorMessage });
        throw error;
      }
    },
    [router, setUser]
  );

  const logout = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }));
    try {
      await makeApiCall(() => apiClient.logout());
    } catch (error) {
      console.error('Logout error:', error);
    }
    tokenManager.clearTokens();
    clearUser();
    setState({
      user: null,
      loading: false,
      error: null,
      isAuthenticated: false,
    });
    toast.success('Logged out successfully');
    
    // Use setTimeout to prevent navigation issues during render
    setTimeout(() => {
      router.push('/login');
    }, 100);
  }, [router, clearUser]);

  const refreshUser = useCallback(async () => {
    if (!tokenManager.getAccessToken()) return;
    try {
      const response = await makeApiCall(() => apiClient.getCurrentUser());
      const sessionUser = mapApiUserToSessionUser(response.user);
      setUser(sessionUser, tokenManager.getAccessToken()!);
      setState((prev) => ({
        ...prev,
        user: response.user,
        isAuthenticated: true,
      }));
    } catch (error) {
      console.error('Failed to refresh user:', error);
      tokenManager.clearTokens();
      clearUser();
      setState((prev) => ({
        ...prev,
        user: null,
        isAuthenticated: false,
      }));
    }
  }, [setUser, clearUser]);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    login,
    register,
    logout,
    refreshUser,
    clearError,
  };
}