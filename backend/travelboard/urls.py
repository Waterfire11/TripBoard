"""
URL configuration for travelboard project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.http import HttpResponse
from django.urls import path, include
from . import views
from .views import home

urlpatterns = [
    #path('', lambda request: HttpResponse("🚀 TravelBoard The backend service is started！"), name='home'),
    path('', views.home, name='home'),
    path('admin/', admin.site.urls),

    path('', views.home, name='home'),

    path("api/auth/", include("accounts.urls")),

    path('api/', include('boards.urls')),
    path("api/auth/", include("rest_framework.urls")),

    path('accounts/', include('django.contrib.auth.urls')),
    path('accounts/signup/', views.signup, name='signup'),
    path('accounts/me/', views.me, name='me'),
    path('accounts/sessions/', views.sessions, name='sessions'),
]
