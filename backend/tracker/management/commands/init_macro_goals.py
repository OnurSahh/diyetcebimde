from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from tracker.models import UserMacroGoal
from survey.models import Survey

class Command(BaseCommand):
    help = 'Initialize UserMacroGoal records from Survey data'

    def handle(self, *args, **kwargs):
        User = get_user_model()
        
        for user in User.objects.all():
            try:
                # Check if user already has macro goals
                if UserMacroGoal.objects.filter(user=user).exists():
                    self.stdout.write(self.style.SUCCESS(f'User {user} already has macro goals'))
                    continue
                
                # Try to get survey data
                survey = Survey.objects.get(user=user)
                
                # Extract macros from survey - ensure we have values
                try:
                    calorie_intake = float(survey.calorie_intake) if survey.calorie_intake is not None else 2000
                except (TypeError, ValueError):
                    calorie_intake = 2000
                
                # Get macros from JSON field with safe defaults
                try:
                    macros = survey.macros if isinstance(survey.macros, dict) else {}
                    protein = float(macros.get('protein', 100)) if macros.get('protein') is not None else 100
                    carbs = float(macros.get('carbs', 250)) if macros.get('carbs') is not None else 250
                    fats = float(macros.get('fats', 70)) if macros.get('fats') is not None else 70
                except (TypeError, ValueError, AttributeError):
                    # Fallback to default values
                    protein = 100
                    carbs = 250
                    fats = 70
                
                # Get water goal with safe conversion
                try:
                    water_goal = int(survey.water_level * 1000) if survey.water_level is not None else 2500
                except (TypeError, ValueError, AttributeError):
                    water_goal = 2500
                
                # Validate values to ensure no nulls
                if protein is None: protein = 100
                if carbs is None: carbs = 250
                if fats is None: fats = 70
                if water_goal is None: water_goal = 2500
                
                # Create UserMacroGoal
                UserMacroGoal.objects.create(
                    user=user,
                    daily_calorie=calorie_intake,
                    protein=protein,
                    carbs=carbs,
                    fats=fats,
                    water_goal=water_goal
                )
                
                self.stdout.write(self.style.SUCCESS(
                    f'Created macro goals for {user}: {calorie_intake} kcal, '
                    f'{protein}g protein, {carbs}g carbs, {fats}g fats'
                ))
                
            except Survey.DoesNotExist:
                # Create default goals for users without survey
                UserMacroGoal.objects.create(
                    user=user,
                    daily_calorie=2000,
                    protein=100,
                    carbs=250,
                    fats=70,
                    water_goal=2500
                )
                self.stdout.write(self.style.WARNING(
                    f'No survey data for {user}, created default goals'
                ))
            except Exception as e:
                self.stdout.write(self.style.ERROR(
                    f'Error creating goals for {user}: {str(e)}'
                ))