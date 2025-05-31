import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import RecipeSuggestions from './recipe-suggestions'; // Adjust path as needed
import { FoodItem, Recipe } from '@shared/schema';
import { groupItemsByExpiryStatus } from '@/lib/utils/date-utils'; // Import for reference, not to test

// Mock hooks and child components
const mockUseQuery = vi.fn();
vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useQuery: mockUseQuery,
  };
});

vi.mock('./small-recipe-card', () => ({
  default: ({ recipe }: { recipe: Recipe }) => <div data-testid={`small-recipe-card-${recipe.id}`}>{recipe.name}</div>,
}));

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
const_MS_PER_DAY = 1000 * 60 * 60 * 24;
const createDate = (daysFromNow: number) => new Date(today.getTime() + daysFromNow * const_MS_PER_DAY);

const sampleFoodItems: FoodItem[] = [
  { id: 1, name: 'Chicken', category: 'Meat', quantity: 1, unit: 'pc', expiryDate: createDate(1).toISOString(), addedDate: new Date() }, // Expiring soon
  { id: 2, name: 'Broccoli', category: 'Vegetable', quantity: 1, unit: 'head', expiryDate: createDate(2).toISOString(), addedDate: new Date() }, // Expiring soon
  { id: 3, name: 'Rice', category: 'Pantry', quantity: 1, unit: 'kg', expiryDate: createDate(30).toISOString(), addedDate: new Date() },
];
const manyExpiringFoodItems: FoodItem[] = [
  ...sampleFoodItems,
  { id: 4, name: 'Milk', category: 'Dairy', quantity: 1, unit: 'L', expiryDate: createDate(0).toISOString(), addedDate: new Date() }, // Expired (today)
  { id: 5, name: 'Eggs', category: 'Dairy', quantity: 12, unit: 'pcs', expiryDate: createDate(1).toISOString(), addedDate: new Date() },
  { id: 6, name: 'Bread', category: 'Bakery', quantity: 1, unit: 'loaf', expiryDate: createDate(2).toISOString(), addedDate: new Date() },
];


const sampleSuggestedRecipes: Recipe[] = [
  { id: 101, name: 'Chicken Stir-fry', ingredients: ['Chicken', 'Broccoli', 'Rice'], description:'', prepTime:0, imageUrl:'', instructions:'', rating:0 },
  { id: 102, name: 'Chicken and Rice', ingredients: ['Chicken', 'Rice'], description:'', prepTime:0, imageUrl:'', instructions:'', rating:0 },
  { id: 103, name: 'Broccoli Soup', ingredients: ['Broccoli'], description:'', prepTime:0, imageUrl:'', instructions:'', rating:0 },
];

