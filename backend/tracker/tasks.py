from datetime import date, timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model
from .models import DailyIntake, UserMacroGoal, UserCustomGoal

def process_daily_records():
    """
    Finalize today's records and create tomorrow's empty records.
    This should be run at midnight by a scheduled task.
    """
    today = timezone.now().date()
    tomorrow = today + timedelta(days=1)
    User = get_user_model()
    
    # Process all active users
    for user in User.objects.filter(is_active=True):
        # Make sure today's record exists
        today_record, _ = DailyIntake.objects.get_or_create(
            user=user,
            date=today
        )
        
        # Create tomorrow's record with goals from user preferences
        try:
            # When creating tomorrow's record, check if user has custom goals
            custom_goals = UserCustomGoal.objects.get(user=user, is_custom=True)
            # Use custom goals if available and manually set
            DailyIntake.objects.get_or_create(
                user=user,
                date=tomorrow,
                defaults={
                    'goal_calorie': custom_goals.daily_calorie,
                    'goal_protein': custom_goals.protein,
                    'goal_carbs': custom_goals.carbs,
                    'goal_fats': custom_goals.fats,
                    'water_goal': custom_goals.water_goal,
                    'actual_calorie': 0,
                    'actual_protein': 0,
                    'actual_carbs': 0,
                    'actual_fats': 0,
                    'water_actual': 0
                }
            )
        except UserCustomGoal.DoesNotExist:
            # Fallback to regular goals
            try:
                user_goals = UserMacroGoal.objects.get(user=user)
                
                # Create tomorrow's record with goals but zero actuals
                DailyIntake.objects.get_or_create(
                    user=user,
                    date=tomorrow,
                    defaults={
                        'goal_calorie': user_goals.daily_calorie,
                        'goal_protein': user_goals.protein,
                        'goal_carbs': user_goals.carbs,
                        'goal_fats': user_goals.fats,
                        'water_goal': user_goals.water_goal,
                        'actual_calorie': 0,
                        'actual_protein': 0,
                        'actual_carbs': 0,
                        'actual_fats': 0,
                        'water_actual': 0
                    }
                )
            except UserMacroGoal.DoesNotExist:
                # If user has no goals set, create with defaults
                DailyIntake.objects.get_or_create(
                    user=user,
                    date=tomorrow
                )