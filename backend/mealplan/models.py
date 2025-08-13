from django.db import models
from django.conf import settings

class MealPlan(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='meal_plans'
    )
    week_start_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Meal Plan for {self.user} starting {self.week_start_date}"


class Day(models.Model):
    meal_plan = models.ForeignKey(MealPlan, on_delete=models.CASCADE, related_name='days')
    day_number = models.PositiveIntegerField()
    date = models.DateField()

    def __str__(self):
        return f"Day {self.day_number} - {self.date}"


class Meal(models.Model):
    day = models.ForeignKey(Day, on_delete=models.CASCADE, related_name='meals')
    name = models.CharField(max_length=50)  # Teknik isim => "Ana Öğün-1", "Ara Öğün 1" vs
    displayed_name = models.CharField(max_length=100, blank=True, default='')  # Kullanıcıya gözükecek
    order = models.PositiveIntegerField(default=1)
    meal_time = models.TimeField(default='00:00')
    consumed = models.BooleanField(default=False)  # Öğünün tamamının tüketilip tüketilmediğini izleme

    def __str__(self):
        return f"Meal: {self.displayed_name} (Day {self.day.day_number}, consumed={self.consumed})"


class Food(models.Model):
    meal = models.ForeignKey(Meal, on_delete=models.CASCADE, related_name='foods')
    name = models.CharField(max_length=100)
    portion_type = models.CharField(max_length=50, blank=True, null=True)
    portion_count = models.FloatField(default=1.0)
    portion_metric_unit = models.CharField(max_length=20, blank=True, null=True)
    portion_metric = models.FloatField(default=0.0)
    calories = models.FloatField()
    protein = models.FloatField()
    carbs = models.FloatField()
    fats = models.FloatField()
    tarif = models.TextField(blank=True, null=True)
    ana_bilesenler = models.TextField(blank=True, null=True)
    consumed = models.BooleanField(default=False)  # Tek tek yemek bazında tüketim bilgisi

    def __str__(self):
        return f"{self.name} ({self.portion_count} {self.portion_type})"


class DailyTotal(models.Model):
    day = models.OneToOneField(Day, on_delete=models.CASCADE, related_name='daily_total')
    calorie = models.FloatField()
    protein = models.FloatField()
    carbohydrate = models.FloatField()
    fat = models.FloatField()

    def __str__(self):
        return f"Totals for Day {self.day.day_number}"


class FoodItem(models.Model):
    """
    Database model for food items replacing the yemekler_yeni.csv file
    """
    food_id = models.AutoField(primary_key=True)
    food_name = models.CharField(max_length=255)
    calories = models.FloatField(default=0.0)
    protein = models.FloatField(default=0.0)
    carbs = models.FloatField(default=0.0)
    fats = models.FloatField(default=0.0)
    portion_type = models.CharField(max_length=100, default='portion')
    min_portion_size = models.FloatField(default=1.0)
    portion_increment = models.FloatField(default=1.0)
    metric_type = models.CharField(max_length=50, default='gram')
    metric_amount = models.FloatField(default=100.0)
    main_ingredients = models.TextField(blank=True)
    recipe = models.TextField(blank=True)
    max_portion = models.FloatField(default=10.0)
    
    def __str__(self):
        return f"{self.food_name} ({self.calories} kcal)"
