import { useState, useEffect, useCallback } from "react";

const DEFAULT_TIMEOUT = 5000;

export const fetchAPI = async (url: string, options?: RequestInit) => {
  const updatedOptions = {
      ...options,
      headers: {
          ...options?.headers,
          Connection: "keep-alive",
      },
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

  try {
      const response = await fetch(url, { ...updatedOptions, signal: controller.signal });

      clearTimeout(timeoutId); // Clear timeout on successful response

      if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      // Return the parsed JSON response directly
      return await response.json();
  } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
          console.error("Fetch aborted due to timeout");
          throw new Error("Fetch request timed out");
      }

      console.error("Fetch error:", error);
      throw error instanceof Error ? error : new Error("Unknown error occurred");
  }
};


export const useFetch = <T>(url: string, options?: RequestInit) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchAPI(url, options);
      if (result.success) {
        setData(result.data);
      } else {
        throw new Error('API call failed');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [url, options]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
};
