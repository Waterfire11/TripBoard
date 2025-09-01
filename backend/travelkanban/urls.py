from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from django.conf import settings
from django.conf.urls.static import static

def api_root(request):
    """Root API endpoint with basic info and available endpoints"""
    return JsonResponse({
        'message': 'Travel Kanban API',
        'version': '1.0.0',
        'status': 'active',
        'endpoints': {
            'auth': '/api/auth/',  # Updated to reflect new auth path
            'users': '/api/users/',
            'boards': '/api/boards/',
            'cards': '/api/cards/',
            'budget': '/api/budget/',
            'maps': '/api/maps/',
            'admin': '/admin/',
            'health': '/api/health/',
        },
        'documentation': 'Visit /admin/ for API administration'
    })

def health_check(request):
    """Health check endpoint for deployment monitoring"""
    return JsonResponse({
        'status': 'healthy',
        'message': 'Travel Kanban API is running successfully',
        'debug_mode': settings.DEBUG
    })

urlpatterns = [
    # Django admin
    path('admin/', admin.site.urls),

    # API root and health endpoints
    path('api/', api_root, name='api_root'),
    path('api/health/', health_check, name='health_check'),
    path('', api_root, name='home'),  # Root URL also shows API info

    # Authentication endpoints - separated from user management
    path('api/auth/', include('users.auth_urls')),
    
    # User management endpoints (for future user listing, searching, etc.)
    path('api/users/', include('users.urls')),
    
    # Other app endpoints
    path('api/boards/', include('boards.urls')),
    path('api/budget/', include('budget.urls')),
    path('api/maps/', include('maps.urls')),
]

# Serve media and static files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATICFILES_DIRS[0])