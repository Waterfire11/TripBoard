from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BoardViewSet, ListViewSet, CardViewSet, SharedBoardView

router = DefaultRouter()
router.register(r"boards", BoardViewSet, basename="board")


list_list     = ListViewSet.as_view({"get": "list", "post": "create"})
list_detail   = ListViewSet.as_view({"get": "retrieve", "patch": "partial_update", "delete": "destroy"})
list_reorder  = ListViewSet.as_view({"patch": "reorder"})

card_list     = CardViewSet.as_view({"get": "list", "post": "create"})
card_detail   = CardViewSet.as_view({"get": "retrieve", "patch": "partial_update", "delete": "destroy"})
card_reorder  = CardViewSet.as_view({"patch": "reorder"})

urlpatterns = [
    path("", include(router.urls)),

    # lists
    path("boards/<uuid:board_id>/lists/", list_list, name="list-list"),
    path("boards/<uuid:board_id>/lists/<uuid:pk>/", list_detail, name="list-detail"),
    path("boards/<uuid:board_id>/lists/<uuid:pk>/reorder/", list_reorder, name="list-reorder"),

    # cards
    path("lists/<uuid:list_id>/cards/", card_list, name="card-list"),
    path("cards/<uuid:pk>/", card_detail, name="card-detail"),
    path("lists/<uuid:list_id>/cards/<uuid:pk>/reorder/", card_reorder, name="card-reorder"),

    # share-only
    path("boards/shared/<uuid:token>/", SharedBoardView.as_view(), name="board-shared"),
]
