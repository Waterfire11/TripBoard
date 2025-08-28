import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tokenManager } from '../auth/hooks';
import { toast } from 'sonner';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://travel-kanban.onrender.com';

export const getHeaders = (token: string | null) => ({
  'Content-Type': 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

export const makeApiCall = async <T>(apiCall: () => Promise<Response>): Promise<T> => {
  try {
    const response = await apiCall();
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch (parseError) {
        console.warn('Failed to parse error response:', parseError);
      }
      const error = new Error(errorMessage);
      (error as any).status = response.status;
      throw error;
    }
    return await response.json();
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error. Please check your connection and try again.');
    }
    throw error;
  }
};

// --- Interfaces ---
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  created_at: string;
}

export interface Board {
  id: number;
  title: string;
  description: string | null;
  owner: User;
  members: User[];
  status: 'planning' | 'active' | 'completed';
  budget: string;
  currency: string;
  start_date: string | null;
  end_date: string | null;
  is_favorite: boolean;
  tags: string[];
  cover_image: string | null;
  lists: List[];
  created_at: string;
  updated_at: string;
}

export interface List {
  id: number;
  board: number;
  title: string;
  color: string;
  position: number;
  cards: Card[];
  created_at: string;
  updated_at: string;
}

export interface Card {
  id: number;
  list: number;
  title: string;
  description: string | null;
  budget: string;
  people_number: number;
  tags: string[];
  due_date: string | null;
  assigned_members: User[];
  subtasks: { title: string; completed: boolean }[];
  attachments: { name: string; size: string }[];
  location: { name: string; lat: number; lng: number } | null;
  position: number;
  created_at: string;
  updated_at: string;
  category?: string;
  expense_id?: number;
}

export interface Expense {
  id: number;
  board: number;
  title: string;
  amount: string;
  category: string;
  date: string | null;
  notes: string | null;
  created_by: User;
  created_at: string;
  updated_at: string;
  currency: string;
}

export interface BudgetSummary {
  board_budget: string;
  actual_spend_total: string;
  remaining: string;
  by_category: { category: string; total: string }[];
}

export interface Location {
  id: number;
  board: number;
  name: string;
  lat: number;
  lng: number;
  created_by: User;
  created_at: string;
  updated_at: string;
}

export interface InviteResponse {
  message: string;
}

