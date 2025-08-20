from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import RegisterAPIView, UserDetailAPIView, LogoutAPIView, LogoutAllAPIView

urlpatterns = [
    path('auth/register/', RegisterAPIView.as_view(), name='register'),


    path('auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),


    path('auth/logout/', LogoutAPIView.as_view(), name='logout'),
    path('auth/logout_all/', LogoutAllAPIView.as_view(), name='logout_all'),


    path('auth/user/', UserDetailAPIView.as_view(), name='user-detail'),
]
