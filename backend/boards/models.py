import uuid
from django.db import models
from django.conf import settings

class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        abstract = True

class Board(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="boards")
    share_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    is_shared_readonly = models.BooleanField(default=False)

    def __str__(self): return self.title

    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)

    def role_of(self, user):
        m = self.members.filter(user=user).first()
        return m.role if m else None


class List(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    board = models.ForeignKey(Board, on_delete=models.CASCADE, related_name="lists")
    title = models.CharField(max_length=100)
    position = models.IntegerField(default=0)  # 可拖拽排序（Must have）

    class Meta:
        ordering = ("position", "created_at", "id")  # 兜底保证稳定

        indexes = [models.Index(fields=["board", "position"]),]

class Card(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    list = models.ForeignKey(List, on_delete=models.CASCADE, related_name="cards")
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    position = models.PositiveIntegerField(default=0)  # 可拖拽排序（Must have）
    due_date = models.DateField(null=True, blank=True)
    budget = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    people = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ("position", "created_at")
        indexes = [models.Index(fields=["list", "position"])]

class BoardMember(models.Model):
    ROLE_VIEWER = "viewer"
    ROLE_EDITOR = "editor"
    ROLE_CHOICES = (
        (ROLE_VIEWER, "Viewer"),
        (ROLE_EDITOR, "Editor"),
    )

    board = models.ForeignKey("Board", related_name="members", on_delete=models.CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="board_memberships", on_delete=models.CASCADE)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default=ROLE_VIEWER)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("board", "user")   # 一个用户在同一看板只出现一次