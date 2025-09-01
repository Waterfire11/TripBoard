<<<<<<< HEAD
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
=======
# boards/models.py
from django.db import models
from django.db.models import Max
from users.models import User

# Add these helper functions at the top of the file
def get_default_list():
    return []

def get_default_dict():
    return {}

class Board(models.Model):
    STATUS_CHOICES = [
        ('planning', 'Planning'),
        ('active', 'Active'),
        ('completed', 'Completed'),
    ]

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='boards')
    members = models.ManyToManyField(User, related_name='member_boards', blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='planning')
    budget = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    currency = models.CharField(max_length=3, default='USD')
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    is_favorite = models.BooleanField(default=False)
    tags = models.JSONField(default=get_default_list)  # Changed to callable
    cover_image = models.URLField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.owner not in self.members.all():
            self.members.add(self.owner)

    class Meta:
        db_table = 'boards'
        ordering = ['-created_at']


class List(models.Model):
    board = models.ForeignKey(Board, on_delete=models.CASCADE, related_name='lists')
    title = models.CharField(max_length=200)
    color = models.CharField(max_length=20, default='blue')
    position = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} ({self.board.title})"

    def save(self, *args, **kwargs):
        if not self.position:
            max_position = self.board.lists.aggregate(Max('position'))['position__max']
            self.position = (max_position or -1) + 1
        super().save(*args, **kwargs)

    class Meta:
        db_table = 'lists'
        ordering = ['position']


class Card(models.Model):
    CATEGORY_CHOICES = [
        ('flight', 'Flight'),
        ('hotel', 'Hotel'),
        ('food', 'Food'),
        ('activity', 'Activity'),
        ('romantic', 'Romantic'),
        ('family', 'Family'),
    ]

    list = models.ForeignKey(List, on_delete=models.CASCADE, related_name='cards')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    budget = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    people_number = models.PositiveIntegerField(default=1)
    tags = models.JSONField(default=get_default_list)  # Changed to callable
    due_date = models.DateField(null=True, blank=True)
    assigned_members = models.ManyToManyField(User, blank=True, related_name='assigned_cards')
    subtasks = models.JSONField(default=get_default_list)  # Changed to callable
    attachments = models.JSONField(default=get_default_list)  # Changed to callable
    location = models.JSONField(default=get_default_dict, null=True, blank=True)  # Changed to callable
    position = models.PositiveIntegerField(default=0)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} ({self.list.board.title})"

    def save(self, *args, **kwargs):
        if not self.position:
            max_position = self.list.cards.aggregate(Max('position'))['position__max']
            self.position = (max_position or -1) + 1
        super().save(*args, **kwargs)

    class Meta:
        db_table = 'cards'
        ordering = ['position', '-created_at']
>>>>>>> gitlab/tripboard-import
