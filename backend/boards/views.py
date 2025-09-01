<<<<<<< HEAD
import uuid
import django_filters as df
from django.db import transaction
from django.db.models import Max, Min, Sum, Count, Prefetch, F, Q
from django.urls import reverse
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets, permissions, generics, filters, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, BasePermission, SAFE_METHODS
from decimal import Decimal
from .models import Board, List, Card, BoardMember
from .serializers import BoardSerializer, ListSerializer, CardSerializer, SharedBoardSerializer, BoardMemberReadSerializer, BoardMemberWriteSerializer
from .permissions import IsBoardOwner

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
        fields = {
            "title": ["exact", "icontains"],
            "budget": ["gte", "lte"],
            "people": ["gte", "lte"],
            "due_date": ["gte", "lte"],
        }


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

class IsOwnerOrBoardCollaborator(BasePermission):
    """
    - SAFE_METHODS: owner or viewer/editor 均可查看
    - 修改: 需要 owner 或 editor
    """
    def _get_board(self):
        # 兼容多种路由命名：board_id / pk / board_pk
        bid = (
            self.kwargs.get("board_id")
            or self.kwargs.get("pk")
            or self.kwargs.get("board_pk")
        )
        return get_object_or_404(Board.objects.all(), id=bid)

    def has_permission(self, request, view):
        # 未登录直接拒
        if not request.user or not request.user.is_authenticated:
            return False

        # 只读方法：能看到 board 的人都放行（owner/editor/viewer）
        if request.method in SAFE_METHODS:
            return True

        # 写方法：需要 owner 或 editor
        # 1) /api/boards/<board_id>/lists/（创建 list）
        board_id = getattr(view, "kwargs", {}).get("board_id")
        if board_id:
            board = Board.objects.filter(id=board_id).first()
            if not board:
                return False
            if board.owner_id == request.user.id:
                return True
            return BoardMember.objects.filter(
                board=board, user=request.user, role=BoardMember.ROLE_EDITOR
            ).exists()

        # 2) /api/lists/<list_id>/cards/（创建 card）
        list_id = getattr(view, "kwargs", {}).get("list_id")
        if list_id:
            lst = List.objects.filter(id=list_id).select_related("board").first()
            if not lst:
                return False
            board = lst.board
            if board.owner_id == request.user.id:
                return True
            return BoardMember.objects.filter(
                board=board, user=request.user, role=BoardMember.ROLE_EDITOR
            ).exists()

        # 其它情况交给对象级权限（比如 detail 更新/删除）
        return True

class MemberViewSet(viewsets.ModelViewSet):
    """
    /api/boards/{board_id}/members/      list  / create
    /api/boards/{board_id}/members/{pk}/ retrieve / partial_update / destroy
    - 读取(list/retrieve)：协作者可见
    - 写(create/patch/delete)：仅 owner
    """
    queryset = BoardMember.objects.none()  # 真正的 queryset 在 get_queryset 里
    lookup_field = "pk"
    permission_classes = [permissions.IsAuthenticated]  # 具体拆分见 get_permissions
    pagination_class = SmallPage

    # —— 权限拆分：GET 放开，写只给 owner
    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsBoardOwner()]

    # —— 取当前 board（注意：不要走可能带 owner 过滤的 self.get_object）
    def _get_board(self):
        return get_object_or_404(Board.objects.all(), id=self.kwargs.get("board_id"))

    # 读权限：owner 或协作者（在 queryset 入口卡）
    def _assert_can_read(self, board, user):
        if board.owner_id == user.id:
            return
        if BoardMember.objects.filter(board=board, user=user).exists():
            return
        raise PermissionDenied("You do not have permission to view members of this board.")

    # —— 只看该 board 的成员
    def get_queryset(self):
        board = self._get_board()
        self._assert_can_read(board, self.request.user)
        return (
            BoardMember.objects
            .filter(board=board)
            .select_related("user")
            .order_by("-created_at")
        )

    # —— 读/写用不同 serializer
    def get_serializer_class(self):
        if self.action in ("list", "retrieve"):
            return BoardMemberReadSerializer
        return BoardMemberWriteSerializer

    # —— 把 board 放进 serializer 上下文，供 create/update 使用
    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["board"] = self._get_board()
        return ctx

    # 不需要重写 create/update/destroy；
    # 写操作由 BoardMemberWriteSerializer 完成（只改 role，create 时用 email 找到 User）


