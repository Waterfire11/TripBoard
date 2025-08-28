# boards/urls.py
from django.urls import path
from . import views

urlpatterns = [
    # Board URLs
    path('', views.BoardListCreateView.as_view(), name='boards'),
    path('<int:pk>/', views.BoardDetailView.as_view(), name='board-detail'),
    
    # Board Member Management
    path('<int:pk>/add-member/', views.BoardMemberAddView.as_view(), name='board-add-member'),
    path('<int:pk>/remove-member/', views.BoardMemberRemoveView.as_view(), name='board-remove-member'),
    
    # List URLs
    path('<int:board_pk>/lists/', views.ListListCreateView.as_view(), name='board-lists'),
    path('<int:board_pk>/lists/<int:pk>/', views.ListDetailView.as_view(), name='board-list-detail'),
    
    # Card URLs
    path('<int:board_pk>/lists/<int:list_pk>/cards/', views.CardListCreateView.as_view(), name='list-cards'),
    path('<int:board_pk>/lists/<int:list_pk>/cards/<int:pk>/', views.CardDetailView.as_view(), name='list-card-detail'),
    
    # Card Move URL
    path('cards/<int:pk>/move/', views.CardMoveView.as_view(), name='card-move'),
]