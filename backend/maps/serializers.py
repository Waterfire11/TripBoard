from rest_framework import serializers
from .models import Location
from users.serializers import UserSerializer

class LocationSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)

    class Meta:
        model = Location
        fields = [
            'id', 'board', 'name', 'lat', 'lng',
            'created_by', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'board', 'created_by', 'created_at', 'updated_at']

    def validate_lat(self, value):
        if not -90 <= value <= 90:
            raise serializers.ValidationError("Latitude must be between -90 and 90.")
        return value

    def validate_lng(self, value):
        if not -180 <= value <= 180:
            raise serializers.ValidationError("Longitude must be between -180 and 180.")
        return value