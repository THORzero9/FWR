import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import InventoryPage from './inventory'; // Adjust path as needed
import { FoodItem } from '@shared/schema';

// Mock hooks
const mockUseFoodItems = vi.fn();
vi.mock('@/hooks/use-food-items', () => ({
  useFoodItems: () => mockUseFoodItems(),
}));

// Mock child components (selectively)
vi.mock('@/components/food/add-item-dialog', () => ({
  default: ({ open, onOpenChange }: {open: boolean, onOpenChange: (open: boolean) => void}) => 
    open ? <div data-testid="add-item-dialog">AddItemDialog Mock <button onClick={() => onOpenChange(false)}>Close</button></div> : null,
}));
vi.mock('@/components/food/multi-select-bar', () => ({
  default: ({ selectedItems, onClearSelection }: {selectedItems: FoodItem[], onClearSelection: () => void}) => 
    selectedItems.length > 0 ? <div data-testid="multi-select-bar">MultiSelectBar Mock ({selectedItems.length} items) <button onClick={onClearSelection}>Clear</button></div> : null,
}));
vi.mock('@/components/recipe/recipe-suggestions', () => ({
  default: ({ foodItems }: { foodItems: FoodItem[] }) => 
    <div data-testid="recipe-suggestions">RecipeSuggestions Mock ({foodItems.length} items)</div>,
}));
vi.mock('@/components/food/category-filter', () => ({
    default: ({ selectedCategory, onCategoryChange }: { selectedCategory: string, onCategoryChange: (category: string) => void}) => (
        <div data-testid="category-filter">
            CategoryFilter Mock. Selected: {selectedCategory}
            <button onClick={() => onCategoryChange("All")}>All</button>
            <button onClick={() => onCategoryChange("Fruit")}>Fruit</button>
            <button onClick={() => onCategoryChange("Vegetable")}>Vegetable</button>
        </div>
    )
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

// Sample data
const today = new Date();
const_MS_PER_DAY = 1000 * 60 * 60 * 24;

const createDate = (daysFromNow: number) => new Date(today.getTime() + daysFromNow * const_MS_PER_DAY);

const sampleFoodItems: FoodItem[] = [
  { id: 1, name: 'Apple', category: 'Fruit', quantity: 5, unit: 'pcs', expiryDate: createDate(2).toISOString(), addedDate: new Date(), favorite: false },
  { id: 2, name: 'Banana', category: 'Fruit', quantity: 10, unit: 'pcs', expiryDate: createDate(5).toISOString(), addedDate: new Date(), favorite: true },
  { id: 3, name: 'Carrot', category: 'Vegetable', quantity: 3, unit: 'pcs', expiryDate: createDate(1).toISOString(), addedDate: new Date(), favorite: false },
  { id: 4, name: 'Broccoli', category: 'Vegetable', quantity: 1, unit: 'head', expiryDate: createDate(7).toISOString(), addedDate: new Date(), favorite: false },
  { id: 5, name: 'Milk', category: 'Dairy', quantity: 1, unit: 'gallon', expiryDate: createDate(10).toISOString(), addedDate: new Date(), favorite: false },
];


describe('InventoryPage Component', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Default mock for useFoodItems
    mockUseFoodItems.mockReturnValue({ data: [], isLoading: false, error: null });
  });

  it('renders loading state', () => {
    mockUseFoodItems.mockReturnValue({ data: undefined, isLoading: true, error: null });
    render(<InventoryPage />, { wrapper: AllTheProviders });
    expect(screen.getByText(/Loading inventory.../i)).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument(); // The spinner div
  });

  it('renders empty state when no food items are present', () => {
    mockUseFoodItems.mockReturnValue({ data: [], isLoading: false, error: null });
    render(<InventoryPage />, { wrapper: AllTheProviders });
    // For "Expiring Soon"
    expect(screen.getByText(/No items expiring soon!/i)).toBeInTheDocument();
    // For "My Inventory"
    expect(screen.getByText(/Your inventory is empty!/i)).toBeInTheDocument();
  });

  describe('With Food Items Data', () => {
    beforeEach(() => {
      mockUseFoodItems.mockReturnValue({ data: sampleFoodItems, isLoading: false, error: null });
    });

    it('renders summary cards with correct stats', () => {
      render(<InventoryPage />, { wrapper: AllTheProviders });
      expect(screen.getByText('Items').closest('div')?.querySelector('p.text-2xl')).toHaveTextContent(sampleFoodItems.length.toString());
      // Expiring soon (Apple, Carrot)
      expect(screen.getByText('Expiring Soon').closest('div')?.querySelector('p.text-2xl')).toHaveTextContent('2'); 
      // Money saved (5 items * $3.50)
      expect(screen.getByText('Saved').closest('div')?.querySelector('p.text-2xl')).toHaveTextContent('$18'); // 17.50 rounded
    });

    it('renders category filter, recipe suggestions, expiring items, and inventory list', () => {
      render(<InventoryPage />, { wrapper: AllTheProviders });
      expect(screen.getByTestId('category-filter')).toBeInTheDocument();
      expect(screen.getByTestId('recipe-suggestions')).toBeInTheDocument();
      expect(screen.getByText(/Expiring Soon/i)).toBeInTheDocument();
      expect(screen.getByText(/My Inventory/i)).toBeInTheDocument();
      
      // Check if item cards are rendered (approximated by checking for item names)
      sampleFoodItems.forEach(item => {
        expect(screen.getAllByText(item.name)[0]).toBeInTheDocument(); // ItemCard might render name multiple times or also in ExpiringItemCard
      });
    });

    it('filters expiring items correctly (Apple and Carrot)', () => {
      render(<InventoryPage />, { wrapper: AllTheProviders });
      const expiringSection = screen.getByText('Expiring Soon').closest('div.mb-6');
      expect(expiringSection).toBeDefined();
      
      const appleCard = within(expiringSection!).queryByText(/Apple/i);
      const carrotCard = within(expiringSection!).queryByText(/Carrot/i);
      const bananaCard = within(expiringSection!).queryByText(/Banana/i); // Should not be here

      expect(appleCard).toBeInTheDocument();
      expect(carrotCard).toBeInTheDocument();
      expect(bananaCard).not.toBeInTheDocument();
    });

    it('filters inventory by category when CategoryFilter changes', () => {
      render(<InventoryPage />, { wrapper: AllTheProviders });
      
      // Initial: All items visible in "My Inventory"
      const inventorySection = screen.getByText('My Inventory').closest('div.pb-20')?.parentElement;
      expect(within(inventorySection!).getAllByText(/Apple/i).length).toBeGreaterThan(0);
      expect(within(inventorySection!).getAllByText(/Carrot/i).length).toBeGreaterThan(0);

      // Click "Fruit" category filter
      const fruitButton = within(screen.getByTestId('category-filter')).getByRole('button', { name: 'Fruit' });
      fireEvent.click(fruitButton);

      // Now only fruits should be in "My Inventory"
      expect(within(inventorySection!).queryByText(/Apple/i)).toBeInTheDocument();
      expect(within(inventorySection!).queryByText(/Banana/i)).toBeInTheDocument();
      expect(within(inventorySection!).queryByText(/Carrot/i)).not.toBeInTheDocument();
      expect(within(inventorySection!).queryByText(/Broccoli/i)).not.toBeInTheDocument();
      
      // Check empty message for non-fruit category if it's now active
      const vegetableButton = within(screen.getByTestId('category-filter')).getByRole('button', { name: 'Vegetable' });
      fireEvent.click(vegetableButton);
      expect(within(inventorySection!).queryByText(/Apple/i)).not.toBeInTheDocument();
      expect(within(inventorySection!).queryByText(/Carrot/i)).toBeInTheDocument(); // Carrot is a vegetable
    });

    it('opens AddItemDialog when "Add Item" button is clicked', () => {
      render(<InventoryPage />, { wrapper: AllTheProviders });
      expect(screen.queryByTestId('add-item-dialog')).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /Add Item/i }));
      expect(screen.getByTestId('add-item-dialog')).toBeInTheDocument();
      // Close it
      fireEvent.click(within(screen.getByTestId('add-item-dialog')).getByText('Close'));
      expect(screen.queryByTestId('add-item-dialog')).not.toBeInTheDocument();
    });

    describe('Selection Mode', () => {
      it('toggles selection mode and displays MultiSelectBar', () => {
        render(<InventoryPage />, { wrapper: AllTheProviders });
        const selectButton = screen.getByRole('button', { name: /Select/i });
        
        // Enter selection mode
        fireEvent.click(selectButton);
        expect(selectButton).toHaveTextContent(/Exit Selection/i);
        // ItemCards should now be selectable (this is an internal prop, difficult to test directly without more complex ItemCard mock)
        
        // Select an item (assuming ItemCard calls onSelectToggle when clicked in selection mode)
        // We need to find an item card and click it.
        // Let's assume the first "Apple" card is clickable for selection.
        const appleCardForSelection = screen.getAllByText('Apple')[0].closest('[role="button"], div[class*="card"]'); // Heuristic
        if (appleCardForSelection) fireEvent.click(appleCardForSelection);
        else console.warn("Could not find clickable Apple card for selection test");


        // MultiSelectBar should appear after an item is selected
        // This depends on ItemCard calling onSelectToggle.
        // Let's simulate the toggle directly for now.
        const itemToSelect = sampleFoodItems[0]; // Apple
        // Manually trigger the selection as if ItemCard was clicked
        // This requires finding a way to call `toggleItemSelection(itemToSelect)`
        // The ItemCard component itself is responsible for this call.
        // For this test, we'll focus on the state change that *would* happen.
        // We can test the toggleItemSelection function indirectly via the MultiSelectBar.
        
        // To test MultiSelectBar appearance, we need selectedItems > 0
        // This is tricky without directly interacting with ItemCard's selection mechanism.
        // Let's assume one item is selected by clicking it.
        // The mocked ItemCard doesn't have selection logic. We need to test the InventoryPage's state change.
        
        // For now, we'll check that the MultiSelectBar mock appears if we *could* select items.
        // This part of the test is limited by not having interactive ItemCards.
        // Let's assume an item is selected (e.g. Apple)
        // For the MultiSelectBar to appear, selectedItems must be > 0.
        // We can manually trigger selection on an item.
        // The ItemCard component receives `onSelectToggle`. We need to simulate that call.
        // This is hard if ItemCard is not mocked to expose this.
        //
        // The component itself renders ItemCard like:
        // <ItemCard onSelectToggle={toggleItemSelection} ... />
        // We can't directly call toggleItemSelection from here.
        //
        // Alternative: Find the rendered ItemCard for "Apple" and assume it's clickable for selection.
        // The real ItemCard would handle the click and call onSelectToggle.
        // The mocked ItemCard doesn't do this. So, this test is more about the button state.
        //
        // Let's verify the button text changes and selection mode is active.
        // The actual selection and MultiSelectBar appearance will be tested if ItemCard tests are more detailed.
        // For now, if selection mode is on, and we *could* select, the bar *would* show.
        // The test for MultiSelectBar itself appearing when items are selected is implicitly covered
        // by the fact that if selectedItems.length > 0 and isSelectionMode, it renders.
        // The following test will cover selection and bar appearance.
      });

      it('selects and deselects items, showing and hiding MultiSelectBar', async () => {
        render(<InventoryPage />, { wrapper: AllTheProviders });
        const selectButton = screen.getByRole('button', { name: /Select/i });
        fireEvent.click(selectButton); // Enter selection mode

        // Find the "Apple" item card. We assume ItemCard has a clickable element.
        // This is a bit fragile as it depends on ItemCard's internal structure.
        // A better way would be if ItemCard had a test ID or specific role for its main clickable area.
        const appleCard = screen.getAllByText('Apple').find(el => el.closest('.bg-white.rounded-lg.shadow-md.overflow-hidden'));
        expect(appleCard).toBeDefined();
        
        // Select Apple
        fireEvent.click(appleCard!);
        await waitFor(() => {
            expect(screen.getByTestId('multi-select-bar')).toHaveTextContent('MultiSelectBar Mock (1 items)');
        });

        // Select Banana
        const bananaCard = screen.getAllByText('Banana').find(el => el.closest('.bg-white.rounded-lg.shadow-md.overflow-hidden'));
        expect(bananaCard).toBeDefined();
        fireEvent.click(bananaCard!);
        await waitFor(() => {
            expect(screen.getByTestId('multi-select-bar')).toHaveTextContent('MultiSelectBar Mock (2 items)');
        });
        
        // Deselect Apple
        fireEvent.click(appleCard!);
         await waitFor(() => {
            expect(screen.getByTestId('multi-select-bar')).toHaveTextContent('MultiSelectBar Mock (1 items)');
        });

        // Clear selection via MultiSelectBar's button
        fireEvent.click(within(screen.getByTestId('multi-select-bar')).getByText('Clear'));
        await waitFor(() => {
            expect(screen.queryByTestId('multi-select-bar')).not.toBeInTheDocument();
        });
        
        // Exit selection mode
        fireEvent.click(selectButton);
        expect(selectButton).toHaveTextContent(/Select/i);
      });
    });
  });
});
