import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useMutation, useQueryClient } from '@tanstack/react-query';
import MultiSelectBar from './multi-select-bar'; // Adjust path as needed
import { FoodItem } from '@shared/schema';

// Mock hooks
const mockMutateFavorite = vi.fn();
const mockMutateUnfavorite = vi.fn();
const mockMutateDelete = vi.fn();
const mockInvalidateQueries = vi.fn();
const mockToast = vi.fn();

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    // Default mock for useMutation, can be overridden per test if needed for specific isPending states
    useMutation: vi.fn((options) => {
      // Determine which mutate function to return based on context (e.g., mutationFn)
      // This is a simplified approach. For real tests, you might spy on options.mutationFn.
      // For this component, we have 3 mutations. We'll need to differentiate them.
      // A common way is to mockImplementation for useMutation in beforeEach or per test.
      if (options && options.mutationFn) {
        // A naive check based on expected behavior or a marker in mutationFn if possible
        // For now, let's use a generic mock and refine if needed.
         if (options.mutationFn.toString().includes("favorite: true")) {
            return { mutate: mockMutateFavorite, isPending: false };
        } else if (options.mutationFn.toString().includes("favorite: false")) {
            return { mutate: mockMutateUnfavorite, isPending: false };
        } else { // Assume delete
            return { mutate: mockMutateDelete, isPending: false };
        }
      }
      return { mutate: vi.fn(), isPending: false }; // Fallback
    }),
    useQueryClient: vi.fn(() => ({ invalidateQueries: mockInvalidateQueries })),
  };
});

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Helper to provide QueryClient
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient();
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const sampleSelectedItems: FoodItem[] = [
  { id: 1, name: 'Apple', category: 'Fruit', quantity: 1, unit: 'pc', expiryDate: '', addedDate: new Date(), favorite: false },
  { id: 2, name: 'Banana', category: 'Fruit', quantity: 2, unit: 'pcs', expiryDate: '', addedDate: new Date(), favorite: false },
];

