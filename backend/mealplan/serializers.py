from rest_framework import serializers
from .models import MealPlan, Day, Meal, Food, DailyTotal

class FoodSerializer(serializers.ModelSerializer):
    class Meta:
        model = Food
        fields = [
            'id',
            'name',
            'portion_type',
            'portion_count',
            'portion_metric_unit',
            'portion_metric',
            'calories',
            'protein',
            'carbs',
            'fats',
            'tarif',
            'ana_bilesenler',
            'consumed'
        ]


class MealSerializer(serializers.ModelSerializer):
    foods = FoodSerializer(many=True, read_only=True)

    class Meta:
        model = Meal
        fields = [
            'id',
            'name',
            'displayed_name',
            'order',
            'meal_time',
            'consumed',
            'foods'
        ]


class DailyTotalSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyTotal
        fields = [
            'calorie',
            'protein',
            'carbohydrate',
            'fat',
        ]


class DaySerializer(serializers.ModelSerializer):
    meals = MealSerializer(many=True, read_only=True)
    daily_total = DailyTotalSerializer(read_only=True)

    class Meta:
        model = Day
        fields = [
            'id',
            'day_number',
            'date',
            'meals',
            'daily_total',
        ]


class MealPlanSerializer(serializers.ModelSerializer):
    days = DaySerializer(many=True, read_only=True)

    class Meta:
        model = MealPlan
        fields = [
            'id',
            'user',
            'week_start_date',
            'created_at',
            'days',
        ]
