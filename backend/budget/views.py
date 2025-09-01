from rest_framework import generics, permissions
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Sum
from decimal import Decimal
from .models import Expense
from .serializers import ExpenseSerializer, BudgetSummarySerializer
from boards.models import Board
from boards.permissions import IsBoardOwnerOrMember


class ExpenseListCreateView(generics.ListCreateAPIView):
    serializer_class = ExpenseSerializer
    permission_classes = [permissions.IsAuthenticated, IsBoardOwnerOrMember]

    def get_queryset(self):
        board = get_object_or_404(Board, pk=self.kwargs['board_id'])
        self.check_object_permissions(self.request, board)
        queryset = Expense.objects.filter(board=board)

        # Apply filters
        category = self.request.query_params.get('category')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')

        if category:
            queryset = queryset.filter(category=category)
        if date_from:
            queryset = queryset.filter(date__gte=date_from)
        if date_to:
            queryset = queryset.filter(date__lte=date_to)
        if date_from and date_to and date_from > date_to:
            raise ValidationError("date_from must be before or equal to date_to")

        return queryset

    def perform_create(self, serializer):
        board = get_object_or_404(Board, pk=self.kwargs['board_id'])
        self.check_object_permissions(self.request, board)
        serializer.save(
            board=board,
            created_by=self.request.user,
            currency=board.currency
        )

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['board'] = get_object_or_404(Board, pk=self.kwargs['board_id'])
        return context


class ExpenseDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ExpenseSerializer
    permission_classes = [permissions.IsAuthenticated, IsBoardOwnerOrMember]

    def get_queryset(self):
        return Expense.objects.all()

    def get_object(self):
        obj = get_object_or_404(Expense, pk=self.kwargs['pk'])
        self.check_object_permissions(self.request, obj)
        return obj

    def perform_update(self, serializer):
        board = serializer.instance.board
        if 'currency' in serializer.validated_data and serializer.validated_data['currency'] != board.currency:
            raise ValidationError("Currency must match the board's currency.")
        serializer.save()

    def get_serializer_context(self):
        context = super().get_serializer_context()
        if self.get_object():
            context['board'] = self.get_object().board
        return context


class BoardBudgetSummaryView(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated, IsBoardOwnerOrMember]
    serializer_class = BudgetSummarySerializer

    def get_object(self):
        board = get_object_or_404(Board, pk=self.kwargs['board_id'])
        self.check_object_permissions(self.request, board)
        return board

    def retrieve(self, request, *args, **kwargs):
        board = self.get_object()
        expenses = board.expenses.all()

        # Aggregate total spending
        total_result = expenses.aggregate(total=Sum('amount'))
        actual_spend_total = total_result['total'] or Decimal('0.00')

        # Calculate remaining budget
        remaining = board.budget - actual_spend_total
        if remaining < Decimal('0.00'):
            remaining = Decimal('0.00')

        # Group by category
        by_category = expenses.values('category').annotate(total=Sum('amount')).order_by('category')
        by_category_list = [
            {
                'category': item['category'],
                'total': str(item['total']) if item['total'] else '0.00'
            }
            for item in by_category
        ]

        # Prepare data for serialization
        summary_data = {
            'board_budget': str(board.budget),
            'actual_spend_total': str(actual_spend_total),
            'remaining': str(remaining),
            'by_category': by_category_list,
        }

        serializer = self.get_serializer(summary_data)
        return Response(serializer.data)