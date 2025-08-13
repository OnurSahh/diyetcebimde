from tracker.models import DailyIntake

def update_daily_intake(user, date, calories, protein, carbs, fats):
    """
    ...
    """
    di, created = DailyIntake.objects.get_or_create(
        user=user,
        date=date,
        defaults={
            "goal_calorie": 0.0,
            "goal_protein": 0.0,
            "goal_carbs":   0.0,
            "goal_fats":    0.0
        }
    )
    di.actual_calorie += calories
    di.actual_protein += protein
    di.actual_carbs   += carbs
    di.actual_fats    += fats
    di.save()


def remove_daily_intake(user, date, calories, protein, carbs, fats):
    """
    Bir yemek iade edilir veya 'consumed=False' yapılırsa, actual makrolardan geri alır.
    """
    try:
        di = DailyIntake.objects.get(user=user, date=date)
    except DailyIntake.DoesNotExist:
        return  # Yoksa pas

    di.actual_calorie = max(0, di.actual_calorie - calories)
    di.actual_protein = max(0, di.actual_protein - protein)
    di.actual_carbs   = max(0, di.actual_carbs - carbs)
    di.actual_fats    = max(0, di.actual_fats - fats)
    di.save()

# tracker/utils.py

def sync_daily_intakes_for_user(user, lookback=90, lookahead=7):
    from mealplan.models import MealPlan, Day
    from django.utils import timezone
    from tracker.models import DailyIntake
    from datetime import timedelta
    
    # 1) lookback gününden daha eski kayıtları silelim
    oldest_allowed = timezone.now().date() - timedelta(days=lookback)
    DailyIntake.objects.filter(user=user, date__lt=oldest_allowed).delete()

    try:
        mealplan = MealPlan.objects.get(user=user)
    except MealPlan.DoesNotExist:
        print("[sync_daily_intakes_for_user] No plan => done.")
        return

    # 2) Var olan plan günlerinin DailyIntake'lerini güncelle
    for day_obj in mealplan.days.all():
        dt = day_obj.date
        if hasattr(day_obj, 'daily_total'):
            gcal = day_obj.daily_total.calorie
            gprot = day_obj.daily_total.protein
            gcarb = day_obj.daily_total.carbohydrate
            gfat  = day_obj.daily_total.fat
        else:
            gcal = 0
            gprot = 0
            gcarb = 0
            gfat  = 0

        di, created = DailyIntake.objects.get_or_create(user=user, date=dt)
        di.goal_calorie = gcal
        di.goal_protein = gprot
        di.goal_carbs   = gcarb
        di.goal_fats    = gfat
        di.save()

    # 3) Geleceğe yönelik lookahead kadar gün isterseniz create edebilirsiniz (opsiyonel)
    # ...
    
    print(f"[sync_daily_intakes_for_user] => completed for user={user}, with lookback={lookback}, lookahead={lookahead}")
