import uuid
import django_filters as df
from django.db import transaction
from django.db.models import Max, Sum, Count, Prefetch, F, Q
from django.urls import reverse
from django.shortcuts import get_object_or_404
from django.http import Http404
from rest_framework import viewsets, permissions, generics, filters, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import BasePermission, SAFE_METHODS
from decimal import Decimal
from .models import Board, List, Card, BoardMember
from .serializers import BoardSerializer, ListSerializer, CardSerializer, SharedBoardSerializer, BoardMemberSerializer

def _can_edit_board(user, board):
    """拥有者或被设为 editor 的成员可以编辑"""
    if not user.is_authenticated:
        return False
    if board.owner_id == user.id:
        return True
    return BoardMember.objects.filter(
        board=board, user=user, role=BoardMember.ROLE_EDITOR
    ).exists()

class CardFilter(df.FilterSet):
    title = df.CharFilter(field_name="title", lookup_expr="icontains")
    min_budget = df.NumberFilter(field_name="budget", lookup_expr="gte")
    max_budget = df.NumberFilter(field_name="budget", lookup_expr="lte")
    min_people = df.NumberFilter(field_name="people", lookup_expr="gte")
    max_people = df.NumberFilter(field_name="people", lookup_expr="lte")
    due_from   = df.DateFilter(field_name="due_date", lookup_expr="gte")
    due_to     = df.DateFilter(field_name="due_date", lookup_expr="lte")

    class Meta:
        model = Card
        fields = ["position"]

