import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useMutation, useQueryClient } from '@tanstack/react-query';
import ItemCard from './item-card'; // Adjust path as needed
import { FoodItem } from '@shared/schema';
import { formatRelativeDate, calculateExpiryProgress } from '@/lib/utils/date-utils'; // For verifying display

// Mock hooks and child components
const mockToggleFavoriteMutate = vi.fn();
const mockInvalidateQueries = vi.fn();
const mockToast = vi.fn(); // Though not directly used by ItemCard, EditItemDialog might use it.

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useMutation: vi.fn(() => ({ mutate: mockToggleFavoriteMutate, isPending: false })),
    useQueryClient: vi.fn(() => ({ invalidateQueries: mockInvalidateQueries })),
  };
});

vi.mock('@/hooks/use-toast', () => ({ // Mock if any child uses it, good practice
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('./edit-item-dialog', () => ({
  default: vi.fn(({ open, onOpenChange, item }) => 
    open ? <div data-testid="edit-item-dialog">EditItemDialog Mock for {item.name} <button onClick={() => onOpenChange(false)}>Close Edit</button></div> : null
  ),
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

const sampleItem: FoodItem = {
  id: 1,
  name: 'Test Apple',
  category: 'Fruits',
  quantity: 5,
  unit: 'pcs',
  expiryDate: createDate(3).toISOString(), // Expires in 3 days
  addedDate: createDate(-2).toISOString(), // Added 2 days ago
  favorite: false,
};

const expiredItem: FoodItem = {
    ...sampleItem,
    id: 2,
    name: 'Expired Banana',
    expiryDate: createDate(-1).toISOString(), // Expired 1 day ago
};


describe('ItemCard Component', () => {
  let onSelectToggleMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetAllMocks();
    onSelectToggleMock = vi.fn();
    (useMutation as ReturnType<typeof vi.fn>).mockReturnValue({
      mutate: mockToggleFavoriteMutate,
      isPending: false,
    });
  });

  describe('Rendering (Not Selectable)', () => {
    it('displays item name, quantity, unit, and category icon', () => {
      render(<ItemCard item={sampleItem} />, { wrapper: AllTheProviders });
      expect(screen.getByText(sampleItem.name)).toBeInTheDocument();
      expect(screen.getByText(`${sampleItem.quantity} ${sampleItem.unit}`)).toBeInTheDocument();
      expect(screen.getByText('nutrition')).toBeInTheDocument(); // Material icon name for Fruits
    });

    it('displays correct expiry status and progress bar', () => {
      render(<ItemCard item={sampleItem} />, { wrapper: AllTheProviders });
      expect(screen.getByText(/Expires in 3 days/i)).toBeInTheDocument();
      // Progress bar color/width can be complex to assert precisely without deep inspection or visual testing.
      // We can check if the progress bar div exists.
      const progressBar = screen.getByRole('progressbar'); // Assuming it has a role
      expect(progressBar).toBeInTheDocument();
      // Example: Check for specific class based on progress (if applicable)
      // Based on current logic: progress > 0.3 = bg-primary
      const progress = calculateExpiryProgress(sampleItem.expiryDate);
      expect(progress).toBeGreaterThan(0.3); // For sampleItem
      expect(progressBar.firstChild).toHaveClass('bg-primary');
    });
    
    it('displays "Expired!" for expired items', () => {
      render(<ItemCard item={expiredItem} />, { wrapper: AllTheProviders });
      expect(screen.getByText(/Expired!/i)).toBeInTheDocument();
       const progressBar = screen.getByRole('progressbar');
       expect(progressBar.firstChild).toHaveClass('bg-red-500'); // progress <= 0.1
    });

    it('displays favorite icon correctly (not favorited)', () => {
      render(<ItemCard item={{ ...sampleItem, favorite: false }} />, { wrapper: AllTheProviders });
      expect(screen.getByText('favorite_outline')).toBeInTheDocument();
    });

    it('displays favorite icon correctly (favorited)', () => {
      render(<ItemCard item={{ ...sampleItem, favorite: true }} />, { wrapper: AllTheProviders });
      expect(screen.getByText('favorite')).toBeInTheDocument();
      expect(screen.getByText('favorite')).toHaveClass('text-red-500');
    });
  });

  describe('Interactions (Not Selectable)', () => {
    it('opens details dialog on card click', () => {
      render(<ItemCard item={sampleItem} />, { wrapper: AllTheProviders });
      fireEvent.click(screen.getByText(sampleItem.name).closest('div[class*="cursor-pointer"]')!);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Food Item Details')).toBeInTheDocument();
      // Check some details in dialog
      expect(within(screen.getByRole('dialog')).getByText(sampleItem.name)).toBeInTheDocument();
      expect(within(screen.getByRole('dialog')).getByText(formatRelativeDate(sampleItem.expiryDate))).toBeInTheDocument();
    });

    it('toggles favorite status on favorite icon click', async () => {
      render(<ItemCard item={{ ...sampleItem, favorite: false }} />, { wrapper: AllTheProviders });
      fireEvent.click(screen.getByText('favorite_outline'));
      
      await waitFor(() => {
        expect(mockToggleFavoriteMutate).toHaveBeenCalled();
      });
      // Simulate successful mutation and cache invalidation (would cause re-render with new data)
      (useMutation as ReturnType<typeof vi.fn>).mockImplementationOnce(({ onSuccess }: any) => {
        return { mutate: () => { mockToggleFavoriteMutate(); onSuccess(); }, isPending: false };
      });
      // Re-render or update props would be needed to see UI change here.
      // For now, just check mutation call.
    });

    it('details dialog "Edit" button opens EditItemDialog', () => {
      render(<ItemCard item={sampleItem} />, { wrapper: AllTheProviders });
      fireEvent.click(screen.getByText(sampleItem.name).closest('div[class*="cursor-pointer"]')!); // Open details dialog
      
      fireEvent.click(screen.getByRole('button', { name: /Edit/i }));
      expect(screen.getByTestId('edit-item-dialog')).toBeInTheDocument();
      expect(screen.getByTestId('edit-item-dialog')).toHaveTextContent(`EditItemDialog Mock for ${sampleItem.name}`);
      
      // Close EditItemDialog (via its mock)
      fireEvent.click(screen.getByText('Close Edit'));
      expect(screen.queryByTestId('edit-item-dialog')).not.toBeInTheDocument();
    });

    it('details dialog "Delete" button also opens EditItemDialog (as per current code)', () => {
      render(<ItemCard item={sampleItem} />, { wrapper: AllTheProviders });
      fireEvent.click(screen.getByText(sampleItem.name).closest('div[class*="cursor-pointer"]')!);
      fireEvent.click(screen.getByRole('button', { name: /Delete/i }));
      expect(screen.getByTestId('edit-item-dialog')).toBeInTheDocument();
    });
    
    it('details dialog "Close" button closes the dialog', () => {
      render(<ItemCard item={sampleItem} />, { wrapper: AllTheProviders });
      fireEvent.click(screen.getByText(sampleItem.name).closest('div[class*="cursor-pointer"]')!);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /Close/i }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Selectable Mode', () => {
    it('renders selection indicator when selectable and not selected', () => {
      render(<ItemCard item={sampleItem} selectable={true} isSelected={false} onSelectToggle={onSelectToggleMock} />, { wrapper: AllTheProviders });
      // The selection indicator is a div, not a checkbox input. Look for its visual cues or structure.
      // It's a div with specific classes.
      const selectionUI = screen.getByRole('button', {name: 'favorite_outline'}).parentElement?.previousElementSibling?.firstChild; // Navigating DOM, might be fragile
      expect(selectionUI).toHaveClass('bg-gray-100'); // Not selected style
      expect(within(selectionUI as HTMLElement).queryByRole('img', {hidden: true})).not.toBeInTheDocument(); // No checkmark icon
    });

    it('renders selection indicator as selected when selectable and isSelected is true', () => {
      render(<ItemCard item={sampleItem} selectable={true} isSelected={true} onSelectToggle={onSelectToggleMock} />, { wrapper: AllTheProviders });
      const selectionUI = screen.getByRole('button', {name: 'favorite_outline'}).parentElement?.previousElementSibling?.firstChild;
      expect(selectionUI).toHaveClass('bg-primary'); // Selected style
      expect(selectionUI?.querySelector('svg')).toBeInTheDocument(); // CheckCircle icon
    });

    it('calls onSelectToggle when card is clicked in selectable mode', () => {
      render(<ItemCard item={sampleItem} selectable={true} isSelected={false} onSelectToggle={onSelectToggleMock} />, { wrapper: AllTheProviders });
      fireEvent.click(screen.getByText(sampleItem.name).closest('div[class*="cursor-pointer"]')!);
      expect(onSelectToggleMock).toHaveBeenCalledWith(sampleItem);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); // Details dialog should not open
    });
    
    it('calls onSelectToggle when selection circle is clicked directly', () => {
      render(<ItemCard item={sampleItem} selectable={true} isSelected={false} onSelectToggle={onSelectToggleMock} />, { wrapper: AllTheProviders });
      const selectionCircle = screen.getByRole('button', {name: 'favorite_outline'}).parentElement?.previousElementSibling?.firstChild;
      expect(selectionCircle).toBeDefined();
      fireEvent.click(selectionCircle!);
      expect(onSelectToggleMock).toHaveBeenCalledWith(sampleItem);
    });
    
    it('favorite button still works in selectable mode', () => {
      render(<ItemCard item={{...sampleItem, favorite: false}} selectable={true} isSelected={false} onSelectToggle={onSelectToggleMock} />, { wrapper: AllTheProviders });
      fireEvent.click(screen.getByText('favorite_outline'));
      expect(mockToggleFavoriteMutate).toHaveBeenCalled();
      expect(onSelectToggleMock).not.toHaveBeenCalled(); // Ensure card click for selection is not triggered
    });
  });
});
