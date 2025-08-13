from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView


urlpatterns = [
    path('admin/', admin.site.urls),
    path('chatbot/', include('chatbot.urls')),  # chatbot uygulamasının URL'lerini dahil et
    path('accounts/', include('accounts.urls')),
    path('api/auth/', include('accounts.urls')),  # Include authentication URLs
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/survey/', include('survey.urls')),  # Include survey URLs
    path('api/mealplan/', include('mealplan.urls')),
    path('api/tracker/', include('tracker.urls')),
    path('api/mealphoto/', include('mealphoto.urls')),
    path('api/mealgpt/', include('mealgpt.urls')),
    path('api/', include('accounts.urls')),
]