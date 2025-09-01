from django.urls import path
from . import views

urlpatterns = [
    # Locations for a board
    path('boards/<int:board_id>/locations/', views.LocationListCreateView.as_view(), name='board-locations'),
    
    # Location detail (global, not nested under board)
    path('locations/<int:pk>/', views.LocationDetailView.as_view(), name='location-detail'),
]