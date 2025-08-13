from rest_framework import serializers
from .models import DailyIntake, UserMacroGoal, WeightHistory, UserCustomGoal

class UserMacroGoalSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserMacroGoal
        fields = ['daily_calorie', 'protein', 'carbs', 'fats', 'water_goal']
        

class DailyIntakeSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyIntake
        fields = [
            'date', 
            'goal_calorie', 'goal_protein', 'goal_carbs', 'goal_fats', 'water_goal',
            'actual_calorie', 'actual_protein', 'actual_carbs', 'actual_fats', 'water_actual'
        ]


class WeightHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = WeightHistory
        fields = ['date', 'weight', 'notes']

class UserCustomGoalSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserCustomGoal
        fields = ['daily_calorie', 'protein', 'carbs', 'fats', 'water_goal', 'is_custom']

class GoalComparisonSerializer(serializers.Serializer):
    """
    Both recommended and custom goals for comparison in the UI
    """
    recommended = UserMacroGoalSerializer()
    custom = UserCustomGoalSerializer()
