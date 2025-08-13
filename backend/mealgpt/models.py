from django.db import models
from django.conf import settings
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

class ManualTrackingDay(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='manual_tracking_days'
    )
    date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'date')
        ordering = ['-date']

    def __str__(self):
        return f"Manual tracking for {self.user.username} on {self.date}"


class ManualTrackingEntry(models.Model):
    day = models.ForeignKey(ManualTrackingDay, on_delete=models.CASCADE, related_name='entries')
    name = models.CharField(max_length=100)
    calories = models.FloatField()
    protein = models.FloatField()
    carbs = models.FloatField()
    fats = models.FloatField()
    grams = models.FloatField(default=100.0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.calories} kcal) on {self.day.date}"


@receiver(post_save, sender=ManualTrackingEntry)
def update_daily_intake_on_entry_save(sender, instance, **kwargs):
    """Update the daily intake totals when a manual entry is saved"""
    from tracker.models import DailyIntake
    
    # Get the date from the parent day
    entry_date = instance.day.date
    
    try:
        # Get or create the daily intake record
        from tracker.views import get_or_create_daily_intake
        daily_intake = get_or_create_daily_intake(instance.day.user, entry_date)
        
        # Recalculate totals from all manual entries for this day
        entries = ManualTrackingEntry.objects.filter(day=instance.day)
        total_calories = sum(e.calories for e in entries)
        total_protein = sum(e.protein for e in entries)
        total_carbs = sum(e.carbs for e in entries)
        total_fats = sum(e.fats for e in entries)
        
        # Update the daily intake record
        daily_intake.actual_calorie = total_calories
        daily_intake.actual_protein = total_protein
        daily_intake.actual_carbs = total_carbs
        daily_intake.actual_fats = total_fats
        daily_intake.save()
    except Exception as e:
        print(f"Error updating daily intake: {e}")


@receiver(post_delete, sender=ManualTrackingEntry)
def update_daily_intake_on_entry_delete(sender, instance, **kwargs):
    """Update the daily intake totals when a manual entry is deleted"""
    # Similar to post_save, but we need to handle the case where all entries for a day are deleted
    from tracker.models import DailyIntake
    
    # Get the date from the parent day
    entry_date = instance.day.date
    day = instance.day
    
    try:
        # Get the daily intake record
        daily_intake = DailyIntake.objects.get(user=day.user, date=entry_date)
        
        # Recalculate totals from remaining manual entries for this day
        entries = ManualTrackingEntry.objects.filter(day=day)
        total_calories = sum(e.calories for e in entries)
        total_protein = sum(e.protein for e in entries)
        total_carbs = sum(e.carbs for e in entries)
        total_fats = sum(e.fats for e in entries)
        
        # Update the daily intake record
        daily_intake.actual_calorie = total_calories
        daily_intake.actual_protein = total_protein
        daily_intake.actual_carbs = total_carbs
        daily_intake.actual_fats = total_fats
        daily_intake.save()
    except DailyIntake.DoesNotExist:
        # This is fine, there's no daily intake to update
        pass
    except Exception as e:
        print(f"Error updating daily intake on delete: {e}")