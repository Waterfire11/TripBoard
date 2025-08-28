from django.urls import path
from . import views

urlpatterns = [
    # Expenses for a board
    path('boards/<int:board_id>/expenses/', views.ExpenseListCreateView.as_view(), name='board-expenses'),
    
    # Expense detail (global, not nested under board)
    path('expenses/<int:pk>/', views.ExpenseDetailView.as_view(), name='expense-detail'),
    
    # Budget summary for a board
    path('boards/<int:board_id>/budget/summary/', views.BoardBudgetSummaryView.as_view(), name='board-budget-summary'),
]