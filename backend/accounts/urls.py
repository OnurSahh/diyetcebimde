# accounts/urls.py

from django.urls import path
from .views import RegisterView, CustomTokenObtainPairView, ProtectedView, get_current_user
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='login'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/user/', get_current_user, name='user'),
    path('auth/protected/', ProtectedView.as_view(), name='protected'),
]
