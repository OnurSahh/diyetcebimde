# accounts/views.py

from rest_framework import generics, status
from .serializers import RegisterSerializer, CustomTokenObtainPairSerializer
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.views import APIView
from .models import CustomUser
from rest_framework.decorators import api_view, permission_classes
from tracker.models import UserMacroGoal, UserCustomGoal

### RegisterView (for User Registration)
class RegisterView(generics.CreateAPIView):
    """
    API endpoint for user registration.
    Allows unauthenticated users to create a new account.
    """
    queryset = CustomUser.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        """
        Override the default create method to customize the response.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Create default goals for the new user
        user_goals = UserMacroGoal.objects.create(
            user=user,
            daily_calorie=2000,
            protein=100,
            carbs=250,
            fats=70,
            water_goal=2500
        )

        # Create matching custom goals
        UserCustomGoal.objects.create(
            user=user,
            daily_calorie=user_goals.daily_calorie,
            protein=user_goals.protein,
            carbs=user_goals.carbs,
            fats=user_goals.fats,
            water_goal=user_goals.water_goal,
            is_custom=False
        )

        return Response({
            "message": "User registered successfully",
            "user": {
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
            }
        }, status=status.HTTP_201_CREATED)

### CustomTokenObtainPairView (for User Login)
class CustomTokenObtainPairView(TokenObtainPairView):
    """
    API endpoint for user login.
    Provides JWT access and refresh tokens upon successful authentication.
    """
    serializer_class = CustomTokenObtainPairSerializer

### ProtectedView (Example of a Protected Endpoint)
class ProtectedView(APIView):
    """
    Example of a protected API endpoint.
    Only accessible to authenticated users with a valid access token.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Handle GET requests and return a personalized message.
        """
        return Response({
            "message": f"Hello, {request.user.first_name}! Welcome to your AI Nutritionist App."
        }, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_user(request):
    """
    API endpoint to get the current authenticated user's information.
    Used for session persistence in the frontend.
    """
    user = request.user
    return Response({
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name
    }, status=status.HTTP_200_OK)
