import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useMutation, useQueryClient } from '@tanstack/react-query';
import ExpiringItemCard from './expiring-item-card'; // Adjust path as needed
import { FoodItem, Recipe } from '@shared/schema';
import { calculateExpiryProgress } from '@/lib/utils/date-utils';

// Mock hooks and child components
const mockDeleteMutate = vi.fn();
const mockInvalidateQueries = vi.fn();
const mockToast = vi.fn();
const mockUseRecipes = vi.fn();

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useMutation: vi.fn(() => ({ mutate: mockDeleteMutate, isPending: false })),
    useQueryClient: vi.fn(() => ({ invalidateQueries: mockInvalidateQueries })),
  };
});

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/hooks/use-recipes', () => ({
  useRecipes: () => mockUseRecipes(),
}));

// Mock wouter Link, or just check its href if it's simple enough
vi.mock('wouter', () => ({
  Link: ({ href, children }: { href: string, children: React.ReactNode }) => <a href={href}>{children}</a>,
}));


// Helper to provide QueryClient
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient();
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const today = new Date();
const const_MS_PER_DAY = 1000 * 60 * 60 * 24;
const createDate = (daysFromNow: number) => new Date(today.getTime() + daysFromNow * const_MS_PER_DAY);

const sampleExpiringItem: FoodItem = {
  id: 1,
  name: 'Expiring Apple',
  category: 'Fruits', // "eco" icon
  quantity: 3,
  unit: 'pcs',
  expiryDate: createDate(2).toISOString(), // Expires in 2 days
  addedDate: createDate(-5).toISOString(),
  favorite: false,
};

const sampleRecipesData: Recipe[] = [
  { id: 1, name: 'Apple Pie', ingredients: ['Apple', 'Flour', 'Sugar'], description:'', prepTime:'', imageUrl:'', instructions:'', rating:0 },
  { id: 2, name: 'Fruit Salad', ingredients: ['Apple', 'Banana', 'Orange'], description:'', prepTime:'', imageUrl:'', instructions:'', rating:0 },
  { id: 3, name: 'Chicken Curry', ingredients: ['Chicken', 'Curry Powder'], description:'', prepTime:'', imageUrl:'', instructions:'', rating:0 },
];


