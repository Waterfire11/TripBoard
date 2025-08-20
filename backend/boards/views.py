from django.db import transaction
from django.db.models import Max, Sum, Prefetch, F
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, permissions, generics, filters, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.decorators import action
from rest_framework.response import Response
from decimal import Decimal
from .models import Board, List, Card
from .serializers import BoardSerializer, ListSerializer, CardSerializer, SharedBoardSerializer
import django_filters as df
from django.urls import reverse
import uuid
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

    @action(detail=True, methods=["post"], url_path="share/enable")
    def enable_share(self, request, pk=None):
        board = self.get_object()  # 已受 IsOwner 保护

        if not board.is_shared_readonly:
            board.is_shared_readonly = True
        if not board.share_token:
            board.share_token = uuid.uuid4()

        board.save(update_fields=["is_shared_readonly", "share_token", "updated_at"])

        shared_url = request.build_absolute_uri(
            reverse("board-shared", kwargs={"share_token": str(board.share_token)})
        )
        return Response(
            {
                "share_token": str(board.share_token),
                "shared_url": shared_url,  # 可选
            },
            status=status.HTTP_201_CREATED,
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

class ListViewSet(viewsets.ModelViewSet):
    serializer_class = ListSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwner]
    ordering_fields = ["position", "created_at", "updated_at", "title"]
    ordering = ["position", "created_at", "id"]

    def get_queryset(self):
        qs = List.objects.filter(board__owner=self.request.user)
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
        return (
            qs.select_related("board")
            .prefetch_related(Prefetch("cards", queryset=cards_qs))
        )

    @transaction.atomic
    def perform_create(self, serializer):
        board = get_object_or_404(Board, pk=self.kwargs["board_id"], owner=self.request.user)
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
    permission_classes = [permissions.IsAuthenticated, IsOwner]

    def get_queryset(self):
        list_id = self.kwargs.get("list_id")
        if list_id:
            return Card.objects.filter(list__board__owner=self.request.user, list_id=list_id)

        return Card.objects.filter(list__board__owner=self.request.user)

    @transaction.atomic
    def perform_create(self, serializer):
        list_id = self.kwargs.get("list_id") or self.request.data.get("list")
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
