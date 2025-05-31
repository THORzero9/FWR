import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useStats } from './use-stats';
import { FoodWasteStats } from '@shared/schema'; // Assuming FoodWasteStats type

// Mock apiRequest from queryClient
vi.mock('@/lib/queryClient', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    apiRequest: vi.fn(),
  };
});

describe('useStats Hook', () => {
  let queryClient: QueryClient;
  let mockApiRequest: ReturnType<typeof vi.fn>;

  // Wrapper component that includes QueryClientProvider
  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false, 
          staleTime: Infinity,
        },
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

  it('should be in a loading state initially', () => {
    mockApiRequest.mockReturnValue(new Promise(() => {})); // Pending promise
    const { result } = renderHook(() => useStats(), { wrapper: createWrapper() });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeNull();
  });

  it('should fetch stats successfully', async () => {
    const mockStatsData: FoodWasteStats = {
      co2Saved: 150.5,
      waterSaved: 2500,
      moneySaved: 85.2,
      wasteReduced: 18.7,
      monthlyProgress: [{ month: "Jan", amount: 10.0 }],
      wasteBreakdown: [{ category: "Fruits", percentage: 30 }],
    };
    mockApiRequest.mockResolvedValue(mockStatsData);

    const { result } = renderHook(() => useStats(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.data).toEqual(mockStatsData);
      expect(result.current.error).toBeNull();
    });
    
    expect(mockApiRequest).toHaveBeenCalledWith('GET', '/api/stats', undefined);
  });

  it('should handle API errors when fetching stats', async () => {
    const errorMessage = 'Failed to fetch stats';
    mockApiRequest.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useStats(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(true);
      expect(result.current.data).toBeUndefined();
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe(errorMessage);
    });
    expect(mockApiRequest).toHaveBeenCalledWith('GET', '/api/stats', undefined);
  });
});
