import { toast } from 'react-toastify';

export const validateApiUrl = (url) => {
  if (!url) {
    toast.error('API URL no configurada. Por favor, configure REACT_APP_API_URL');
    return false;
  }
  try {
    new URL(url);
    return true;
  } catch {
    toast.error('URL de API inválida');
    return false;
  }
};

export const safeParseInt = (value, defaultValue = 0) => {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

export const validateElectionStatus = (election) => {
  if (!election) return false;
  
  const now = Math.floor(Date.now() / 1000);
  const isActive = now >= election.startTime && now <= election.endTime;
  
  if (!isActive) {
    toast.error('Esta elección no está activa actualmente');
  }
  
  return isActive;
};

export const handleApiError = (error, defaultMessage = 'Error de conexión con el servidor') => {
  const errorMessage = error?.message || defaultMessage;
  console.error('Error API:', error);
  toast.error(errorMessage);
  return errorMessage;
};

export const createLoadingState = () => ({
  loading: false,
  error: '',
  data: null,
  lastUpdated: null
});

export const updateLoadingState = (state, newState) => ({
  ...state,
  ...newState,
  lastUpdated: newState.error ? null : new Date()
});
