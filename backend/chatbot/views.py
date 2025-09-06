# chatbot/views.py
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from openai import OpenAI
from django.views.decorators.csrf import csrf_exempt
import cloudinary
import cloudinary.uploader
from PIL import Image
import os
import tempfile
from django.conf import settings

# Configure your Cloudinary account
cloudinary.config(
    cloud_name='dzl7xlvfy', 
    api_key='113518356455862', 
    api_secret='kQMsvySvnHJ6wF3Pc_eZpTPvXnI'
)

# Initialize OpenAI client with API key
client = OpenAI(api_key=settings.OPENAI_API_KEY)
# Default system prompt
SYSTEM_PROMPT = (
    "Senin adın Nobi. Bilgili ve destekleyici bir diyetisyen olarak hareket ediyorsunuz. "
    "Sadece yiyecekler (veya yiyeceklerin yola acabilecegi stres) hakkında konuşun. Konuşma temelli olarak çok kısa, net, olabildigince çok kısa ve alakalı tavsiyeler verin, "
    "ancak kullanıcı açıkça bahsetmediği sürece önceki etkileşimlere referans vermeyin. "
    "GPT arayüzünde çalışan semboller (örneğin **, ###) kullanmayın! Türkçe yaz ve kısa yaz."
)

@api_view(['POST'])
@permission_classes([AllowAny])
@authentication_classes([])  # Disable authentication
@csrf_exempt  # Disable CSRF protection
def send_photo(request):
    """
    Fotoğraf tabanlı mesajları işlemek için endpoint.
    Beklenenler:
      - 'purpose': 'analyze_food', 'prepare_meal', 'menu_analysis', 'food_item_analysis'
      - 'image': Fotoğraf dosyası (multipart/form-data).
      - 'additional_input' (opsiyonel)
    """
    if not request.content_type.startswith('multipart/form-data'):
        return Response({"message": "Content-Type must be multipart/form-data."}, status=400)

    # Get purpose; if missing, default to "analyze_food"
    purpose = request.data.get('purpose', 'analyze_food').strip()
    file_obj = request.FILES.get('image', None)
    additional_input = request.data.get('additional_input', '').strip()

    if not file_obj:
        return Response({"message": "Missing 'image' data."}, status=400)

    # Set system prompt based on purpose
    if purpose == 'analyze_food':
        system_prompt = (
            "Bir diyetisyen olarak hareket ediyorsunuz. Görüntüdeki yiyeceği analiz edin ve "
            "kalori ile makro besin bilgisi sağlayın (gram, makro). GPT arayüzünde çalışan semboller kullanmayın!"
        )
    elif purpose == 'prepare_meal':
        if not additional_input:
            additional_input = "Kullanıcı ekstra malzeme belirtmedi."
        system_prompt = (
            f"Yaratıcı bir aşçı ve diyetisyen olarak hareket ediyorsunuz. Kullanıcının ekstra verdiği malzemeler: {additional_input}. "
            "Bu malzemelerle hazırlanabilecek yemekleri önerin (gram, makro). GPT arayüzünde çalışan semboller kullanmayın!"
        )
    elif purpose == 'menu_analysis':
        if not additional_input:
            additional_input = "Kullanıcı ekstra tercih belirtmedi."
        system_prompt = (
            f"Bir diyetisyen olarak hareket ediyorsunuz. Görüntüdeki menüyü analiz edin ve kullanıcının tercihlerine göre "
            f"en sağlıklı seçenekleri önerin. Kullanıcı tercihleri: {additional_input}. GPT arayüzünde çalışan semboller kullanmayın!"
        )
    elif purpose == 'food_item_analysis':
        system_prompt = (
            "Bir diyetisyen olarak hareket ediyorsunuz. Aşağıdaki görseldeki gıda öğesinin sağlıklı olup olmadığını belirleyin ve kısa, net bir değerlendirme yapın. GPT arayüzünde çalışan semboller kullanmayın!"
        )

    else:
        return Response({"message": "Invalid 'purpose' value."}, status=400)

    try:
        # Process the image using Pillow
        image = Image.open(file_obj)
        image = image.convert('RGB')
        image = image.resize((512, 512))

        # Save the resized image temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as temp_file:
            image.save(temp_file, format='JPEG')
            temp_file_path = temp_file.name

        # Upload image to Cloudinary
        response_cloudinary = cloudinary.uploader.upload(temp_file_path)
        response_url = response_cloudinary.get('secure_url')

        # Delete the temporary file
        os.remove(temp_file_path)

        # Prepare messages for GPT
        # Instead of passing a normal text message, you can structure them as needed for your model
        message_content = [
            {"type": "text", "text": system_prompt},
            {"type": "image_url", "image_url": {"url": response_url}},
        ]

        # Send request to GPT
        response = client.chat.completions.create(
            model="gpt-4o-2024-08-06",
            messages=[
                {
                    "role": "user",
                    "content": message_content,
                }
            ],
            max_tokens=600,
        )

        response_message = response.choices[0].message.content.strip()

        # Remove unwanted symbols from the response
        plain_text_response = response_message.replace('###', '').replace('**', '').replace('*', '').replace('__', '')

        return Response({"message": plain_text_response, "image_url": response_url})

    except Exception as e:
        return Response({"message": "Error: Failed to process the photo."}, status=500)


