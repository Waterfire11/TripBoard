# backend/boards/permissions.py
from rest_framework.permissions import BasePermission, SAFE_METHODS
from .models import Board

class IsBoardEditorOrReadOnly(BasePermission):
    """
    - viewer：只允许 SAFE_METHODS（GET/HEAD/OPTIONS）
    - editor/owner：允许所有
    - 非成员：拒绝
    说明：视图需要提供 view.get_target_board(request) 来返回 Board 实例
    """

    message = "Only editors/owners can modify this board."

    def has_permission(self, request, view):
        # 只做认证检查和能否拿到 board
        if not request.user or not request.user.is_authenticated:
            return False

        board = None
        if hasattr(view, "get_target_board"):
            board = view.get_target_board(request)
        if board is None:
            # 某些 action（如列表）没有 board 时，不放行
            return False

        role = board.role_of(request.user)  # 建议在 Board 模型里已有/新增这个辅助方法
        if role in ("owner", "editor"):
            return True
        if role == "viewer":
            return request.method in SAFE_METHODS
        return False

class IsBoardOwner(BasePermission):
    message = "Only the board owner can manage members."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        board = getattr(view, "get_target_board", lambda req: None)(request)
        if board is None:
            return False
        return board.role_of(request.user) == "owner"

class CanManageMembers(BasePermission):
    """
    仅 board.owner 可管理成员；读取成员列表也可以放开给 editor/viewer，
    但创建/修改/删除只允许 owner。
    """
    def has_permission(self, request, view):
        board = getattr(view, "board", None)
        if not board:
            return False
        # 只读方法可以放开给能读 board 的人（可选）
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return True
        return board.owner_id == request.user.id