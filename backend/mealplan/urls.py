from django.urls import path
from .views import (
    generate_meal_plan,
    get_meal_plan,
    mark_food_consumed,
    mark_meal_consumed,
    bulk_update_consumed
)

urlpatterns = [
    path('generate-meal-plan/', generate_meal_plan, name='generate_meal_plan'),
    path('get-meal-plan/', get_meal_plan, name='get_meal_plan'),
    path('mark-food-consumed/', mark_food_consumed, name='mark_food_consumed'),
    path('mark-meal-consumed/', mark_meal_consumed, name='mark_meal_consumed'),
    path('bulk-update-consumed/', bulk_update_consumed, name='bulk_update_consumed'),
]