@api_view(['POST'])
@permission_classes([AllowAny])
@authentication_classes([])  # Disable authentication
@csrf_exempt  # Disable CSRF protection
def send_message(request):
    """
    Metin tabanlı sohbet mesajlarını işlemek için endpoint.
    Beklenen JSON gövde: 
      - 'messages': Mesaj listesi, her mesajda 'role' (user veya assistant) ve 'content'
      - Opsiyonel: 'purpose'
    """
    if not request.content_type.startswith('application/json'):
        return Response({"message": "Content-Type must be application/json."}, status=400)

    messages = request.data.get('messages', [])
    if not isinstance(messages, list):
        return Response({"message": "Invalid 'messages' format. It should be a list."}, status=400)

    purpose = request.data.get('purpose', '').strip()

    if purpose == 'prepare_meal':
        system_prompt = (
            "Yaratıcı bir aşçı ve diyetisyen olarak hareket ediyorsunuz. Kullanıcının verdiği malzemelerle "
            "hazırlanabilecek yemekleri önerin (gram, makro). GPT arayüzünde çalışan semboller kullanmayın!"
        )
    elif purpose == 'menu_analysis':
        system_prompt = (
            "Bir diyetisyen olarak hareket ediyorsunuz. Kullanıcının tercihlerine göre en sağlıklı menü seçeneklerini önerin. "
            "GPT arayüzünde çalışan semboller kullanmayın!"
        )
    elif purpose == 'food_item_analysis':
        system_prompt = (
            "Bir diyetisyen olarak hareket ediyorsunuz. Kullanıcının isteklerine göre süpermarketten alınabilecek en sağlıklı "
            "gıda öğelerini önerin. GPT arayüzünde çalışan semboller kullanmayın!"
        )
    else:
        system_prompt = SYSTEM_PROMPT

    full_messages = [{"role": "system", "content": system_prompt}] + messages

    # Add this at the beginning of your OpenAI call
    api_key = settings.OPENAI_API_KEY
    print(f"OpenAI API Key exists: {bool(api_key)}")
    print(f"OpenAI API Key starts with sk-: {api_key.startswith('sk-') if api_key else False}")

    try:
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=full_messages,
            max_tokens=600,
        )

        response_message = completion.choices[0].message.content.strip()
        plain_text_response = response_message.replace('###', '').replace('**', '').replace('*', '').replace('__', '')
        return Response({"message": plain_text_response})

    except Exception as e:
        return Response({"message": "Error: Unable to process your request."}, status=500)
