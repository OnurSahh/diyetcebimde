// app/context/AuthContext.tsx

import React, { createContext, useState, ReactNode, useEffect, useContext } from 'react';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';
import ipv4Data from '../../assets/ipv4_address.json';

interface User {
  email: string;
  first_name: string;
  last_name: string;
}

interface AuthContextData {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (
    email: string,
    first_name: string,
    last_name: string,
    password: string,
  ) => Promise<void>;
}

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthContext = createContext<AuthContextData>({
  user: null,
  login: async () => {},
  logout: async () => {},
  register: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const accessToken = await SecureStore.getItemAsync('accessToken');
        const refreshToken = await SecureStore.getItemAsync('refreshToken');
        
        if (accessToken) {
          // Set up axios with the token
          axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
          
          // Get user data
          const userResponse = await axios.get(
            `http://${ipv4Data.ipv4_address}:8000/api/auth/user/`
          );
          
          const { email, first_name, last_name } = userResponse.data;
          setUser({ email, first_name, last_name });
          console.log('User session restored');
        }
      } catch (error) {
        console.log('Error restoring session:', error);
        // Try to refresh the token here if needed
        await SecureStore.deleteItemAsync('accessToken');
        await SecureStore.deleteItemAsync('refreshToken');
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      // Remove any logging of sensitive information
      console.log('Login attempt initiated');
      
      const response = await axios.post(
        `http://${ipv4Data.ipv4_address}:8000/api/auth/login/`,
        { email, password }
      );

      const { access, refresh, email: userEmail, first_name, last_name } = response.data;

      // Store tokens securely using SecureStore
      await SecureStore.setItemAsync('accessToken', access);
      await SecureStore.setItemAsync('refreshToken', refresh);

      // Update user state
      setUser({ email: userEmail, first_name, last_name });
    } catch (error: any) {
      throw error; // Still propagate the error to be handled in the calling function
    }
  };

  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
      setUser(null);
      // Clear any other auth-related data from AsyncStorage if needed
      console.log('User successfully logged out');
    } catch (error: any) {
      console.error('AuthContext logout error:', error);
    }
  };

  const register = async (
    email: string,
    first_name: string,
    last_name: string,
    password: string
  ) => {
    console.log('Registering user:', { email, first_name, last_name });
    try {
      const response = await axios.post(
        `http://${ipv4Data.ipv4_address}:8000/api/auth/register/`,
        {
          email,
          first_name,
          last_name,
          password,
          password2: password, // Ensure passwords match
        }
      );
      console.log('Registration response:', response.data);
      // Optionally log the user in after registration
      await login(email, password);
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        console.error('Axios error response data:', error.response?.data);
        Alert.alert('Registration Error', JSON.stringify(error.response?.data));
      } else {
        console.error('Unexpected error:', error);
        Alert.alert('Registration Error', 'An unexpected error occurred.');
      }
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
};
