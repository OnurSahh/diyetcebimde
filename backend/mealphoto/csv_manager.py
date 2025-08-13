import json
import time
from difflib import SequenceMatcher
import openai
from dotenv import load_dotenv
from django.db.models import Max
from mealplan.models import FoodItem

load_dotenv()

# -- Your existing OpenAI usage (unchanged) --
client = openai.OpenAI(api_key='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')

def load_yemekler():
    """
    Loads food items from database instead of CSV
    Returns list of dict objects with the same structure as before
    """
    print("[load_yemekler] Loading food items from database")
    food_items = []
    
    for item in FoodItem.objects.all():
        food_items.append({
            'yemek_id': item.food_id,
            'yemek_adi': item.food_name,
            'kalori (kcal)': item.calories,
            'protein (g)': item.protein,
            'karbonhidrat (g)': item.carbs,
            'yag (g)': item.fats,
            'porsiyon_turu': item.portion_type,
            'minimum_porsiyon_boyutu': item.min_portion_size,
            'porsiyon_artıs_birimi': item.portion_increment,
            'porsiyon_metrik_türü': item.metric_type,
            'porsiyon_metrik': item.metric_amount,
            'ana_bilesenler': item.main_ingredients,
            'tarif': item.recipe,
            'maksimum_porsiyon': item.max_portion
        })
    
    return food_items

def get_next_yemek_id():
    """
    Gets the next food_id for a new item
    """
    max_id = FoodItem.objects.aggregate(Max('food_id'))['food_id__max'] or 0
    return max_id + 1

def save_yemek_to_db(yemek_info):
    """
    Saves a food item to the database
    """
    if 'yemek_id' not in yemek_info or yemek_info['yemek_id'] == 0:
        yemek_info['yemek_id'] = get_next_yemek_id()
    
    food_item = FoodItem(
        food_id=yemek_info.get('yemek_id', 0),
        food_name=yemek_info.get('yemek_adi', ''),
        calories=yemek_info.get('kalori (kcal)', 0.0),
        protein=yemek_info.get('protein (g)', 0.0),
        carbs=yemek_info.get('karbonhidrat (g)', 0.0),
        fats=yemek_info.get('yag (g)', 0.0),
        portion_type=yemek_info.get('porsiyon_turu', 'portion'),
        min_portion_size=yemek_info.get('minimum_porsiyon_boyutu', 1.0),
        portion_increment=yemek_info.get('porsiyon_artıs_birimi', 1.0),
        metric_type=yemek_info.get('porsiyon_metrik_türü', 'gram'),
        metric_amount=yemek_info.get('porsiyon_metrik', 100.0),
        main_ingredients=yemek_info.get('ana_bilesenler', ''),
        recipe=yemek_info.get('tarif', ''),
        max_portion=yemek_info.get('maksimum_porsiyon', 10.0)
    )
    food_item.save()
    return food_item

def find_similar_yemek_in_list(yemek_adi, yemek_listesi, threshold=0.85):
    """
    Uses SequenceMatcher to find similar food in the list
    Returns the item if above threshold, else None
    """
    best_ratio = 0.0
    best_match = None
    lower_in = yemek_adi.lower()
    for row in yemek_listesi:
        name_lower = row['yemek_adi'].lower()
        ratio = SequenceMatcher(None, lower_in, name_lower).ratio()
        if ratio > best_ratio:
            best_ratio = ratio
            best_match = row
    if best_ratio >= threshold and best_match:
        print(f"[find_similar_yemek_in_list] '{yemek_adi}' benzer bulundu => '{best_match['yemek_adi']}' (oran: {best_ratio:.2f})")
        return best_match
    return None

def request_yemek_info_from_gpt(yemek_adi, max_attempts=3):
    """
    Gets food nutritional info from GPT
    """
    prompt = f"""
    "Sen deneyimli bir diyetisyensin. Bana şu Türkçe yemek adı için besin değerlerini (kalori, protein, karbonhidrat, yağ) ver:
    Yemek Adı: {yemek_adi}

    Format yalnızca tek bir JSON nesnesi olsun (başka açıklama ekleme):
    ```json
    {{
      "yemek_adi": "{yemek_adi}",
      "kalori (kcal)": 0.0,
      "protein (g)": 0.0,
      "karbonhidrat (g)": 0.0,
      "yag (g)": 0.0,
      "porsiyon_turu": "porsiyon",
      "minimum_porsiyon_boyutu": 1,
      "porsiyon_artıs_birimi": 1,
      "porsiyon_metrik_türü": "gram",
      "porsiyon_metrik": 100,
      "ana_bilesenler": "",
      "tarif": "",
      "maksimum_porsiyon": 10
    }}
    ```
    Sadece bu JSON'u döndür. Lütfen değerleri uygun tahminlerle doldur, Türkçe isim kullan.
    """
    # Rest of the function remains the same
    for attempt in range(max_attempts):
        print(f"[request_yemek_info_from_gpt] '{yemek_adi}' => deneme {attempt+1}")
        try:
            message_to_gpt = [
                {"role": "system", "content": "Sen deneyimli bir diyetisyensin."},
                {"role": "user", "content": prompt}
            ]
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=message_to_gpt,
                temperature=0.5,
                max_tokens=1000
            )
            reply = response.choices[0].message.content
            print("[request_yemek_info_from_gpt] GPT cevabı:", reply)

            start_idx = reply.find('{')
            end_idx = reply.rfind('}') + 1
            if start_idx < 0 or end_idx <= 0:
                print("[request_yemek_info_from_gpt] JSON parse error - cannot find { }")
                continue
            json_str = reply[start_idx:end_idx]
            data = json.loads(json_str)

            for col in [
                "kalori (kcal)", "protein (g)", "karbonhidrat (g)", "yag (g)",
                "porsiyon_metrik", "minimum_porsiyon_boyutu", "porsiyon_artıs_birimi",
                "maksimum_porsiyon"
            ]:
                if col in data:
                    try:
                        data[col] = float(data[col])
                    except:
                        data[col] = 0.0

            if 'tarif' not in data:
                data['tarif'] = ""
            if 'ana_bilesenler' not in data:
                data['ana_bilesenler'] = ""

            print("[request_yemek_info_from_gpt] Oluşturulan JSON:", json.dumps(data, ensure_ascii=False))
            return data
        except Exception as ex:
            print("[request_yemek_info_from_gpt] hata:", ex)
            time.sleep(0.5)

    return None

def ensure_yemek_in_db(yemek_adi, csv_listesi):
    """
    Ensures a food item exists in the database
    If not found, gets info from GPT and saves to DB
    """
    found = find_similar_yemek_in_list(yemek_adi, csv_listesi, threshold=0.80)
    if found:
        return found
    else:
        print(f"[ensure_yemek_in_db] '{yemek_adi}' yemeğine benzer yok, yeni oluşturuluyor...")
        new_info = request_yemek_info_from_gpt(yemek_adi)
        if new_info:
            if 'yemek_adi' not in new_info or not new_info['yemek_adi']:
                new_info['yemek_adi'] = yemek_adi
            save_yemek_to_db(new_info)
            csv_listesi.append(new_info)
            print(f"[ensure_yemek_in_db] => '{yemek_adi}' eklendi veritabanına.")
            return new_info
        print(f"[ensure_yemek_in_db] '{yemek_adi}' için GPT'den bilgi alınamadı, None dönüyor.")
        return None
