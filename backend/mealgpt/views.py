from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
import json
from datetime import datetime

from .csv_manager import load_yemekler, ensure_yemek_in_db
from .models import ManualTrackingDay, ManualTrackingEntry

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def manual_add(request):
    """
    POST /api/mealgpt/manual-add/
    {
      "name": "Tavuk Göğsü",
      "grams": 150,
      "date": "2025-05-07" (optional, defaults to today),
      "calculate_nutrients": true/false (optional, defaults to true),
      "calories": 250, (required if calculate_nutrients is false)
      "protein": 25, (optional if calculate_nutrients is false)
      "carbs": 0, (optional if calculate_nutrients is false)
      "fats": 10 (optional if calculate_nutrients is false)
    }
    Returns => { success: true, item: { id, name, calories, protein, carbs, fats } }
    """
    try:
        name = request.data.get("name", "").strip()
        grams = float(request.data.get("grams", 100.0))
        date_str = request.data.get("date", timezone.now().strftime('%Y-%m-%d'))
        calculate_nutrients = request.data.get("calculate_nutrients", True)
        
        if not name:
            return Response({"error": "Geçersiz isim"}, status=400)

        # Initialize variables for nutrient values
        item_cals = 0
        item_prot = 0
        item_carb = 0
        item_fat = 0
        
        # Handle manual entry with provided nutrient values
        if not calculate_nutrients:
            # Use directly provided values
            item_cals = float(request.data.get("calories", 0))
            item_prot = float(request.data.get("protein", 0))
            item_carb = float(request.data.get("carbs", 0))
            item_fat = float(request.data.get("fats", 0))
            
            # Basic validation
            if item_cals < 0:
                return Response({"error": "Geçersiz kalori değeri"}, status=400)
                
        else:
            # Original GPT/CSV based calculation
            if grams <= 0:
                return Response({"error": "Geçersiz gram değeri"}, status=400)
                
            # Process with GPT/CSV
            csv_list = load_yemekler()
            matched = ensure_yemek_in_db(name, csv_list)
            if not matched:
                return Response({"error": "Yemek bulunamadı/oluşturulamadı"}, status=500)

            # Calculate macros
            base_cals = matched.get("kalori (kcal)", 0.0)
            base_prot = matched.get("protein (g)", 0.0)
            base_carb = matched.get("karbonhidrat (g)", 0.0)
            base_fat = matched.get("yag (g)", 0.0)
            
            # Get the actual portion size from CSV instead of assuming 100g
            base_portion = matched.get("porsiyon_metrik", 100.0)  # Default to 100g if not specified
            
            # Calculate the correct scaling factor based on the actual portion size
            factor = grams / base_portion
            
            # Apply the correct factor to all nutrient calculations
            item_cals = round(base_cals * factor, 2)
            item_prot = round(base_prot * factor, 2)
            item_carb = round(base_carb * factor, 2)
            item_fat = round(base_fat * factor, 2)

        # Save to database
        day, created = ManualTrackingDay.objects.get_or_create(
            user=request.user,
            date=date_str
        )
        
        entry = ManualTrackingEntry.objects.create(
            day=day,
            name=name,
            calories=item_cals,
            protein=item_prot,
            carbs=item_carb,
            fats=item_fat,
            grams=grams
        )

        item_data = {
            "id": entry.id,
            "name": name,
            "calories": item_cals,
            "protein": item_prot,
            "carbs": item_carb,
            "fats": item_fat,
            "grams": grams
        }

        return Response({"success": True, "item": item_data}, status=200)

    except Exception as e:
        print("manual_add error:", e)
        return Response({"error": f"Sunucu hatası: {str(e)}"}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_manual_entries(request):
    """
    GET /api/mealgpt/manual-entries/
    
    Query params:
    - days: int (optional, default 7) - Number of days to fetch
    - date: YYYY-MM-DD (optional) - Specific date to fetch
    
    Returns => { success: true, entries: { "2025-05-07": [entries], ... } }
    """
    try:
        user = request.user
        days = int(request.query_params.get('days', 7))
        date_param = request.query_params.get('date')
        
        if date_param:
            # Fetch entries for a specific date
            tracking_days = ManualTrackingDay.objects.filter(
                user=user,
                date=date_param
            )
        else:
            # Fetch last N days with entries
            tracking_days = ManualTrackingDay.objects.filter(
                user=user
            ).order_by('-date')[:days]
        
        result = {}
        
        for day in tracking_days:
            entries = day.entries.all()
            formatted_entries = []
            
            for entry in entries:
                formatted_entries.append({
                    "id": entry.id,
                    "title": entry.name,
                    "calories": entry.calories,
                    "protein": entry.protein,
                    "carbs": entry.carbs,
                    "fats": entry.fats,
                    "grams": entry.grams
                })
            
            result[day.date.strftime('%Y-%m-%d')] = formatted_entries
        
        return Response({"success": True, "entries": result}, status=200)
        
    except Exception as e:
        print("get_manual_entries error:", e)
        return Response({"error": "Sunucu hatası"}, status=500)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_manual_entry(request, entry_id):
    """
    DELETE /api/mealgpt/manual-entry/{entry_id}/
    
    Returns => { success: true }
    """
    try:
        entry = ManualTrackingEntry.objects.get(id=entry_id, day__user=request.user)
        entry.delete()
        return Response({"success": True}, status=200)
    except ManualTrackingEntry.DoesNotExist:
        return Response({"error": "Kayıt bulunamadı"}, status=404)
    except Exception as e:
        print("delete_manual_entry error:", e)
        return Response({"error": "Sunucu hatası"}, status=500)