// --- Boards ---
export const useGetBoards = () => {
  return useQuery<Board[]>({
    queryKey: ['boards'],
    queryFn: async () => {
      const token = tokenManager.getAccessToken();
      if (!token) {
        console.warn('No access token available for fetching boards');
        return [];
      }
      try {
        const response = await makeApiCall<PaginatedResponse<Board>>(() =>
          fetch(`${API_BASE_URL}/api/boards/`, {
            headers: getHeaders(token),
          })
        );
        return response.results || [];
      } catch (error: any) {
        if (error.status === 404) {
          return [];
        }
        throw error;
      }
    },
    placeholderData: [],
    retry: (failureCount, error: any) => {
      if (error?.status === 401 || error?.status === 403) {
        return false;
      }
      return failureCount < 2;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useGetBoard = (boardId: string | number) => {
  return useQuery<Board>({
    queryKey: ['board', boardId],
    queryFn: async () => {
      const token = tokenManager.getAccessToken();
      if (!token) {
        throw new Error('Authentication required');
      }
      return makeApiCall(() =>
        fetch(`${API_BASE_URL}/api/boards/${boardId}/`, {
          headers: getHeaders(token),
        })
      );
    },
    enabled: !!boardId && !!tokenManager.getAccessToken(),
    retry: (failureCount, error: any) => {
      if (error?.status === 401 || error?.status === 403 || error?.status === 404) {
        return false;
      }
      return failureCount < 2;
    },
  });
};

export const useCreateBoard = () => {
  const queryClient = useQueryClient();
  return useMutation<Board, Error, Partial<Board>>({
    mutationFn: async (data) => {
      const token = tokenManager.getAccessToken();
      if (!token) {
        throw new Error('Authentication required');
      }
      return makeApiCall(() =>
        fetch(`${API_BASE_URL}/api/boards/`, {
          method: 'POST',
          headers: getHeaders(token),
          body: JSON.stringify(data),
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      queryClient.refetchQueries({ queryKey: ['boards'] });
    },
    onError: (error) => {
      console.error('Failed to create board:', error);
    },
  });
};

export const useUpdateBoard = () => {
  const queryClient = useQueryClient();
  return useMutation<Board, Error, { boardId: string | number; data: Partial<Board> }>({
    mutationFn: async ({ boardId, data }) => {
      const token = tokenManager.getAccessToken();
      if (!token) {
        throw new Error('Authentication required');
      }
      return makeApiCall(() =>
        fetch(`${API_BASE_URL}/api/boards/${boardId}/`, {
          method: 'PATCH',
          headers: getHeaders(token),
          body: JSON.stringify(data),
        })
      );
    },
    onSuccess: (updatedBoard, { boardId }) => {
      queryClient.setQueryData(['board', boardId], updatedBoard);
      queryClient.invalidateQueries({ queryKey: ['boards'] });
    },
    onError: (error) => {
      console.error('Failed to update board:', error);
    },
  });
};

export const useDeleteBoard = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string | number>({
    mutationFn: async (boardId) => {
      const token = tokenManager.getAccessToken();
      if (!token) {
        throw new Error('Authentication required');
      }
      return makeApiCall(() =>
        fetch(`${API_BASE_URL}/api/boards/${boardId}/`, {
          method: 'DELETE',
          headers: getHeaders(token),
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] });
    },
    onError: (error) => {
      console.error('Failed to delete board:', error);
    },
  });
};

// --- Lists ---
export const useCreateList = (boardId: string | number) => {
  const queryClient = useQueryClient();
  return useMutation<List, Error, Partial<List>>({
    mutationFn: async (data) => {
      const token = tokenManager.getAccessToken();
      if (!token) {
        throw new Error('Authentication required');
      }
      return makeApiCall(() =>
        fetch(`${API_BASE_URL}/api/boards/${boardId}/lists/`, {
          method: 'POST',
          headers: getHeaders(token),
          body: JSON.stringify(data),
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    },
  });
};

export const useUpdateList = (boardId: string | number) => {
  const queryClient = useQueryClient();
  return useMutation<List, Error, { listId: string | number; data: Partial<List> }>({
    mutationFn: async ({ listId, data }) => {
      const token = tokenManager.getAccessToken();
      if (!token) {
        throw new Error('Authentication required');
      }
      return makeApiCall(() =>
        fetch(`${API_BASE_URL}/api/boards/${boardId}/lists/${listId}/`, {
          method: 'PATCH',
          headers: getHeaders(token),
          body: JSON.stringify(data),
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    },
  });
};

export const useDeleteList = (boardId: string | number) => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string | number>({
    mutationFn: async (listId) => {
      const token = tokenManager.getAccessToken();
      if (!token) {
        throw new Error('Authentication required');
      }
      return makeApiCall(() =>
        fetch(`${API_BASE_URL}/api/boards/${boardId}/lists/${listId}/`, {
          method: 'DELETE',
          headers: getHeaders(token),
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    },
  });
};

// --- Cards ---
const mapCardCategoryToExpense = (cardCategory?: string): string => {
  if (!cardCategory) return 'misc';
  const map: { [key: string]: string } = {
    flight: 'travel',
    hotel: 'lodging',
    food: 'food',
    activity: 'activities',
    romantic: 'misc',
    family: 'misc',
  };
  return map[cardCategory.toLowerCase()] || 'misc';
};

export const useCreateCard = (boardId: string | number, listId: string | number) => {
  const queryClient = useQueryClient();
  const { mutate: createExpense } = useCreateExpense(boardId);
  return useMutation<Card, Error, Partial<Card>>({
    mutationFn: async (data) => {
      const token = tokenManager.getAccessToken();
      if (!token) {
        throw new Error('Authentication required');
      }
      return makeApiCall(() =>
        fetch(`${API_BASE_URL}/api/boards/${boardId}/lists/${listId}/cards/`, {
          method: 'POST',
          headers: getHeaders(token),
          body: JSON.stringify(data),
        })
      );
    },
    onSuccess: (newCard) => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
      if (newCard.budget && parseFloat(newCard.budget) > 0 && newCard.category) {
        createExpense({
          title: newCard.title,
          amount: newCard.budget,  // Raw
          category: mapCardCategoryToExpense(newCard.category),
          notes: `From card ID ${newCard.id}`,
        }, {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['board', boardId, 'budget-summary'] });
            queryClient.invalidateQueries({ queryKey: ['board', boardId, 'expenses'] });
          }
        });
      }
    },
  });
};

export const useUpdateCard = (boardId: string | number, listId: string | number) => {
  const queryClient = useQueryClient();
  const { mutate: updateExpense } = useUpdateExpense();
  return useMutation<Card, Error, { cardId: string | number; data: Partial<Card> }>({
    mutationFn: async ({ cardId, data }) => {
      const token = tokenManager.getAccessToken();
      if (!token) {
        throw new Error('Authentication required');
      }
      return makeApiCall(() =>
        fetch(`${API_BASE_URL}/api/boards/${boardId}/lists/${listId}/cards/${cardId}/`, {
          method: 'PATCH',
          headers: getHeaders(token),
          body: JSON.stringify(data),
        })
      );
    },
    onSuccess: (updatedCard, { cardId }) => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
      if (updatedCard.budget && parseFloat(updatedCard.budget) > 0 && updatedCard.category) {
        const expenseData = {
          title: updatedCard.title,
          amount: updatedCard.budget,  // Raw
          category: mapCardCategoryToExpense(updatedCard.category),
          notes: `From card ID ${updatedCard.id}`,
        };
        updateExpense({
          expenseId: updatedCard.expense_id || 0,  // Assume expense_id
          data: expenseData,
          boardId,
        }, {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['board', boardId, 'budget-summary'] });
            queryClient.invalidateQueries({ queryKey: ['board', boardId, 'expenses'] });
          }
        });
      }
    },
  });
};

export const useDeleteCard = (boardId: string | number, listId: string | number) => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string | number>({
    mutationFn: async (cardId) => {
      const token = tokenManager.getAccessToken();
      if (!token) {
        throw new Error('Authentication required');
      }
      return makeApiCall(() =>
        fetch(`${API_BASE_URL}/api/boards/${boardId}/lists/${listId}/cards/${cardId}/`, {
          method: 'DELETE',
          headers: getHeaders(token),
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
      queryClient.invalidateQueries({ queryKey: ['board', boardId, 'expenses'] });
      queryClient.invalidateQueries({ queryKey: ['board', boardId, 'budget-summary'] });
    },
  });
};

export const useMoveCard = () => {
  const queryClient = useQueryClient();
  return useMutation<Card, Error, { cardId: number; new_list_id?: number; new_position: number; boardId: number }>({
    mutationFn: async ({ cardId, new_list_id, new_position }) => {
      const token = tokenManager.getAccessToken();
      if (!token) {
        throw new Error('Authentication required');
      }
      return makeApiCall(() =>
        fetch(`${API_BASE_URL}/api/boards/cards/${cardId}/move/`, {
          method: 'PATCH',
          headers: getHeaders(token),
          body: JSON.stringify({ new_list_id, new_position }),
        })
      );
    },
    onSuccess: (_, { boardId }) => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
      queryClient.invalidateQueries({ queryKey: ['board', boardId, 'budget-summary'] });
    },
  });
};

// --- Budget & Expenses ---
export const useBoardBudgetSummary = (boardId: string | number) => {
  return useQuery<BudgetSummary>({
    queryKey: ['board', boardId, 'budget-summary'],
    queryFn: async () => {
      const token = tokenManager.getAccessToken();
      if (!token) {
        throw new Error('Authentication required');
      }
      try {
        return makeApiCall<BudgetSummary>(() =>
          fetch(`${API_BASE_URL}/api/budget/boards/${boardId}/budget/summary/`, {
            headers: getHeaders(token),
          })
        );
      } catch (error: any) {
        if (error.status === 404) {
          console.warn('Budget summary endpoint not available');
          return {
            board_budget: '0',
            actual_spend_total: '0',
            remaining: '0',
            by_category: [],
          };
        }
        throw error;
      }
    },
    enabled: !!boardId && !!tokenManager.getAccessToken(),
  });
};

export const useExpenses = (
  boardId: string | number,
  filters?: { category?: string; date_from?: string; date_to?: string }
) => {
  const queryParams = new URLSearchParams();
  if (filters?.category) queryParams.append('category', filters.category);
  if (filters?.date_from) queryParams.append('date_from', filters.date_from);
  if (filters?.date_to) queryParams.append('date_to', filters.date_to);
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
  return useQuery<Expense[]>({
    queryKey: ['board', boardId, 'expenses', filters || {}],
    queryFn: async () => {
      const token = tokenManager.getAccessToken();
      if (!token) {
        throw new Error('Authentication required');
      }
      try {
        const response = await makeApiCall<Expense[] | PaginatedResponse<Expense>>(() =>
          fetch(`${API_BASE_URL}/api/budget/boards/${boardId}/expenses/${queryString}`, {
            headers: getHeaders(token),
          })
        );
        if (Array.isArray(response)) {
          return response;
        } else if (response && 'results' in response) {
          return response.results || [];
        } else {
          return [];
        }
      } catch (error: any) {
        if (error.status === 404) {
          return [];
        }
        throw error;
      }
    },
    enabled: !!boardId && !!tokenManager.getAccessToken(),
    placeholderData: [],
    retry: (failureCount, error: any) => {
      if (error?.status === 401 || error?.status === 403) {
        return false;
      }
      return failureCount < 2;
    },
  });
};

export const useCreateExpense = (boardId: string | number) => {
  const queryClient = useQueryClient();
  return useMutation<Expense, Error, Partial<Expense>>({
    mutationFn: async (data) => {
      const token = tokenManager.getAccessToken();
      if (!token) {
        throw new Error('Authentication required');
      }
      return makeApiCall(() =>
        fetch(`${API_BASE_URL}/api/budget/boards/${boardId}/expenses/`, {
          method: 'POST',
          headers: getHeaders(token),
          body: JSON.stringify(data),
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId, 'expenses'] });
      queryClient.invalidateQueries({ queryKey: ['board', boardId, 'budget-summary'] });
    },
  });
};

export const useUpdateExpense = () => {
  const queryClient = useQueryClient();
  return useMutation<Expense, Error, { expenseId: number; data: Partial<Expense>; boardId: string | number }>({
    mutationFn: async ({ expenseId, data }) => {
      const token = tokenManager.getAccessToken();
      if (!token) {
        throw new Error('Authentication required');
      }
      return makeApiCall(() =>
        fetch(`${API_BASE_URL}/api/budget/expenses/${expenseId}/`, {
          method: 'PATCH',
          headers: getHeaders(token),
          body: JSON.stringify(data),
        })
      );
    },
    onSuccess: (_, { boardId }) => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId, 'expenses'] });
      queryClient.invalidateQueries({ queryKey: ['board', boardId, 'budget-summary'] });
    },
  });
};

export const useDeleteExpense = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { expenseId: number; boardId: string | number }>({
    mutationFn: async ({ expenseId }) => {
      const token = tokenManager.getAccessToken();
      if (!token) {
        throw new Error('Authentication required');
      }
      return makeApiCall(() =>
        fetch(`${API_BASE_URL}/api/budget/expenses/${expenseId}/`, {
          method: 'DELETE',
          headers: getHeaders(token),
        })
      );
    },
    onSuccess: (_, { boardId }) => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId, 'expenses'] });
      queryClient.invalidateQueries({ queryKey: ['board', boardId, 'budget-summary'] });
    },
  });
};

