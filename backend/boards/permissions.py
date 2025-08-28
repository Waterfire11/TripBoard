# boards/permissions.py
from rest_framework.permissions import BasePermission
from django.shortcuts import get_object_or_404
from .models import Board

class IsBoardOwnerOrMember(BasePermission):
    """
    Custom permission to only allow board owners or members to access board-related objects.
    - Read permissions: Board owner or members
    - Write permissions: Board owner only
    """
    
    def has_object_permission(self, request, view, obj):
        # Determine the board object based on the object type
        if hasattr(obj, 'owner'):  # Board object
            board = obj
        elif hasattr(obj, 'board'):  # List object
            board = obj.board
        elif hasattr(obj, 'list'):  # Card object
            board = obj.list.board
        else:
            return False
            
        # Check for share query param
        share = request.query_params.get('share')
        if share == 'read':
            return True  # Allow read for shared
        elif share == 'edit' and request.method not in ['GET', 'HEAD', 'OPTIONS']:
            return board.owner == request.user or request.user in board.members.all()  # Edit for members/owner
        
        # Read permissions for owner and members
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return board.owner == request.user or request.user in board.members.all()
        
        # Write permissions only for owner
        return board.owner == request.user