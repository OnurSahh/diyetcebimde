from django.urls import path
from .views import manual_add, get_manual_entries, delete_manual_entry

urlpatterns = [
    path('manual-add/', manual_add, name='manual_add'),
    path('manual-entries/', get_manual_entries, name='get_manual_entries'),
    path('manual-entry/<int:entry_id>/', delete_manual_entry, name='delete_manual_entry'),
]
