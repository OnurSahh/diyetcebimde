#tracker/models.py
from django.db import models
from django.conf import settings
from django.utils import timezone

class UserMacroGoal(models.Model):
    """
    Kullanıcının hedef makroları (Survey'den de gelebilir).
    """
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    daily_calorie = models.FloatField(default=2000)  # Hedef kalori
    protein = models.FloatField(default=100)
    carbs = models.FloatField(default=250)
    fats = models.FloatField(default=70)
    water_goal = models.IntegerField(default=2500)  # ml cinsinden su hedefi
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"MacroGoal for {self.user} => {self.daily_calorie} kcal"


class UserCustomGoal(models.Model):
    """
    Kullanıcının manuel olarak ayarladığı özel hedefler.
    Varsayılan olarak survey'den gelen değerlerle doldurulur,
    ama kullanıcı bunları değiştirebilir.
    """
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    daily_calorie = models.FloatField()
    protein = models.FloatField()
    carbs = models.FloatField()
    fats = models.FloatField()
    water_goal = models.IntegerField()
    is_custom = models.BooleanField(default=False)  # True if user manually edited
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Custom Goal for {self.user} => {self.daily_calorie} kcal"


class DailyIntake(models.Model):
    """
    Kullanıcının her gün tükettiği TOPLAM macro/kcal değerleri
    Hem hedef (goal) hem de gerçekleşen (actual) değerleri içerir.
    """
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    date = models.DateField()

    # Hedef (goal) alanları
    goal_calorie = models.FloatField(default=0.0)
    goal_protein = models.FloatField(default=0.0)
    goal_carbs   = models.FloatField(default=0.0)
    goal_fats    = models.FloatField(default=0.0)
    water_goal   = models.IntegerField(default=2500)  # ml cinsinden

    # Gerçekleşen (actual) alanları
    actual_calorie = models.FloatField(default=0.0)
    actual_protein = models.FloatField(default=0.0)
    actual_carbs   = models.FloatField(default=0.0)
    actual_fats    = models.FloatField(default=0.0)
    water_actual   = models.IntegerField(default=0)   # ml cinsinden

    class Meta:
        unique_together = ('user', 'date')

    def __str__(self):
        return f"{self.user} {self.date} => actual={self.actual_calorie} / goal={self.goal_calorie}"


class WeightHistory(models.Model):
    """
    Kullanıcının kilo takibi
    """
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    date = models.DateField()
    weight = models.FloatField()  # kg cinsinden
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'date')
        ordering = ['-date']

    def __str__(self):
        return f"{self.user} {self.date} => {self.weight}kg"