describe('MultiSelectBar Component', () => {
  let onClearSelectionMock: ReturnType<typeof vi.fn>;

  // Function to set up specific mutation mocks for each action
  const setupMutationMocks = (
    { isFavoritePending = false, favoriteError = null }: { isFavoritePending?: boolean, favoriteError?: Error | null } = {},
    { isUnfavoritePending = false, unfavoriteError = null }: { isUnfavoritePending?: boolean, unfavoriteError?: Error | null } = {},
    { isDeletePending = false, deleteError = null }: { isDeletePending?: boolean, deleteError?: Error | null } = {}
  ) => {
    (useMutation as ReturnType<typeof vi.fn>).mockImplementation((options: any) => {
      // This logic tries to identify which mutation is being set up based on its behavior.
      // It's a bit fragile. A better way would be if the mutations had unique identifiers
      // or if we could inspect `options.mutationFn` more reliably.
      // For this test, we'll assume the order of `useMutation` calls in the component or use a simpler heuristic.
      // Let's assume the `mutationFn` content can distinguish them.
      // A more robust approach would be to mock each `useMutation` call individually if the component structure allowed.
      // For now, we'll use a counter or a more specific check if needed.
      // The component initializes them in order: favorite, unfavorite, delete.
      
      // This is a simplified mock. The actual component calls useMutation three times.
      // We need to ensure the correct mockMutate and isPending is returned for each.
      // The below will apply the same mock to all, which is not correct.
      // We need to mock the implementation of useMutation to return different values based on some identifier.
      // For now, we'll mock them individually in tests where specific pending states are needed.
      
      // Default generic mock
      let mutationType = 'unknown';
      if (options?.mutationFn?.toString().includes('favorite: true')) mutationType = 'favorite';
      if (options?.mutationFn?.toString().includes('favorite: false')) mutationType = 'unfavorite';
      if (options?.mutationFn?.toString().includes('DELETE')) mutationType = 'delete';


      if (mutationType === 'favorite') {
        return { 
            mutate: (args: any) => {
                mockMutateFavorite(args);
                if (favoriteError) options.onError(favoriteError); else options.onSuccess();
            }, 
            isPending: isFavoritePending 
        };
      }
      if (mutationType === 'unfavorite') {
        return { 
            mutate: (args: any) => {
                mockMutateUnfavorite(args);
                if (unfavoriteError) options.onError(unfavoriteError); else options.onSuccess();
            }, 
            isPending: isUnfavoritePending
        };
      }
      if (mutationType === 'delete') {
         return { 
            mutate: (args: any) => {
                mockMutateDelete(args);
                if (deleteError) options.onError(deleteError); else options.onSuccess();
            }, 
            isPending: isDeletePending
        };
      }
      return { mutate: vi.fn(), isPending: false }; // Fallback for safety
    });
  };


  beforeEach(() => {
    vi.resetAllMocks();
    onClearSelectionMock = vi.fn();
    setupMutationMocks(); // Setup default mocks for mutations
  });

  it('renders correctly with selected items count', () => {
    render(<MultiSelectBar selectedItems={sampleSelectedItems} onClearSelection={onClearSelectionMock} />, { wrapper: AllTheProviders });
    expect(screen.getByText(`Clear (${sampleSelectedItems.length})`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Favorite/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Unfavorite/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete/i })).toBeInTheDocument();
  });

  it('calls onClearSelection when "Clear" button is clicked', () => {
    render(<MultiSelectBar selectedItems={sampleSelectedItems} onClearSelection={onClearSelectionMock} />, { wrapper: AllTheProviders });
    fireEvent.click(screen.getByText(/Clear/i));
    expect(onClearSelectionMock).toHaveBeenCalledTimes(1);
  });

  describe('Bulk Favorite Action', () => {
    it('calls bulkFavorite mutation, then toasts and clears selection on success', async () => {
      render(<MultiSelectBar selectedItems={sampleSelectedItems} onClearSelection={onClearSelectionMock} />, { wrapper: AllTheProviders });
      fireEvent.click(screen.getByRole('button', { name: /Favorite/i }));
      
      await waitFor(() => expect(mockMutateFavorite).toHaveBeenCalled());
      // onSuccess is called by the mock setup
      await waitFor(() => {
        expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ["/api/food-items"] });
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Items marked as favorite" }));
        expect(onClearSelectionMock).toHaveBeenCalledTimes(1);
      });
    });
    
    it('shows error toast on bulkFavorite failure', async () => {
      const error = new Error("Favorite failed");
      setupMutationMocks({ favoriteError: error });
      render(<MultiSelectBar selectedItems={sampleSelectedItems} onClearSelection={onClearSelectionMock} />, { wrapper: AllTheProviders });
      fireEvent.click(screen.getByRole('button', { name: /Favorite/i }));

      await waitFor(() => expect(mockMutateFavorite).toHaveBeenCalled());
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Error marking items as favorite", description: error.message }));
      });
    });

    it('disables Favorite button when isFavoritePending is true', () => {
      setupMutationMocks({ isFavoritePending: true });
      render(<MultiSelectBar selectedItems={sampleSelectedItems} onClearSelection={onClearSelectionMock} />, { wrapper: AllTheProviders });
      expect(screen.getByRole('button', { name: /Favorite/i })).toBeDisabled();
    });
  });
  
  describe('Bulk Unfavorite Action', () => {
    it('calls bulkUnfavorite mutation, then toasts and clears selection on success', async () => {
      render(<MultiSelectBar selectedItems={sampleSelectedItems} onClearSelection={onClearSelectionMock} />, { wrapper: AllTheProviders });
      fireEvent.click(screen.getByRole('button', { name: /Unfavorite/i }));
      
      await waitFor(() => expect(mockMutateUnfavorite).toHaveBeenCalled());
      await waitFor(() => {
        expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ["/api/food-items"] });
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Items unmarked as favorite" }));
        expect(onClearSelectionMock).toHaveBeenCalledTimes(1);
      });
    });
     it('disables Unfavorite button when isUnfavoritePending is true', () => {
      setupMutationMocks({}, { isUnfavoritePending: true });
      render(<MultiSelectBar selectedItems={sampleSelectedItems} onClearSelection={onClearSelectionMock} />, { wrapper: AllTheProviders });
      expect(screen.getByRole('button', { name: /Unfavorite/i })).toBeDisabled();
    });
  });

  describe('Bulk Delete Action', () => {
    it('opens confirmation dialog on "Delete" button click', () => {
      render(<MultiSelectBar selectedItems={sampleSelectedItems} onClearSelection={onClearSelectionMock} />, { wrapper: AllTheProviders });
      fireEvent.click(screen.getByRole('button', { name: /Delete/i }));
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      expect(screen.getByText(`This will permanently delete ${sampleSelectedItems.length} items from your inventory.`)).toBeInTheDocument();
    });

    it('closes confirmation dialog on "Cancel" click', () => {
      render(<MultiSelectBar selectedItems={sampleSelectedItems} onClearSelection={onClearSelectionMock} />, { wrapper: AllTheProviders });
      fireEvent.click(screen.getByRole('button', { name: /Delete/i })); // Open dialog
      fireEvent.click(screen.getByRole('button', { name: /Cancel/i })); // Click cancel
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });

    it('calls bulkDelete mutation, then toasts, clears selection, and closes dialog on confirm', async () => {
      render(<MultiSelectBar selectedItems={sampleSelectedItems} onClearSelection={onClearSelectionMock} />, { wrapper: AllTheProviders });
      fireEvent.click(screen.getByRole('button', { name: /Delete/i })); // Open dialog
      fireEvent.click(screen.getByRole('button', { name: /Delete Items/i })); // Confirm delete
      
      await waitFor(() => expect(mockMutateDelete).toHaveBeenCalled());
      await waitFor(() => {
        expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ["/api/food-items"] });
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Items deleted" }));
        expect(onClearSelectionMock).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument(); // Dialog closes
      });
    });
    
    it('shows error toast on bulkDelete failure (dialog should remain or close based on UX)', async () => {
      const error = new Error("Delete failed");
      setupMutationMocks({}, {}, { deleteError: error });
      render(<MultiSelectBar selectedItems={sampleSelectedItems} onClearSelection={onClearSelectionMock} />, { wrapper: AllTheProviders });
      fireEvent.click(screen.getByRole('button', { name: /Delete/i }));
      fireEvent.click(screen.getByRole('button', { name: /Delete Items/i }));

      await waitFor(() => expect(mockMutateDelete).toHaveBeenCalled());
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Error deleting items", description: error.message }));
        // Depending on desired UX, dialog might stay open or close. Current code doesn't show it closing on error.
        // expect(screen.getByRole('alertdialog')).toBeInTheDocument(); 
      });
    });

    it('disables Delete button in bar when isDeletePending is true (main button)', () => {
      setupMutationMocks({}, {}, { isDeletePending: true });
      render(<MultiSelectBar selectedItems={sampleSelectedItems} onClearSelection={onClearSelectionMock} />, { wrapper: AllTheProviders });
      expect(screen.getByRole('button', { name: /Delete/i })).toBeDisabled();
    });
    
    it('shows "Deleting..." and disables button in AlertDialog when isDeletePending is true', () => {
      setupMutationMocks({}, {}, { isDeletePending: true });
      render(<MultiSelectBar selectedItems={sampleSelectedItems} onClearSelection={onClearSelectionMock} />, { wrapper: AllTheProviders });
      fireEvent.click(screen.getByRole('button', { name: /Delete/i })); // Open dialog
      expect(screen.getByRole('button', { name: /Deleting.../i })).toBeDisabled();
    });
  });
});