describe('RecipeSuggestions Component', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Default mock for useQuery
    mockUseQuery.mockReturnValue({ data: [], isLoading: false, error: null });
  });

  it('returns null if foodItems array is empty', () => {
    const { container } = render(<RecipeSuggestions foodItems={[]} />, { wrapper: AllTheProviders });
    expect(container.firstChild).toBeNull();
  });

  it('returns null if useQuery is loading', () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: true, error: null });
    const { container } = render(<RecipeSuggestions foodItems={sampleFoodItems} />, { wrapper: AllTheProviders });
    expect(container.firstChild).toBeNull();
  });
  
  it('returns null if no suggested recipes are returned and itemsToUse was populated', () => {
    // Simulate itemsToUse being populated, but query returning no recipes
     mockUseQuery.mockImplementation(({ queryKey, enabled }: any) => {
        const itemsToUseStr = queryKey[1];
        if (enabled && itemsToUseStr.length > 0) {
            return { data: [], isLoading: false, error: null }; // No recipes
        }
        return { data: [], isLoading: false, error: null, isInitialLoading: false, status: 'success' }; // Or an appropriate state for 'disabled but successful completion'
    });
    const { container } = render(<RecipeSuggestions foodItems={sampleFoodItems} />, { wrapper: AllTheProviders });
    // Need to wait for useEffect to set itemsToUse and then for useQuery to run with enabled: true
    // and then return no recipes.
    // The component will return null if suggestedRecipes is empty.
    // This test ensures that even if itemsToUse are present, if API returns no recipes, it's null.
    expect(container.firstChild).toBeNull();
  });
  
   it('returns null if itemsToUse remains empty (e.g. only non-expiring items)', () => {
    const nonExpiringFoodItems: FoodItem[] = [
      { id: 1, name: 'Canned Beans', category: 'Pantry', quantity: 1, unit: 'can', expiryDate: createDate(100).toISOString(), addedDate: new Date() },
    ];
    mockUseQuery.mockImplementation(({ enabled }: any) => {
        expect(enabled).toBe(false); // Query should be disabled
        return { data: [], isLoading: false, error: null, status: 'pending' }; // RQ's state for disabled
    });
    const { container } = render(<RecipeSuggestions foodItems={nonExpiringFoodItems} />, { wrapper: AllTheProviders });
    // Since itemsToUse will be empty, useQuery is disabled, and suggestedRecipes will be undefined or [].
    // The component should return null.
    expect(container.firstChild).toBeNull();
  });


  describe('With Suggested Recipes', () => {
    beforeEach(() => {
      mockUseQuery.mockReturnValue({ data: sampleSuggestedRecipes, isLoading: false, error: null });
    });

    it('renders the suggestions card with title and description', () => {
      render(<RecipeSuggestions foodItems={sampleFoodItems} />, { wrapper: AllTheProviders });
      expect(screen.getByText('Recipe Suggestions')).toBeInTheDocument();
      // itemsToUse will be "Chicken, Broccoli" from sampleFoodItems
      expect(screen.getByText(/Recipes using: Chicken, Broccoli/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /All Recipes/i })).toBeInTheDocument();
    });

    it('displays up to 2 suggested recipes using SmallRecipeCard', () => {
      render(<RecipeSuggestions foodItems={sampleFoodItems} />, { wrapper: AllTheProviders });
      expect(screen.getByTestId(`small-recipe-card-${sampleSuggestedRecipes[0].id}`)).toHaveTextContent(sampleSuggestedRecipes[0].name);
      expect(screen.getByTestId(`small-recipe-card-${sampleSuggestedRecipes[1].id}`)).toHaveTextContent(sampleSuggestedRecipes[1].name);
      expect(screen.queryByTestId(`small-recipe-card-${sampleSuggestedRecipes[2].id}`)).not.toBeInTheDocument(); // Only shows 2
    });

    it('correctly determines itemsToUse (expiring/expired, max 5)', async () => {
      // This tests the useEffect logic that sets itemsToUse, which then forms part of the queryKey.
      // We need to capture the queryKey passed to useQuery.
      let capturedQueryKey: string[] | undefined;
      mockUseQuery.mockImplementation(({ queryKey, queryFn, enabled }: any) => {
        capturedQueryKey = queryKey;
        if (enabled) return { data: sampleSuggestedRecipes, isLoading: false, error: null };
        return { data: [], isLoading: false, error: null, status: 'pending' };
      });

      render(<RecipeSuggestions foodItems={manyExpiringFoodItems} />, { wrapper: AllTheProviders });

      // Expected itemsToUse (expired/expiring, up to 5): Milk, Chicken, Eggs, Broccoli, Bread (order might vary based on exact expiry logic)
      // Milk (0 days), Chicken (1 day), Eggs (1 day), Broccoli (2 days), Bread (2 days)
      // The groupItemsByExpiryStatus and subsequent mapping will determine the exact order.
      // For this test, we'll check that the captured queryKey[1] (the items string) contains these names.
      await waitFor(() => {
        expect(capturedQueryKey).toBeDefined();
        const itemsString = capturedQueryKey![1];
        expect(itemsString).toContain('Milk');
        expect(itemsString).toContain('Chicken');
        expect(itemsString).toContain('Eggs');
        expect(itemsString).toContain('Broccoli');
        expect(itemsString).toContain('Bread');
        expect(itemsString.split(',').length).toBe(5); // Max 5 items
        expect(itemsString).not.toContain('Rice'); // Not expiring
      });
    });
    
    it('query is enabled only when itemsToUse has elements', () => {
      let wasEnabled: boolean | undefined;
      mockUseQuery.mockImplementation(({ enabled }: any) => {
        wasEnabled = enabled;
        return { data: [], isLoading: false, error: null, status: enabled ? 'success' : 'pending' };
      });

      // Case 1: No expiring items, so itemsToUse should be empty, query disabled
      const nonExpiringItems = [sampleFoodItems[2]]; // Only Rice
      render(<RecipeSuggestions foodItems={nonExpiringItems} />, { wrapper: AllTheProviders });
      expect(wasEnabled).toBe(false);

      // Case 2: Expiring items present, query should be enabled
      render(<RecipeSuggestions foodItems={sampleFoodItems} />, { wrapper: AllTheProviders });
      expect(wasEnabled).toBe(true);
    });
  });
});
