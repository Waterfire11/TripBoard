# boards/serializers.py
from rest_framework import serializers
from .models import Board, List, Card
from users.serializers import UserSerializer
from django.utils import timezone
from datetime import datetime

class CardMoveSerializer(serializers.Serializer):
    """Serializer for moving cards between lists or reordering within lists"""
    new_list_id = serializers.IntegerField(required=False, help_text="ID of the target list (optional if reordering within same list)")
    new_position = serializers.IntegerField(help_text="New position in the target list (0-based index)")

    def validate_new_position(self, value):
        if value < 0:
            raise serializers.ValidationError("Position must be non-negative")
        return value

class CardSerializer(serializers.ModelSerializer):
    assigned_members = UserSerializer(many=True, read_only=True)

    class Meta:
        model = Card
        fields = [
            'id', 'list', 'title', 'description', 'budget', 'people_number', 'tags',
            'due_date', 'assigned_members', 'subtasks', 'attachments', 'location',
            'position', 'created_at', 'updated_at', 'category'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'list']

class ListSerializer(serializers.ModelSerializer):
    cards = CardSerializer(many=True, read_only=True)

    class Meta:
        model = List
        fields = [
            'id', 'board', 'title', 'color', 'position', 'cards', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'board']

class BoardSerializer(serializers.ModelSerializer):
    owner = UserSerializer(read_only=True)
    members = UserSerializer(many=True, read_only=True)
    lists = ListSerializer(many=True, read_only=True)
    
    # Explicitly defining fields with their correct types and constraints
    title = serializers.CharField(max_length=255)
    description = serializers.CharField(allow_blank=True, allow_null=True)
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    budget = serializers.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    currency = serializers.CharField(max_length=3, default='USD')
    cover_image = serializers.URLField(allow_blank=True, allow_null=True)

    class Meta:
        model = Board
        fields = [
            'id', 'title', 'description', 'owner', 'members', 'status', 'budget', 'currency',
            'start_date', 'end_date', 'is_favorite', 'tags', 'cover_image', 'lists',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'owner', 'members', 'lists', 'created_at', 'updated_at']

    def validate_budget(self, value):
        try:
            return float(value)
        except (TypeError, ValueError):
            raise serializers.ValidationError("Budget must be a valid number (e.g., 5000.00)")

    def validate_currency(self, value):
        if not value or len(value.strip()) != 3:
            raise serializers.ValidationError("Currency must be a 3-letter code (e.g., USD)")
        return value.strip().upper()

    def validate_cover_image(self, value):
        if value and not value.startswith(('http://', 'https://')):
            raise serializers.ValidationError("Cover image must be a valid URL starting with http:// or https://, or leave it empty.")
        return value
    
    def validate_tags(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("Tags must be a list")
        return value

    def validate_start_date(self, value):
        # The value is already a date object thanks to serializers.DateField
        if value < timezone.now().date():
            raise serializers.ValidationError("Start date cannot be in the past.")
        return value

    def validate_end_date(self, value):
        # The value is already a date object thanks to serializers.DateField
        start_date_data = self.initial_data.get('start_date')
        if start_date_data:
            try:
                # Convert the string from initial_data to a date object
                start_date = datetime.strptime(start_date_data, '%Y-%m-%d').date()
                if value < start_date:
                    raise serializers.ValidationError("End date must be after the start date.")
            except (ValueError, TypeError):
                # Handle cases where start_date is not in the expected format
                pass
        
        # Additional validation for end date to not be in the past
        if value < timezone.now().date():
             raise serializers.ValidationError("End date cannot be in the past.")
        
        return value

class BoardMemberSerializer(serializers.Serializer):
    """Serializer for adding/removing board members"""
    user_id = serializers.IntegerField(help_text="ID of the user to add/remove as a board member")