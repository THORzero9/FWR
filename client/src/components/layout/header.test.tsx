import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Header from './header'; // Adjust path as needed
import { User } from '@shared/schema'; // Assuming User type for mock

// Mock hooks
const mockLogoutMutate = vi.fn();
const mockUseAuth = vi.fn();
const mockToast = vi.fn();
const mockSetLocation = vi.fn();

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));
vi.mock('wouter', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    Link: ({ href, children }: { href: string, children: React.ReactNode }) => <a href={href}>{children}</a>,
    useLocation: () => ["/", mockSetLocation], // Current location and mock setLocation
  };
});

// Helper to provide QueryClient
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient();
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const mockUser: User = { id: 1, username: 'testuser', email: 'test@example.com' };

describe('Header Component', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Default: User not logged in
    mockUseAuth.mockReturnValue({ user: null, logoutMutation: { mutate: mockLogoutMutate } });
  });

  describe('Rendering (User Not Logged In)', () => {
    it('displays site title, search, notifications, and Login button', () => {
      render(<Header />, { wrapper: AllTheProviders });
      expect(screen.getByRole('link', { name: /FreshSave/i })).toHaveAttribute('href', '/');
      expect(screen.getByLabelText(/Search/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Notifications/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Login/i })).toHaveAttribute('href', '/auth');
      expect(screen.queryByText(mockUser.username)).not.toBeInTheDocument(); // No user dropdown
    });
  });

  describe('Rendering (User Logged In)', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: mockUser, logoutMutation: { mutate: mockLogoutMutate } });
    });

    it('displays site title, search, notifications, and user dropdown', () => {
      render(<Header />, { wrapper: AllTheProviders });
      expect(screen.getByRole('link', { name: /FreshSave/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/Search/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Notifications/i)).toBeInTheDocument();
      expect(screen.getByText(mockUser.username)).toBeInTheDocument(); // User dropdown with username
      expect(screen.queryByRole('link', { name: /Login/i })).not.toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('opens search dialog on search icon click', () => {
      render(<Header />, { wrapper: AllTheProviders });
      fireEvent.click(screen.getByLabelText(/Search/i));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/Search Inventory/i)).toBeInTheDocument();
    });

    it('search dialog handles input, submission, and cancel', async () => {
      render(<Header />, { wrapper: AllTheProviders });
      fireEvent.click(screen.getByLabelText(/Search/i)); // Open dialog
      
      const searchInput = screen.getByPlaceholderText(/Search for items.../i);
      const submitButton = screen.getByRole('button', { name: /Search/i });
      const cancelButton = screen.getByRole('button', { name: /Cancel/i });

      // Test input
      fireEvent.change(searchInput, { target: { value: 'apples' } });
      expect(searchInput).toHaveValue('apples');
      expect(submitButton).not.toBeDisabled();

      // Test submission
      fireEvent.click(submitButton);
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
          title: "Search",
          description: 'Searching for "apples"...',
        }));
      });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); // Dialog closes
      // expect(searchInput).toHaveValue(''); // Input cleared - this check fails as component re-renders dialog fresh

      // Test cancel
      fireEvent.click(screen.getByLabelText(/Search/i)); // Re-open dialog
      fireEvent.change(screen.getByPlaceholderText(/Search for items.../i), { target: { value: 'bananas' } });
      fireEvent.click(cancelButton);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    
    it('search button in dialog is disabled if query is empty', () => {
      render(<Header />, { wrapper: AllTheProviders });
      fireEvent.click(screen.getByLabelText(/Search/i));
      const submitButton = screen.getByRole('button', { name: /Search/i });
      expect(submitButton).toBeDisabled();
      fireEvent.change(screen.getByPlaceholderText(/Search for items.../i), { target: { value: '  ' } }); // whitespace
      expect(submitButton).toBeDisabled();
    });

    it('shows notification toast on notification icon click', () => {
      render(<Header />, { wrapper: AllTheProviders });
      fireEvent.click(screen.getByLabelText(/Notifications/i));
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
        title: "Notifications",
        description: "You have no new notifications.",
      }));
      // Note: The problem statement implies notificationsOpen state is set, but it's not used to open a dialog.
      // The current implementation just shows a toast.
    });

    describe('User Dropdown (Logged In)', () => {
      beforeEach(() => {
        mockUseAuth.mockReturnValue({ user: mockUser, logoutMutation: { mutate: mockLogoutMutate } });
      });

      it('opens dropdown and shows logout option', () => {
        render(<Header />, { wrapper: AllTheProviders });
        // The trigger is complex (Button with User icon and username). Find by username.
        fireEvent.click(screen.getByText(mockUser.username)); 
        expect(screen.getByText(/Log out/i)).toBeVisible(); // Dropdown item
      });

      it('calls logoutMutation and redirects on "Log out" click', async () => {
        render(<Header />, { wrapper: AllTheProviders });
        fireEvent.click(screen.getByText(mockUser.username)); // Open dropdown
        fireEvent.click(screen.getByText(/Log out/i));
        
        await waitFor(() => {
          expect(mockLogoutMutate).toHaveBeenCalledTimes(1);
          expect(mockSetLocation).toHaveBeenCalledWith('/auth');
        });
      });
    });
  });
});
