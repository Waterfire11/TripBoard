from django.db import models
from boards.models import Board
from users.models import User

class Location(models.Model):
    board = models.ForeignKey(Board, on_delete=models.CASCADE, related_name='locations')
    name = models.CharField(max_length=200)
    lat = models.FloatField()
    lng = models.FloatField()
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_locations')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.board.title})"

    class Meta:
        db_table = 'locations'
        ordering = ['-created_at']