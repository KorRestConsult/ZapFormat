import { useCallback, useState } from 'react';

export function useAsync<T>() {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (operation: () => Promise<T>) => {
    setLoading(true);
    setError(null);
    try {
      const result = await operation();
      setData(result);
      return result;
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Ошибка выполнения операции';
      setError(message);
      throw caught;
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, run };
}
