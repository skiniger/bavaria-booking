import { AxiosError } from 'axios';
import type { ToastType } from '../store/useStore';

export interface ApiError {
  message: string;
  status?: number;
  details?: unknown;
}

export function parseApiError(error: unknown): ApiError {
  if (error instanceof AxiosError) {
    const status = error.response?.status;
    const data = error.response?.data;

    // Check for specific error messages
    if (data?.detail) {
      return {
        message: data.detail,
        status,
        details: data,
      };
    }

    if (data?.message) {
      return {
        message: data.message,
        status,
        details: data,
      };
    }

    // Handle different HTTP status codes
    switch (status) {
      case 400:
        return {
          message: 'Ungültige Anfrage. Bitte überprüfen Sie Ihre Eingaben.',
          status,
          details: data,
        };
      case 401:
        return {
          message: 'Nicht autorisiert. Bitte melden Sie sich an.',
          status,
        };
      case 403:
        return {
          message: 'Zugriff verweigert. Sie haben keine Berechtigung.',
          status,
        };
      case 404:
        return {
          message: 'Die angeforderte Ressource wurde nicht gefunden.',
          status,
        };
      case 500:
        return {
          message: 'Serverfehler. Bitte versuchen Sie es später erneut.',
          status,
        };
      case 503:
        return {
          message: 'Service nicht verfügbar. Bitte versuchen Sie es später erneut.',
          status,
        };
      default:
        return {
          message: error.message || 'Ein unbekannter Fehler ist aufgetreten.',
          status,
        };
    }
  }

  if (error instanceof Error) {
    return {
      message: error.message,
    };
  }

  return {
    message: 'Ein unbekannter Fehler ist aufgetreten.',
  };
}

export function getToastTypeFromError(error: ApiError): ToastType {
  if (!error.status) return 'error';

  if (error.status >= 400 && error.status < 500) {
    return 'warning';
  }

  return 'error';
}

export function handleApiError(error: unknown, addToast: (type: ToastType, message: string) => void) {
  const apiError = parseApiError(error);
  const toastType = getToastTypeFromError(apiError);
  addToast(toastType, apiError.message);
  console.error('API Error:', apiError);
}
