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

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


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