import { useState } from 'react';
import { useStore } from '../store/useStore';
import { handleApiError } from '../utils/errorHandling';

interface UseApiCallOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: unknown) => void;
  successMessage?: string;
  showErrorToast?: boolean;
}

export function useApiCall<T = any>() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<T | null>(null);
  const { addToast } = useStore();

  const execute = async (
    apiCall: () => Promise<T>,
    options: UseApiCallOptions<T> = {}
  ): Promise<T | null> => {
    const {
      onSuccess,
      onError,
      successMessage,
      showErrorToast = true,
    } = options;

    setIsLoading(true);
    setError(null);

    try {
      const result = await apiCall();
      setData(result);

      if (successMessage) {
        addToast('success', successMessage);
      }

      onSuccess?.(result);
      return result;
    } catch (err) {
      setError(err as Error);

      if (showErrorToast) {
        handleApiError(err, addToast);
      }

      onError?.(err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setIsLoading(false);
    setError(null);
    setData(null);
  };

  return {
    execute,
    isLoading,
    error,
    data,
    reset,
  };
}
