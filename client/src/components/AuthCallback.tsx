import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const { setAuthData } = useAuth();

  useEffect(() => {
    console.log('=== AUTH CALLBACK COMPONENT MOUNTED ===');
    
    // Add a small delay to ensure URL is fully loaded
    const timer = setTimeout(() => {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      const userParam = urlParams.get('user');

      console.log('Auth callback - token:', !!token, 'user:', !!userParam);
      console.log('Full URL:', window.location.href);
      console.log('Current pathname:', window.location.pathname);
      console.log('Raw token:', token?.substring(0, 50) + '...');
      console.log('Raw user param:', userParam?.substring(0, 100) + '...');

      if (token && userParam) {
        try {
          const user = JSON.parse(decodeURIComponent(userParam));
          console.log('Parsed user:', user);
          
          // Use the new setAuthData function to avoid state reset
          setAuthData(token, user);
          console.log('Auth data set, navigating to chat');
          navigate('/chat');
        } catch (error) {
          console.error('Failed to parse user data:', error);
          setTimeout(() => navigate('/'), 2000);
        }
      } else {
        console.log('Missing token or user, redirecting to home in 2 seconds');
        // Only redirect if we're not in debug mode
        if (!window.location.search.includes('test=1')) {
          setTimeout(() => navigate('/'), 2000);
        }
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [navigate, setAuthData]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Completing sign in...</p>
      </div>
    </div>
  );
};

export default AuthCallback;