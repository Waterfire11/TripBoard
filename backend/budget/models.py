from django.db import models
from boards.models import Board
from users.models import User
from django.utils import timezone 

CATEGORY_CHOICES = [
    ('travel', 'Travel/Flight'),
    ('lodging', 'Lodging'),
    ('food', 'Food'),
    ('activities', 'Activities'),
    ('fees', 'Fees'),
    ('misc', 'Misc'),
]

class Expense(models.Model):
    board = models.ForeignKey(Board, on_delete=models.CASCADE, related_name='expenses')
    title = models.CharField(max_length=200)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_expenses')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    currency = models.CharField(max_length=3)

    def __str__(self):
        return f"{self.title} ({self.board.title})"

    def save(self, *args, **kwargs):
        if not self.date:
            self.date = timezone.now().date()  # Fixed: Use date instead of datetime
        if not self.currency:
            self.currency = self.board.currency
        super().save(*args, **kwargs)

    class Meta:
        db_table = 'expenses'
        ordering = ['-created_at']