// --- Locations ---
export const useGetLocations = (boardId: string | number) => {
  return useQuery<Location[]>({
    queryKey: ['board', boardId, 'locations'],
    queryFn: async () => {
      const token = tokenManager.getAccessToken();
      if (!token) {
        throw new Error('Authentication required');
      }
      try {
        const response = await makeApiCall<Location[] | PaginatedResponse<Location>>(() =>
          fetch(`${API_BASE_URL}/api/maps/boards/${boardId}/locations/`, {
            headers: getHeaders(token),
          })
        );
        if (Array.isArray(response)) {
          return response;
        } else if (response && 'results' in response) {
          return response.results || [];
        } else {
          return [];
        }
      } catch (error: any) {
        if (error.status === 404) {
          return [];
        }
        throw error;
      }
    },
    enabled: !!boardId && !!tokenManager.getAccessToken(),
    placeholderData: [],
    retry: (failureCount, error: any) => {
      if (error?.status === 401 || error?.status === 403) {
        return false;
      }
      return failureCount < 2;
    },
  });
};

export const useCreateLocation = (boardId: string | number) => {
  const queryClient = useQueryClient();
  return useMutation<Location, Error, Partial<Location>>({
    mutationFn: async (data) => {
      const token = tokenManager.getAccessToken();
      if (!token) {
        throw new Error('Authentication required');
      }
      return makeApiCall(() =>
        fetch(`${API_BASE_URL}/api/maps/boards/${boardId}/locations/`, {
          method: 'POST',
          headers: getHeaders(token),
          body: JSON.stringify(data),
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId, 'locations'] });
    },
  });
};

