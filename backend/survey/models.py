# survey/models.py

from django.db import models
from django.conf import settings
from django.contrib.postgres.fields import ArrayField
from django.utils import timezone

class Survey(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='survey'
    )
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    birth_date = models.DateField(null=True, blank=True)
    age = models.IntegerField(null=True, blank=True)
    height_cm = models.FloatField(null=True, blank=True)
    height_feet = models.FloatField(null=True, blank=True)
    weight = models.FloatField(null=True, blank=True)
    weight_lbs = models.FloatField(null=True, blank=True)
    gender = models.CharField(max_length=10)

    # Nutrition Data
    goal = models.CharField(max_length=255, null=True, blank=True)
    bmr = models.FloatField(null=True, blank=True)
    tdee = models.FloatField(null=True, blank=True)
    bmi = models.FloatField(null=True, blank=True)
    bmi_category = models.CharField(max_length=50, null=True, blank=True)
    ideal_weight_range = models.JSONField(null=True, blank=True)
    body_fat_percentage = models.FloatField(null=True, blank=True)
    ideal_body_fat_range = models.JSONField(null=True, blank=True)
    calorie_deficit_surplus = models.FloatField(null=True, blank=True)
    calorie_intake = models.FloatField(null=True, blank=True)
    macros = models.JSONField(null=True, blank=True)

    # Habits Data
    sleep_time = models.TimeField(null=True, blank=True)
    wake_time = models.TimeField(null=True, blank=True)
    sleep_duration = models.FloatField(null=True, blank=True)
    remaining_hours = models.FloatField(default=0)
    activity_data = models.JSONField(null=True, blank=True)

    # Dietary Data
    dietary_option = models.CharField(max_length=255, null=True, blank=True)
    other_diet = models.CharField(max_length=255, null=True, blank=True)

    # Meals Data
    main_meals = models.IntegerField(null=True, blank=True)
    snack_meals = models.IntegerField(null=True, blank=True)
    snack_times = ArrayField(models.TimeField(), null=True, blank=True)
    main_full = models.CharField(max_length=10, null=True, blank=True)
    snacks_full = models.CharField(max_length=10, null=True, blank=True)
    meal_times = models.JSONField(null=True, blank=True)
    meal_types = models.JSONField(null=True, blank=True)
    excluded_items = ArrayField(models.CharField(max_length=255), null=True, blank=True)

    # Health Data
    health_conditions = models.JSONField(null=True, blank=True)

    # Bad Habits
    bad_habits = models.JSONField(null=True, blank=True)

    # Water Data
    water_level = models.FloatField(null=True, blank=True)

    # Disliked Foods and Allergies
    disliked_and_allergies = ArrayField(models.CharField(max_length=255), null=True, blank=True)

    # Created At
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Survey for {self.user.email}"

class Measurement(models.Model):
    survey = models.OneToOneField(Survey, on_delete=models.CASCADE, related_name='measurements')
    neck_size = models.CharField(max_length=10, null=True, blank=True)
    shoulder_size = models.CharField(max_length=10, null=True, blank=True)
    upperArm_size = models.CharField(max_length=10, null=True, blank=True)
    chest_size = models.CharField(max_length=10, null=True, blank=True)
    waist_size = models.CharField(max_length=10, null=True, blank=True)
    leg_size = models.CharField(max_length=10, null=True, blank=True)
    bodyFat = models.CharField(max_length=10, null=True, blank=True)

    def __str__(self):
        return f"Measurements for {self.survey.user.email}"

class MedicineDetail(models.Model):
    survey = models.ForeignKey(Survey, on_delete=models.CASCADE, related_name='medicine_details')
    name = models.CharField(max_length=255)
    dosage_count = models.IntegerField()
    times = ArrayField(models.TimeField(), null=True, blank=True)
    stomach_status = models.CharField(max_length=50, null=True, blank=True)

    def __str__(self):
        return f"MedicineDetail for {self.survey.user.email}: {self.name}"

class DailyIntake(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='daily_intakes'
    )
    date = models.DateField(default=timezone.now)
    calorie_goal = models.FloatField(null=True, blank=True)
    macros_goal = models.JSONField(null=True, blank=True)
    calorie_intake = models.FloatField(default=0.0)
    macros_intake = models.JSONField(default=dict)

    def __str__(self):
        return f"{self.user.email} - {self.date}"