class BoardViewSet(viewsets.ModelViewSet):
    queryset = Board.objects.all()
    serializer_class = BoardSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwner]

    def get_permissions(self):
        """
        仅当访问成员列表/详情 且 为只读方法 时，放宽到协作者可读；
        其它情况沿用原来的 IsOwner。
        """
        action = getattr(self, "action", None)
        if action in ("members", "member_detail") and self.request.method in SAFE_METHODS:
            # 你项目里已有的“能够读取 board 的人”权限类，任选其一
            # 如果你有 CanReadBoard，用它；如果你有 IsOwnerOrBoardCollaborator，用它
            return [permissions.IsAuthenticated(), IsOwnerOrBoardCollaborator()]
        return [perm() for perm in self.permission_classes]

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
=======
# boards/views.py
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import models
from .models import Board, List, Card
from .serializers import BoardSerializer, ListSerializer, CardSerializer
from .permissions import IsBoardOwnerOrMember
from users.models import User


class BoardListCreateView(generics.ListCreateAPIView):
    serializer_class = BoardSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Return boards where user is owner or member
        return Board.objects.filter(
            models.Q(owner=self.request.user) | 
            models.Q(members=self.request.user)
        ).distinct()
>>>>>>> gitlab/tripboard-import

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

<<<<<<< HEAD
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

    @action(detail=True, methods=["get"], url_path="stats")
    def stats(self, request, pk=None):
        """
        汇总看板的统计与预算信息。
        GET /api/boards/<board_id>/stats/
        """
        board = self.get_object()

        # 基础聚合
        lists_qs = board.lists.all()  # related_name="lists"
        cards_qs = board.lists.values_list("id", flat=True)
        from boards.models import Card, List  # 按你的路径
        cards = Card.objects.filter(list__board=board)

        totals = {
            "lists": lists_qs.count(),
            "cards": cards.count(),
        }

        # 预算聚合
        cards = Card.objects.filter(list__board=board)
        agg = cards.aggregate(board_total=Sum("budget"),
                              people_sum=Sum("people"),
                              due_min=Min("due_date"),
                              due_max=Max("due_date"))
        board_total = agg["board_total"] or 0
        people_sum = agg["people_sum"] or 0

        by_list = list(
            List.objects.filter(board=board)
            .values("id", "title")
            .annotate(total=Sum("cards__budget"))
            .order_by("title")
        )
        for row in by_list:
            row["total"] = row["total"] or 0

        # 平均每日预算
        avg_per_day = None
        if agg["due_min"] and agg["due_max"] and agg["due_max"] >= agg["due_min"]:
            days = (agg["due_max"] - agg["due_min"]).days + 1
            if days > 0:
                avg_per_day = float(board_total) / days

        # 角色分布
        roles = dict(
            BoardMember.objects.filter(board=board)
            .values_list("role")
            .annotate(n=Count("role"))
            .values_list("role", "n")
        )

        data = {
            "board_id": str(board.id),
            "totals": totals,
            "budget": {
                "board_total": board_total,
                "by_list": by_list,
                "avg_per_day": avg_per_day,
            },
            "people_sum": people_sum,
            "roles": roles,
        }
        return Response(data, status=status.HTTP_200_OK)

    def _assert_owner(self, board, user):
        if board.owner_id != user.id:
            self.permission_denied(self.request, message="Only owner can manage members")

    def _can_read_board(self, board, user):
        return (
                board.owner_id == user.id
                or BoardMember.objects.filter(board=board, user=user).exists()
        )

    @action(detail=True, methods=["get", "post"], url_path="members")
    def members(self, request, pk=None):
        board = get_object_or_404(Board.objects.all(), pk=pk)

        if request.method == "GET":
            if not self._can_read_board(board, request.user):
                self.permission_denied(request, "Not allowed to view members")

            qs = board.members.select_related("user").order_by("created_at")

            # 显式用 SmallPage 做分页，避免依赖全局配置
            paginator = SmallPage()
            page = paginator.paginate_queryset(qs, request, view=self)
            ser = BoardMemberReadSerializer(page or qs, many=True)
            return (
                paginator.get_paginated_response(ser.data)
                if page is not None
                else Response(ser.data)
            )

            # POST：仅 owner
        if board.owner_id != request.user.id:
            self.permission_denied(request, "Only owner can manage members")

        ser = BoardMemberWriteSerializer(data=request.data, context={"board": board})
        ser.is_valid(raise_exception=True)
        member = ser.save()
        return Response(
            BoardMemberReadSerializer(member).data,
            status=status.HTTP_201_CREATED if getattr(ser, "was_created", False) else status.HTTP_200_OK
        )

    # 修改为（匹配整数 id）
    @action(detail=True, methods=["patch", "delete"],
            url_path=r"members/(?P<member_id>[^/]+)")  # 你已经修成 int id 的正则
    def member_detail(self, request, pk=None, member_id=None):
        board = get_object_or_404(Board.objects.all(), pk=pk)
        self._assert_owner(board, request.user)

        member = get_object_or_404(BoardMember, pk=member_id, board=board)

        if request.method == "DELETE":
            if member.user_id == board.owner_id:
                return Response({"detail": "Cannot remove the board owner."},
                                status=status.HTTP_400_BAD_REQUEST)
            member.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        # PATCH 仍用写序列化器（里面已有“不能改 owner 角色”的校验）
        ser = BoardMemberWriteSerializer(member, data=request.data, partial=True, context={"board": board})
        ser.is_valid(raise_exception=True)
        member = ser.save()
        return Response(BoardMemberReadSerializer(member).data)

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
        board = get_object_or_404(Board.objects.all(), id=self.kwargs.get("board_id"))
        if not _can_edit_board(self.request.user, board):
            self.permission_denied(self.request, message="Only owner or editor can create lists")

        # 可选：前端传 position，不传就追加
        req_pos = self.request.data.get("position")

        if req_pos is None:
            max_pos = (List.objects.filter(board=board).aggregate(Max("position"))["position__max"] or 0)
            pos = max_pos + 1
        else:
            pos = int(req_pos)
            # 在 pos 处插入：将该板内 position >= pos 的全部右移 1
            List.objects.filter(board=board, position__gte=pos).update(position=F("position") + 1)

        agg = List.objects.filter(board=board).aggregate(max_pos=Max("position"))
        max_pos = agg.get("max_pos") or 0

        serializer.save(board=board, position=max_pos + 10)

    @action(detail=True, methods=["patch"], url_path="reorder")
    @transaction.atomic
    def reorder(self, request, board_id=None, pk=None):
        lst = self.get_object()
        board = lst.board

        # 只有 owner 或 editor 可以重排
        if not _can_edit_board(request.user, board):
            self.permission_denied(request, "Only owner or editor can reorder lists")

        try:
            new_pos = int(request.data.get("position", lst.position))
        except (TypeError, ValueError):
            return Response({"detail": "Invalid position"}, status=status.HTTP_400_BAD_REQUEST)

        old_pos = lst.position
        if new_pos == old_pos:
            return Response(ListSerializer(lst).data, status=status.HTTP_200_OK)

        # 规范化边界
        max_pos = List.objects.filter(board=board).aggregate(m=Max("position"))["m"] or 0
        new_pos = max(1, min(new_pos, max_pos))

        qs = List.objects.select_for_update().filter(board=board)

        if new_pos > old_pos:
            # (old_pos, new_pos] 左移 1
            qs.filter(position__gt=old_pos, position__lte=new_pos).update(position=F("position") - 1)
        else:
            # [new_pos, old_pos) 右移 1
            qs.filter(position__gte=new_pos, position__lt=old_pos).update(position=F("position") + 1)

        lst.position = new_pos
        lst.save(update_fields=["position"])

        return Response(ListSerializer(lst).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="reorder")
    def reorder_bulk(self, request, *args, **kwargs):
        """
        POST /api/boards/<board_id>/lists/reorder/
        body: {"ordered_ids": [list_id1, list_id2, ...]}  -> 200
        仅在同一 board 内重排 position，从 0 开始编号。
        """
        board_id = kwargs.get("board_id") or request.parser_context["kwargs"].get("board_id")
        ordered_ids = request.data.get("ordered_ids") or []

        # 错误或空输入：不报错，直接 200（测试不会走到这里）
        if not ordered_ids:
            return Response(status=status.HTTP_200_OK)

        qs = List.objects.filter(board_id=board_id).order_by("position", "created_at", "id")
        db_ids = list(qs.values_list("id", flat=True))

        # 容错：只重排存在于该 board 的 id；其他忽略
        id_to_pos = {str(_id): idx+1 for idx, _id in enumerate(ordered_ids) if _id in map(str, db_ids)}

        with transaction.atomic():
            objs = list(qs.select_for_update())
            changed = False
            for obj in objs:
                want = id_to_pos.get(str(obj.id))
                if want is not None and obj.position != want:
                    obj.position = want
                    changed = True
            if changed:
                List.objects.bulk_update(objs, ["position"])

        return Response(status=status.HTTP_200_OK)

    def get_target_board(self, request):
        # 创建/列表：URL 上有 board_id，或请求体里有 board
        if self.action in ("list", "create"):
            bid = self.kwargs.get("board_id") or request.data.get("board")
            return Board.objects.filter(id=bid).first()
        # 详情/更新/删除：通过对象取
        obj = self.get_object()
        return obj.board

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        "board": ["exact"],
        "title": ["exact", "icontains"],
        "position": ["exact", "lte", "gte"],
    }
    search_fields = ["title"]
    ordering_fields = ["position", "created_at", "updated_at", "title", "id"]

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
        lst = get_object_or_404(List.objects.select_related("board"), id=self.kwargs.get("list_id"))
        if not _can_edit_board(self.request.user, lst.board):
            self.permission_denied(self.request, message="Only owner or editor can create cards")
        pos = serializer.validated_data.get("position")

        # 绑定 list_id 给序列化器
        serializer.validated_data["list_id"] = list_id

        if pos is None:
            # 追加：取当前最大 position + 1
            max_pos = (Card.objects.filter(list=lst).aggregate(Max("position"))["position__max"] or 0)
            pos = max_pos + 1
        else:
            # 插入：让位
            Card.objects.select_for_update().filter(list_id=list_id, position__gte=pos) \
                .update(position=F("position") + 1)

        agg = Card.objects.filter(list=lst).aggregate(max_pos=Max("position"))
        max_pos = agg.get("max_pos") or 0

        serializer.save(list=lst, position=max_pos + 10)

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

    @action(detail=True, methods=["post", "patch"], url_path="reorder")
    @transaction.atomic
    def reorder(self, request, *args, **kwargs):
        card = self.get_object()
        data = request.data

        # 兼容参数名，注意 0 不能被当作 False
        target_list_id = data["to_list"] if "to_list" in data else data.get("list")
        if "to_position" in data:
            target_pos = data["to_position"]
        else:
            target_pos = data.get("position")

        if target_pos is None:
            return Response({"detail": "to_position/position required"},
                            status=status.HTTP_400_BAD_REQUEST)
        try:
            target_pos = int(target_pos)
        except (TypeError, ValueError):
            return Response({"detail": "to_position must be an integer"},
                            status=status.HTTP_400_BAD_REQUEST)

        # 目标 list：没传就用当前 list
        target_list = get_object_or_404(List, pk=target_list_id) if target_list_id else card.list

        with transaction.atomic():
            # 目标 list 的现有顺序（排除自己）
            qs = (Card.objects
                  .filter(list=target_list)
                  .exclude(pk=card.pk)
                  .order_by("position", "id"))  # id 做稳定的并列裁决

            n = qs.count()
            if target_pos < 0:
                target_pos = 0
            if target_pos > n:
                target_pos = n

            ordered_ids = list(qs.values_list("pk", flat=True))
            # 把自己插入目标位置
            ordered_ids.insert(target_pos, card.pk)

            # 如果跨 list，先更新 list_id
            if card.list_id != target_list.pk:
                card.list = target_list
                card.save(update_fields=["list"])

            # 重新编号 position（从 0 或 1 都可，和你现在模型保持一致）
            updates = [Card(pk=pk, position=i) for i, pk in enumerate(ordered_ids, 1)]
            Card.objects.bulk_update(updates, ["position"])

        return Response(status=status.HTTP_200_OK)

    def get_target_board(self, request):
        if self.action == "create":
            # 创建卡片：list_id 在 URL 或 body
            lid = self.kwargs.get("pk") or request.data.get("list")
            lst = List.objects.filter(id=lid).select_related("board").first()
            return lst.board if lst else None
        obj = self.get_object()
        return obj.list.board

        # ✅ 增量配置

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = CardFilter  # ✅ 支持 min_budget / due_from / due_to 别名
    pagination_class = SmallPage  # ✅ 返回 {"count","results":[...]} 结构

    # 精准过滤（=、范围、列表等）
    filterset_fields = {
        "list": ["exact"],  # 只看某个 List 的卡片
        "title": ["exact", "icontains"],
        "due_date": ["exact", "lte", "gte"],
        "budget": ["exact", "lte", "gte"],
        "people": ["exact", "lte", "gte"],
        "created_at": ["date", "date__gte", "date__lte"],  # 可选
        "updated_at": ["date", "date__gte", "date__lte"],  # 可选
    }

    # 模糊搜索
    search_fields = ["title", "description"]

    # 排序白名单（保留你已有的）
    ordering_fields = ["position", "id", "created_at", "updated_at", "title", "due_date", "budget", "people"]


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
=======

class BoardDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = BoardSerializer
    permission_classes = [permissions.IsAuthenticated, IsBoardOwnerOrMember]

    def get_queryset(self):
        return Board.objects.filter(
            models.Q(owner=self.request.user) | 
            models.Q(members=self.request.user)
        ).distinct()

    def get_object(self):
        obj = get_object_or_404(self.get_queryset(), pk=self.kwargs['pk'])
        self.check_object_permissions(self.request, obj)
        return obj


class BoardMemberAddView(generics.UpdateAPIView):
    """Add a member to a board (owner only)"""
    serializer_class = BoardSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return get_object_or_404(Board, pk=self.kwargs['pk'], owner=self.request.user)

    def perform_update(self, serializer):
        user_id = self.request.data.get('user_id')
        if not user_id:
            raise ValidationError("user_id is required")
        
        user = get_object_or_404(User, pk=user_id)
        serializer.instance.members.add(user)
        serializer.save()

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_update(self.get_serializer(instance))
        return Response(self.get_serializer(instance).data)


class BoardMemberRemoveView(generics.UpdateAPIView):
    """Remove a member from a board (owner only)"""
    serializer_class = BoardSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return get_object_or_404(Board, pk=self.kwargs['pk'], owner=self.request.user)

    def perform_update(self, serializer):
        user_id = self.request.data.get('user_id')
        if not user_id:
            raise ValidationError("user_id is required")
        
        user = get_object_or_404(User, pk=user_id)
        if user == serializer.instance.owner:
            raise ValidationError("Cannot remove board owner")
        
        serializer.instance.members.remove(user)
        serializer.save()

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_update(self.get_serializer(instance))
        return Response(self.get_serializer(instance).data)


