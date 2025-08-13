# mealplan/views.py

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .utils import generate_and_optimize_mealplan_for_user
from .models import MealPlan, Food, Meal
from .serializers import MealPlanSerializer, FoodSerializer
from tracker.utils import update_daily_intake, remove_daily_intake, sync_daily_intakes_for_user
import traceback

TURKCE_MEALTYPE_MAP = {
    "breakfast": "Kahvaltı",
    "lunch": "Öğle Yemeği",
    "dinner": "Akşam Yemeği",
    "snack": "Ara Öğün",
    "ana öğün-1": "Kahvaltı",
    "ana öğün-2": "Öğle Yemeği",
    "ana öğün-3": "Akşam Yemeği",
}


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_meal_plan(request):
    user = request.user
    try:
        print("[DEBUG] generate_meal_plan => user:", user)
        mealplan_obj = generate_and_optimize_mealplan_for_user(user)
        if not mealplan_obj:
            return Response({"detail": "Plan oluşturulamadı veya Survey eksik."},
                            status=status.HTTP_400_BAD_REQUEST)
        
        # plan oluşturulunca tracker'a da (DailyIntake) hedef değerleri kaydedelim
        sync_daily_intakes_for_user(user=user, lookback=90, lookahead=7)

        ser = MealPlanSerializer(mealplan_obj)
        return Response(ser.data, status=status.HTTP_200_OK)
    except Exception as e:
        print("[ERROR] Exception in generate_meal_plan =>", e)
        traceback.print_exc()
        return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_meal_plan(request):
    user = request.user
    try:
        mp = MealPlan.objects.get(user=user)
        ser = MealPlanSerializer(mp)
        return Response(ser.data, status=status.HTTP_200_OK)
    except MealPlan.DoesNotExist:
        return Response({"detail": "Plan yok"}, status=status.HTTP_404_NOT_FOUND)


def _cannot_mark_consumed(meal: Meal):
    # İstersen öğün saatine göre kısıt koyabilirsin. Şimdilik hep False dönüyoruz.
    return False


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_food_consumed(request):
    """
    Request Body: { "food_id": 123, "is_eaten": true/false }
    Toggles the consumed state of the given food.
    """
    user = request.user
    food_id = request.data.get("food_id")
    # Default to True if not provided, but we expect the client to pass it.
    is_eaten = request.data.get("is_eaten", True)
    
    if food_id is None:
        return Response({"detail": "food_id is required."}, status=400)

    try:
        food = Food.objects.get(id=food_id, meal__day__meal_plan__user=user)
    except Food.DoesNotExist:
        return Response({"detail": "Food not found."}, status=404)

    if _cannot_mark_consumed(food.meal):
        return Response({"detail": "Not allowed at this time."}, status=403)

    # If the client wants to mark the food as eaten
    if is_eaten and not food.consumed:
        update_daily_intake(
            user=user,
            date=food.meal.day.date,
            calories=food.calories,
            protein=food.protein,
            carbs=food.carbs,
            fats=food.fats
        )
        food.consumed = True
        food.save()

    # If the client wants to unmark (i.e. set as not eaten)
    elif not is_eaten and food.consumed:
        remove_daily_intake(
            user=user,
            date=food.meal.day.date,
            calories=food.calories,
            protein=food.protein,
            carbs=food.carbs,
            fats=food.fats
        )
        food.consumed = False
        food.save()

    ser = FoodSerializer(food)
    return Response(ser.data, status=200)



