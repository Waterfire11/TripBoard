# boards/serializers.py
from django.contrib.auth import get_user_model
from rest_framework import serializers
from django.urls import reverse

from .models import Board, List, Card, BoardMember

User = get_user_model()

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
        url = reverse("board-shared", kwargs={"share_token": str(obj.share_token)})
        return request.build_absolute_uri(url) if request else url

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

class BoardMemberReadSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()
    email = serializers.SerializerMethodField()  # 从 user 派生

    class Meta:
        model = BoardMember
        fields = ("id", "user", "email", "role", "created_at")
        read_only_fields = ("id", "user", "email", "created_at")

    def get_user(self, obj):
        u = getattr(obj, "user", None)
        if u:
            return {"id": str(u.id), "username": u.username, "email": u.email}
        return None

    def get_email(self, obj):
        u = getattr(obj, "user", None)
        return getattr(u, "email", None) if u else None

class BoardMemberWriteSerializer(serializers.ModelSerializer):
    email = serializers.CharField(write_only=True, required=True, trim_whitespace=True)

    class Meta:
        model = BoardMember
        fields = ("email", "role")

    def validate_role(self, value):
        if value not in ("owner", "editor", "viewer"):
            raise serializers.ValidationError("Invalid role.")
        return value

    def validate(self, attrs):
        board = self.context["board"]
        role = attrs.get("role")

        # 统一清理邮箱：替换全角空格、去前后空白
        email = (attrs.get("email") or "").replace("\u3000", " ").strip()
        attrs["email"] = email  # 规范化回写，避免后续使用到原值

        # —— 更新：禁止 owner 降级；禁止把非 owner 提升为 owner
        if getattr(self, "instance", None):
            if self.instance.user_id == board.owner_id and role and role != "owner":
                raise serializers.ValidationError({"role": "Owner role cannot be changed."})
            if role == "owner" and self.instance.user_id != board.owner_id:
                raise serializers.ValidationError({"role": "Only the board owner can have role 'owner'."})
            return attrs

        # —— 创建：用规范化后的邮箱查用户（不区分大小写）
        from django.contrib.auth import get_user_model
        User = get_user_model()
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            raise serializers.ValidationError({
                "email": "User not found. Tip: check for extra spaces and ensure the user exists in this environment."
            })

        # 保护 owner：只有 board.owner 才能是 'owner' 角色
        if user.id == board.owner_id and role != "owner":
            raise serializers.ValidationError({"role": "Owner must have role 'owner'."})
        if user.id != board.owner_id and role == "owner":
            raise serializers.ValidationError({"role": "Only the board owner can have role 'owner'."})

        # 缓存 user 给 create() 用，避免重复查询
        self._validated_user = user
        return attrs

    def create(self, validated_data):
        from django.contrib.auth import get_user_model
        User = get_user_model()

        board = self.context["board"]
        # 统一清洗：全角空格→半角、前后空白去掉、大小写不敏感
        email = (validated_data.pop("email") or "").replace("\u3000", " ").strip().lower()
        role  = validated_data["role"]

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            raise serializers.ValidationError({"email": "User not found"})

        member, created = BoardMember.objects.get_or_create(
            board=board, user=user, defaults={"role": role}
        )
        self.was_created = created
        if not created and member.role != role:
            member.role = role
            member.save(update_fields=["role"])
        return member

    def update(self, instance, validated_data):
        role = validated_data.get("role")
        if role and role != instance.role:
            instance.role = role
            instance.save(update_fields=["role"])
        return instance