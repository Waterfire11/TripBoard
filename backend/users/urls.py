from django.urls import path
from . import views

# URL namespace for the users app
app_name = 'users'

urlpatterns = [
    # Health check endpoint (kept here for consistency)
    path('health/', views.health_check, name='health_check'),

    # Notifications
    path('notifications/', views.NotificationListView.as_view(), name='notifications'),

    # Future user management endpoints
    # These will be useful when you need user listing, searching, etc.
    # path('', views.UserListView.as_view(), name='user_list'),
    # path('<int:pk>/', views.UserDetailView.as_view(), name='user_detail'),
]