@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def mark_meal_consumed(request):
    """
    Body: { "meal_id": <id>, "is_eaten": true/false }
    => Meal içindeki tüm food'ların consumed durumu set edilir.
    => True iken tracker'a ekliyoruz, False ise geri alıyoruz.
    """
    user = request.user
    meal_id = request.data.get("meal_id")
    is_eaten = request.data.get("is_eaten")

    if meal_id is None or is_eaten is None:
        return Response({"detail": "meal_id ve is_eaten gereklidir."}, status=400)
    if not isinstance(is_eaten, bool):
        return Response({"detail": "is_eaten boolean olmalı."}, status=400)

    try:
        meal = Meal.objects.get(id=meal_id, day__meal_plan__user=user)
    except Meal.DoesNotExist:
        return Response({"detail": "Öğün bulunamadı."}, status=404)

    if is_eaten:
        # Daha önce tüketilmemiş Food'lar tracker'a ekleniyor
        for fd in meal.foods.all():
            if not fd.consumed:
                update_daily_intake(
                    user=user,
                    date=meal.day.date,
                    calories=fd.calories,
                    protein=fd.protein,
                    carbs=fd.carbs,
                    fats=fd.fats
                )
                fd.consumed = True
                fd.save()
    else:
        # Tüketilme geri alınıyor
        for fd in meal.foods.all():
            if fd.consumed:
                remove_daily_intake(
                    user=user,
                    date=meal.day.date,
                    calories=fd.calories,
                    protein=fd.protein,
                    carbs=fd.carbs,
                    fats=fd.fats
                )
                fd.consumed = False
                fd.save()

    meal.consumed = is_eaten
    meal.save()

    foods_ser = FoodSerializer(meal.foods.all(), many=True)
    return Response({
        "meal_id": meal_id,
        "meal_consumed": meal.consumed,
        "foods": foods_ser.data
    }, status=200)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_update_consumed(request):
    """
    JSON: {
      "day_number": 3,
      "foods": [
        { "food_id": 123, "consumed": true },
        ...
      ],
      "meals": [
        { "meal_id": 45, "consumed": false },
        ...
      ]
    }
    => Tek seferde hem foods hem meals consumed durumunu ayarlıyoruz.
    => Her birinde consumed durumu değiştiyse tracker'a yansıtıyoruz.
    """
    user = request.user
    data = request.data
    day_number = data.get("day_number", None)
    foods_data = data.get("foods", [])
    meals_data = data.get("meals", [])

    try:
        mealplan = MealPlan.objects.get(user=user)
        day_obj = mealplan.days.get(day_number=day_number)
    except:
        return Response({"detail": "Gün bulunamadı"}, status=404)

    # Tek tek foods
    for fd in foods_data:
        food_id = fd.get("food_id")
        consumed = fd.get("consumed", False)
        try:
            food = Food.objects.get(id=food_id, meal__day=day_obj)
        except Food.DoesNotExist:
            continue

        if consumed and not food.consumed:
            update_daily_intake(
                user=user,
                date=day_obj.date,
                calories=food.calories,
                protein=food.protein,
                carbs=food.carbs,
                fats=food.fats
            )
        elif (food.consumed and not consumed):
            remove_daily_intake(
                user=user,
                date=day_obj.date,
                calories=food.calories,
                protein=food.protein,
                carbs=food.carbs,
                fats=food.fats
            )
        food.consumed = consumed
        food.save()

    # Tek tek meals
    for md in meals_data:
        meal_id = md.get("meal_id")
        consumed = md.get("consumed", False)
        try:
            meal = Meal.objects.get(id=meal_id, day=day_obj)
        except Meal.DoesNotExist:
            continue

        if consumed != meal.consumed:
            meal.consumed = consumed
            meal.save()
            for f in meal.foods.all():
                if consumed and not f.consumed:
                    update_daily_intake(
                        user=user,
                        date=day_obj.date,
                        calories=f.calories,
                        protein=f.protein,
                        carbs=f.carbs,
                        fats=f.fats
                    )
                elif f.consumed and not consumed:
                    remove_daily_intake(
                        user=user,
                        date=day_obj.date,
                        calories=f.calories,
                        protein=f.protein,
                        carbs=f.carbs,
                        fats=f.fats
                    )
                f.consumed = consumed
                f.save()

    return Response({"detail": "Ok"}, status=200)
