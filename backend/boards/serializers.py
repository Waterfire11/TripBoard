# boards/serializers.py
from rest_framework import serializers
from .models import Board, List, Card

class CardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Card
        fields = (
            "id", "title", "description", "position",
            "due_date", "budget", "people", "list",
            "created_at", "updated_at",
        )
        read_only_fields = ("created_at", "updated_at",)

class ListSerializer(serializers.ModelSerializer):
    cards = CardSerializer(many=True, read_only=True)

    class Meta:
        model = List
        fields = ("id", "title", "position", "board", "cards", "created_at", "updated_at")
        read_only_fields = ("created_at", "updated_at",)

class BoardSerializer(serializers.ModelSerializer):
    lists = ListSerializer(many=True, read_only=True)

    class Meta:
        model = Board
        fields = (
            "id", "title", "lists",
            "is_shared_readonly", "share_token",
            "created_at", "updated_at",
        )
        read_only_fields = ("share_token", "created_at", "updated_at",)
