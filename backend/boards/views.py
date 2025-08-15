from django.db.models import Max, Sum
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Board, List, Card
from .serializers import BoardSerializer, ListSerializer, CardSerializer

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
    serializer_class = BoardSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwner]

    def get_queryset(self):
        return Board.objects.filter(owner=self.request.user).prefetch_related("lists__cards")

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=["get"])
    def budget(self, request, pk=None):

        board = self.get_object()
        qs = Card.objects.filter(list__board=board)
        board_total = qs.aggregate(total=Sum("budget"))["total"] or 0
        by_list = (
            qs.values("list__id", "list__title")
              .annotate(total=Sum("budget"))
              .order_by("list__title")
        )
        return Response({"board_total": board_total, "by_list": list(by_list)})

class ListViewSet(viewsets.ModelViewSet):
    serializer_class = ListSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwner]

    def get_queryset(self):
        board_id = self.kwargs.get("board_id")
        return List.objects.filter(board__owner=self.request.user, board_id=board_id)

    def perform_create(self, serializer):
        board = get_object_or_404(Board, pk=self.kwargs["board_id"], owner=self.request.user)
        max_pos = List.objects.filter(board=board).aggregate(m=Max("position"))["m"] or 0
        serializer.save(board=board, position=max_pos + 1)

    @action(detail=True, methods=["patch"])
    def reorder(self, request, board_id=None, pk=None):
        lst = self.get_object()
        new_pos = int(request.data.get("position", lst.position))
        lst.position = new_pos
        lst.save()
        return Response(ListSerializer(lst).data)

class CardViewSet(viewsets.ModelViewSet):
    serializer_class = CardSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwner]

    def get_queryset(self):
        list_id = self.kwargs.get("list_id")
        if list_id:
            return Card.objects.filter(list__board__owner=self.request.user, list_id=list_id)

        return Card.objects.filter(list__board__owner=self.request.user)

    def perform_create(self, serializer):
        list_id = self.kwargs.get("list_id")
        lst = get_object_or_404(List, pk=list_id, board__owner=self.request.user)
        max_pos = Card.objects.filter(list=lst).aggregate(m=Max("position"))["m"] or 0
        serializer.save(list=lst, position=max_pos + 1)

    @action(detail=True, methods=["patch"])
    def reorder(self, request, pk=None, list_id=None):
        card = self.get_object()
        new_pos = int(request.data.get("position", card.position))
        card.position = new_pos
        card.save()
        return Response(CardSerializer(card).data)

class SharedBoardView(APIView):

    permission_classes = [permissions.AllowAny]

    def get(self, request, token):
        board = get_object_or_404(Board, share_token=token, is_shared_readonly=True)
        data = BoardSerializer(board).data
        return Response(data)
