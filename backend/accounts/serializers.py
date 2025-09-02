# accounts/serializers.py

from rest_framework import serializers
from .models import CustomUser
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

### RegisterSerializer (for Registration)
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = CustomUser
        fields = ('email', 'password', 'first_name', 'last_name')

    def create(self, validated_data):
        # Extract the data
        email = validated_data.get('email')
        password = validated_data.pop('password')
        first_name = validated_data.get('first_name')
        last_name = validated_data.get('last_name')
        
        # Create user with username set to email
        user = CustomUser.objects.create_user(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            username=email  # ADD THIS LINE - set username to email
        )
        
        return user

### CustomTokenObtainPairSerializer (for Login)
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = CustomUser.USERNAME_FIELD  # Corrected line

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Add custom claims
        token['email'] = user.email
        token['first_name'] = user.first_name
        token['last_name'] = user.last_name

        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data.update({
            'email': self.user.email,
            'first_name': self.user.first_name,
            'last_name': self.user.last_name,
        })
        return data
