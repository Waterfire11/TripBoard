from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

# FIX: Create a custom view for token refresh to use the custom serializer
class CustomTokenRefreshView(TokenRefreshView):
    serializer_class = views.CustomTokenRefreshSerializer  # Reference the custom serializer

urlpatterns = [
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.CustomTokenObtainPairView.as_view(), name='login'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('me/', views.MeView.as_view(), name='me'),
    path('me/delete/', views.UserDeleteView.as_view(), name='user-delete'),
    path('token/refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),  # FIXED: Use custom view
    path('invite/', views.InviteView.as_view(), name='invite'),
    path('notifications/', views.NotificationListView.as_view(), name='notifications'), 
]