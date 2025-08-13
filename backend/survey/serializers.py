# survey/serializers.py

from rest_framework import serializers
from .models import Survey, Measurement, MedicineDetail, DailyIntake

class MeasurementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Measurement
        exclude = ['survey']

class MedicineDetailSerializer(serializers.ModelSerializer):
    times = serializers.ListField(
        child=serializers.TimeField(format='%H:%M:%S', input_formats=['%H:%M', '%H:%M:%S']), 
        required=False
    )

    class Meta:
        model = MedicineDetail
        exclude = ['survey']

class SurveySerializer(serializers.ModelSerializer):
    measurements = MeasurementSerializer(required=False)
    medicine_details = MedicineDetailSerializer(many=True, required=False)
    bad_habits = serializers.JSONField(required=False)
    health_conditions = serializers.JSONField(required=False)
    meal_times = serializers.JSONField(required=False)
    meal_types = serializers.JSONField(required=False)
    excluded_items = serializers.ListField(child=serializers.CharField(), required=False)
    disliked_and_allergies = serializers.ListField(child=serializers.CharField(), required=False)
    activity_data = serializers.JSONField(required=False)
    snack_times = serializers.ListField(
        child=serializers.TimeField(format='%H:%M:%S', input_formats=['%H:%M', '%H:%M:%S']), 
        required=False
    )
    ideal_weight_range = serializers.JSONField(required=False)
    ideal_body_fat_range = serializers.JSONField(required=False)
    macros = serializers.JSONField(required=False)
    # user_preferences alanı kaldırıldı

    class Meta:
        model = Survey
        fields = '__all__'
        read_only_fields = ['user']

    def create(self, validated_data):
        measurements_data = validated_data.pop('measurements', None)
        medicine_details_data = validated_data.pop('medicine_details', [])
        user = self.context['request'].user

        survey = Survey.objects.create(user=user, **validated_data)

        if measurements_data:
            Measurement.objects.create(survey=survey, **measurements_data)

        for medicine_data in medicine_details_data:
            times = medicine_data.pop('times', [])
            medicine_detail = MedicineDetail.objects.create(survey=survey, **medicine_data)
            medicine_detail.times = times
            medicine_detail.save()

        return survey

    def update(self, instance, validated_data):
        measurements_data = validated_data.pop('measurements', None)
        medicine_details_data = validated_data.pop('medicine_details', [])

        # Update Survey fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update or create Measurements
        if measurements_data:
            Measurement.objects.update_or_create(survey=instance, defaults=measurements_data)

        # Handle MedicineDetails
        if medicine_details_data:
            instance.medicine_details.all().delete()
            for medicine_data in medicine_details_data:
                times = medicine_data.pop('times', [])
                medicine_detail = MedicineDetail.objects.create(survey=instance, **medicine_data)
                medicine_detail.times = times
                medicine_detail.save()

        return instance

class DailyIntakeSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyIntake
        fields = '__all__'
        read_only_fields = ['user', 'date']