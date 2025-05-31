import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SharePage from './share'; // Adjust path as needed
import { FoodBank, NearbyUser } from '@shared/schema';

// Mock hooks
const mockUseSharing = vi.fn();
vi.mock('@/hooks/use-sharing', () => ({
  useSharing: () => mockUseSharing(),
}));

// Mock child components
vi.mock('@/components/share/nearby-user-card', () => ({
  default: ({ user }: { user: NearbyUser }) => <div data-testid={`nearby-user-card-${user.id}`}>{user.name}</div>,
}));
vi.mock('@/components/share/food-bank-card', () => ({
  default: ({ foodBank }: { foodBank: FoodBank }) => <div data-testid={`food-bank-card-${foodBank.id}`}>{foodBank.name}</div>,
}));

// Helper to provide QueryClient
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// Sample Data
const sampleNearbyUsers: NearbyUser[] = [
  { id: 1, name: 'Alice', distance: '1 mile', rating: 4.5, imageUrl: '' },
  { id: 2, name: 'Bob', distance: '0.5 miles', rating: 4.0, imageUrl: '' },
];
const sampleFoodBanks: FoodBank[] = [
  { id: 101, name: 'Main Street Food Pantry', distance: '2 miles', openHours: 'Mon-Fri 9am-5pm', description: 'Community food bank' },
  { id: 102, name: 'Helping Hand Food Bank', distance: '5 miles', openHours: 'Tue, Thu 10am-2pm', description: 'Volunteer-run' },
];

describe('SharePage Component', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Default mock for useSharing
    mockUseSharing.mockReturnValue({ 
      data: { nearbyUsers: [], foodBanks: [] }, 
      isLoading: false, 
      error: null 
    });
  });

  it('renders loading state', () => {
    mockUseSharing.mockReturnValue({ data: undefined, isLoading: true, error: null });
    render(<SharePage />, { wrapper: AllTheProviders });
    expect(screen.getByText(/Loading sharing options.../i)).toBeInTheDocument();
  });

  it('renders main sections: Share & Donate, Nearby Food Sharing, Local Food Banks', () => {
    render(<SharePage />, { wrapper: AllTheProviders });
    expect(screen.getByRole('heading', { name: /Share & Donate/i, level: 2 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Nearby Food Sharing/i, level: 3 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Local Food Banks/i, level: 3 })).toBeInTheDocument();
  });

  it('renders empty state for nearby users and food banks when data is empty', () => {
    mockUseSharing.mockReturnValue({ 
      data: { nearbyUsers: [], foodBanks: [] }, 
      isLoading: false 
    });
    render(<SharePage />, { wrapper: AllTheProviders });

    // Check that no user cards are rendered
    const nearbyUsersSection = screen.getByText('Nearby Food Sharing').closest('div');
    expect(nearbyUsersSection).toBeDefined();
    expect(within(nearbyUsersSection!).queryAllByTestId(/nearby-user-card-/).length).toBe(0);

    // Check that no food bank cards are rendered
    const foodBanksSection = screen.getByText('Local Food Banks').closest('div');
    expect(foodBanksSection).toBeDefined();
    expect(within(foodBanksSection!).queryAllByTestId(/food-bank-card-/).length).toBe(0);
  });

  describe('With Sharing Data', () => {
    beforeEach(() => {
      mockUseSharing.mockReturnValue({
        data: { nearbyUsers: sampleNearbyUsers, foodBanks: sampleFoodBanks },
        isLoading: false,
      });
    });

    it('renders NearbyUserCard components for each nearby user', () => {
      render(<SharePage />, { wrapper: AllTheProviders });
      sampleNearbyUsers.forEach(user => {
        expect(screen.getByTestId(`nearby-user-card-${user.id}`)).toHaveTextContent(user.name);
      });
    });

    it('renders FoodBankCard components for each food bank', () => {
      render(<SharePage />, { wrapper: AllTheProviders });
      sampleFoodBanks.forEach(foodBank => {
        expect(screen.getByTestId(`food-bank-card-${foodBank.id}`)).toHaveTextContent(foodBank.name);
      });
    });
    
    it('renders the map placeholder and action buttons', () => {
      render(<SharePage />, { wrapper: AllTheProviders });
      // Check for SVG map placeholder (presence of SVG element)
      expect(screen.getByRole('graphics-document')).toBeInTheDocument(); // Role for SVG
      
      // Check for buttons
      expect(screen.getByRole('button', { name: /Find Nearby/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /filter_list/i })).toBeInTheDocument(); // Icon button
    });
  });
  
  it('handles isLoading true but data also present (e.g. during refetch)', () => {
    // This scenario might happen if isLoading is true due to a background refetch,
    // but stale data is still available.
    mockUseSharing.mockReturnValue({
      data: { nearbyUsers: sampleNearbyUsers, foodBanks: sampleFoodBanks },
      isLoading: true, // e.g., refetching in background
    });
    render(<SharePage />, { wrapper: AllTheProviders });
    // Even if isLoading is true, if data is present, it should render the data
    // The current component logic prioritizes isLoading. If true, it shows loading spinner.
    // This test verifies that behavior.
    expect(screen.getByText(/Loading sharing options.../i)).toBeInTheDocument();
    expect(screen.queryByTestId(`nearby-user-card-${sampleNearbyUsers[0].id}`)).not.toBeInTheDocument();
  });
});