class SmallPage(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

class IsOwner(permissions.BasePermission):

    def has_object_permission(self, request, view, obj):
        if isinstance(obj, Board):
            return obj.owner == request.user
        if isinstance(obj, List):
            return obj.board.owner == request.user
        if isinstance(obj, Card):
            return obj.list.board.owner == request.user
        return False

class BoardViewSet(viewsets.ModelViewSet):
    queryset = Board.objects.all()
    serializer_class = BoardSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwner]

    def _do_enable_share(self, request, board):
        created_now = False
        if not board.is_shared_readonly:
            board.is_shared_readonly = True
            created_now = True
        if not board.share_token:
            board.share_token = uuid.uuid4()
            created_now = True
        board.save(update_fields=["is_shared_readonly", "share_token", "updated_at"])

        shared_url = request.build_absolute_uri(
            reverse("board-shared", kwargs={"share_token": str(board.share_token)})
        )
        return Response(
            {"share_token": str(board.share_token), "shared_url": shared_url},
            status=status.HTTP_201_CREATED if created_now else status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="share/disable")
    def disable_share(self, request, pk=None):
        board = self.get_object()
        if board.is_shared_readonly:
            board.is_shared_readonly = False
            # 为了彻底失效旧链接，可以顺便刷新 token（可选）
            board.share_token = uuid.uuid4()
            board.save(update_fields=["is_shared_readonly", "share_token", "updated_at"])
        ser = self.get_serializer(board, context={"request": request})
        return Response(ser.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="share/rotate")
    def rotate_share(self, request, pk=None):
        board = self.get_object()
        if not board.is_shared_readonly:
            return Response(
                {"detail": "Share is not enabled."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        board.share_token = uuid.uuid4()
        board.save(update_fields=["share_token", "updated_at"])
        ser = self.get_serializer(board, context={"request": request})
        return Response(ser.data, status=status.HTTP_200_OK)

    def get_queryset(self):
        # 子层：cards 的固定排序
        cards_qs = Card.objects.order_by("position", "created_at")

        # 中层：lists 也固定排序，并预取其 cards（已带排序）
        lists_qs = (
            List.objects.order_by("position", "created_at")
            .prefetch_related(Prefetch("cards", queryset=cards_qs))
        )

        # 顶层：当前用户的 boards，预取 lists（已带排序）
        return (
            Board.objects.filter(owner=self.request.user)
            .prefetch_related(Prefetch("lists", queryset=lists_qs))
        )

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=["get"], url_path="budget")
    def budget(self, request, pk=None):
        board = self.get_object()
        qs = Card.objects.filter(list__board=board)
        board_total = qs.aggregate(total=Sum("budget"))["total"] or Decimal("0")
        by_list = (
            qs.values("list__id", "list__title")
            .annotate(total=Sum("budget"))
            .order_by("list__title")
        )
        return Response({"board_total": board_total, "by_list": list(by_list)})

    @action(detail=True, methods=["post"], url_path="share/enable")
    def enable_share(self, request, pk=None):
        return self._do_enable_share(request, self.get_object())

    @action(detail=True, methods=["get"], url_path="stats", permission_classes=[permissions.IsAuthenticated, IsOwner],)
    def stats(self, request, pk=None):
        board = self.get_object()

        cards_qs = Card.objects.filter(list__board=board)
        agg = cards_qs.aggregate(
            total_cards=Count("id"),
            total_budget=Sum("budget"),
            total_people=Sum("people"),
        )
        # 每个 List 的卡片数量
        per_list = (
            board.lists
            .annotate(card_count=Count("cards"))
            .values("id", "title", "position", "card_count")
            .order_by("position")
        )

        data = {
            "board": str(board.id),
            "title": board.title,
            "total_lists": board.lists.count(),
            "total_cards": agg["total_cards"] or 0,
            "total_budget": str(agg["total_budget"] or 0),
            "total_people": agg["total_people"] or 0,
            "per_list": list(per_list),
        }
        return Response(data)

    def _assert_owner(self, board, user):
        if board.owner_id != user.id:
            self.permission_denied(self.request, message="Only owner can manage members")

    @action(detail=True, methods=["get", "post"], url_path="members")
    def members(self, request, pk=None):
        board = self.get_object()
        self._assert_owner(board, request.user)

        if request.method == "GET":
            qs = board.members.select_related("user").order_by("created_at")
            data = BoardMemberSerializer(qs, many=True).data
            return Response(data)

        # POST: {email, role}
        ser = BoardMemberSerializer(data=request.data, context={"board": board})
        ser.is_valid(raise_exception=True)
        member = ser.save()
        return Response(BoardMemberSerializer(member).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["patch", "delete"], url_path=r"members/(?P<member_id>\d+)")
    def member_detail(self, request, pk=None, member_id=None):
        board = self.get_object()
        self._assert_owner(board, request.user)
        member = get_object_or_404(BoardMember, pk=member_id, board=board)

        if request.method == "DELETE":
            member.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        # PATCH: {role}
        ser = BoardMemberSerializer(member, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        member = ser.save()
        return Response(BoardMemberSerializer(member).data)

class IsOwnerOrBoardCollaborator(BasePermission):
    """
    - SAFE_METHODS: owner or viewer/editor 均可查看
    - 修改: 需要 owner 或 editor
    """
    def _get_board(self, obj):
        if isinstance(obj, Board):  return obj
        if isinstance(obj, List):   return obj.board
        if isinstance(obj, Card):   return obj.list.board
        return None

    def has_object_permission(self, request, view, obj):
        board = self._get_board(obj)
        if not board or not request.user.is_authenticated:
            return False

        if board.owner_id == request.user.id:
            return True

        # 成员是否有权限
        exists = BoardMember.objects.filter(board=board, user=request.user).only("role").first()
        if not exists:
            return False

        if request.method in SAFE_METHODS:
            return True
        return exists.role == BoardMember.ROLE_EDITOR

class ListViewSet(viewsets.ModelViewSet):
    serializer_class = ListSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrBoardCollaborator]
    ordering_fields = ["position", "created_at", "updated_at", "title"]
    ordering = ["position", "created_at", "id"]

    def get_queryset(self):
        qs = List.objects.filter(
            Q(board__owner=self.request.user) | Q(board__members__user=self.request.user)
        ).distinct()
        board_id = self.kwargs.get("board_id")
        if board_id:
            qs = qs.filter(board_id=board_id)

        # ① 默认稳定排序：position → created_at → id
        #    只有在没有 ?ordering=... 时才强制默认排序；
        #    一旦有 ordering 参数，就交给 OrderingFilter 处理（保持你现有的行为）。
        if "ordering" not in self.request.query_params:
            qs = qs.order_by("position", "created_at", "id")

        # ② 子集 cards 固定排序：position → created_at（带上 select_related('list') 以避免 N+1）
        cards_qs = (
            Card.objects.order_by("position", "created_at")
            .select_related("list")
        )

        # ③ 同时优化外键与子集合
        qs = qs.select_related("board").prefetch_related(Prefetch("cards", queryset=cards_qs))
        if "ordering" not in self.request.query_params:
            qs = qs.order_by("position", "created_at", "id")
        return qs

    @transaction.atomic
    def perform_create(self, serializer):
        board = get_object_or_404(Board, pk=self.kwargs["board_id"])
        if not _can_edit_board(self.request.user, board):
            self.permission_denied(self.request, message="Only owner or editor can create lists")

        # 可选：前端传 position，不传就追加
        req_pos = self.request.data.get("position")

        if req_pos is None:
            max_pos = List.objects.filter(board=board).aggregate(m=Max("position"))["m"] or 0
            pos = max_pos + 1
        else:
            pos = int(req_pos)
            # 在 pos 处插入：将该板内 position >= pos 的全部右移 1
            List.objects.filter(board=board, position__gte=pos).update(position=F("position") + 1)

        serializer.save(board=board, position=pos)

    def reorder(self, request, board_id=None, pk=None):
        lst = self.get_object()
        new_pos = int(request.data.get("position", lst.position))
        lst.position = new_pos
        lst.save()
        return Response(ListSerializer(lst).data)

    pagination_class = SmallPage
    filter_backends = [filters.OrderingFilter]
    filterset_fields = ("title",)
    search_fields = ("title",)

class CardViewSet(viewsets.ModelViewSet):
    serializer_class = CardSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrBoardCollaborator]

    def get_queryset(self):
        base = (Card.objects
                .filter(Q(list__board__owner=self.request.user) |
                        Q(list__board__members__user=self.request.user))
                .distinct()
                .select_related("list", "list__board"))

        list_id = self.kwargs.get("list_id")
        if list_id:
            base = base.filter(list_id=list_id)

        if "ordering" not in self.request.query_params:
            base = base.order_by("position", "created_at")
        return base

    @transaction.atomic
    def perform_create(self, serializer):
        list_id = self.kwargs.get("list_id") or self.request.data.get("list")
        lst = get_object_or_404(List, pk=list_id)
        if not _can_edit_board(self.request.user, lst.board):
            self.permission_denied(self.request, message="Only owner or editor can create cards")
        pos = serializer.validated_data.get("position")

        # 绑定 list_id 给序列化器
        serializer.validated_data["list_id"] = list_id

        if pos is None:
            # 追加：取当前最大 position + 1
            max_pos = Card.objects.filter(list_id=list_id).aggregate(m=Max("position"))["m"] or 0
            pos = max_pos + 1
        else:
            # 插入：让位
            Card.objects.select_for_update().filter(list_id=list_id, position__gte=pos) \
                .update(position=F("position") + 1)

        serializer.save(position=pos)

    @transaction.atomic
    def perform_update(self, serializer):
        card = self.get_object()
        old_list_id = card.list_id
        old_pos = card.position

        # 新目标（若未传则沿用旧值）
        new_list = serializer.validated_data.get("list", card.list)
        new_list_id = new_list.id
        new_pos = serializer.validated_data.get("position", card.position)

        if new_list_id == old_list_id:
            # —— 同一列表 —— #
            if new_pos == old_pos:
                # 原地不动，直接保存其它字段
                serializer.save(list_id=old_list_id, position=old_pos)
                return

            if new_pos > old_pos:
                # 向后移动：把 (old_pos, new_pos] 的卡片整体左移 1
                (Card.objects
                 .select_for_update()
                 .filter(list_id=old_list_id, position__gt=old_pos, position__lte=new_pos)
                 .update(position=F("position") - 1))
            else:
                # 向前移动：把 [new_pos, old_pos) 的卡片整体右移 1
                (Card.objects
                 .select_for_update()
                 .filter(list_id=old_list_id, position__gte=new_pos, position__lt=old_pos)
                 .update(position=F("position") + 1))

            serializer.save(list_id=old_list_id, position=new_pos)
        else:
            # —— 跨列表移动 —— #
            # 先校验目标 list 所在 board 是否可编辑
            if not _can_edit_board(self.request.user, new_list.board):
                self.permission_denied(self.request, "Only owner or editor can move card to target list")
            # 1) 老列表收缩
            (Card.objects
             .select_for_update()
             .filter(list_id=old_list_id, position__gt=old_pos)
             .update(position=F("position") - 1))

            # 2) 新列表让位（若未传 position，默认追加到末尾）
            if "position" not in serializer.validated_data:
                max_pos = Card.objects.filter(list_id=new_list_id).aggregate(m=Max("position"))["m"] or 0
                new_pos = max_pos + 1
            else:
                (Card.objects
                 .select_for_update()
                 .filter(list_id=new_list_id, position__gte=new_pos)
                 .update(position=F("position") + 1))

            # 3) 真正移动
            serializer.save(list_id=new_list_id, position=new_pos)

    def reorder(self, request, pk=None, list_id=None):
        card = self.get_object()
        new_pos = int(request.data.get("position", card.position))
        card.position = new_pos
        card.save()
        return Response(CardSerializer(card).data)

    pagination_class = SmallPage
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ("position","created_at","updated_at","title","due_date","budget","people")
    ordering = ("position","created_at")
    filterset_class = CardFilter
    search_fields = ("title","description")


class SharedBoardView(generics.RetrieveAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = SharedBoardSerializer
    lookup_field = "share_token"
    lookup_url_kwarg = "share_token"
    http_method_names = ["get"]

    def get_queryset(self):
        """
        只允许已开启只读分享的 Board；
        同时把嵌套的 lists / cards 带着排序预取，避免 N+1。
        """
        cards_qs = (
            Card.objects
            .order_by("position", "created_at")
            .select_related("list")
        )

        lists_qs = (
            List.objects
            .order_by("position", "created_at")
            .prefetch_related(Prefetch("cards", queryset=cards_qs))
            .select_related("board")
        )

        return (
            Board.objects
            .filter(is_shared_readonly=True)
            .prefetch_related(Prefetch("lists", queryset=lists_qs))
        )
