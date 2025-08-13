# survey/views.py

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from datetime import date
from .models import Survey, DailyIntake
from .serializers import SurveySerializer, DailyIntakeSerializer
from rest_framework.decorators import api_view, permission_classes
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from tracker.models import UserCustomGoal  # Import the UserCustomGoal model

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_survey(request):
    """Submit user survey data"""
    user = request.user
    survey_data = request.data.copy()
    survey_data['user'] = user.id
    
    try:
        survey = Survey.objects.get(user=user)
        serializer = SurveySerializer(survey, data=survey_data, context={'request': request})
    except Survey.DoesNotExist:
        serializer = SurveySerializer(data=survey_data, context={'request': request})
    
    if serializer.is_valid():
        survey = serializer.save()
        
        print(f"Survey saved for user {user.id}. Now updating UserCustomGoal...")
        
        # Get the macro values from the survey
        # Adjust these field names to match your Survey model's actual field names
        calorie_intake = survey.calorie_intake
        protein_goal = survey.protein_goal 
        carbs_goal = survey.carbs_goal
        fats_goal = survey.fats_goal
        
        print(f"Survey values: {calorie_intake} kcal, {protein_goal}g protein, {carbs_goal}g carbs, {fats_goal}g fats")
        
        # Update or create UserCustomGoal with survey values
        custom_goal, created = UserCustomGoal.objects.update_or_create(
            user=user,
            defaults={
                'daily_calorie': calorie_intake,
                'protein': protein_goal,
                'carbs': carbs_goal,
                'fats': fats_goal,
                'water_goal': 2500,  # Default water goal
                'is_custom': False   # Not manually set
            }
        )
        
        if created:
            print(f"Created new UserCustomGoal for user {user.id} with survey values")
        else:
            print(f"Updated existing UserCustomGoal for user {user.id} with survey values")
        
        return Response({'message': 'Survey submitted successfully.'}, status=status.HTTP_200_OK)
    else:
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class SubmitSurveyView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        survey_data = request.data.copy()
        survey_data['user'] = user.id

        try:
            survey = Survey.objects.get(user=user)
            serializer = SurveySerializer(survey, data=survey_data, context={'request': request})
        except Survey.DoesNotExist:
            serializer = SurveySerializer(data=survey_data, context={'request': request})

        if serializer.is_valid():
            survey = serializer.save()
            
            # Get macro values from survey
            calorie_intake = survey.calorie_intake or 2000
            macros = survey.macros or {}
            protein = macros.get('protein', 100)
            carbs = macros.get('carbs', 250)
            fats = macros.get('fats', 70)
            water_goal = 2500  # Default water goal
            
            # Update or create UserCustomGoal with survey values
            UserCustomGoal.objects.update_or_create(
                user=user,
                defaults={
                    'daily_calorie': calorie_intake,
                    'protein': protein,
                    'carbs': carbs,
                    'fats': fats,
                    'water_goal': water_goal,
                    'is_custom': False  # Not manually set
                }
            )
            
            # Continue with the rest of your view logic
            return Response({'message': 'Survey submitted successfully.'}, status=status.HTTP_200_OK)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class DailyIntakeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        today = date.today()
        try:
            daily_intake = DailyIntake.objects.get(user=user, date=today)
            serializer = DailyIntakeSerializer(daily_intake)
            return Response(serializer.data, status=200)
        except DailyIntake.DoesNotExist:
            # Otomatik oluştur:
            survey = None
            try:
                survey = Survey.objects.get(user=user)
            except Survey.DoesNotExist:
                # O da yoksa, mecburen 404
                return Response({'error': 'Survey not found, cannot create daily intake.'}, status=404)

            daily_intake = DailyIntake.objects.create(
                user=user,
                date=today,
                calorie_goal=survey.calorie_intake,
                macros_goal=survey.macros or {"protein":0,"carbs":0,"fats":0},
                # calorie_intake=0,
                # macros_intake={},
            )
            serializer = DailyIntakeSerializer(daily_intake)
            return Response(serializer.data, status=200)


class UpdateDailyIntakeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        today = date.today()
        data = request.data

        try:
            daily_intake = DailyIntake.objects.get(user=user, date=today)
            calorie_addition = data.get('calorie_intake', 0)
            macros_addition = data.get('macros_intake', {})

            daily_intake.calorie_intake += calorie_addition
            macros_intake = daily_intake.macros_intake or {}
            for key, value in macros_addition.items():
                macros_intake[key] = macros_intake.get(key, 0) + value
            daily_intake.macros_intake = macros_intake
            daily_intake.save()
            return Response({'message': 'Daily intake updated successfully.'}, status=status.HTTP_200_OK)
        except DailyIntake.DoesNotExist:
            return Response({'error': 'Daily intake data not found for today'}, status=status.HTTP_404_NOT_FOUND)

class GetSurveyView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        try:
            survey = Survey.objects.get(user=user)
            serializer = SurveySerializer(survey)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Survey.DoesNotExist:
            return Response({'error': 'Survey data not found.'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_survey_status(request):
    user = request.user
    try:
        Survey.objects.get(user=user)
        return Response({'completed': True}, status=status.HTTP_200_OK)
    except Survey.DoesNotExist:
        return Response({'completed': False}, status=status.HTTP_200_OK)

class UpdateSurveyView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request):
        user = request.user
        try:
            survey = Survey.objects.get(user=user)
        except Survey.DoesNotExist:
            return Response({'error': 'Survey not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = SurveySerializer(survey, data=request.data, context={'request': request}, partial=True)
        if serializer.is_valid():
            survey = serializer.save()
            
            # Get macro values from updated survey
            calorie_intake = survey.calorie_intake or 2000
            macros = survey.macros or {}
            protein = macros.get('protein', 100)
            carbs = macros.get('carbs', 250)
            fats = macros.get('fats', 70)
            water_goal = 2500  # Default water goal
            
            # Update UserCustomGoal with survey values if not manually set
            try:
                custom_goal = UserCustomGoal.objects.get(user=user)
                # Only update if user hasn't manually customized their goals
                if not custom_goal.is_custom:
                    custom_goal.daily_calorie = calorie_intake
                    custom_goal.protein = protein
                    custom_goal.carbs = carbs
                    custom_goal.fats = fats
                    custom_goal.water_goal = water_goal
                    custom_goal.save()
            except UserCustomGoal.DoesNotExist:
                # Create new if doesn't exist
                UserCustomGoal.objects.create(
                    user=user,
                    daily_calorie=calorie_intake,
                    protein=protein,
                    carbs=carbs,
                    fats=fats,
                    water_goal=water_goal,
                    is_custom=False
                )
            
            return Response(serializer.data, status=status.HTTP_200_OK)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
