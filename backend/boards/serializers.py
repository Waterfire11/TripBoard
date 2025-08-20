# boards/serializers.py
from rest_framework import serializers
from django.urls import reverse

from .models import Board, List, Card

# ---- Cards ----
class CardSerializer(serializers.ModelSerializer):
    due_date = serializers.DateField(
        required=False, allow_null=True,
        input_formats=['%Y-%m-%d', 'iso-8601'],
        format='%Y-%m-%d',
        style={'input_type': 'text', 'placeholder': 'YYYY-MM-DD'}
    )

    class Meta:
        model = Card
        fields = (
            "id", "title", "description", "position",
            "due_date", "budget", "people", "list",
            "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at",)
        # 允许由视图在 perform_create 里注入 list_id（嵌套路由）
        extra_kwargs = {"list": {"required": False}}
        validators = []

    def validate(self, data):
        if data.get("position", 0) < 0:
            raise serializers.ValidationError({"position": "position cannot be negative"})
        if data.get("people", 1) < 1:
            raise serializers.ValidationError({"people": "people is at least 1"})
        if data.get("budget", 0) < 0:
            raise serializers.ValidationError({"budget": "budget cannot be negative"})
        return data

# ---- Lists ----
class ListSerializer(serializers.ModelSerializer):
    cards = CardSerializer(many=True, read_only=True)

    class Meta:
        model = List
        fields = ("id", "title", "position", "board", "cards", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at",)
        # 允许由视图在 perform_create 里注入 board_id（嵌套路由）
        extra_kwargs = {"board": {"required": False}}
        validators = []

    def validate_position(self, v):
        if v < 0:
            raise serializers.ValidationError("position cannot be negative")
        return v

# ---- Boards（保留只读嵌套 lists/cards）----
class BoardSerializer(serializers.ModelSerializer):
    lists = ListSerializer(many=True, read_only=True)
    share_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Board
        fields = (
            "id", "title", "owner",
            "is_shared_readonly", "share_token",
            "created_at", "updated_at",
            "lists",
            "share_url",
        )
        read_only_fields = ("owner", "id", "share_token", "created_at", "updated_at",)

    def get_share_url(self, obj):
        # 仅 owner 才返回 share_url；且必须开启只读分享
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not request or not user or obj.owner_id != user.id:
            return None
        if not obj.is_shared_readonly:
            return None
        # 构造 /api/boards/shared/<token>/ 的绝对 URL
        path = reverse("board-shared", kwargs={"token": obj.share_token})
        return request.build_absolute_uri(path)

# ---- 共享只读（用于 /boards/shared/<token>/）----
class SharedCardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Card
        fields = ("id", "title", "description", "position", "due_date", "budget", "people",
                  "created_at", "updated_at")

class SharedListSerializer(serializers.ModelSerializer):
    cards = SharedCardSerializer(many=True, read_only=True)
    class Meta:
        model = List
        fields = ("id", "title", "position", "cards", "created_at", "updated_at")

class SharedBoardSerializer(serializers.ModelSerializer):
    lists = SharedListSerializer(many=True, read_only=True)
    class Meta:
        model = Board
        fields = ("id", "title", "lists", "created_at", "updated_at")
