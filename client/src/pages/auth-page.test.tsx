import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Switch, Route } from 'wouter'; // MemoryRouter for useLocation
import AuthPage from './auth-page'; // Adjust path as needed
import { useAuth } from '@/hooks/use-auth'; // Import the actual hook

// Mock hooks
const mockLoginMutation = vi.fn();
const mockRegisterMutation = vi.fn();
const mockSetLocation = vi.fn();
const mockToast = vi.fn();

// Hold a reference to the mocked useAuth
const mockedUseAuth = useAuth as vi.MockedFunction<typeof useAuth>;

vi.mock('@/hooks/use-auth', () => ({
  // Important: This mock factory needs to be defined before the above `mockedUseAuth` assignment
  // if we were to initialize `mockedUseAuth` directly from `vi.mocked(useAuth)`.
  // However, by mocking the module and then casting the imported `useAuth` later, we're fine.
  useAuth: vi.fn(() => ({ // Make the mock function itself mockable
    user: null,
    loginMutation: { mutate: mockLoginMutation, isPending: false },
    registerMutation: { mutate: mockRegisterMutation, isPending: false },
  })),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

// Mock wouter's useLocation
vi.mock('wouter', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useLocation: () => [ "/auth", mockSetLocation ], // Provide a mock setLocation
  };
});


// Helper to provide QueryClient and MemoryRouter
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/auth"]}>
        <Switch>
          <Route path="/auth">{children}</Route>
          <Route path="/"><div>Home Page</div></Route>
        </Switch>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('AuthPage Component', () => {
  beforeEach(() => {
    vi.resetAllMocks(); // Reset mocks before each test
    
    // Default mock implementation for useAuth (no user, mutations not pending)
    mockedUseAuth.mockReturnValue({
        user: null,
        loginMutation: { mutate: mockLoginMutation, isPending: false },
        registerMutation: { mutate: mockRegisterMutation, isPending: false },
    } as any);
  });

  it('renders login and register tabs, with login active by default', () => {
    render(<AuthPage />, { wrapper: AllTheProviders });
    expect(screen.getByRole('tab', { name: /Login/i, selected: true })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Register/i, selected: false })).toBeInTheDocument();
    expect(screen.getByLabelText(/Username/i)).toBeInTheDocument(); // Login form field
    expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument(); // Login form field
  });

  it('redirects to home if user is already logged in', async () => {
     // Override default mock for this test
    mockedUseAuth.mockReturnValue({
        user: { id: 1, username: 'testuser', email: 'test@example.com' },
        loginMutation: { mutate: mockLoginMutation, isPending: false },
        registerMutation: { mutate: mockRegisterMutation, isPending: false },
    } as any);

    render(<AuthPage />, { wrapper: AllTheProviders });
    
    await waitFor(() => {
      expect(mockSetLocation).toHaveBeenCalledWith('/');
    });
  });

  describe('Login Form', () => {
    it('allows typing in username and password fields', () => {
      render(<AuthPage />, { wrapper: AllTheProviders });
      fireEvent.change(screen.getByPlaceholderText('johndoe'), { target: { value: 'testuser' } });
      fireEvent.change(screen.getAllByPlaceholderText('••••••••')[0], { target: { value: 'password123' } });
      expect(screen.getByPlaceholderText('johndoe')).toHaveValue('testuser');
      expect(screen.getAllByPlaceholderText('••••••••')[0]).toHaveValue('password123');
    });

    it('shows validation errors for login form', async () => {
      render(<AuthPage />, { wrapper: AllTheProviders });
      fireEvent.click(screen.getByRole('button', { name: /Login/i }));

      expect(await screen.findByText('Username must be at least 3 characters')).toBeInTheDocument();
      expect(await screen.findByText('Password must be at least 6 characters')).toBeInTheDocument();
    });

    it('submits login form with correct data', async () => {
      render(<AuthPage />, { wrapper: AllTheProviders });
      fireEvent.change(screen.getByPlaceholderText('johndoe'), { target: { value: 'testuser' } });
      fireEvent.change(screen.getAllByPlaceholderText('••••••••')[0], { target: { value: 'password123' } });
      fireEvent.click(screen.getByLabelText(/Remember me/i)); // Check remember me
      fireEvent.click(screen.getByRole('button', { name: /Login/i }));

      await waitFor(() => {
        expect(mockLoginMutation).toHaveBeenCalledWith({
          username: 'testuser',
          password: 'password123',
          rememberMe: true,
        });
      });
    });
    
    it('shows "Logging in..." when loginMutation is pending', async () => {
      mockedUseAuth.mockReturnValue({
        user: null,
        loginMutation: { mutate: mockLoginMutation, isPending: true }, // isPending true
        registerMutation: { mutate: mockRegisterMutation, isPending: false },
      } as any);
      render(<AuthPage />, { wrapper: AllTheProviders });
      expect(screen.getByRole('button', { name: /Logging in.../i })).toBeDisabled();
    });
  });

  describe('Register Form', () => {
    beforeEach(() => {
      // Switch to register tab for these tests
      render(<AuthPage />, { wrapper: AllTheProviders });
      fireEvent.click(screen.getByRole('tab', { name: /Register/i }));
    });

    it('switches to register tab and shows register form fields', () => {
      expect(screen.getByRole('tab', { name: /Register/i, selected: true })).toBeInTheDocument();
      expect(screen.getByLabelText(/Username/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();
    });

    it('shows validation errors for register form', async () => {
      fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));
      expect(await screen.findByText('Username must be at least 3 characters')).toBeInTheDocument();
      expect(await screen.findByText('Please enter a valid email address')).toBeInTheDocument();
      expect(await screen.findAllByText('Password must be at least 6 characters')).toHaveLength(2); // Password & Confirm
    });
    
    it('shows \"Passwords do not match\" error', async () => {
      fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'newuser' } });
      fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'new@example.com' } });
      fireEvent.change(screen.getAllByPlaceholderText('••••••••')[0], { target: { value: 'password123' } });
      fireEvent.change(screen.getAllByPlaceholderText('••••••••')[1], { target: { value: 'password456' } });
      fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));
      
      expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
    });

    it('submits register form with correct data', async () => {
      fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'newuser' } });
      fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'new@example.com' } });
      fireEvent.change(screen.getAllByPlaceholderText('••••••••')[0], { target: { value: 'password123' } });
      fireEvent.change(screen.getAllByPlaceholderText('••••••••')[1], { target: { value: 'password123' } });
      fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));

      await waitFor(() => {
        expect(mockRegisterMutation).toHaveBeenCalledWith({
          username: 'newuser',
          email: 'new@example.com',
          password: 'password123',
          // confirmPassword is not sent
        });
      });
    });
    
    it('shows "Creating account..." when registerMutation is pending', async () => {
      mockedUseAuth.mockReturnValue({
        user: null,
        loginMutation: { mutate: mockLoginMutation, isPending: false },
        registerMutation: { mutate: mockRegisterMutation, isPending: true }, // isPending true
      } as any);
      // Need to re-render or ensure this mock is active before render
      render(<AuthPage />, { wrapper: AllTheProviders });
      fireEvent.click(screen.getByRole('tab', { name: /Register/i })); // Switch to register tab

      expect(screen.getByRole('button', { name: /Creating account.../i })).toBeDisabled();
    });
  });
});
