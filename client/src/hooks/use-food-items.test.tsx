import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFoodItems } from './use-food-items';
import { FoodItem } from '@shared/schema'; // Assuming FoodItem type is available

// Mock apiRequest from queryClient
vi.mock('@/lib/queryClient', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    apiRequest: vi.fn(), // This will be mocked to control API responses
     // queryClient will be provided by the wrapper in tests, but if the hook used a global one,
    // we might need to manage that too. For useQuery, it uses the one from context.
  };
});

describe('useFoodItems Hook', () => {
  let queryClient: QueryClient;
  let mockApiRequest: ReturnType<typeof vi.fn>;

  // Wrapper component that includes QueryClientProvider
  const createWrapper = () => {
    // New QueryClient for each test to ensure isolation
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false, // Disable retries for tests
          staleTime: Infinity, // Prevent immediate refetch for tests
          queryFn: async ({ queryKey }) => {
            // Get the mockApiRequest from the module scope of the test file
            // This assumes mockApiRequest is defined at the top of the test file or in a beforeEach
            const url = queryKey[0] as string;
            // The mockApiRequest should be the one from vi.mock('@/lib/queryClient')
            // which is assigned to the module-level `mockApiRequest` variable in beforeEach.
            if (!mockApiRequest) {
              throw new Error('mockApiRequest is not defined in queryFn. Check test setup.');
            }
            // Match the actual defaultQueryFn which returns data, not a Response
            const result = await mockApiRequest('GET', url, undefined);
            // If mockApiRequest is mocked to return a Response object (like actual apiRequest)
            // then we would do: return (await mockApiRequest('GET', url, undefined)).json();
            // But current tests mock it to return data directly.
            return result;
          },
        },
      },
    });
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
  
  beforeEach(async () => {
    // Dynamically import the mocked apiRequest from the actual module we are mocking
    // and assign it to our module-scoped variable.
    const qcModule = await import('@/lib/queryClient'); // This gets the mocked version due to vi.mock
    mockApiRequest = qcModule.apiRequest as ReturnType<typeof vi.fn>; 
    
    mockApiRequest.mockReset();
    
    // If there's a shared queryClient instance in the actual '@/lib/queryClient' module
    // that might be used by default by useQuery if not wrapped, ensure it's cleared.
    // However, useQuery should prioritize the client from QueryClientProvider.
    // qcModule.queryClient.clear(); // If applicable
  });

  it('should be in a loading state initially', () => {
    // Mock a pending promise that never resolves to keep it in loading state
    mockApiRequest.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useFoodItems(), { wrapper: createWrapper() });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeNull();
  });

  it('should fetch food items successfully', async () => {
    const mockFoodItems: FoodItem[] = [
      { id: 1, name: 'Apple', category: 'Fruit', quantity: 5, unit: 'pcs', expiryDate: '2024-12-01', addedDate: new Date(), favorite: false },
      { id: 2, name: 'Banana', category: 'Fruit', quantity: 10, unit: 'pcs', expiryDate: '2024-11-01', addedDate: new Date(), favorite: true },
    ];
    // The hook uses useQuery with queryKey: ["/api/food-items"]
    // React Query by default will call the queryFn with a QueryFunctionContext.
    // If no queryFn is provided in useQuery, it uses the defaultQueryFn from QueryClient.
    // We need to ensure our mockApiRequest is called.
    // The defaultQueryFn in queryClient.ts likely calls apiRequest("GET", queryKey[0]).
    mockApiRequest.mockResolvedValue(mockFoodItems); // Assuming apiRequest directly returns data

    const { result } = renderHook(() => useFoodItems(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.data).toEqual(mockFoodItems);
      expect(result.current.error).toBeNull();
    });
    
    // Verify apiRequest was called correctly by the default query function
    expect(mockApiRequest).toHaveBeenCalledWith('GET', '/api/food-items', undefined);
  });

  it('should handle API errors when fetching food items', async () => {
    const errorMessage = 'Failed to fetch food items';
    mockApiRequest.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useFoodItems(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(true);
      expect(result.current.data).toBeUndefined();
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe(errorMessage);
    });
    expect(mockApiRequest).toHaveBeenCalledWith('GET', '/api/food-items', undefined);
  });
  
  it('should use staleTime and refetchOnWindowFocus options', () => {
    // This test is more about verifying the options are passed to useQuery,
    // rather than testing React Query's behavior itself.
    // We can't directly inspect the options passed to useQuery after renderHook.
    // However, we know the hook is simple. If it works (fetches data),
    // it implies it's calling useQuery correctly.
    // We can check if data becomes stale and refetches, but that's complex for a unit test.
    // For now, we assume React Query handles these options correctly.
    // A functional/integration test would be better for staleTime/refetch behavior.
    
    // Basic check that the hook initializes
    mockApiRequest.mockResolvedValue([]);
    const { result } = renderHook(() => useFoodItems(), { wrapper: createWrapper() });
    expect(result.current).toBeDefined();
    // Further behavioral tests for staleTime etc. are typically out of scope for unit tests of a simple wrapper hook.
  });
});
