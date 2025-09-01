from django.contrib import admin
from .models import Expense

@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ('title', 'board', 'amount', 'category', 'date', 'created_by', 'created_at')
    list_filter = ('board', 'category', 'date', 'created_by')
    search_fields = ('title', 'notes')