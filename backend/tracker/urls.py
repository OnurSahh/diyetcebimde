#tracker/urls.py
from django.urls import path
from . import views

urlpatterns = [
    # Replace these two with your existing statistics functions
    path('weekly-report/', views.get_weekly_statistics, name='tracker_weekly_report'),
    path('daily-intake/', views.get_daily_statistics, name='tracker_daily_intake'),

    # Water tracking
    path('water/', views.update_water_intake, name='update_water_intake'),
    
    # Weight tracking
    path('weight/', views.log_weight, name='log_weight'),
    path('weight/history/', views.get_weight_history, name='get_weight_history'),
    
    # Statistics - keep these too for backward compatibility
    path('statistics/daily/', views.get_daily_statistics, name='get_daily_statistics'),
    path('statistics/weekly/', views.get_weekly_statistics, name='get_weekly_statistics'),
    path('statistics/monthly/', views.get_monthly_statistics, name='get_monthly_statistics'),
    path('statistics/daily/manual/', views.get_daily_manual_statistics, name='get_daily_manual_statistics'),
    path('statistics/weekly/manual/', views.get_weekly_manual_statistics, name='get_weekly_manual_statistics'),
    path('statistics/monthly/manual/', views.get_monthly_manual_statistics, name='get_monthly_manual_statistics'),

    # Custom goals endpoints
    path('goals/', views.get_user_goals, name='get_user_goals'),
    path('goals/update/', views.update_custom_goals, name='update_custom_goals'),
]