class ListListCreateView(generics.ListCreateAPIView):
    serializer_class = ListSerializer
    permission_classes = [permissions.IsAuthenticated, IsBoardOwnerOrMember]

    def get_queryset(self):
        board = get_object_or_404(Board, pk=self.kwargs['board_pk'])
        self.check_object_permissions(self.request, board)
        return List.objects.filter(board=board)

    def perform_create(self, serializer):
        board = get_object_or_404(Board, pk=self.kwargs['board_pk'])
        self.check_object_permissions(self.request, board)
        serializer.save(board=board)


class ListDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ListSerializer
    permission_classes = [permissions.IsAuthenticated, IsBoardOwnerOrMember]

    def get_queryset(self):
        board = get_object_or_404(Board, pk=self.kwargs['board_pk'])
        self.check_object_permissions(self.request, board)
        return List.objects.filter(board=board)

    def get_object(self):
        obj = get_object_or_404(self.get_queryset(), pk=self.kwargs['pk'])
        self.check_object_permissions(self.request, obj)
        return obj


class CardListCreateView(generics.ListCreateAPIView):
    serializer_class = CardSerializer
    permission_classes = [permissions.IsAuthenticated, IsBoardOwnerOrMember]

    def get_queryset(self):
        board = get_object_or_404(Board, pk=self.kwargs['board_pk'])
        list_obj = get_object_or_404(List, pk=self.kwargs['list_pk'], board=board)
        self.check_object_permissions(self.request, board)
        return Card.objects.filter(list=list_obj)

    def perform_create(self, serializer):
        board = get_object_or_404(Board, pk=self.kwargs['board_pk'])
        list_obj = get_object_or_404(List, pk=self.kwargs['list_pk'], board=board)
        self.check_object_permissions(self.request, board)
        serializer.save(list=list_obj)


class CardDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CardSerializer
    permission_classes = [permissions.IsAuthenticated, IsBoardOwnerOrMember]

    def get_queryset(self):
        board = get_object_or_404(Board, pk=self.kwargs['board_pk'])
        list_obj = get_object_or_404(List, pk=self.kwargs['list_pk'], board=board)
        self.check_object_permissions(self.request, board)
        return Card.objects.filter(list=list_obj)

    def get_object(self):
        obj = get_object_or_404(self.get_queryset(), pk=self.kwargs['pk'])
        self.check_object_permissions(self.request, obj)
        return obj


class CardMoveView(generics.UpdateAPIView):
    """Move a card between lists or reorder within the same list"""
    serializer_class = CardSerializer
    permission_classes = [permissions.IsAuthenticated, IsBoardOwnerOrMember]

    def get_object(self):
        card = get_object_or_404(Card, pk=self.kwargs['pk'])
        self.check_object_permissions(self.request, card.list.board)
        return card

    def perform_update(self, serializer):
        instance = serializer.instance
        old_list = instance.list
        old_position = instance.position
        
        new_position = self.request.data.get('new_position')
        new_list_id = self.request.data.get('new_list_id')
        
        # Validate new_position
        if new_position is None:
            raise ValidationError("new_position is required")
        
        try:
            new_position = int(new_position)
        except (ValueError, TypeError):
            raise ValidationError("new_position must be a valid integer")

        # Get new list (default to current list if not specified)
        if new_list_id:
            new_list = get_object_or_404(List, pk=new_list_id, board=old_list.board)
        else:
            new_list = old_list

        # Validate new_position bounds
        max_position = new_list.cards.count()
        if new_list != old_list:
            max_position += 1  # Adding a card to new list
        
        if new_position < 0 or new_position >= max_position:
            new_position = max(0, max_position - 1)

        # Handle moving between different lists
        if new_list != old_list:
            # Remove from old list: shift positions down for cards after old position
            old_list.cards.filter(position__gt=old_position).update(
                position=models.F('position') - 1
            )
            
            # Add to new list: shift positions up for cards at/after new position
            new_list.cards.filter(position__gte=new_position).update(
                position=models.F('position') + 1
            )
            
            # Update card's list and position
            instance.list = new_list
            instance.position = new_position
        
        # Handle reordering within the same list
        else:
            if new_position != old_position:
                if new_position > old_position:
                    # Moving down: shift cards between old and new position up
                    old_list.cards.filter(
                        position__gt=old_position, 
                        position__lte=new_position
                    ).update(position=models.F('position') - 1)
                elif new_position < old_position:
                    # Moving up: shift cards between new and old position down
                    old_list.cards.filter(
                        position__gte=new_position, 
                        position__lt=old_position
                    ).update(position=models.F('position') + 1)
                
                instance.position = new_position

        instance.save()

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_update(self.get_serializer(instance))
        return Response(self.get_serializer(instance).data)
>>>>>>> gitlab/tripboard-import
