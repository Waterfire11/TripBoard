from rest_framework import serializers
from .models import Expense
from users.serializers import UserSerializer


class ExpenseSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)

    class Meta:
        model = Expense
        fields = [
            'id', 'board', 'title', 'amount', 'category', 'date', 'notes',
            'created_by', 'created_at', 'updated_at', 'currency'
        ]
        read_only_fields = [
            'id', 'board', 'created_by', 'created_at', 'updated_at', 'currency'
        ]


class BudgetSummaryByCategorySerializer(serializers.Serializer):
    category = serializers.CharField()
    total = serializers.CharField()  # String representation of decimal amount


class BudgetSummarySerializer(serializers.Serializer):
    board_budget = serializers.CharField()
    actual_spend_total = serializers.CharField()
    remaining = serializers.CharField()
    by_category = BudgetSummaryByCategorySerializer(many=True)