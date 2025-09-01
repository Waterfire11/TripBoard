'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Search, Calendar, CreditCard, Users, MapPin, Star, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import Image from 'next/image';
import { useGetBoards, useCreateBoard, useUpdateBoard, Board, useInviteUser } from '@/features/boards/hooks';

// Updated schema with stricter URL validation
const boardSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().transform((val) => (val.trim() === '' ? null : val)).nullable(),
  start_date: z.string().min(1, 'Start date is required').regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  end_date: z.string().min(1, 'End date is required').regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  budget: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Must be a valid amount (e.g., 5000.00)')
    .transform((val) => (val === '' ? '0.00' : val)),
  currency: z
    .string()
    .length(3, 'Currency must be a 3-letter code (e.g., USD)')
    .transform((val) => val?.trim().toUpperCase() || 'USD'),
  cover_image: z
    .string()
    .url({ message: 'Must be a valid URL (e.g., https://example.com/image.jpg)' })
    .transform((val) => (val.trim() === '' ? null : val))
    .nullable(),
});

type BoardFormData = z.infer<typeof boardSchema>;
type FilterType = 'all' | 'active' | 'planning' | 'completed';
type SortType = 'recent' | 'title' | 'budget' | 'date';

export default function BoardsPage() {
  const { data: boards = [], isLoading, error: fetchError } = useGetBoards();
  const { mutate: updateBoard } = useUpdateBoard();
  const { mutate: createBoard, isPending: isCreating } = useCreateBoard();
  const inviteUserMutation = useInviteUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('recent');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const searchParams = useSearchParams();
  const router = useRouter();

  // Handle query param for modal
  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setIsCreateModalOpen(true);
    }
  }, [searchParams]);

  // Close modal and clean URL
  const closeModal = () => {
    setIsCreateModalOpen(false);
    router.replace('/boards');
  };

  // Handle invite submission
  const handleInviteSubmit = () => {
    if (!inviteEmail.trim()) {
      toast.error('Please enter a valid email address');
      return;
    }
    inviteUserMutation.mutate({ email: inviteEmail.trim() }, {
      onSuccess: () => {
        toast.success('Invitation sent successfully!');
        setInviteEmail('');
        setIsInviteModalOpen(false);
      },
      onError: (err) => {
        toast.error(err.message || 'Failed to send invitation');
      },
    });
  };

  // Form setup
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BoardFormData>({
    resolver: zodResolver(boardSchema),
    defaultValues: {
      title: '',
      description: '',
      start_date: '',
      end_date: '',
      budget: '0.00',
      currency: 'USD',
      cover_image: '',
    },
  });

  // Submit handler
  const onSubmit = (data: BoardFormData) => {
    createBoard(
      {
        title: data.title,
        description: data.description,
        start_date: data.start_date,
        end_date: data.end_date,
        budget: data.budget,
        currency: data.currency,
        cover_image: data.cover_image,
      },
      {
        onSuccess: (newBoard) => {
          toast.success('Board created!', {
            description: `${data.title} has been created.`,
          });
          closeModal();
          reset();
        },
        onError: (error: any) => {
          let errorMessage = 'Failed to create board';
          if (error.response?.data) {
            const errors = error.response.data;
            if (errors.end_date) {
              errorMessage = errors.end_date[0] || 'Invalid end date';
            } else if (errors.start_date) {
              errorMessage = errors.start_date[0] || 'Invalid start date';
            } else if (errors.cover_image) {
              errorMessage = errors.cover_image[0] || 'Invalid cover image URL';
            } else {
              errorMessage = error.message || 'Please check your input and try again';
            }
          }
          toast.error(errorMessage);
        },
      }
    );
  };

  // Type guard to ensure board is valid
  const isValidBoard = (board: any): board is Board => {
    return board &&
           typeof board === 'object' &&
           'id' in board &&
           'title' in board &&
           'status' in board;
  };

  // Safely filter and sort boards
  const filteredBoards = Array.isArray(boards)
    ? boards
        .filter(isValidBoard)
        .filter((board) => {
          const matchesSearch =
            !searchTerm ||
            (board.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              board.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              (Array.isArray(board.tags) &&
                board.tags.some((tag) => tag?.toLowerCase().includes(searchTerm.toLowerCase()))));
          const matchesStatus =
            statusFilter === 'all' || board.status === statusFilter;
          return matchesSearch && matchesStatus;
        })
        .sort((a, b) => {
          switch (sortBy) {
            case 'title':
              return (a.title || '').localeCompare(b.title || '');
            case 'budget':
              return (parseFloat(b.budget || '0') || 0) - (parseFloat(a.budget || '0') || 0);
            case 'date':
              const dateA = a.start_date ? new Date(a.start_date).getTime() : Infinity;
              const dateB = b.start_date ? new Date(b.start_date).getTime() : Infinity;
              return dateA - dateB;
            case 'recent':
            default:
              const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
              const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
              return timeB - timeA;
          }
        })
    : [];

  // Status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'planning':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-gray-100 text-gray-600 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const formatCurrency = (amount: string, currency: string = 'USD') => {
    const num = parseFloat(amount || '0');
    return isNaN(num)
      ? '$0.00'
      : new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency,
          minimumFractionDigits: 2,
        }).format(num);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const toggleFavorite = (boardId: number, current: boolean) => {
    updateBoard(
      { boardId, data: { is_favorite: !current } },
      {
        onError: () => toast.error('Failed to update favorite'),
      }
    );
  };

  const calculateProgress = (board: Board) => {
    if (!board.lists || !Array.isArray(board.lists) || board.lists.length === 0) {
      return 0;
    }

    const total = board.lists.reduce(
      (sum: number, list: any) => {
        if (!list || !list.cards || !Array.isArray(list.cards)) return sum;
        return sum + list.cards.length;
      },
      0
    );

    if (total === 0) return 0;

    const completed = board.lists
      .filter((list: any) => list?.title?.toLowerCase().includes('completed'))
      .reduce(
        (sum: number, list: any) => {
          if (!list || !list.cards || !Array.isArray(list.cards)) return sum;
          return sum + list.cards.length;
        },
        0
      );

    return Math.round((completed / total) * 100);
  };

  const getTasksCount = (board: Board) => {
    if (!board.lists || !Array.isArray(board.lists) || board.lists.length === 0) {
      return { planning: 0, booked: 0, completed: 0 };
    }

    return board.lists.reduce(
      (acc: any, list: any) => {
        if (!list || !list.title || !list.cards || !Array.isArray(list.cards)) return acc;
        const key = list.title.toLowerCase();
        if (key.includes('planning')) acc.planning += list.cards.length;
        else if (key.includes('booked')) acc.booked += list.cards.length;
        else if (key.includes('completed')) acc.completed += list.cards.length;
        return acc;
      },
      { planning: 0, booked: 0, completed: 0 }
    );
  };

  const getTotalTasks = (tasks: ReturnType<typeof getTasksCount>) => {
    return tasks.planning + tasks.booked + tasks.completed;
  };

  // Validate image URL
  const isValidCoverImage = (url: string | null) => {
    if (!url || !url.startsWith('http')) return false;
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  };

  // Show error
  if (fetchError) {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900">Failed to Load Boards</h3>
          <p className="text-gray-600 mt-2">{fetchError.message || 'An error occurred.'}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Travel Boards</h1>
          <p className="text-gray-600 mt-1">Manage your travel plans and organize your trips</p>
        </div>
        <div className="flex gap-4 mt-4 sm:mt-0">
          <Button
            onClick={() => router.push('/boards?create=true')}
            className="inline-flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Create New Board
          </Button>
          <Button
            onClick={() => setIsInviteModalOpen(true)}
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700"
          >
            <Users className="h-5 w-5" />
            Invite Team Members
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex-1 relative">
            <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              placeholder="Search boards, descriptions, or tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white text-gray-900 shadow-sm"
            />
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as FilterType)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortType)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Most Recent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="title">Title A-Z</SelectItem>
                <SelectItem value="budget">Highest Budget</SelectItem>
                <SelectItem value="date">Trip Date</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>Showing {filteredBoards.length} of {Array.isArray(boards) ? boards.length : 0} boards</span>
        {(searchTerm || statusFilter !== 'all') && (
          <button
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
            }}
            className="text-blue-600 hover:text-blue-700"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Boards Grid */}
      {filteredBoards.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredBoards.map((board) => (
            <Link key={board.id} href={`/boards/${board.id}`} className="block">
              <div className="bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer group">
                {board.cover_image && isValidCoverImage(board.cover_image) ? (
                  <div className="h-48 overflow-hidden rounded-t-lg">
                    <Image
                      src={board.cover_image}
                      alt={board.title || 'Cover'}
                      width={400}
                      height={200}
                      className="object-cover w-full h-full"
                      onError={(e) => {
                        e.currentTarget.src = '/placeholder-image.jpg';
                      }}
                    />
                  </div>
                ) : (
                  <div className="h-48 bg-gray-200 rounded-t-lg flex items-center justify-center">
                    <span className="text-gray-500">No image</span>
                  </div>
                )}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(board.status || 'planning')}`}>
                      {board.status || 'Planning'}
                    </span>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleFavorite(board.id, !!board.is_favorite);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded"
                    >
                      <Star
                        className={`h-4 w-4 ${board.is_favorite ? 'text-yellow-400 fill-current' : 'text-gray-400'}`}
                      />
                    </button>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2 line-clamp-1">
                    {board.title || 'Untitled Board'}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {board.description || 'No description'}
                  </p>
                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mb-4">
                    {Array.isArray(board.tags) &&
                      board.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    {Array.isArray(board.tags) && board.tags.length > 3 && (
                      <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full">
                        +{board.tags.length - 3}
                      </span>
                    )}
                  </div>
                  {/* Progress */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600">Progress</span>
                      <span className="font-medium text-gray-900">{calculateProgress(board)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${calculateProgress(board)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <CreditCard className="h-4 w-4" />
                      <span className="font-medium">
                        {formatCurrency(board.budget || '0', board.currency || 'USD')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Users className="h-4 w-4" />
                      <span>{board.members?.length || 0} member{(board.members?.length || 0) !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(board.start_date)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span>{getTotalTasks(getTasksCount(board))} tasks</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}

          {/* Create New Board Card */}
          <div
            onClick={() => router.push('/boards?create=true')}
            className="bg-white rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer group h-full min-h-[300px] flex flex-col items-center justify-center p-8"
          >
            <div className="bg-blue-50 group-hover:bg-blue-100 p-4 rounded-full mb-4 transition-colors">
              <Plus className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Create New Board</h3>
            <p className="text-gray-600 text-center text-sm">
              Start planning your next adventure
            </p>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900">No Boards Found</h3>
          <p className="text-gray-600 mb-6">
            {searchTerm || statusFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Create your first travel board to get started!'}
          </p>
          <Button onClick={() => router.push('/boards?create=true')} className="inline-flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create New Board
          </Button>
        </div>
      )}

      {/* Create Board Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={closeModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Travel Board</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Title
              </label>
              <Input
                id="title"
                {...register('title')}
                placeholder="e.g., Bali Trip 2025"
                className={errors.title ? 'border-red-500' : ''}
              />
              {errors.title && (
                <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Tell us about your trip..."
                className={errors.description ? 'border-red-500' : ''}
              />
              {errors.description && (
                <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="start_date" className="block text-sm font-medium text-gray-700">
                Start Date
              </label>
              <Input
                id="start_date"
                type="date"
                {...register('start_date')}
                className={errors.start_date ? 'border-red-500' : ''}
              />
              {errors.start_date && (
                <p className="text-red-500 text-sm mt-1">{errors.start_date.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="end_date" className="block text-sm font-medium text-gray-700">
                End Date
              </label>
              <Input
                id="end_date"
                type="date"
                {...register('end_date')}
                className={errors.end_date ? 'border-red-500' : ''}
              />
              {errors.end_date && (
                <p className="text-red-500 text-sm mt-1">{errors.end_date.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="budget" className="block text-sm font-medium text-gray-700">
                  Budget
                </label>
                <Input
                  id="budget"
                  {...register('budget')}
                  placeholder="e.g., 3000.00"
                  type="text"
                  className={errors.budget ? 'border-red-500' : ''}
                />
                {errors.budget && (
                  <p className="text-red-500 text-sm mt-1">{errors.budget.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="currency" className="block text-sm font-medium text-gray-700">
                  Currency
                </label>
                <Input
                  id="currency"
                  {...register('currency')}
                  placeholder="e.g., USD"
                  className={errors.currency ? 'border-red-500' : ''}
                />
                {errors.currency && (
                  <p className="text-red-500 text-sm mt-1">{errors.currency.message}</p>
                )}
              </div>
            </div>
            <div>
              <label htmlFor="cover_image" className="block text-sm font-medium text-gray-700">
                Cover Image URL (optional)
              </label>
              <Input
                id="cover_image"
                {...register('cover_image')}
                placeholder="e.g., https://example.com/image.jpg"
                className={errors.cover_image ? 'border-red-500' : ''}
              />
              {errors.cover_image && (
                <p className="text-red-500 text-sm mt-1">{errors.cover_image.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Board'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Invite Team Members Modal */}
      <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Enter email address"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setIsInviteModalOpen(false); setInviteEmail(''); }}>
                Cancel
              </Button>
              <Button
                onClick={handleInviteSubmit}
                disabled={inviteUserMutation.isPending || !inviteEmail.trim()}
              >
                {inviteUserMutation.isPending ? 'Sending...' : 'Send Invite'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
