# survey/urls.py

from django.urls import path
from .views import (
    SubmitSurveyView,
    DailyIntakeView,
    UpdateDailyIntakeView,
    check_survey_status,
    GetSurveyView,
    UpdateSurveyView,
)

urlpatterns = [
    path('submit-data/', SubmitSurveyView.as_view(), name='submit-survey'),
    path('daily-intake/', DailyIntakeView.as_view(), name='daily-intake'),  # <-- EKLENDİ
    path('update-daily-intake/', UpdateDailyIntakeView.as_view(), name='update-daily-intake'),
    path('check-survey-status/', check_survey_status, name='check-survey-status'),
    path('get-survey/', GetSurveyView.as_view(), name='get-survey'),
    path('update-survey/', UpdateSurveyView.as_view(), name='update-survey'),
]
