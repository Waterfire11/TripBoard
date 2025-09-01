from django.contrib import admin
from .models import Location

@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    list_display = ('name', 'board', 'lat', 'lng', 'created_by', 'created_at')
    list_filter = ('board', 'created_by')
    search_fields = ('name',)