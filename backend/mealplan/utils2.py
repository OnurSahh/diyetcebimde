# mealplan/utils.py

import json
import re
import datetime
import pandas as pd
from datetime import datetime, timedelta
from django.utils import timezone
import os
from dotenv import load_dotenv

from survey.models import Survey
from mealplan.models import MealPlan, Day, Meal, Food, DailyTotal
from mealplan.csv_manager import load_yemekler, ensure_yemek_in_db
from mealplan.linear_optimizer import solve_meal_plan_with_pulp
from tracker.utils import update_daily_intake, sync_daily_intakes_for_user
import pprint

from django.conf import settings

load_dotenv()

########################################
# 0) GPT / OpenAI
########################################
import openai
client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)


def request_meal_plan_gpt(prompt: str):
    """
    GPT'ye istek atar. 
    Dönecek JSON'un formatını prompt içinde belirtiyoruz.
    """
    print("[request_meal_plan_gpt] => GPT'ye istek gönderiliyor...")
    try:
        response = client.chat.completions.create(
            model="gpt-4o-2024-08-06",
            messages=[
                {"role": "system", "content": "Sen deneyimli bir diyetisyensin."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.5,
            max_tokens=6000
        )
        print("[request_meal_plan_gpt] => GPT'den yanıt alındı.\n", response)
    except Exception as e:
        print("[request_meal_plan_gpt] => OpenAI API Hatası:", e)
        return None

    assistant_reply = response.choices[0].message.content
    print("[DEBUG] assistant_reply (GPT'den gelen ham metin):")
    pprint.pprint(assistant_reply)
    return assistant_reply


########################################
# 1) GPT JSON PARSE (IGNORE GPT 'Gün' field)
########################################

def extract_gun_objects(text: str):
    """
    Metin içindeki {...}{...} JSON bloklarını ayıklar.
    """
    blocks = []
    stack = []
    start_idx = None
    for i, ch in enumerate(text):
        if ch == '{':
            if not stack:
                start_idx = i
            stack.append(ch)
        elif ch == '}':
            if stack:
                stack.pop()
                if not stack and start_idx is not None:
                    block = text[start_idx:i+1]
                    blocks.append(block)
                    start_idx = None
    return blocks


def parse_raw_7days_mealplan_ignore_dayname(assistant_reply: str):
    """
    GPT cevabını parse ederken “gün” alanını yok sayıp
    sadece “öğünler” ve “günlük_toplam” kısımlarını alır.
    """
    text = assistant_reply.strip()
    blocks = extract_gun_objects(text)
    if not blocks:
        return []

    day_list = []
    for blk in blocks:
        try:
            obj = json.loads(blk)
        except:
            continue  # JSON parse hatası => atla

        ogunler = obj.get("öğünler", [])
        gunluk_toplam = obj.get("günlük_toplam", {})

        day_data = {
            "ogunler": ogunler,
            "gunluk_toplam": gunluk_toplam
        }
        day_list.append(day_data)

    # 7'den fazlaysa sadece ilk 7'si
    return day_list[:7]


########################################
# 2) CREATE MATCHED FOODS -> DataFrame
########################################

def is_snack(meal_title: str) -> bool:
    lt = meal_title.lower()
    return ("snack" in lt) or ("ara" in lt)


def detect_meal_type_and_name(
    gpt_ogun_name,
    default_main_names,
    default_snack_names,
    main_index,
    snack_index
):
    """
    Gelen öğün ismine bakıp, “Ara öğün mü ana öğün mü?” diye ayırır.
    """
    if is_snack(gpt_ogun_name):
        if snack_index < len(default_snack_names):
            std = default_snack_names[snack_index]
            snack_index += 1
        else:
            std = "Ara Öğün-X"
    else:
        if main_index < len(default_main_names):
            std = default_main_names[main_index]
            main_index += 1
        else:
            std = "Ana Öğün-X"
    return std, main_index, snack_index


def create_matched_foods_dataframe(
    parsed_days: list,
    csv_list: list,
    main_meals_count=3,
    snack_meals_count=1
) -> pd.DataFrame:
    """
    parsed_days => [ { "ogunler": [...], "gunluk_toplam": {...} }, ... ]
    Dönüş: her row = day_index, meal_name, yemek_adi, kalori, vs...
    Burada csv'den portion_type, portion_metric_unit, tarif, ana_bilesenler de alalım.
    """
    if not parsed_days:
        return pd.DataFrame()

    df_records = []
    default_main_names = [f"Ana Öğün-{i+1}" for i in range(main_meals_count)]
    default_snack_names = [f"Ara Öğün {i+1}" for i in range(snack_meals_count)]

    for i, day_obj in enumerate(parsed_days):
        ogunler = day_obj.get("ogunler", [])

        main_index = 0
        snack_index = 0

        for ogun_data in ogunler:
            gpt_ogun_name = ogun_data.get("öğün", "Öğün X")
            besinler_list = ogun_data.get("besinler", [])

            # Ana/Ara
            std_meal_name, main_index, snack_index = detect_meal_type_and_name(
                gpt_ogun_name,
                default_main_names,
                default_snack_names,
                main_index,
                snack_index
            )

            # Besinler
            for b in besinler_list:
                raw_adi = b.get("ad", "???").lower().strip()
                miktar_str = b.get("miktar", "").strip()

                # Miktar parse
                val = 1.0
                unt = 'g'
                match_m = re.match(r'^([\d.]+)\s*([a-zA-Z]+)?$', miktar_str)
                if match_m:
                    val_s = match_m.group(1).replace(',', '.')
                    try:
                        val = float(val_s)
                    except:
                        val = 1.0
                    if match_m.group(2):
                        unl = match_m.group(2).lower()
                        if unl in ['gr', 'gram', 'g']:
                            unt = 'g'
                        elif unl in ['ml', 'mililitre']:
                            unt = 'ml'
                        else:
                            unt = 'p'  # adet/porsiyon vb.

                found = ensure_yemek_in_db(raw_adi, csv_list, "yemekler_yeni.csv")
                if found:
                    # CSV'den ek alanları da alalım
                    pm = float(found.get("porsiyon_metrik", 100.0))
                    st = float(found.get("porsiyon_artıs_birimi", 1.0))
                    if st <= 0:
                        st = 1.0
                    minp = float(found.get("minimum_porsiyon_boyutu", 1.0))
                    maxp = float(found.get("maksimum_porsiyon", 10.0))
                    portion_type = found.get("porsiyon_turu", "porsiyon")
                    portion_metric_unit = found.get("porsiyon_metrik_türü", "gram")
                    ana_bilesenler = found.get("ana_bilesenler", "")
                    tarif = found.get("tarif", "")

                    if unt in ['g', 'ml']:
                        val_std = val
                    else:
                        val_std = pm  # eğer "p" ise varsayılan pm

                    pors = val_std / pm
                    pors = round(pors / st) * st
                    pors = max(pors, minp)
                    pors = min(pors, maxp)

                    df_records.append({
                        'day_index': i+1,
                        'meal_name': std_meal_name,
                        'original_yemek_adi': raw_adi,
                        'yemek_adi': found['yemek_adi'],
                        'kalori (kcal)': float(found['kalori (kcal)']),
                        'protein (g)': float(found['protein (g)']),
                        'karbonhidrat (g)': float(found['karbonhidrat (g)']),
                        'yag (g)': float(found['yag (g)']),
                        'porsiyon_adedi': pors,
                        'porsiyon_metrik': pm,
                        'porsiyon_metrik_türü': portion_metric_unit,
                        'porsiyon_turu': portion_type,
                        'minimum_porsiyon_boyutu': minp,
                        'porsiyon_artıs_birimi': st,
                        'maksimum_porsiyon_adedi': maxp,
                        'ana_bilesenler': ana_bilesenler,
                        'tarif': tarif
                    })
                else:
                    # CSV'de bulamadı => 0
                    df_records.append({
                        'day_index': i+1,
                        'meal_name': std_meal_name,
                        'original_yemek_adi': raw_adi,
                        'yemek_adi': raw_adi,
                        'kalori (kcal)': 0.0,
                        'protein (g)': 0.0,
                        'karbonhidrat (g)': 0.0,
                        'yag (g)': 0.0,
                        'porsiyon_adedi': 1.0,
                        'porsiyon_metrik': 100.0,
                        'porsiyon_metrik_türü': 'gram',
                        'porsiyon_turu': 'porsiyon',
                        'minimum_porsiyon_boyutu': 1.0,
                        'porsiyon_artıs_birimi': 1.0,
                        'maksimum_porsiyon_adedi': 10.0,
                        'ana_bilesenler': '',
                        'tarif': ''
                    })

    return pd.DataFrame(df_records)


########################################
# 3) CREATE FINAL JSON
########################################

def create_final_json(parsed_days: list,
                      df: pd.DataFrame,
                      meal_times: dict,
                      snack_times: dict,
                      start_date):
    """
    Her i için date = start_date + i
    """
    final_out = {"günler": []}

    if df.empty:
        # DF boşsa => GPT parse bilgisini ham olarak al
        for i, day_obj in enumerate(parsed_days):
            final_out["günler"].append({
                "gün": f"Gün {i+1}",
                "date": str(start_date + timedelta(days=i)),
                "öğünler": day_obj.get("ogunler", []),
                "günlük_toplam": day_obj.get("gunluk_toplam", {})
            })
        return final_out

    for i, day_obj in enumerate(parsed_days):
        day_date = start_date + timedelta(days=i)
        subdf = df[df['day_index'] == (i+1)].copy()

        new_ogunler = []
        for meal_name in subdf['meal_name'].unique():
            # eğer meal_name "Ara Öğün-1" vs => snack_times
            if meal_name.startswith("Ara Öğün"):
                ogun_saati = snack_times.get(meal_name, "10:00")
            else:
                ogun_saati = meal_times.get(meal_name, "09:00")

            meal_slice = subdf[subdf['meal_name'] == meal_name]
            food_list = []
            for _, row in meal_slice.iterrows():
                food_list.append({
                    "ad": row['yemek_adi'],
                    "miktar": f"{row['porsiyon_adedi']} x {row['porsiyon_metrik']} {row['porsiyon_metrik_türü']}"
                })

            new_ogunler.append({
                "öğün": meal_name,
                "öğün_saati": ogun_saati,
                "besinler": food_list
            })

        # Günlük toplam
        subdf['sum_kcal'] = subdf['kalori (kcal)'] * subdf['porsiyon_adedi']
        subdf['sum_prot'] = subdf['protein (g)'] * subdf['porsiyon_adedi']
        subdf['sum_carb'] = subdf['karbonhidrat (g)'] * subdf['porsiyon_adedi']
        subdf['sum_fat']  = subdf['yag (g)'] * subdf['porsiyon_adedi']

        daily_totals = {
            "kalori (kcal)": round(subdf['sum_kcal'].sum(), 2),
            "protein (g)": round(subdf['sum_prot'].sum(), 2),
            "karbonhidrat (g)": round(subdf['sum_carb'].sum(), 2),
            "yağ (g)": round(subdf['sum_fat'].sum(), 2),
        }

        final_out["günler"].append({
            "gün": f"Gün {i+1}",
            "date": str(day_date),
            "öğünler": new_ogunler,
            "günlük_toplam": daily_totals
        })

    return final_out


########################################
# 4) DB KAYIT (ÖNEMLİ KISIM)
########################################

def save_meal_plan_to_db(final_json: dict, user, final_df: pd.DataFrame):
    """
    Planı DB'ye kaydederken, final_df içindeki makroları her Food objesine yazar:
      - portion_type
      - portion_metric_unit
      - portion_metric
      - tarif
      - ana_bilesenler
    """
    from .views import TURKCE_MEALTYPE_MAP
    # Eski planları silelim
    MealPlan.objects.filter(user=user).delete()

    days_list = final_json.get("günler", [])
    if not days_list:
        return None

    first_day_date_str = days_list[0].get("date", "")
    try:
        first_day_date = datetime.strptime(first_day_date_str, "%Y-%m-%d").date()
    except:
        first_day_date = timezone.now().date()

    mealplan = MealPlan.objects.create(user=user, week_start_date=first_day_date)

    for i, day_item in enumerate(days_list):
        day_number = i + 1
        d_str = day_item.get("date", "")
        try:
            day_date = datetime.strptime(d_str, "%Y-%m-%d").date()
        except:
            day_date = first_day_date + timedelta(days=i)

        day_db = Day.objects.create(
            meal_plan=mealplan,
            day_number=day_number,
            date=day_date
        )

        # Öğünler
        ogunler_list = day_item.get("öğünler", [])
        for j, ogun_obj in enumerate(ogunler_list):
            ogun_name = ogun_obj.get("öğün", f"Öğün {j+1}")
            ogun_time = ogun_obj.get("öğün_saati", "09:00")

            short_name = ogun_name.lower().strip()
            tr_name = TURKCE_MEALTYPE_MAP.get(short_name, short_name)
            display_name = f"{tr_name} {ogun_time}"

            meal_db = Meal.objects.create(
                day=day_db,
                name=ogun_name,
                displayed_name=display_name,
                order=j+1,
                meal_time=ogun_time,
                consumed=False
            )

            # Besinler
            food_list = ogun_obj.get("besinler", [])
            for bitem in food_list:
                fname = bitem.get("ad", "???")

                # final_df'den portion_type vb. alalım
                df_slice = final_df[
                    (final_df['day_index'] == day_number) &
                    (final_df['meal_name'] == ogun_name) &
                    (final_df['yemek_adi'] == fname)
                ]
                if not df_slice.empty:
                    row = df_slice.iloc[0]
                    kcal_each = row['kalori (kcal)']
                    prot_each = row['protein (g)']
                    carb_each = row['karbonhidrat (g)']
                    fat_each  = row['yag (g)']
                    pors_count = row['porsiyon_adedi']

                    total_cal = kcal_each * pors_count
                    total_p   = prot_each * pors_count
                    total_c   = carb_each * pors_count
                    total_f   = fat_each  * pors_count

                    portion_type        = row['porsiyon_turu']
                    portion_metric_unit = row['porsiyon_metrik_türü']
                    portion_metric      = row['porsiyon_metrik']
                    tarif               = row['tarif']
                    ana_bilesenler      = row['ana_bilesenler']
                else:
                    total_cal = 0
                    total_p   = 0
                    total_c   = 0
                    total_f   = 0
                    pors_count = 1
                    portion_type        = "porsiyon"
                    portion_metric_unit = "gram"
                    portion_metric      = 0.0
                    tarif               = ""
                    ana_bilesenler      = ""

                Food.objects.create(
                    meal=meal_db,
                    name=fname,
                    portion_type=portion_type,
                    portion_count=pors_count,
                    portion_metric_unit=portion_metric_unit,
                    portion_metric=portion_metric,
                    calories=total_cal,
                    protein=total_p,
                    carbs=total_c,
                    fats=total_f,
                    tarif=tarif,
                    ana_bilesenler=ana_bilesenler,
                    consumed=False
                )

        # Günlük toplam
        gt = day_item.get("günlük_toplam", {})
        DailyTotal.objects.create(
            day=day_db,
            calorie=float(gt.get("kalori (kcal)", 0.0)),
            protein=float(gt.get("protein (g)", 0.0)),
            carbohydrate=float(gt.get("karbonhidrat (g)", 0.0)),
            fat=float(gt.get("yağ (g)", 0.0))
        )

    return mealplan


########################################
# 5) ANA FONK => generate_and_optimize_mealplan_for_user
########################################

def generate_and_optimize_mealplan_for_user(user, start_date=None):
    """
    1) Survey'den bilgileri al (main_meals, snack_meals, snack_times, meal_times vb.)
    2) GPT’den 7 günlük plan çek (ama “gün” alanını yok say)
    3) CSV => DataFrame => optimize
    4) create_final_json => (day i=0..6 => date = start_date + i)
    5) DB kaydet (Food objelerinde makroları, tarif, vb. kaydet)
    6) sync daily intakes
    """
    print(f"[generate_and_optimize_mealplan_for_user] => user: {user}")

    # 1) Survey
    try:
        survey = Survey.objects.get(user=user)
        daily_cal = survey.calorie_intake or survey.tdee or 2000

        # Makrolar
        macros = survey.macros or {"protein": 100, "carbs": 250, "fats": 70}

        # Kaç ana öğün, kaç ara öğün
        main_meals_count = survey.main_meals or 3
        snack_meals_count = survey.snack_meals or 1

        # Survey'de meal_times => JSON => {"Ana Öğün-1":"09:00","Ana Öğün-2":"13:00","Ana Öğün-3":"20:00"}
        # snack_times => JSON => örn. {"Ara Öğün 1":"11:00","Ara Öğün 2":"17:00"} vs.
        # Eğer field yok veya emptyyse fallback verelim
        meal_times = {}
        if survey.meal_times:
            # meal_times JSON => parse
            meal_times_json = json.loads(survey.meal_times)
            if isinstance(meal_times_json, dict):
                meal_times = meal_times_json

        # Aralarda "snack_times" gibi bir alan varsa parse edelim:
        # "snack_times" => e.g. "{"18:00:00}" ya da full JSON
        # Bu kısım her projede farklı olabilir; örnek olarak:
        snack_times = {}
        if survey.snack_times:
            # Mesela tek bir JSON olabilir. format => {"Ara Öğün 1":"18:00:00"}...
            # Veya string => {18:00:00}
            # Aşağıdakiler tamamen örnek, projede net format belirlenmeli:
            try:
                st_json = json.loads(survey.snack_times)
                if isinstance(st_json, dict):
                    # st_json => { "Ara Öğün 1": "18:00:00" }
                    snack_times = st_json
            except:
                pass

        # eğer meal_times dict'te "Ana Öğün-1","Ana Öğün-2","Ana Öğün-3" yoksa fallback
        # (istemezseniz fallback koymayabilirsiniz)
        default_meal_times = {
            "Ana Öğün-1": "09:00",
            "Ana Öğün-2": "13:00",
            "Ana Öğün-3": "19:00",
        }
        for mk, mv in default_meal_times.items():
            if mk not in meal_times:
                meal_times[mk] = mv

        # eğer snack_times boşsa, basit üretelim:
        if not snack_times and snack_meals_count > 0:
            # misal 1 snack => "Ara Öğün 1": "10:00"
            snack_times = {
                f"Ara Öğün {i}": f"{10+i}:00" for i in range(1, snack_meals_count+1)
            }

        # Kullanıcı Aversions/excluded
        user_aversions = survey.excluded_items or []

        # Ekonomik durum, mutfak
        economic_status = "Orta"
        cuisine_type = "Türk Mutfağı"

    except Survey.DoesNotExist:
        daily_cal = 2000
        macros = {"protein": 100, "carbs": 250, "fats": 70}
        main_meals_count = 3
        snack_meals_count = 1
        meal_times = {
            "Ana Öğün-1": "09:00",
            "Ana Öğün-2": "13:00",
            "Ana Öğün-3": "19:00"
        }
        snack_times = {
            "Ara Öğün 1": "10:00"
        }
        user_aversions = []
        economic_status = "Orta"
        cuisine_type = "Türk Mutfağı"

    # Eğer start_date yoksa bugünün tarihi
    if not start_date:
        start_date = timezone.now().date()

    # GPT prompt'u hazırlayalım
    # Kaç ana öğün ->  main_meals_count
    # Kaç ara öğün ->  snack_meals_count
    # Bu sayılara göre meal isimleri: "Ana Öğün-1","Ana Öğün-2", ...  / "Ara Öğün 1", ...
    user_meal_names = []
    for idx_m in range(main_meals_count):
        user_meal_names.append(f"Ana Öğün-{idx_m+1}")
    for idx_s in range(snack_meals_count):
        user_meal_names.append(f"Ara Öğün {idx_s+1}")

    # MEAL TIMES => string
    meal_times_str = "; ".join([f"{k}: {v}" for k, v in meal_times.items()])
    # SNACK TIMES => string
    snack_times_str = "; ".join([f"{k}: {v}" for k, v in snack_times.items()])

    prompt = f"""
    Aşağıdaki kriterlere göre 7 günlük bir meal plan oluştur:

    - **Günlük Kalori Hedefi:** {daily_cal} kcal
    - **Makro Hedefleri:**
      - Protein: {macros['protein']} g
      - Karbonhidrat: {macros['carbs']} g
      - Yağ: {macros['fats']} g
    - **Günlük Öğün Sayısı:** {len(user_meal_names)} öğün ({', '.join(user_meal_names)})
    - **Öğün Türleri/Saatleri:**
      {meal_times_str}
      {snack_times_str}
    - **Beslenme Modeli:**
      - "4 Yapraklı Yonca Modeli" temelinde, dört besin grubunu öğünlere dağıt.
    - **Porsiyonları Belirtirken:**
      - Metrik ölçü ve anlaşılır ölçü belirt
    - **Kullanıcı Tercihleri:**
      - Sevmediği Besinler: {', '.join(user_aversions)}
    - **Ekonomik Durum:** {economic_status}
    - **Çeşitlilik:**
      - 7 gün farklı çeşit
    - **Mutfak:** {cuisine_type}
    - **Gün İsimleri:** "Gün 1"..."Gün 7"
    - **Günlük Makrolar** => lütfen ekle
    - Tek başına yağ, sos vb. önermeyin
    Lütfen formatı şöyle ver, JSON, her gün bir blok:
    {{
      "gün": "Gün 1",
      "öğünler": [
        {{
          "öğün": "Ana Öğün-1",
          "besinler": [
            {{
              "ad": "xx",
              "miktar": "60g"
            }}
          ]
        }}
      ],
      "günlük_toplam": {{
        "kalori (kcal)": "xxx",
        "protein (g)": "xxx",
        "karbonhidrat (g)": "xxx",
        "yağ (g)": "xxx"
      }}
    }}
    """

    # 3) GPT'den cevap
    reply = request_meal_plan_gpt(prompt)
    if not reply:
        return None

    # parse GPT
    parsed_days = parse_raw_7days_mealplan_ignore_dayname(reply)
    if not parsed_days:
        return None

    parsed_days = parsed_days[:7]  # sadece 7 gün

    # 4) CSV'den yemek data yükle
    csv_list = load_yemekler("yemekler_yeni.csv")

    # DataFrame
    df = create_matched_foods_dataframe(
        parsed_days=parsed_days,
        csv_list=csv_list,
        main_meals_count=main_meals_count,
        snack_meals_count=snack_meals_count
    )
    if df.empty:
        return None

    # 4) Optimize
    from mealplan.linear_optimizer import solve_meal_plan_with_pulp

    final_df_parts = []
    unique_days = df['day_index'].unique()
    for day_i in unique_days:
        slice_i = df[df['day_index'] == day_i].copy()
        optdf, ok_status = solve_meal_plan_with_pulp(
            slice_i,
            kcal_target=daily_cal,
            prot_target=macros['protein'],
            carb_target=macros['carbs'],
            fat_target=macros['fats'],
            kcal_tol=0.05,
            prot_tol=0.10,
            carb_tol=0.10,
            fat_tol=0.10
        )
        if ok_status:
            final_df_parts.append(optdf)
        else:
            final_df_parts.append(slice_i)

    final_df = pd.concat(final_df_parts, ignore_index=True)

    # 5) create_final_json => DB kaydet
    final_json = create_final_json(
        parsed_days,
        final_df,
        meal_times,
        snack_times,
        start_date
    )

    mealplan_obj = save_meal_plan_to_db(final_json, user, final_df)

    # 6) sync_daily_intakes
    sync_daily_intakes_for_user(user, lookback=90, lookahead=7)
    return mealplan_obj


########################################
# 6) TEK GÜN request (opsiyonel)
########################################

def request_gpt_for_single_day(
    day_name: str,
    daily_cal: float,
    macros: dict,
    user_meal_names: list,
    meal_times: dict,
    snack_times: dict,
    user_aversions: list,
    economic_status: str,
    cuisine_type: str
):
    """
    Sadece tek bir gün için GPT'den plan ister.
    (Opsiyonel kullanım)
    """
    user_preferences = []
    meal_times_str = "; ".join([f"{k}: {v}" for k,v in meal_times.items()])
    snack_times_str = "; ".join([f"{k}: {v}" for k,v in snack_times.items()])

    prompt = f"""
    Aşağıdaki kriterlere göre sadece '{day_name}' günü için bir meal plan oluştur:
    
    - **Günlük Kalori Hedefi:** {daily_cal} kcal
    - **Makro Hedefleri:**
      - Protein: {macros['protein']} g
      - Karbonhidrat: {macros['carbs']} g
      - Yağ: {macros['fats']} g
    - **Öğün Sayısı:** {len(user_meal_names)} öğün ({', '.join(user_meal_names)})
    - **Öğün İsimleri/Saatleri:**
      {meal_times_str}
      {snack_times_str}
    - **Beslenme Modeli:**
      - "4 Yapraklı Yonca Modeli"ni temel alarak, dört besin grubunu öğünlere dağıt.
    - **Porsiyonları Belirtirken:**
      - Her yiyeceğin miktarını metrik ölçü + anlaşılır ölçü belirt
    - **Kullanıcı Tercihleri:**
      - Sevmediği Besinler: {', '.join(user_aversions)}
    - **Ekonomik Durum:** {economic_status}
    - **Çeşitlilik:**
      - Tekrar etme
    - **Mutfak:** {cuisine_type}

    Cevabı JSON olarak ver, format:
    {{
      "gün": "{day_name}",
      "öğünler": [
        {{
          "öğün": "Ana Öğün-1",
          "besinler": [
            {{
              "ad": "xxx",
              "miktar": "60g"
            }}
          ]
        }}
      ],
      "günlük_toplam": {{
        "kalori (kcal)": "xxx",
        "protein (g)": "xxx",
        "karbonhidrat (g)": "xxx",
        "yağ (g)": "xxx"
      }}
    }}
    """
    return request_meal_plan_gpt(prompt)


########################################
# 7) CONSUMPTION => tracker (opsiyonel örnek)
########################################

def mark_food_as_consumed(food_id: int, user, date_str: str = None):
    """
    Bir 'food_id' için consumed=True yapar,
    'food.calories' vb. makroları 'DailyIntake'e ekler.
    """
    from tracker.models import DailyIntake
    try:
        food_obj = Food.objects.get(pk=food_id, meal__day__meal_plan__user=user)
    except Food.DoesNotExist:
        return None

    if not food_obj.consumed:
        food_obj.consumed = True
        food_obj.save()

        # hangi güne eklenecek
        if date_str:
            try:
                dval = datetime.strptime(date_str, "%Y-%m-%d").date()
            except:
                dval = food_obj.meal.day.date
        else:
            dval = food_obj.meal.day.date

        from tracker.utils import update_daily_intake
        update_daily_intake(
            user=user,
            date=dval,
            cals=food_obj.calories or 0,
            protein=food_obj.protein or 0,
            carbs=food_obj.carbs or 0,
            fats=food_obj.fats or 0
        )

    return food_obj


def mark_meal_as_consumed(meal_id: int, user, date_str: str = None):
    """
    Bir öğünün tamamını consumed=True yapar,
    içindeki Food'ları da consumed=True yapar,
    tümünün makrolarını DailyIntake'e ekler.
    """
    from tracker.models import DailyIntake
    try:
        meal_obj = Meal.objects.get(pk=meal_id, day__meal_plan__user=user)
    except Meal.DoesNotExist:
        return None

    if not meal_obj.consumed:
        meal_obj.consumed = True
        meal_obj.save()

        if date_str:
            try:
                dval = datetime.strptime(date_str, "%Y-%m-%d").date()
            except:
                dval = meal_obj.day.date
        else:
            dval = meal_obj.day.date

        from tracker.utils import update_daily_intake

        total_cal = 0
        total_p = 0
        total_c = 0
        total_f = 0

        foods = Food.objects.filter(meal=meal_obj)
        for f in foods:
            if not f.consumed:
                f.consumed = True
                f.save()
                total_cal += f.calories or 0
                total_p   += f.protein  or 0
                total_c   += f.carbs    or 0
                total_f   += f.fats     or 0

        update_daily_intake(
            user=user,
            date=dval,
            cals=total_cal,
            protein=total_p,
            carbs=total_c,
            fats=total_f
        )

    return meal_obj
