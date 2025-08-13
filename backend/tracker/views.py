from django.utils import timezone
from django.db.models import Sum
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from datetime import timedelta, date

from .models import DailyIntake, UserMacroGoal, WeightHistory, UserCustomGoal
from .serializers import DailyIntakeSerializer, WeightHistorySerializer, UserMacroGoalSerializer, UserCustomGoalSerializer

from mealgpt.models import ManualTrackingDay, ManualTrackingEntry
from mealphoto.models import UserPhotoMeal  # Adjust if your model name is different

# Helper function to get or create today's DailyIntake
def get_or_create_daily_intake(user, target_date=None):
    """Get or create a DailyIntake for the specified user and date"""
    target_date = target_date or timezone.now().date()
    
    # Try to get existing record
    try:
        return DailyIntake.objects.get(user=user, date=target_date)
    except DailyIntake.DoesNotExist:
        # Create new record with goals from user's preferences
        try:
            user_goals = UserMacroGoal.objects.get(user=user)
            daily_intake = DailyIntake.objects.create(
                user=user,
                date=target_date,
                goal_calorie=user_goals.daily_calorie,
                goal_protein=user_goals.protein,
                goal_carbs=user_goals.carbs,
                goal_fats=user_goals.fats,
                water_goal=user_goals.water_goal,
            )
            return daily_intake
        except UserMacroGoal.DoesNotExist:
            # No goals set, create with defaults
            return DailyIntake.objects.create(
                user=user,
                date=target_date
            )

# Helper function to get manual entries for a date range
def get_manual_entries(user, start_date, end_date=None):
    """
    Aggregates entries from manual tracking and photo meals for a user
    within the specified date range.
    """
    result = {}
    
    # If only one date is provided, set end_date to the same date
    if end_date is None:
        end_date = start_date
    
    # Get manual entries from mealgpt app
    manual_days = ManualTrackingDay.objects.filter(
        user=user,
        date__gte=start_date,
        date__lte=end_date
    )
    
    # Process manual entries
    for day in manual_days:
        day_str = day.date.isoformat()
        entries = day.entries.all()
        
        if day_str not in result:
            result[day_str] = {
                'calories': 0,
                'protein': 0,
                'carbs': 0,
                'fats': 0,
                'entries': []
            }
        
        # Add entry details
        for entry in entries:
            result[day_str]['calories'] += entry.calories
            result[day_str]['protein'] += entry.protein
            result[day_str]['carbs'] += entry.carbs
            result[day_str]['fats'] += entry.fats
            
            result[day_str]['entries'].append({
                'id': entry.id,
                'name': entry.name,
                'calories': entry.calories,
                'protein': entry.protein,
                'carbs': entry.carbs,
                'fats': entry.fats,
                'source': 'manual'
            })
    
    # Get photo meal entries - use created_at__date instead of date
    try:
        photo_meals = UserPhotoMeal.objects.filter(
            user=user,
            created_at__date__gte=start_date,
            created_at__date__lte=end_date
        )
        
        # Process photo meal entries
        for meal in photo_meals:
            day_str = meal.created_at.date().isoformat()
            
            if day_str not in result:
                result[day_str] = {
                    'calories': 0,
                    'protein': 0,
                    'carbs': 0,
                    'fats': 0,
                    'entries': []
                }
            
            # Add meal details - using the direct fields, not meal_data
            result[day_str]['calories'] += meal.calories
            result[day_str]['protein'] += meal.protein
            result[day_str]['carbs'] += meal.carbs
            result[day_str]['fats'] += meal.fats
            
            result[day_str]['entries'].append({
                'id': meal.id,
                'name': meal.name,
                'calories': meal.calories,
                'protein': meal.protein,
                'carbs': meal.carbs,
                'fats': meal.fats,
                'source': 'photo'
            })
    except Exception as e:
        print(f"Error processing photo meals: {e}")
    
    return result

