# mealphoto/serializers.py
from rest_framework import serializers
from .models import UserPhotoMeal

class UserPhotoMealSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPhotoMeal
        fields = '__all__'
        read_only_fields = ['user', 'created_at']
