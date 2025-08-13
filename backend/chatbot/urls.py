# chatbot/urls.py
from django.urls import path
from .views import send_message, send_photo

urlpatterns = [
    path('send_message/', send_message, name='send_message'),
    path('send_photo/', send_photo, name='send_photo'),
]
