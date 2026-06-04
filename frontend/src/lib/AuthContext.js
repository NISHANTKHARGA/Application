'use client';
import { createContext, useContext, useReducer, useEffect } from 'react';
import api from './api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

const initialState = {
  user: null,
  role: null,
  isAuthenticated: false,
  isLoading: true,
};

const authReducer = (state, action) => {
  switch (action.type) {
    case 'SET_USER':
      return {
        ...state,
        user: action.payload.user,
        role: action.payload.role,
        isAuthenticated: true,
        isLoading: false,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        role: null,
        isAuthenticated: false,
        isLoading: false,
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      const storedRole = localStorage.getItem('role');

      if (token && storedUser && storedRole) {
        try {
          const response = await api.get('/auth/me');
          dispatch({
            type: 'SET_USER',
            payload: {
              user: response.data.user || response.data.lawyer || response.data.admin,
              role: response.data.role,
            },
          });
        } catch (error) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('role');
          dispatch({ type: 'LOGOUT' });
        }
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initAuth();
  }, []);

  const login = async (email, password, userType = 'user') => {
    try {
      const endpoint = userType === 'lawyer' ? '/auth/lawyer/login' : 
                       userType === 'admin' ? '/auth/admin/login' : '/auth/login';
      const response = await api.post(endpoint, { email, password });

      if (response.data.success) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user || response.data.lawyer || response.data.admin));
        localStorage.setItem('role', response.data.role);

        dispatch({
          type: 'SET_USER',
          payload: {
            user: response.data.user || response.data.lawyer || response.data.admin,
            role: response.data.role,
          },
        });

        toast.success('Welcome back!');
        return { success: true, role: response.data.role };
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      toast.error(message);
      return { success: false, message };
    }
  };

  const register = async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      if (response.data.success) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        localStorage.setItem('role', 'user');

        dispatch({
          type: 'SET_USER',
          payload: {
            user: response.data.user,
            role: 'user',
          },
        });

        toast.success('Registration successful!');
        return { success: true };
      }
    } catch (error) {
      const data = error.response?.data || {};
      const message = data.message || 'Registration failed';
      const detail = data.error || data.stack || null;
      toast.error(detail ? `${message}: ${detail}` : message);
      return { success: false, message: detail ? `${message}: ${detail}` : message };
    }
  };

  const lawyerRegister = async (formData) => {
    try {
      const response = await api.post('/auth/lawyer/register', formData);
      if (response.data.success) {
        toast.success(response.data.message);
        return { success: true, message: response.data.message };
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      toast.error(message);
      return { success: false, message };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    dispatch({ type: 'LOGOUT' });
    toast.success('Logged out successfully');
  };

  return (
    <AuthContext.Provider value={{ ...state, login, register, lawyerRegister, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
