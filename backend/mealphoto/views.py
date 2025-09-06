from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
import os
import tempfile
import json

import cloudinary
import cloudinary.uploader
from PIL import Image

# Keep your OpenAI usage EXACTLY as is:
from openai import OpenAI

from django.views.decorators.csrf import csrf_exempt

from .models import UserPhotoMeal
from .serializers import UserPhotoMealSerializer

# Import the CSV manager you just created:
from .csv_manager import (
    load_yemekler, ensure_yemek_in_db
)

# Import models for manual tracking
from mealgpt.models import ManualTrackingDay, ManualTrackingEntry
from django.utils import timezone

# Configure Cloudinary
cloudinary.config(
    cloud_name='dzl7xlvfy', 
    api_key='113518356455862', 
    api_secret='kQMsvySvnHJ6wF3Pc_eZpTPvXnI'
)

# Same client = OpenAI(...) as your original code
client = OpenAI(api_key=settings.OPENAI_API_KEY)

SYSTEM_PROMPT = """
Sen bir yardımcı asistansın ve bir resim linki alıyorsun. Kullanıcının isteği sadece JSON formatında çıktıdır.

Eğer bu resimde hiçbir yemek yoksa, YALNIZCA şu yanıtı ver:
{
  "error": "NO_FOOD_DETECTED"
}

Diğer durumda, lütfen sadece bir adet JSON objesi döndür. Bu objede:

- "foodItems" adlı bir dizi olmalı. 
- Her öğede "name" (Türkçe yemek adı) ve "grams" (float) bulunmalı. 
- Ayrıca "totalCalories" adlı bir alan olmalı (0 olarak). 

Örnek:
{
  "foodItems": [
    {
      "name": "Tavuk Göğsü",
      "grams": 150
    }
  ],
  "totalCalories": 0
}

Ek açıklama istemiyorum, yalnızca JSON ver.
"""

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_photo(request):
    """
    POST /api/mealphoto/send_photo/
    multipart/form-data:
      - 'image': file
    Returns JSON with GPT's analysis or error if no food detected.

    The GPT only returns {foodItems: [{name, grams}], totalCalories}.
    Then we look up macros in CSV or create new entries for unrecognized foods.
    Finally we multiply macros by (grams/100) and update the returned JSON.
    """
    if not request.content_type or not request.content_type.startswith('multipart/form-data'):
        return Response({"message": "Content-Type must be multipart/form-data."}, status=400)

    file_obj = request.FILES.get('image', None)
    if not file_obj:
        return Response({"message": "Missing image file."}, status=400)

    try:
        # Resize image with PIL
        image = Image.open(file_obj).convert('RGB')
        image = image.resize((512, 512))

        # Save to a temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as temp_file:
            image.save(temp_file, format='JPEG')
            temp_file_path = temp_file.name

        # Upload to Cloudinary
        response_cloud = cloudinary.uploader.upload(temp_file_path)
        os.remove(temp_file_path)
        image_url = response_cloud.get('secure_url', None)
        if not image_url:
            return Response({"message": "Cloudinary upload failed."}, status=500)

        # Prepare message content for GPT
        message_content = [
            {"type": "text", "text": SYSTEM_PROMPT},
            {"type": "image_url", "image_url": {"url":image_url}},
        ]

        # Send request to GPT
        print("[send_photo] Gönderilen Prompt (Sistem + image_url). Bekleniyor...")
        gpt_response = client.chat.completions.create(
            model="gpt-4o-2024-08-06",
            messages=[
                {
                    "role": "user",
                    "content": message_content
                }
            ],
            max_tokens=300,
        )
        assistant_content = gpt_response.choices[0].message.content.strip()
        print("[send_photo] GPT'ten gelen ham yanıt:", assistant_content)

        # Attempt to extract JSON from GPT's response
        start_index = assistant_content.find('{')
        end_index = assistant_content.rfind('}')
        if start_index == -1 or end_index == -1:
            return Response({"message": "GPT did not return valid JSON."}, status=500)

        json_str = assistant_content[start_index:end_index+1]
        parsed_json = json.loads(json_str)
        print("[send_photo] GPT JSON parse başarılı:", parsed_json)

        # If GPT says NO_FOOD_DETECTED => 400
        if parsed_json.get("error") == "NO_FOOD_DETECTED":
            return Response({"message": "No food detected in the image."}, status=400)

        # Expecting something like:
        # {
        #   "foodItems": [
        #       { "name": "Tavuk Göğsü", "grams": 150 }
        #   ],
        #   "totalCalories": 0
        # }
        food_items = parsed_json.get("foodItems", [])
        if not isinstance(food_items, list):
            return Response({"message": "GPT JSON format invalid (foodItems not a list)."}, status=500)

        csv_list = load_yemekler()

        total_kcal = 0.0
        for item in food_items:
            f_name = item.get("name", "").strip()
            f_grams = float(item.get("grams", 0.0))

            if not f_name:
                continue

            # 1) Ensure item is in CSV (or GPT will create macros). 
            matched_yemek = ensure_yemek_in_db(f_name, csv_list)
            if matched_yemek:
                base_cals = matched_yemek.get("kalori (kcal)", 0.0)
                base_prot = matched_yemek.get("protein (g)", 0.0)
                base_carb = matched_yemek.get("karbonhidrat (g)", 0.0)
                base_fat  = matched_yemek.get("yag (g)", 0.0)

                # Multiply macros by factor = (grams / 100).
                factor = f_grams / 100.0 if f_grams > 0 else 0
                cals = round(base_cals * factor, 2)
                prot = round(base_prot * factor, 2)
                carb = round(base_carb * factor, 2)
                fat  = round(base_fat * factor, 2)

                total_kcal += cals
                # Store final macros in the item we return:
                item["calories"] = cals
                item["protein"]  = prot
                item["carbs"]    = carb
                item["fats"]     = fat
            else:
                # If not found/created, item macros = 0
                item["calories"] = 0.0
                item["protein"]  = 0.0
                item["carbs"]    = 0.0
                item["fats"]     = 0.0

        parsed_json["totalCalories"] = round(total_kcal, 2)

        # Save photo_meal in DB
        meal_photo = UserPhotoMeal.objects.create(
            user=request.user,
            image_url=image_url,
            meal_data=parsed_json  # store entire JSON (with final macros)
        )
        serializer = UserPhotoMealSerializer(meal_photo)

        return Response({
            "message": "Photo processed successfully.",
            "meal_data": parsed_json,
            "photo_meal": serializer.data
        }, status=200)

    except Exception as e:
        print("Error in send_photo:", str(e))
        return Response({"message": "Error: Failed to process the photo."}, status=500)
