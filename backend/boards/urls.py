from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BoardViewSet, ListViewSet, CardViewSet, SharedBoardView, MemberViewSet

router = DefaultRouter()
router.register(r"boards", BoardViewSet, basename="board")
router.register(r'lists',  ListViewSet,  basename='list')
router.register(r'cards',  CardViewSet,  basename='card')

member_list   = MemberViewSet.as_view({"get": "list", "post": "create"})
member_detail = MemberViewSet.as_view({"get": "retrieve", "patch": "update", "delete": "destroy"})

list_list     = ListViewSet.as_view({"get": "list", "post": "create"})
list_detail   = ListViewSet.as_view({"get": "retrieve", "patch": "partial_update", "delete": "destroy"})
list_reorder_flat  = ListViewSet.as_view({"post": "reorder", "patch": "reorder"})

card_list     = CardViewSet.as_view({"get": "list", "post": "create"})
card_detail   = CardViewSet.as_view({"get": "retrieve", "patch": "partial_update", "delete": "destroy"})
card_reorder_flat  = CardViewSet.as_view({"post": "reorder", "patch": "reorder"})

urlpatterns = [
    path("", include(router.urls)),

    path("boards/<uuid:board_id>/members/", member_list, name="board-members"),
    path("boards/<uuid:board_id>/members/<pk>/", member_detail, name="board-member-detail"),

    # lists
    path("boards/<uuid:board_id>/lists/", list_list, name="list-list"),
    path("boards/<uuid:board_id>/lists/<uuid:pk>/", list_detail, name="list-detail"),
    path("boards/<uuid:board_id>/lists/<uuid:pk>/reorder/", list_reorder_flat, name="list-reorder-flat"),

    # cards
    path("lists/<uuid:list_id>/cards/", card_list, name="card-list"),
    path("cards/<uuid:pk>/", card_detail, name="card-detail"),
    path("cards/<uuid:pk>/reorder/", CardViewSet.as_view({"post": "reorder"}), name="card-reorder"),

    # share-only
    path("boards/shared/<uuid:share_token>/", SharedBoardView.as_view(), name="board-shared"),

# ✅ 测试 1 需要的端点：按 board 维度重排 lists（集合级）
    path(
        "boards/<uuid:board_id>/lists/reorder/",
        ListViewSet.as_view({"post": "reorder_bulk"}),
        name="list-reorder-bulk",
    ),

    # ✅ 测试 2 需要的端点：按 card id 重排/移动（detail 级）
    path(
        "cards/<uuid:pk>/reorder/",
        CardViewSet.as_view({"post": "reorder"}),
        name="card-reorder-flat",
    ),
]

""