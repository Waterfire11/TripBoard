from rest_framework import generics, permissions
from rest_framework.exceptions import ValidationError
from django.shortcuts import get_object_or_404
from .models import Location
from .serializers import LocationSerializer
from boards.models import Board
from boards.permissions import IsBoardOwnerOrMember

class LocationListCreateView(generics.ListCreateAPIView):
    serializer_class = LocationSerializer
    permission_classes = [permissions.IsAuthenticated, IsBoardOwnerOrMember]

    def get_queryset(self):
        board = get_object_or_404(Board, pk=self.kwargs['board_id'])
        self.check_object_permissions(self.request, board)
        return Location.objects.filter(board=board)

    def perform_create(self, serializer):
        board = get_object_or_404(Board, pk=self.kwargs['board_id'])
        self.check_object_permissions(self.request, board)
        serializer.save(
            board=board,
            created_by=self.request.user
        )

class LocationDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = LocationSerializer
    permission_classes = [permissions.IsAuthenticated, IsBoardOwnerOrMember]

    def get_queryset(self):
        return Location.objects.all()

    def get_object(self):
        obj = get_object_or_404(Location, pk=self.kwargs['pk'])
        self.check_object_permissions(self.request, obj)
        return obj