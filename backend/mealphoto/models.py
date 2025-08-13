# mealphoto/models.py
from django.db import models
from django.conf import settings
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.utils import timezone
from datetime import date

class UserPhotoMeal(models.Model):
    """
    Stores a user-uploaded meal photo, with nutritional analysis.
    """
    # User relationship
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='photo_meals')
    
    # Basic meal information
    name = models.CharField(max_length=100, default="Unnamed photo meal")
    calories = models.FloatField(default=0)
    protein = models.FloatField(default=0)
    carbs = models.FloatField(default=0)
    fats = models.FloatField(default=0)
    grams = models.FloatField(default=100.0)
    
    # Photo information
    image_url = models.URLField(blank=True, null=True)
    
    # Additional data in JSON format
    meal_data = models.JSONField(default=dict, blank=True)
    
    # Date tracking
    date = models.DateField(default=date.today)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"{self.name} ({self.calories} kcal) by {self.user} on {self.date}"

    def save(self, *args, **kwargs):
        # Set date from created_at if not explicitly provided
        if not self.date:
            self.date = self.created_at.date()
        
        # Extract nutrition data from meal_data if available
        if not self.calories and 'calories' in self.meal_data:
            self.calories = float(self.meal_data.get('calories', 0))
        if not self.protein and 'protein' in self.meal_data:
            self.protein = float(self.meal_data.get('protein', 0))
        if not self.carbs and 'carbs' in self.meal_data:
            self.carbs = float(self.meal_data.get('carbs', 0))
        if not self.fats and 'fats' in self.meal_data:
            self.fats = float(self.meal_data.get('fats', 0))
        if not self.name and 'name' in self.meal_data:
            self.name = self.meal_data.get('name', 'Unnamed photo meal')
            
        super().save(*args, **kwargs)


@receiver(post_save, sender=UserPhotoMeal)
def update_daily_intake_on_photo_save(sender, instance, **kwargs):
    """Update the daily intake totals when a photo meal is saved"""
    from tracker.models import DailyIntake
    from tracker.views import get_or_create_daily_intake
    
    try:
        # Get or create the daily intake record
        daily_intake = get_or_create_daily_intake(instance.user, instance.date)
        
        # Recalculate totals from all entries for this day
        from mealgpt.models import ManualTrackingDay, ManualTrackingEntry
        
        # Get manual tracking entries
        manual_calories = 0
        manual_protein = 0
        manual_carbs = 0
        manual_fats = 0
        
        try:
            manual_day = ManualTrackingDay.objects.get(user=instance.user, date=instance.date)
            manual_entries = ManualTrackingEntry.objects.filter(day=manual_day)
            manual_calories = sum(e.calories for e in manual_entries)
            manual_protein = sum(e.protein for e in manual_entries)
            manual_carbs = sum(e.carbs for e in manual_entries)
            manual_fats = sum(e.fats for e in manual_entries)
        except ManualTrackingDay.DoesNotExist:
            pass
        
        # Get photo meals for the same day
        photo_meals = UserPhotoMeal.objects.filter(
            user=instance.user,
            date=instance.date
        )
        photo_calories = sum(m.calories for m in photo_meals)
        photo_protein = sum(m.protein for m in photo_meals)
        photo_carbs = sum(m.carbs for m in photo_meals)
        photo_fats = sum(m.fats for m in photo_meals)
        
        # Update the daily intake record with totals from both sources
        daily_intake.actual_calorie = manual_calories + photo_calories
        daily_intake.actual_protein = manual_protein + photo_protein
        daily_intake.actual_carbs = manual_carbs + photo_carbs
        daily_intake.actual_fats = manual_fats + photo_fats
        daily_intake.save()
    except Exception as e:
        print(f"Error updating daily intake from photo meal: {e}")


@receiver(post_delete, sender=UserPhotoMeal)
def update_daily_intake_on_photo_delete(sender, instance, **kwargs):
    """Update the daily intake totals when a photo meal is deleted"""
    from tracker.models import DailyIntake
    
    try:
        # Get the daily intake record
        daily_intake = DailyIntake.objects.get(user=instance.user, date=instance.date)
        
        # Recalculate totals from all entries for this day
        from mealgpt.models import ManualTrackingDay, ManualTrackingEntry
        
        # Get manual tracking entries
        manual_calories = 0
        manual_protein = 0
        manual_carbs = 0
        manual_fats = 0
        
        try:
            manual_day = ManualTrackingDay.objects.get(user=instance.user, date=instance.date)
            manual_entries = ManualTrackingEntry.objects.filter(day=manual_day)
            manual_calories = sum(e.calories for e in manual_entries)
            manual_protein = sum(e.protein for e in manual_entries)
            manual_carbs = sum(e.carbs for e in manual_entries)
            manual_fats = sum(e.fats for e in manual_entries)
        except ManualTrackingDay.DoesNotExist:
            pass
        
        # Get remaining photo meals for the same day
        photo_meals = UserPhotoMeal.objects.filter(
            user=instance.user,
            date=instance.date
        ).exclude(id=instance.id)
        photo_calories = sum(m.calories for m in photo_meals)
        photo_protein = sum(m.protein for m in photo_meals)
        photo_carbs = sum(m.carbs for m in photo_meals)
        photo_fats = sum(m.fats for m in photo_meals)
        
        # Update the daily intake record with totals from both sources
        daily_intake.actual_calorie = manual_calories + photo_calories
        daily_intake.actual_protein = manual_protein + photo_protein
        daily_intake.actual_carbs = manual_carbs + photo_carbs
        daily_intake.actual_fats = manual_fats + photo_fats
        daily_intake.save()
    except DailyIntake.DoesNotExist:
        # This is fine, there's no daily intake to update
        pass
    except Exception as e:
        print(f"Error updating daily intake on photo delete: {e}")
