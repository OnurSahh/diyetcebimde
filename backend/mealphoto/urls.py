# mealphoto/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('send_photo/', views.send_photo, name='send_photo'),
    # If you have any other endpoints for mealphoto, add them here
]
