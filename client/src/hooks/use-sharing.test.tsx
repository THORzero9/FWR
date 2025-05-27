import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSharing } from './use-sharing';
import { FoodBank, NearbyUser } from '@shared/schema';

// Mock apiRequest from queryClient
vi.mock('@/lib/queryClient', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    apiRequest: vi.fn(),
  };
});

describe('useSharing Hook', () => {
  let queryClient: QueryClient;
  let mockApiRequest: ReturnType<typeof vi.fn>;

  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Infinity },
      },
    });
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  beforeEach(async () => {
    const qcModule = await import('@/lib/queryClient');
    mockApiRequest = qcModule.apiRequest as ReturnType<typeof vi.fn>;
    mockApiRequest.mockReset();
  });

  const mockFoodBanksData: FoodBank[] = [
    { id: 1, name: 'City Food Bank', distance: '5 miles', openHours: '9am-5pm', description: 'Main food bank' },
  ];
  const mockNearbyUsersData: NearbyUser[] = [
    { id: 1, name: 'John Doe', distance: '2 blocks', rating: 4.5, imageUrl: '' },
  ];

  it('should be loading when both queries are loading', () => {
    mockApiRequest.mockImplementation(() => new Promise(() => {})); // Keep them pending

    const { result } = renderHook(() => useSharing(), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data.foodBanks).toEqual([]);
    expect(result.current.data.nearbyUsers).toEqual([]);
  });

  it('should be loading when foodBanks is loading and nearbyUsers has data', async () => {
    mockApiRequest.mockImplementation((method, path) => {
      if (path === '/api/food-banks') {
        return new Promise(() => {}); // FoodBanks pending
      }
      if (path === '/api/nearby-users') {
        return Promise.resolve(mockNearbyUsersData);
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    const { result } = renderHook(() => useSharing(), { wrapper: createWrapper() });

    // Wait for nearbyUsers to resolve
    await waitFor(() => {
      expect(result.current.data.nearbyUsers).toEqual(mockNearbyUsersData);
    });
    
    // foodBanks is still loading, so hook's isLoading should be true
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data.foodBanks).toEqual([]);
  });

  it('should be loading when nearbyUsers is loading and foodBanks has data', async () => {
    mockApiRequest.mockImplementation((method, path) => {
      if (path === '/api/food-banks') {
        return Promise.resolve(mockFoodBanksData);
      }
      if (path === '/api/nearby-users') {
        return new Promise(() => {}); // NearbyUsers pending
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    const { result } = renderHook(() => useSharing(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.data.foodBanks).toEqual(mockFoodBanksData);
    });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data.nearbyUsers).toEqual([]);
  });

  it('should successfully fetch both foodBanks and nearbyUsers data', async () => {
    mockApiRequest.mockImplementation((method, path) => {
      if (path === '/api/food-banks') {
        return Promise.resolve(mockFoodBanksData);
      }
      if (path === '/api/nearby-users') {
        return Promise.resolve(mockNearbyUsersData);
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    const { result } = renderHook(() => useSharing(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false); // Both loaded
      expect(result.current.data.foodBanks).toEqual(mockFoodBanksData);
      expect(result.current.data.nearbyUsers).toEqual(mockNearbyUsersData);
    });
    expect(mockApiRequest).toHaveBeenCalledWith('GET', '/api/food-banks', undefined);
    expect(mockApiRequest).toHaveBeenCalledWith('GET', '/api/nearby-users', undefined);
  });

  it('should handle error when fetching foodBanks, but nearbyUsers succeeds', async () => {
    mockApiRequest.mockImplementation((method, path) => {
      if (path === '/api/food-banks') {
        return Promise.reject(new Error('Failed to fetch food banks'));
      }
      if (path === '/api/nearby-users') {
        return Promise.resolve(mockNearbyUsersData);
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    const { result } = renderHook(() => useSharing(), { wrapper: createWrapper() });
    
    // React Query will log an error to the console, this is expected.
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await waitFor(() => {
      // isLoading is true because foodBanks data is missing (due to error)
      expect(result.current.isLoading).toBe(true); 
      expect(result.current.data.foodBanks).toEqual([]); // Default to empty array on error/no data
      expect(result.current.data.nearbyUsers).toEqual(mockNearbyUsersData);
    });
    consoleErrorSpy.mockRestore();
  });

  it('should handle error when fetching nearbyUsers, but foodBanks succeeds', async () => {
    mockApiRequest.mockImplementation((method, path) => {
      if (path === '/api/food-banks') {
        return Promise.resolve(mockFoodBanksData);
      }
      if (path === '/api/nearby-users') {
        return Promise.reject(new Error('Failed to fetch nearby users'));
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useSharing(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(true);
      expect(result.current.data.foodBanks).toEqual(mockFoodBanksData);
      expect(result.current.data.nearbyUsers).toEqual([]);
    });
    consoleErrorSpy.mockRestore();
  });

  it('should handle errors for both queries', async () => {
    mockApiRequest.mockImplementation(() => Promise.reject(new Error('API Error')));
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useSharing(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(true); // Both errored, so data undefined
      expect(result.current.data.foodBanks).toEqual([]);
      expect(result.current.data.nearbyUsers).toEqual([]);
    });
    consoleErrorSpy.mockRestore();
  });
  
  it('should return empty arrays for data if queries resolve with undefined or null', async () => {
    mockApiRequest.mockImplementation((method, path) => {
      if (path === '/api/food-banks') {
        return Promise.resolve(undefined); // Simulate API returning no data or React Query cache being empty
      }
      if (path === '/api/nearby-users') {
        return Promise.resolve(null); // Simulate API returning null
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    const { result } = renderHook(() => useSharing(), { wrapper: createWrapper() });

    await waitFor(() => {
      // isLoading is false because both queries have "resolved" (even with undefined/null)
      expect(result.current.isLoading).toBe(false); 
      expect(result.current.data.foodBanks).toEqual([]);
      expect(result.current.data.nearbyUsers).toEqual([]);
    });
  });
});