export const useUpdateLocation = () => {
  const queryClient = useQueryClient();
  return useMutation<Location, Error, { locationId: number; data: Partial<Location>; boardId: string | number }>({
    mutationFn: async ({ locationId, data }) => {
      const token = tokenManager.getAccessToken();
      if (!token) {
        throw new Error('Authentication required');
      }
      return makeApiCall(() =>
        fetch(`${API_BASE_URL}/api/maps/locations/${locationId}/`, {
          method: 'PATCH',
          headers: getHeaders(token),
          body: JSON.stringify(data),
        })
      );
    },
    onSuccess: (_, { boardId }) => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId, 'locations'] });
    },
  });
};

export const useDeleteLocation = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { locationId: number; boardId: string | number }>({
    mutationFn: async ({ locationId }) => {
      const token = tokenManager.getAccessToken();
      if (!token) {
        throw new Error('Authentication required');
      }
      return makeApiCall(() =>
        fetch(`${API_BASE_URL}/api/maps/locations/${locationId}/`, {
          method: 'DELETE',
          headers: getHeaders(token),
        })
      );
    },
    onSuccess: (_, { boardId }) => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId, 'locations'] });
    },
  });
};

// --- Invites ---
export const useInviteUser = () => {
  const queryClient = useQueryClient();
  return useMutation<InviteResponse, Error, { email: string }>({
    mutationFn: async ({ email }) => {
      const token = tokenManager.getAccessToken();
      if (!token) {
        throw new Error('Authentication required');
      }
      return makeApiCall(() =>
        fetch(`${API_BASE_URL}/api/auth/invite/`, {
          method: 'POST',
          headers: getHeaders(token),
          body: JSON.stringify({ email }),
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] });
    },
    onError: (error) => {
      console.error('Failed to invite user:', error);
    },
  });
};
