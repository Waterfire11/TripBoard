'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Calendar, CreditCard, CheckSquare, Users, TrendingUp, MapPin } from 'lucide-react';
import { useSession } from '@/store/useSession';
import { useGetBoards, Board, useInviteUser } from '@/features/boards/hooks';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react'; // FIXED: Added search bar

interface DashboardStats {
  totalBoards: number;
  activeTrips: number;
  totalBudget: number;
  completedTasks: number;
  upcomingTasks: number;
  totalMembers: number;
}

export default function DashboardPage() {
  const { user } = useSession();
  const { data: boards = [], isLoading, error } = useGetBoards();
  const inviteUserMutation = useInviteUser();
  
  // Initialize stats with useMemo to prevent object recreation
  const initialStats: DashboardStats = useMemo(() => ({
    totalBoards: 0,
    activeTrips: 0,
    totalBudget: 0,
    completedTasks: 0,
    upcomingTasks: 0,
    totalMembers: 0,
  }), []);

  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [recentBoards, setRecentBoards] = useState<Board[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<
    { id: number; title: string; board: string; dueDate: string }[]
  >([]);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [searchTerm, setSearchTerm] = useState(''); // FIXED: Added search

  // Helper function to extract first name from full name or use first_name
  const getFirstName = (userData: any) => {
    if (!userData) return 'User';
    // Prefer first_name if available, otherwise split full name
    return userData.first_name || (userData.name ? userData.name.split(' ')[0] : 'User');
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

  // Type guard to ensure board is valid
  const isValidBoard = (board: any): board is Board => {
    return board && 
           typeof board === 'object' && 
           'id' in board && 
           'title' in board && 
           'status' in board &&
           'created_at' in board;
  };

  // Show error toast only once when error changes
  useEffect(() => {
    if (error) {
      console.error('Dashboard data loading error:', error);
      toast.error('Failed to load dashboard data');
    }
  }, [error]); // Only depend on error

  // Calculate stats when boards data changes
  useEffect(() => {
    // Add safety checks to prevent crashes with invalid data
    if (!Array.isArray(boards)) {
      console.log('Boards data is not available or invalid:', boards);
      return;
    }

    // Filter to ensure we only work with valid boards
    const validBoards = boards.filter(isValidBoard);

    if (validBoards.length > 0) {
      try {
        const calculatedStats: DashboardStats = {
          totalBoards: validBoards.length,
          activeTrips: validBoards.filter((b) => b.status === 'active').length,
          totalBudget: validBoards.reduce((sum, b) => {
            const budget = parseFloat(b?.budget || '0');
            return sum + (isNaN(budget) ? 0 : budget);
          }, 0),
          completedTasks: validBoards.reduce(
            (sum, b) => {
              // Handle empty lists array properly
              if (!b.lists || !Array.isArray(b.lists) || b.lists.length === 0) return sum;
              return sum + b.lists.reduce(
                (s, l) => {
                  if (!l?.title || !l?.cards || !Array.isArray(l.cards)) return s;
                  return s + (l.title.toLowerCase().includes('completed') ? l.cards.length : 0);
                },
                0
              );
            },
            0
          ),
          upcomingTasks: validBoards.flatMap((b) => {
            // Handle empty lists array properly
            if (!b.lists || !Array.isArray(b.lists) || b.lists.length === 0) return [];
            return b.lists.flatMap((l) => {
              if (!l?.cards || !Array.isArray(l.cards)) return [];
              return l.cards.filter(
                (c) => c?.due_date && new Date(c.due_date) > new Date()
              );
            });
          }).length,
          totalMembers: Array.from(
            new Set(validBoards.flatMap((b) => {
              if (!b?.members || !Array.isArray(b.members)) return [];
              return b.members.map((m) => m?.id).filter(id => id != null);
            }))
          ).length,
        };
        
        setStats(calculatedStats);
        
        const sortedBoards = [...validBoards]
          .sort((a, b) => {
            const dateA = new Date(a.created_at).getTime();
            const dateB = new Date(b.created_at).getTime();
            return dateB - dateA;
          });
        
        setRecentBoards(sortedBoards.slice(0, 3));
        
        const tasks = validBoards
          .flatMap((b) => {
            // Handle empty lists array properly
            if (!b.lists || !Array.isArray(b.lists) || b.lists.length === 0 || !b.title) return [];
            return b.lists.flatMap((l) => {
              if (!l?.cards || !Array.isArray(l.cards)) return [];
              return l.cards
                .filter((c) => c?.due_date && c?.title && new Date(c.due_date) > new Date())
                .map((c) => ({
                  id: c.id,
                  title: c.title,
                  board: b.title,
                  dueDate: c.due_date!,
                }));
            });
          })
          .sort(
            (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
          )
          .slice(0, 3);
        
        setUpcomingTasks(tasks);
      } catch (statsError) {
        console.error('Error calculating dashboard stats:', statsError);
        toast.error('Error processing dashboard data');
        // Reset to initial state on error
        setStats(initialStats);
        setRecentBoards([]);
        setUpcomingTasks([]);
      }
    } else {
      // Reset stats when no boards - use the memoized initial stats
      setStats(initialStats);
      setRecentBoards([]);
      setUpcomingTasks([]);
    }
  }, [boards, initialStats]); // Include initialStats in dependencies

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'planning':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatCurrency = (amount: number) => {
    if (isNaN(amount) || amount === null || amount === undefined) {
      return '$0';
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'N/A';
    }
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

  // Filter recent boards by search (FIXED: Added search to dashboard)
  const filteredRecentBoards = recentBoards.filter((board) => {
    return !searchTerm || board.title?.toLowerCase().includes(searchTerm.toLowerCase()) || board.description?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Show error state if there's an error
  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        <div className="text-center py-12">
          <div className="bg-red-50 dark:bg-red-950 rounded-full p-6 w-24 h-24 mx-auto mb-4 flex items-center justify-center">
            <Calendar className="h-12 w-12 text-red-400 dark:text-red-500" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Unable to Load Dashboard</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            We're having trouble loading your dashboard data. Please try refreshing the page.
          </p>
          <div className="flex gap-4 justify-center">
            <Button onClick={() => window.location.reload()} variant="outline">
              Refresh Page
            </Button>
            <Link href="/boards?create=true">
              <Button className="inline-flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create Your First Board
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Welcome back, {getFirstName(user)}
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">Here's what's happening with your travel plans</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Link href="/boards?create=true">
            <Button className="inline-flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create New Board
            </Button>
          </Link>
        </div>
      </div>
      
      {/* Search Bar (FIXED: Added) */}
      <div className="relative">
        <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <Input
          placeholder="Search boards..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Boards</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">{stats.totalBoards}</p>
            </div>
            <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full">
              <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Active Trips</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">{stats.activeTrips}</p>
            </div>
            <div className="bg-green-100 dark:bg-green-900 p-3 rounded-full">
              <MapPin className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Budget</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">{formatCurrency(stats.totalBudget)}</p>
            </div>
            <div className="bg-yellow-100 dark:bg-yellow-900 p-3 rounded-full">
              <CreditCard className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Completed Tasks</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">{stats.completedTasks}</p>
            </div>
            <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-full">
              <CheckSquare className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Upcoming Tasks</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">{stats.upcomingTasks}</p>
            </div>
            <div className="bg-red-100 dark:bg-red-900 p-3 rounded-full">
              <TrendingUp className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Team Members</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">{stats.totalMembers}</p>
            </div>
            <div className="bg-indigo-100 dark:bg-indigo-900 p-3 rounded-full">
              <Users className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Boards */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Recent Boards</h2>
                <Link href="/boards" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium">
                  View all →
                </Link>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {filteredRecentBoards.length > 0 ? ( // FIXED: Use filtered
                filteredRecentBoards.map((board) => (
                  <Link key={board.id} href={`/boards/${board.id}`}>
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer bg-white dark:bg-gray-800">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{board.title || 'Untitled Board'}</h3>
                            <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(board.status || 'planning')}`}>
                              {board.status || 'planning'}
                            </span>
                          </div>
                          <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">{board.description || 'No description'}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                            <div className="flex items-center gap-1">
                              <CreditCard className="h-4 w-4" />
                              {formatCurrency(parseFloat(board.budget || '0'))}
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {board.members?.length || 0} members
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {formatDate(board.start_date)} - {formatDate(board.end_date)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{calculateProgress(board)}%</div>
                          <div className="w-16 bg-gray-200 dark:bg-gray-600 rounded-full h-2 mt-1">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{ width: `${calculateProgress(board)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-300 dark:text-gray-500 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400 mb-4">No boards yet</p>
                  <Link href="/boards?create=true">
                    <Button className="inline-flex items-center gap-2">
                      <Plus className="h-5 w-5" />
                      Create Your First Board
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Upcoming Tasks */}
        <div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Upcoming Tasks</h2>
            </div>
            <div className="p-6 space-y-4">
              {upcomingTasks.length > 0 ? (
                upcomingTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors bg-white dark:bg-gray-800"
                  >
                    <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full flex-shrink-0">
                      <CheckSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{task.title}</p>
                      <p className="text-gray-600 dark:text-gray-300 text-xs mt-1">{task.board}</p>
                      <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">Due {formatDate(task.dueDate)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <CheckSquare className="h-12 w-12 text-gray-300 dark:text-gray-500 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No upcoming tasks</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mt-6">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Quick Actions</h2>
            </div>
            <div className="p-6 space-y-3">
              <Link href="/boards?create=true">
                <Button variant="outline" className="w-full text-left flex items-center gap-3">
                  <Plus className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-gray-900 dark:text-gray-100">Create New Board</span>
                </Button>
              </Link>
              <Button 
                variant="outline" 
                className="w-full text-left flex items-center gap-3"
                onClick={() => setIsInviteModalOpen(true)}
              >
                <Users className="h-5 w-5 text-purple-600" />
                <span className="font-medium text-gray-900 dark:text-gray-100">Invite Team Members</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

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