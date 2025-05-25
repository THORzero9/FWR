import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './use-auth';
import type { UserCredentials, UserRegistration } from '@shared/schema'; // Assuming these types exist

// Mock dependencies
vi.mock('@/lib/queryClient', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    apiRequest: vi.fn(),
    queryClient: new QueryClient({ // Use a real QueryClient for testing mutations' effects on cache
      defaultOptions: {
        queries: { retry: false, staleTime: Infinity }, // Disable retries and keep data fresh for tests
      },
    }), 
  };
});

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock window.location.href
const originalLocation = window.location;
beforeAll(() => {
  // @ts-ignore
  delete window.location;
  window.location = { ...originalLocation, href: vi.fn() };
});
afterAll(() => {
  window.location = originalLocation; // Restore original location
});


describe('useAuth Hook and AuthProvider', () => {
  let queryClient: QueryClient;
  let mockApiRequest: ReturnType<typeof vi.fn>;
  let mockToast: ReturnType<typeof vi.fn>;
  
  // Wrapper component that includes QueryClientProvider and AuthProvider
  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Infinity },
        mutations: { retry: false },
      },
    });
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    );
  };

  beforeEach(async () => {
    // Import mocked anmed exports
    const qcModule = await import('@/lib/queryClient');
    mockApiRequest = qcModule.apiRequest as ReturnType<typeof vi.fn>;
    
    const toastModule = await import('@/hooks/use-toast');
    mockToast = (toastModule.useToast().toast) as ReturnType<typeof vi.fn>;

    // Reset mocks and QueryClient cache before each test
    mockApiRequest.mockReset();
    vi.mocked(window.location.href).mockReset();
    mockToast.mockReset();
    
    // Ensure the QueryClient used by the hook (from queryClient module) is also cleared.
    // This is a bit tricky as the module itself exports a client.
    // For full isolation, the AuthProvider should ideally accept a QueryClient instance.
    // Or, we ensure the default client is cleared.
    const realQueryClientModule = await import('@/lib/queryClient');
    realQueryClientModule.queryClient.clear(); // Clear the shared client
  });

  it('useAuth should throw error if not used within AuthProvider', () => {
    // Suppress console.error output from React when it catches the error
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used within an AuthProvider');
    consoleErrorSpy.mockRestore();
  });

  describe('User Fetching (/api/user)', () => {
    it('should initially be loading and then fetch authenticated user data', async () => {
      const mockUser = { id: 1, username: 'testuser', email: 'test@example.com' };
      mockApiRequest.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockUser,
      });

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
      
      expect(result.current.isLoading).toBe(true); // Initial loading state from useQuery

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.user).toEqual(mockUser);
        expect(result.current.error).toBeNull();
      });
      expect(mockApiRequest).toHaveBeenCalledWith("GET", "/api/user");
    });

    it('should handle unauthenticated user (401 response)', async () => {
      // Mock fetch directly as useQuery in use-auth uses it for /api/user
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Unauthorized' }),
      });
      
      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      expect(result.current.isLoading).toBe(true);
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.user).toBeNull();
        // A 401 is not necessarily a query "error" in the sense of network failure,
        // but rather a state indicating no user. The hook's queryFn returns null.
        expect(result.current.error).toBeNull(); 
      });
       expect(global.fetch).toHaveBeenCalledWith("/api/user", {"credentials": "include"});
    });
    
    it('should handle other API errors during user fetch', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({ message: 'Server Error' }),
      });

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      expect(result.current.isLoading).toBe(true);
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.user).toBeNull();
        expect(result.current.error).toBeInstanceOf(Error);
        expect(result.current.error?.message).toContain('API request failed: 500 Internal Server Error');
      });
    });
    
     it('should handle network errors during user fetch', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network failure'));

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      expect(result.current.isLoading).toBe(true);
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.user).toBeNull(); // initialData
        expect(result.current.error).toBeInstanceOf(Error);
        expect(result.current.error?.message).toBe('Network failure');
      });
    });
  });

  describe('Login Mutation', () => {
    const loginCredentials: UserCredentials = { username: 'test', password: 'password' };
    const mockUser = { id: 1, username: 'test', email: 'test@example.com' };

    it('should successfully login and update user state', async () => {
      // Initial state: no user
       global.fetch = vi.fn().mockResolvedValueOnce({ ok: false, status: 401 }); // No user initially
      
      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.user).toBeNull());

      // Mock login API call
      mockApiRequest.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
      });
      
      act(() => {
        result.current.loginMutation.mutate(loginCredentials);
      });

      await waitFor(() => {
        expect(result.current.loginMutation.isSuccess).toBe(true);
        expect(result.current.user).toEqual(mockUser); // User state updated via queryClient.setQueryData
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Login successful' }));
        expect(window.location.href).toBe('/');
      });
      expect(mockApiRequest).toHaveBeenCalledWith("POST", "/api/login", loginCredentials);
    });

    it('should handle login failure', async () => {
      mockApiRequest.mockRejectedValueOnce(new Error('Invalid credentials'));
      
      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
      
      act(() => {
        result.current.loginMutation.mutate(loginCredentials);
      });

      await waitFor(() => {
        expect(result.current.loginMutation.isError).toBe(true);
        expect(result.current.loginMutation.error?.message).toBe('Invalid credentials');
        expect(result.current.user).toBeNull(); // User state should not change
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Login failed', variant: 'destructive' }));
        expect(window.location.href).not.toHaveBeenCalled();
      });
    });
  });

  describe('Register Mutation', () => {
    const registerCredentials: UserRegistration = { username: 'newuser', email: 'new@example.com', password: 'password123' };
    const mockNewUser = { id: 2, username: 'newuser', email: 'new@example.com' };

    it('should successfully register and update user state', async () => {
       global.fetch = vi.fn().mockResolvedValueOnce({ ok: false, status: 401 }); // No user initially
      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.user).toBeNull());


      mockApiRequest.mockResolvedValueOnce({
        ok: true,
        json: async () => mockNewUser,
      });
      
      act(() => {
        result.current.registerMutation.mutate(registerCredentials);
      });

      await waitFor(() => {
        expect(result.current.registerMutation.isSuccess).toBe(true);
        expect(result.current.user).toEqual(mockNewUser);
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Registration successful' }));
        expect(window.location.href).toBe('/');
      });
       expect(mockApiRequest).toHaveBeenCalledWith("POST", "/api/register", registerCredentials);
    });

    it('should handle registration failure', async () => {
      mockApiRequest.mockRejectedValueOnce(new Error('Username already exists'));
      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
      
      act(() => {
        result.current.registerMutation.mutate(registerCredentials);
      });

      await waitFor(() => {
        expect(result.current.registerMutation.isError).toBe(true);
        expect(result.current.registerMutation.error?.message).toBe('Username already exists');
        expect(result.current.user).toBeNull();
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Registration failed', variant: 'destructive' }));
      });
    });
  });

  describe('Logout Mutation', () => {
    const mockUser = { id: 1, username: 'testuser', email: 'test@example.com' };
    
    it('should successfully logout and clear user state', async () => {
      // Start with an authenticated user
      global.fetch = vi.fn().mockResolvedValueOnce({ ok: true, status: 200, json: async () => mockUser });
      const { result, rerender } = renderHook(() => useAuth(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.user).toEqual(mockUser));

      // Mock logout API call
      mockApiRequest.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
      
      act(() => {
        result.current.logoutMutation.mutate();
      });

      await waitFor(() => {
        expect(result.current.logoutMutation.isSuccess).toBe(true);
        expect(result.current.user).toBeNull(); // User state cleared via queryClient.setQueryData
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Logged out' }));
        expect(window.location.href).toBe('/auth');
      });
      expect(mockApiRequest).toHaveBeenCalledWith("POST", "/api/logout");
    });

    it('should handle logout failure but still clear user and redirect', async () => {
      // Start with an authenticated user
      global.fetch = vi.fn().mockResolvedValueOnce({ ok: true, status: 200, json: async () => mockUser });
      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.user).toEqual(mockUser));

      mockApiRequest.mockRejectedValueOnce(new Error('Logout API error'));
      
      act(() => {
        result.current.logoutMutation.mutate();
      });

      await waitFor(() => {
        expect(result.current.logoutMutation.isError).toBe(true);
        expect(result.current.logoutMutation.error?.message).toBe('Logout API error');
        expect(result.current.user).toBeNull(); // User state should still be cleared
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Logout failed', variant: 'destructive' }));
        expect(window.location.href).toBe('/auth'); // Should still redirect
      });
    });
  });
});