# Water tracking endpoints
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_water_intake(request):
    """Update water intake for the day"""
    amount = request.data.get('amount')
    target_date_str = request.data.get('date')
    
    # Validate input
    if amount is None:
        return Response({'error': 'Amount required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        amount = int(amount)
        if amount < 0:
            raise ValueError("Amount cannot be negative")
    except ValueError:
        return Response({'error': 'Invalid amount'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Parse date if provided
    target_date = None
    if target_date_str:
        try:
            target_date = date.fromisoformat(target_date_str)
        except ValueError:
            return Response({'error': 'Invalid date format'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Get or create today's intake record
    daily_intake = get_or_create_daily_intake(request.user, target_date)
    
    # Update water intake
    daily_intake.water_actual = amount
    daily_intake.save()
    
    return Response({
        'water_actual': daily_intake.water_actual,
        'water_goal': daily_intake.water_goal
    })

# Weight tracking endpoints
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def log_weight(request):
    """Log user's weight"""
    weight = request.data.get('weight')
    notes = request.data.get('notes', '')
    target_date_str = request.data.get('date')
    
    # Validate input
    if weight is None:
        return Response({'error': 'Weight required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        weight = float(weight)
        if weight <= 0 or weight > 500:  # Reasonable limits
            raise ValueError("Weight out of reasonable range")
    except ValueError:
        return Response({'error': 'Invalid weight'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Parse date if provided, otherwise use today
    target_date = timezone.now().date()
    if target_date_str:
        try:
            target_date = date.fromisoformat(target_date_str)
        except ValueError:
            return Response({'error': 'Invalid date format'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Create or update weight entry
    weight_entry, created = WeightHistory.objects.update_or_create(
        user=request.user,
        date=target_date,
        defaults={
            'weight': weight,
            'notes': notes
        }
    )
    
    return Response(WeightHistorySerializer(weight_entry).data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_weight_history(request):
    """Get user's weight history"""
    # Get optional limit parameter (default to 30 days)
    limit = request.query_params.get('limit', 30)
    try:
        limit = int(limit)
    except ValueError:
        limit = 30
    
    entries = WeightHistory.objects.filter(
        user=request.user
    ).order_by('-date')[:limit]
    
    return Response(WeightHistorySerializer(entries, many=True).data)

# Statistics endpoints
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_daily_statistics(request):
    """Get today's nutritional statistics"""
    target_date_str = request.query_params.get('date')
    
    # Parse date if provided, otherwise use today
    target_date = timezone.now().date()
    if target_date_str:
        try:
            target_date = date.fromisoformat(target_date_str)
        except ValueError:
            return Response({'error': 'Invalid date format'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Get or create today's intake record
    daily_intake = get_or_create_daily_intake(request.user, target_date)
    
    # Try to get weight for the day
    try:
        weight_entry = WeightHistory.objects.get(user=request.user, date=target_date)
        weight = weight_entry.weight
    except WeightHistory.DoesNotExist:
        weight = None
    
    # Get food item details from manual tracking or entries
    # This depends on your existing application structure
    # This is a placeholder - replace with your actual food items retrieval
    food_items = []  # You'll need to populate this from your food tracking system
    
    response_data = {
        'date': daily_intake.date.isoformat(),
        'totals': {
            'calories': {
                'goal': daily_intake.goal_calorie,
                'actual': daily_intake.actual_calorie
            },
            'protein': {
                'goal': daily_intake.goal_protein,
                'actual': daily_intake.actual_protein
            },
            'carbs': {
                'goal': daily_intake.goal_carbs,
                'actual': daily_intake.actual_carbs
            },
            'fats': {
                'goal': daily_intake.goal_fats,
                'actual': daily_intake.actual_fats
            },
            'water': {
                'goal': daily_intake.water_goal,
                'actual': daily_intake.water_actual
            }
        },
        'foodItems': food_items,
        'weight': weight
    }
    
    return Response(response_data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_weekly_statistics(request):
    """Get nutritional statistics for the past 7 days"""
    end_date = timezone.now().date()
    start_date = end_date - timedelta(days=6)  # 7 days including today
    
    # Get records for the past 7 days
    daily_records = DailyIntake.objects.filter(
        user=request.user,
        date__gte=start_date,
        date__lte=end_date
    ).order_by('date')
    
    # Get weight records for the same period
    weight_records = WeightHistory.objects.filter(
        user=request.user,
        date__gte=start_date,
        date__lte=end_date
    ).order_by('date')
    
    # Prepare data arrays for the response
    dates = []
    calories_actual = []
    calories_goal = []
    protein_actual = []
    carbs_actual = []
    fats_actual = []
    water_actual = []
    water_goal = []
    weights = []
    
    # Create a lookup for weight records by date
    weight_by_date = {record.date: record.weight for record in weight_records}
    
    # Fill in any missing days with default records
    current_date = start_date
    while current_date <= end_date:
        # Try to find existing record for this date
        day_record = next((record for record in daily_records if record.date == current_date), None)
        
        if not day_record:
            # Create a dummy record with zeros for missing dates
            day_record = DailyIntake(
                user=request.user,
                date=current_date,
                actual_calorie=0,
                actual_protein=0,
                actual_carbs=0,
                actual_fats=0,
                water_actual=0,
                goal_calorie=0,
                goal_protein=0,
                goal_carbs=0,
                goal_fats=0,
                water_goal=0
            )
        
        # Format date as "Mon", "Tue", etc.
        date_str = current_date.strftime('%a')
        dates.append(date_str)
        
        # Add nutritional data
        calories_actual.append(day_record.actual_calorie)
        calories_goal.append(day_record.goal_calorie)
        protein_actual.append(day_record.actual_protein)
        carbs_actual.append(day_record.actual_carbs)
        fats_actual.append(day_record.actual_fats)
        water_actual.append(day_record.water_actual)
        water_goal.append(day_record.water_goal)
        
        # Add weight data if available
        weights.append(weight_by_date.get(current_date))
        
        # Move to next day
        current_date += timedelta(days=1)
    
    response_data = {
        'dates': dates,
        'calories': {
            'actual': calories_actual,
            'goal': calories_goal
        },
        'macros': {
            'protein': protein_actual,
            'carbs': carbs_actual,
            'fats': fats_actual
        },
        'water': {
            'actual': water_actual,
            'goal': water_goal
        },
        'weight': weights
    }
    
    return Response(response_data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_monthly_statistics(request):
    """Get nutritional statistics for the current month"""
    # Get current date
    today = timezone.now().date()
    # Get first day of the month
    start_date = today.replace(day=1)
    
    # Get records for the current month
    daily_records = DailyIntake.objects.filter(
        user=request.user,
        date__gte=start_date,
        date__lte=today
    ).order_by('date')
    
    # Get weight records for the same period
    weight_records = WeightHistory.objects.filter(
        user=request.user,
        date__gte=start_date,
        date__lte=today
    ).order_by('date')
    
    # Prepare data arrays for the response
    dates = []
    calories_actual = []
    calories_goal = []
    protein_actual = []
    carbs_actual = []
    fats_actual = []
    water_actual = []
    water_goal = []
    weights = []
    
    # Create a lookup for weight records by date
    weight_by_date = {record.date: record.weight for record in weight_records}
    
    # Fill in any missing days with default records
    current_date = start_date
    while current_date <= today:
        # Try to find existing record for this date
        day_record = next((record for record in daily_records if record.date == current_date), None)
        
        if not day_record:
            # Create a dummy record with zeros for missing dates
            day_record = DailyIntake(
                user=request.user,
                date=current_date,
                actual_calorie=0,
                actual_protein=0,
                actual_carbs=0,
                actual_fats=0,
                water_actual=0,
                goal_calorie=0,
                goal_protein=0,
                goal_carbs=0,
                goal_fats=0,
                water_goal=0
            )
        
        # Format date as ISO format
        date_str = current_date.isoformat()
        dates.append(date_str)
        
        # Add nutritional data
        calories_actual.append(day_record.actual_calorie)
        calories_goal.append(day_record.goal_calorie)
        protein_actual.append(day_record.actual_protein)
        carbs_actual.append(day_record.actual_carbs)
        fats_actual.append(day_record.actual_fats)
        water_actual.append(day_record.water_actual)
        water_goal.append(day_record.water_goal)
        
        # Add weight data if available
        weights.append(weight_by_date.get(current_date))
        
        # Move to next day
        current_date += timedelta(days=1)
    
    response_data = {
        'dates': dates,
        'calories': {
            'actual': calories_actual,
            'goal': calories_goal
        },
        'macros': {
            'protein': protein_actual,
            'carbs': carbs_actual,
            'fats': fats_actual
        },
        'water': {
            'actual': water_actual,
            'goal': water_goal
        },
        'weight': weights
    }
    
    return Response(response_data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_goals(request):
    """Get both recommended and custom goals for the user"""
    try:
        # Get recommended goals from survey calculations
        recommended_goals = UserMacroGoal.objects.get(user=request.user)
        
        # Get or create custom goals (initialized with recommended values)
        custom_goals, created = UserCustomGoal.objects.get_or_create(
            user=request.user,
            defaults={
                'daily_calorie': recommended_goals.daily_calorie,
                'protein': recommended_goals.protein,
                'carbs': recommended_goals.carbs,
                'fats': recommended_goals.fats,
                'water_goal': recommended_goals.water_goal,
                'is_custom': False
            }
        )
        
        # Return both for comparison
        response_data = {
            'recommended': UserMacroGoalSerializer(recommended_goals).data,
            'custom': UserCustomGoalSerializer(custom_goals).data
        }
        
        return Response(response_data)
    except UserMacroGoal.DoesNotExist:
        return Response({'error': 'No recommended goals found. Please complete the survey.'}, 
                        status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_custom_goals(request):
    """Update user's custom nutrition goals"""
    try:
        # Get existing custom goals or create with defaults from recommended
        try:
            custom_goals = UserCustomGoal.objects.get(user=request.user)
        except UserCustomGoal.DoesNotExist:
            recommended = UserMacroGoal.objects.get(user=request.user)
            custom_goals = UserCustomGoal.objects.create(
                user=request.user,
                daily_calorie=recommended.daily_calorie,
                protein=recommended.protein,
                carbs=recommended.carbs,
                fats=recommended.fats,
                water_goal=recommended.water_goal
            )
        
        # Update with new values
        for field in ['daily_calorie', 'protein', 'carbs', 'fats', 'water_goal']:
            if field in request.data:
                setattr(custom_goals, field, request.data[field])
        
        custom_goals.is_custom = True  # Mark as manually edited
        custom_goals.save()
        
        return Response(UserCustomGoalSerializer(custom_goals).data)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_daily_manual_statistics(request):
    """Get today's manual tracking statistics"""
    try:
        target_date_str = request.query_params.get('date')
        
        # Parse date if provided, otherwise use today
        target_date = timezone.now().date()
        if target_date_str:
            try:
                target_date = date.fromisoformat(target_date_str)
            except ValueError:
                return Response({'error': 'Invalid date format'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get manual entries for the day
        entries = get_manual_entries(request.user, target_date)
        
        # Get daily intake for macronutrient goals
        daily_intake = get_or_create_daily_intake(request.user, target_date)
        
        # Get weight entry - same as weekly plan
        try:
            weight_entry = WeightHistory.objects.get(user=request.user, date=target_date)
            weight = weight_entry.weight
        except WeightHistory.DoesNotExist:
            weight = None
        
        # Format the response
        response_data = {
            'date': target_date.isoformat(),
            'entries': entries.get(target_date.isoformat(), {}).get('entries', []),
            'totals': {
                'calories': {
                    'goal': daily_intake.goal_calorie,
                    'actual': entries.get(target_date.isoformat(), {}).get('calories', 0)
                },
                'protein': {
                    'goal': daily_intake.goal_protein,
                    'actual': entries.get(target_date.isoformat(), {}).get('protein', 0)
                },
                'carbs': {
                    'goal': daily_intake.goal_carbs,
                    'actual': entries.get(target_date.isoformat(), {}).get('carbs', 0)
                },
                'fats': {
                    'goal': daily_intake.goal_fats,
                    'actual': entries.get(target_date.isoformat(), {}).get('fats', 0)
                },
                'water': {
                    'goal': daily_intake.water_goal,  # Use water_goal instead of goal_water
                    'actual': daily_intake.water_actual
                }
            },
            'weight': weight
        }
        
        return Response(response_data)
    except Exception as e:
        print(f"Error in get_daily_manual_statistics: {e}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_weekly_manual_statistics(request):
    """Get manual tracking statistics for the past 7 days"""
    try:
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=6)  # 7 days including today
        
        # Get manual entries for the week
        entries = get_manual_entries(request.user, start_date, end_date)
        
        # Prepare data arrays for the response
        dates = []
        calories_actual = []
        protein_actual = []
        carbs_actual = []
        fats_actual = []
        water_actual = []
        weights = []
        
        # Get goals (using the latest daily intake for goals)
        daily_intake = get_or_create_daily_intake(request.user)
        calories_goal = daily_intake.goal_calorie
        protein_goal = daily_intake.goal_protein
        carbs_goal = daily_intake.goal_carbs
        fats_goal = daily_intake.goal_fats
        water_goal = daily_intake.water_goal  # Use water_goal instead of goal_water
        
        # Fill in data for each day
        current_date = start_date
        while current_date <= end_date:
            date_str = current_date.strftime('%a')  # 'Mon', 'Tue', etc.
            iso_date = current_date.isoformat()
            dates.append(date_str)
            
            day_entries = entries.get(iso_date, {})
            
            # Add nutritional data
            calories_actual.append(day_entries.get('calories', 0))
            protein_actual.append(day_entries.get('protein', 0))
            carbs_actual.append(day_entries.get('carbs', 0))
            fats_actual.append(day_entries.get('fats', 0))
            
            # Add water data - use the same approach as weekly plan
            try:
                daily_intake_record = DailyIntake.objects.get(user=request.user, date=current_date)
                water_actual.append(daily_intake_record.water_actual)
            except DailyIntake.DoesNotExist:
                water_actual.append(0)
            
            # Add weight data - use the same approach as weekly plan
            try:
                weight_record = WeightHistory.objects.get(user=request.user, date=current_date)
                weights.append(weight_record.weight)
            except WeightHistory.DoesNotExist:
                weights.append(None)
            
            # Move to next day
            current_date += timedelta(days=1)
        
        response_data = {
            'dates': dates,
            'calories': {
                'actual': calories_actual,
                'goal': [calories_goal] * 7
            },
            'macros': {
                'protein': protein_actual,
                'carbs': carbs_actual,
                'fats': fats_actual
            },
            'water': {
                'actual': water_actual,
                'goal': [water_goal] * 7
            },
            'weight': weights,  # Changed from 'weights' to 'weight' to match weekly plan format
            'goals': {
                'protein': protein_goal,
                'carbs': carbs_goal,
                'fats': fats_goal,
                'water': water_goal
            }
        }
        
        return Response(response_data)
    except Exception as e:
        print(f"Error in get_weekly_manual_statistics: {e}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_monthly_manual_statistics(request):
    """Get manual tracking statistics for the current month"""
    try:
        # Get current date
        today = timezone.now().date()
        # Get first day of the month
        start_date = today.replace(day=1)
        
        # Get manual entries for the month
        entries = get_manual_entries(request.user, start_date, today)
        
        # Prepare data arrays for the response
        dates = []
        calories_actual = []
        protein_actual = []
        carbs_actual = []
        fats_actual = []
        water_actual = []
        weights = []
        
        # Get goals (using the latest daily intake for goals)
        daily_intake = get_or_create_daily_intake(request.user)
        calories_goal = daily_intake.goal_calorie
        protein_goal = daily_intake.goal_protein
        carbs_goal = daily_intake.goal_carbs
        fats_goal = daily_intake.goal_fats
        water_goal = daily_intake.water_goal  # Use water_goal instead of goal_water
        
        # Fill in data for each day
        current_date = start_date
        while current_date <= today:
            # Format date as day of month
            date_str = str(current_date.day)
            iso_date = current_date.isoformat()
            dates.append(date_str)
            
            day_entries = entries.get(iso_date, {})
            
            # Add nutritional data
            calories_actual.append(day_entries.get('calories', 0))
            protein_actual.append(day_entries.get('protein', 0))
            carbs_actual.append(day_entries.get('carbs', 0))
            fats_actual.append(day_entries.get('fats', 0))
            
            # Add water data - use the same approach as weekly plan
            try:
                daily_intake_record = DailyIntake.objects.get(user=request.user, date=current_date)
                water_actual.append(daily_intake_record.water_actual)
            except DailyIntake.DoesNotExist:
                water_actual.append(0)
            
            # Add weight data - use the same approach as weekly plan
            try:
                weight_record = WeightHistory.objects.get(user=request.user, date=current_date)
                weights.append(weight_record.weight)
            except WeightHistory.DoesNotExist:
                weights.append(None)
            
            # Move to next day
            current_date += timedelta(days=1)
        
        # Number of days in the period
        days_count = len(dates)
        
        response_data = {
            'dates': dates,
            'calories': {
                'actual': calories_actual,
                'goal': [calories_goal] * days_count
            },
            'macros': {
                'protein': protein_actual,
                'carbs': carbs_actual,
                'fats': fats_actual
            },
            'water': {
                'actual': water_actual,
                'goal': [water_goal] * days_count
            },
            'weight': weights,  # Changed from 'weights' to 'weight' to match weekly plan format
            'goals': {
                'protein': protein_goal,
                'carbs': carbs_goal,
                'fats': fats_goal,
                'water': water_goal
            }
        }
        
        return Response(response_data)
    except Exception as e:
        print(f"Error in get_monthly_manual_statistics: {e}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
