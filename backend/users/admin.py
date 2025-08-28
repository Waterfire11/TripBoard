from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.forms import UserCreationForm, UserChangeForm
from .models import User, Notification

class CustomUserCreationForm(UserCreationForm):
    """Custom form for creating users in admin."""

    class Meta:
        model = User
        fields = ('username', 'email', 'first_name', 'last_name')

class CustomUserChangeForm(UserChangeForm):
    """Custom form for updating users in admin."""

    class Meta:
        model = User
        fields = '__all__'

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Custom admin for User model."""

    form = CustomUserChangeForm
    add_form = CustomUserCreationForm

    list_display = (
        'email', 'username', 'first_name', 'last_name',
        'is_staff', 'is_active', 'created_at'
    )
    list_filter = (
        'is_staff', 'is_superuser', 'is_active',
        'created_at', 'last_login'
    )
    search_fields = ('email', 'username', 'first_name', 'last_name')
    ordering = ('-created_at',)

    fieldsets = (
        (None, {
            'fields': ('username', 'email', 'password')
        }),
        ('Personal info', {
            'fields': ('first_name', 'last_name')
        }),
        ('Permissions', {
            'fields': (
                'is_active', 'is_staff', 'is_superuser',
                'groups', 'user_permissions'
            ),
        }),
        ('Important dates', {
            'fields': ('last_login', 'created_at')
        }),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': (
                'username', 'email', 'first_name', 'last_name',
                'password1', 'password2'
            ),
        }),
    )

    readonly_fields = ('created_at',)

    def get_form(self, request, obj=None, **kwargs):
        """Override to use different forms for add vs change."""
        if obj is None:
            return self.add_form
        return super().get_form(request, obj, **kwargs)

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'is_read', 'created_at')
    list_filter = ('is_read', 'user')
    search_fields = ('title', 'message')
    ordering = ('-created_at',)
