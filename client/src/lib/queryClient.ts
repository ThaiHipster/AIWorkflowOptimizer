import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Custom error class that includes the response object
export class ApiError extends Error {
  response: Response;
  responseData?: any;
  
  constructor(message: string, response: Response) {
    super(message);
    this.name = 'ApiError';
    this.response = response;
  }
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Clone the response so we still have one to read later
    const clonedRes = res.clone();
    
    // Try to get json data first for better error messages
    try {
      const errorData = await res.json();
      const message = errorData.message || errorData.error || res.statusText;
      const errorInstance = new ApiError(`${res.status}: ${message}`, clonedRes);
      errorInstance.responseData = errorData;
      throw errorInstance;
    } catch (jsonError) {
      // If JSON parsing fails, fall back to text
      try {
        const text = await clonedRes.text() || res.statusText;
        throw new ApiError(`${res.status}: ${text}`, clonedRes);
      } catch (textError) {
        // Last resort if both fail
        throw new ApiError(`${res.status}: ${res.statusText}`, clonedRes);
      }
    }
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  try {
    const res = await fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    console.error(`API request failed: ${method} ${url}`, error);
    throw error; // Re-throw for handling by the caller
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error) {
      console.error(`Query failed for ${queryKey[0]}:`, error);
      
      // Special handling for 401 unauthorized if configured to return null
      if (error instanceof ApiError && error.response.status === 401 && unauthorizedBehavior === "returnNull") {
        return null;
      }
      
      // Re-throw all other errors
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
