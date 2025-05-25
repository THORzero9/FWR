import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RecipesPage from './recipes'; // Adjust path as needed
import { Recipe, FoodItem } from '@shared/schema';

// Mock hooks
const mockUseRecipes = vi.fn();
const mockUseFoodItems = vi.fn();

vi.mock('@/hooks/use-recipes', () => ({
  useRecipes: () => mockUseRecipes(),
}));
vi.mock('@/hooks/use-food-items', () => ({
  useFoodItems: () => mockUseFoodItems(),
}));

// Mock child components (optional, if they are simple enough, let them render)
// For this test, we'll let them render to see if correct props are passed.
// If they become complex, they should be mocked.
vi.mock('@/components/recipe/recipe-card', () => ({
  default: ({ recipe }: { recipe: Recipe }) => <div data-testid={`recipe-card-${recipe.id}`}>{recipe.name}</div>,
}));
vi.mock('@/components/recipe/small-recipe-card', () => ({
  default: ({ recipe }: { recipe: Recipe }) => <div data-testid={`small-recipe-card-${recipe.id}`}>{recipe.name}</div>,
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
const today = new Date();
const_MS_PER_DAY = 1000 * 60 * 60 * 24;
const createDate = (daysFromNow: number) => new Date(today.getTime() + daysFromNow * const_MS_PER_DAY);

const sampleFoodItems: FoodItem[] = [
  { id: 1, name: 'Chicken Breast', category: 'Meat', quantity: 2, unit: 'pcs', expiryDate: createDate(2).toISOString(), addedDate: new Date(), favorite: false }, // Expiring
  { id: 2, name: 'Tomato', category: 'Vegetable', quantity: 5, unit: 'pcs', expiryDate: createDate(1).toISOString(), addedDate: new Date(), favorite: false }, // Expiring
  { id: 3, name: 'Pasta', category: 'Pantry', quantity: 1, unit: 'box', expiryDate: createDate(30).toISOString(), addedDate: new Date(), favorite: false },
  { id: 4, name: 'Lettuce', category: 'Vegetable', quantity: 1, unit: 'head', expiryDate: createDate(4).toISOString(), addedDate: new Date(), favorite: false },
];

const sampleRecipes: Recipe[] = [
  { id: 101, name: 'Chicken Pasta', description: 'Easy chicken pasta', prepTime: '30m', imageUrl: '', ingredients: ['Chicken Breast', 'Pasta', 'Tomato Sauce'], instructions: '', rating: 4.5 },
  { id: 102, name: 'Tomato Soup', description: 'Classic tomato soup', prepTime: '20m', imageUrl: '', ingredients: ['Tomato', 'Cream', 'Basil'], instructions: '', rating: 4.2 },
  { id: 103, name: 'Simple Salad', description: 'Quick salad', prepTime: '10m', imageUrl: '', ingredients: ['Lettuce', 'Cucumber', 'Dressing'], instructions: '', rating: 3.8 },
  { id: 104, name: 'Grilled Chicken', description: 'Healthy grilled chicken', prepTime: '25m', imageUrl: '', ingredients: ['Chicken Breast', 'Herbs'], instructions: '', rating: 4.8 }, // Most popular
  { id: 105, name: 'Pasta Aglio e Olio', description: 'Simple pasta dish', prepTime: '15m', imageUrl: '', ingredients: ['Pasta', 'Garlic', 'Olive Oil'], instructions: '', rating: 4.0 },
];


describe('RecipesPage Component', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Default mocks
    mockUseRecipes.mockReturnValue({ data: [], isLoading: false, error: null });
    mockUseFoodItems.mockReturnValue({ data: [], isLoading: false, error: null });
  });

  it('renders loading state when useRecipes is loading', () => {
    mockUseRecipes.mockReturnValue({ data: undefined, isLoading: true, error: null });
    mockUseFoodItems.mockReturnValue({ data: sampleFoodItems, isLoading: false, error: null });
    render(<RecipesPage />, { wrapper: AllTheProviders });
    expect(screen.getByText(/Loading recipes.../i)).toBeInTheDocument();
  });

  it('renders loading state when useFoodItems is loading', () => {
    mockUseRecipes.mockReturnValue({ data: sampleRecipes, isLoading: false, error: null });
    mockUseFoodItems.mockReturnValue({ data: undefined, isLoading: true, error: null });
    render(<RecipesPage />, { wrapper: AllTheProviders });
    expect(screen.getByText(/Loading recipes.../i)).toBeInTheDocument();
  });

  it('renders "no recipes based on expiring items" when no matching recipes', () => {
    mockUseRecipes.mockReturnValue({ data: [sampleRecipes[2]], isLoading: false, error: null }); // Only Simple Salad
    mockUseFoodItems.mockReturnValue({ data: [sampleFoodItems[0]], isLoading: false, error: null }); // Only Chicken (expiring)
    render(<RecipesPage />, { wrapper: AllTheProviders });
    expect(screen.getByText(/No recipes based on expiring items!/i)).toBeInTheDocument();
  });
  
  it('renders empty popular recipes section if no recipes available', () => {
    mockUseRecipes.mockReturnValue({ data: [], isLoading: false, error: null });
    mockUseFoodItems.mockReturnValue({ data: [], isLoading: false, error: null });
    render(<RecipesPage />, { wrapper: AllTheProviders });
    
    const popularSection = screen.getByText('Popular Recipes').closest('div');
    expect(popularSection).toBeDefined();
    // Check that no small-recipe-card is rendered within this section
    expect(within(popularSection!).queryAllByTestId(/small-recipe-card-/).length).toBe(0);
  });


  describe('With Recipes and Food Items Data', () => {
    beforeEach(() => {
      mockUseRecipes.mockReturnValue({ data: sampleRecipes, isLoading: false, error: null });
      mockUseFoodItems.mockReturnValue({ data: sampleFoodItems, isLoading: false, error: null });
    });

    it('renders recipe suggestions and popular recipes sections', () => {
      render(<RecipesPage />, { wrapper: AllTheProviders });
      expect(screen.getByText(/Recipe Suggestions/i)).toBeInTheDocument();
      expect(screen.getByText(/Based on expiring items/i)).toBeInTheDocument();
      expect(screen.getByText(/Popular Recipes/i)).toBeInTheDocument();
    });

    it('correctly identifies and displays recipes based on expiring items', async () => {
      // Expiring items: Chicken Breast (2 days), Tomato (1 day)
      // Recipes using these: Chicken Pasta (Chicken Breast, Tomato), Tomato Soup (Tomato), Grilled Chicken (Chicken Breast)
      render(<RecipesPage />, { wrapper: AllTheProviders });
      
      const expiringSection = screen.getByText('Based on expiring items').closest('div');
      expect(expiringSection).toBeDefined();

      await waitFor(() => {
        // Chicken Pasta uses Chicken Breast and Tomato (indirectly via "Tomato Sauce" if logic is loose, or directly if "Tomato")
        // For this test, our sample data has "Tomato" in Tomato Soup and "Chicken Breast" in Chicken Pasta & Grilled Chicken.
        // The logic is: recipe.ingredients.some(ing => expiringItemNames.some(itemName => ing.toLowerCase().includes(itemName)))
        // Expiring item names: "chicken breast", "tomato"
        expect(within(expiringSection!).getByTestId('recipe-card-101')).toHaveTextContent('Chicken Pasta'); // Uses Chicken Breast
        expect(within(expiringSection!).getByTestId('recipe-card-102')).toHaveTextContent('Tomato Soup');   // Uses Tomato
        expect(within(expiringSection!).getByTestId('recipe-card-104')).toHaveTextContent('Grilled Chicken'); // Uses Chicken Breast
      });
    });
    
    it('displays a maximum of 3 recipes for expiring items', async () => {
      // Create more expiring items and recipes that match them
      const manyExpiringItems: FoodItem[] = [
        { id: 1, name: 'Chicken', expiryDate: createDate(1).toISOString(), category: 'Meat', quantity:1, unit:'pc', addedDate: new Date() },
        { id: 2, name: 'Beef', expiryDate: createDate(1).toISOString(), category: 'Meat', quantity:1, unit:'pc', addedDate: new Date() },
        { id: 3, name: 'Pork', expiryDate: createDate(1).toISOString(), category: 'Meat', quantity:1, unit:'pc', addedDate: new Date() },
        { id: 4, name: 'Lamb', expiryDate: createDate(1).toISOString(), category: 'Meat', quantity:1, unit:'pc', addedDate: new Date() },
      ];
      const manyMatchingRecipes: Recipe[] = [
        { id: 201, name: 'Chicken Dish', ingredients: ['Chicken'], rating: 4, description:'', prepTime:'', imageUrl:'', instructions:'' },
        { id: 202, name: 'Beef Stew', ingredients: ['Beef'], rating: 4, description:'', prepTime:'', imageUrl:'', instructions:'' },
        { id: 203, name: 'Pork Chops', ingredients: ['Pork'], rating: 4, description:'', prepTime:'', imageUrl:'', instructions:'' },
        { id: 204, name: 'Lamb Curry', ingredients: ['Lamb'], rating: 4, description:'', prepTime:'', imageUrl:'', instructions:'' },
      ];
      mockUseRecipes.mockReturnValue({ data: manyMatchingRecipes, isLoading: false, error: null });
      mockUseFoodItems.mockReturnValue({ data: manyExpiringItems, isLoading: false, error: null });

      render(<RecipesPage />, { wrapper: AllTheProviders });
      const expiringSection = screen.getByText('Based on expiring items').closest('div');
      await waitFor(() => {
          const recipeCards = within(expiringSection!).queryAllByTestId(/recipe-card-/);
          expect(recipeCards.length).toBe(3); // Hardcoded slice(0, 3)
      });
    });


    it('correctly identifies and displays popular recipes (max 4, sorted by rating)', async () => {
      render(<RecipesPage />, { wrapper: AllTheProviders });
      const popularSection = screen.getByText('Popular Recipes').closest('div');
      expect(popularSection).toBeDefined();

      // Expected order by rating: Grilled Chicken (4.8), Chicken Pasta (4.5), Tomato Soup (4.2), Pasta Aglio e Olio (4.0)
      // Then Simple Salad (3.8) - but only 4 should be shown.
      await waitFor(() => {
        const popularRecipeCards = within(popularSection!).getAllByTestId(/small-recipe-card-/);
        expect(popularRecipeCards.length).toBe(4); // Hardcoded slice(0, 4)
        expect(popularRecipeCards[0]).toHaveTextContent('Grilled Chicken'); // Rating 4.8
        expect(popularRecipeCards[1]).toHaveTextContent('Chicken Pasta');   // Rating 4.5
        expect(popularRecipeCards[2]).toHaveTextContent('Tomato Soup');     // Rating 4.2
        expect(popularRecipeCards[3]).toHaveTextContent('Pasta Aglio e Olio'); // Rating 4.0
      });
    });
  });
});