describe('ExpiringItemCard Component', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (useMutation as ReturnType<typeof vi.fn>).mockReturnValue({
      mutate: mockDeleteMutate,
      isPending: false,
    });
    mockUseRecipes.mockReturnValue({ data: [], isLoading: false }); // Default no recipes
  });

  describe('Rendering', () => {
    it('displays item name, quantity, unit, category icon, and expiry text', () => {
      render(<ExpiringItemCard item={sampleExpiringItem} />, { wrapper: AllTheProviders });
      expect(screen.getByText(sampleExpiringItem.name)).toBeInTheDocument();
      expect(screen.getByText(/3 pcs - Expires in 2 days/i)).toBeInTheDocument();
      expect(screen.getByText('eco')).toBeInTheDocument(); // Material icon for Fruits
    });

    it('displays "Expires today!" for items expiring today', () => {
      const itemExpiringToday = { ...sampleExpiringItem, expiryDate: createDate(0).toISOString() };
      render(<ExpiringItemCard item={itemExpiringToday} />, { wrapper: AllTheProviders });
      expect(screen.getByText(/Expires today!/i)).toBeInTheDocument();
    });
    
    it('displays "Expired!" for expired items', () => {
      const itemExpired = { ...sampleExpiringItem, expiryDate: createDate(-2).toISOString() };
      render(<ExpiringItemCard item={itemExpired} />, { wrapper: AllTheProviders });
      expect(screen.getByText(/Expired!/i)).toBeInTheDocument();
      expect(screen.getByText(/Expired!/i).parentElement).toHaveClass('text-red-500');
    });

    it('displays expiry progress bar correctly', () => {
      render(<ExpiringItemCard item={sampleExpiringItem} />, { wrapper: AllTheProviders });
      const progressBar = screen.getByRole('progressbar'); // Assuming it has a role
      expect(progressBar).toBeInTheDocument();
      const progress = calculateExpiryProgress(sampleExpiringItem.expiryDate);
      expect(progress).toBeGreaterThan(0.3); // For sampleItem (2 days left out of assumed total, e.g. 7-14)
      expect(progressBar.firstChild).toHaveClass('bg-primary');
    });

    it('renders "Recipes" link text correctly when matching recipes are found', () => {
      mockUseRecipes.mockReturnValue({ data: sampleRecipesData, isLoading: false });
      render(<ExpiringItemCard item={sampleExpiringItem} />, { wrapper: AllTheProviders });
      // "Expiring Apple" matches "Apple Pie" and "Fruit Salad"
      expect(screen.getByRole('link', { name: /Recipes/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Recipes/i })).toHaveClass('text-blue-600');
    });

    it('renders "No Recipes" link text when no matching recipes are found', () => {
      mockUseRecipes.mockReturnValue({ data: [sampleRecipesData[2]], isLoading: false }); // Only Chicken Curry
      render(<ExpiringItemCard item={sampleExpiringItem} />, { wrapper: AllTheProviders });
      expect(screen.getByRole('link', { name: /No Recipes/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /No Recipes/i })).toHaveClass('text-neutral-400');
    });
     it('renders "No Recipes" if useRecipes returns undefined data', () => {
      mockUseRecipes.mockReturnValue({ data: undefined, isLoading: false });
      render(<ExpiringItemCard item={sampleExpiringItem} />, { wrapper: AllTheProviders });
      expect(screen.getByRole('link', { name: /No Recipes/i })).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('opens dropdown menu on more_vert click', () => {
      render(<ExpiringItemCard item={sampleExpiringItem} />, { wrapper: AllTheProviders });
      fireEvent.click(screen.getByText('more_vert'));
      // DropdownMenuContent is usually portaled, check for items within it.
      expect(screen.getByText('Delete Item')).toBeVisible(); // Dropdown items should be visible
      expect(screen.getByText('Edit Item')).toBeVisible();
    });

    it('calls deleteItem mutation and shows toast on "Delete Item" click', async () => {
      // Mock useMutation specifically for this test to control onSuccess
      (useMutation as ReturnType<typeof vi.fn>).mockImplementationOnce(({ mutationFn, onSuccess }: any) => {
        return {
          mutate: async () => {
            await mutationFn(); // Call the actual mutationFn from the component
            onSuccess();      // Then call its onSuccess
          },
          isPending: false,
        };
      });
      
      render(<ExpiringItemCard item={sampleExpiringItem} />, { wrapper: AllTheProviders });
      fireEvent.click(screen.getByText('more_vert')); // Open dropdown
      fireEvent.click(screen.getByText('Delete Item'));

      await waitFor(() => {
        // We don't mock apiRequest here, so the actual mutationFn in component will be called
        // which calls apiRequest. If apiRequest is not globally mocked to resolve, this might hang/error.
        // Let's ensure apiRequest is mocked for the DELETE call.
        // Since useMutation is mocked, its internal call to apiRequest won't happen unless we make it.
        // The mockMutate here is from the top-level mock.
        // The component's deleteItem calls the mutate function from its own useMutation instance.
        // So, we need to ensure *that* specific mutate is called.
        // The current setup of mocking useMutation globally means mockDeleteMutate is that function.
        expect(mockDeleteMutate).toHaveBeenCalled(); 
      });

      // To test onSuccess behavior (toast, invalidateQueries):
      await waitFor(() => {
        expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ["/api/food-items"] });
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
          title: "Item deleted",
          description: `${sampleExpiringItem.name} has been removed from your inventory.`,
        }));
      });
    });
    
    // Note: "Edit Item" in dropdown currently has no onClick. If it did, it would be tested here.
    // For now, we can check its presence.
    it('"Edit Item" option is present in dropdown', () => {
      render(<ExpiringItemCard item={sampleExpiringItem} />, { wrapper: AllTheProviders });
      fireEvent.click(screen.getByText('more_vert'));
      expect(screen.getByText('Edit Item')).toBeVisible();
    });


    it('"Recipes" link navigates to /recipes', () => {
      render(<ExpiringItemCard item={sampleExpiringItem} />, { wrapper: AllTheProviders });
      const recipesLink = screen.getByRole('link', { name: /Recipes/i }) as HTMLAnchorElement;
      expect(recipesLink.getAttribute('href')).toBe('/recipes');
    });

    it('calls toast on "Share" button click', () => {
      render(<ExpiringItemCard item={sampleExpiringItem} />, { wrapper: AllTheProviders });
      fireEvent.click(screen.getByRole('button', { name: /Share/i }));
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
        title: "Item shared",
        description: `${sampleExpiringItem.name} has been shared with nearby users.`,
      }));
    });
  });
});
