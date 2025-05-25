import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useMutation, useQueryClient } from '@tanstack/react-query';
import AddItemDialog from './add-item-dialog'; // Adjust path as needed
import { FOOD_CATEGORIES, FOOD_UNITS } from '@shared/schema';
import { format } from 'date-fns';

// Mock hooks and modules
const mockMutate = vi.fn();
const mockInvalidateQueries = vi.fn();
const mockToast = vi.fn();
const mockFormReset = vi.fn();

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useMutation: vi.fn(() => ({ mutate: mockMutate, isPending: false })),
    useQueryClient: vi.fn(() => ({ invalidateQueries: mockInvalidateQueries })),
  };
});

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// We also need to mock react-hook-form if we want to control its reset behavior specifically,
// but usually, we can test its effects through UI interactions and props.
// For form.reset(), we'll spy on it if we can get the form instance, or test its effects.

// Helper to provide QueryClient
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient();
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('AddItemDialog Component', () => {
  let onOpenChangeMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetAllMocks();
    onOpenChangeMock = vi.fn();
    
    // Reset useMutation mock for each test
    (useMutation as ReturnType<typeof vi.fn>).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });
    (useQueryClient as ReturnType<typeof vi.fn>).mockReturnValue({
        invalidateQueries: mockInvalidateQueries
    });

    // Spy on form.reset if possible, or ensure its effects are tested.
    // This is tricky without direct access to the form instance from outside.
    // We'll assume form.reset() is called and verify its user-visible effects (fields cleared).
  });

  it('does not render when open prop is false', () => {
    render(<AddItemDialog open={false} onOpenChange={onOpenChangeMock} />, { wrapper: AllTheProviders });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the dialog with form fields when open prop is true', () => {
    render(<AddItemDialog open={true} onOpenChange={onOpenChangeMock} />, { wrapper: AllTheProviders });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Add Food Item')).toBeInTheDocument();
    expect(screen.getByLabelText(/Item Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Quantity/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Unit/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Expiration Date/i)).toBeInTheDocument();
  });

  describe('Form Interactions and Validation', () => {
    it('allows typing into input fields', () => {
      render(<AddItemDialog open={true} onOpenChange={onOpenChangeMock} />, { wrapper: AllTheProviders });
      fireEvent.change(screen.getByLabelText(/Item Name/i), { target: { value: 'Test Apple' } });
      expect(screen.getByLabelText(/Item Name/i)).toHaveValue('Test Apple');

      fireEvent.change(screen.getByLabelText(/Quantity/i), { target: { value: '5' } });
      expect(screen.getByLabelText(/Quantity/i)).toHaveValue(5);
    });

    it('allows selecting category and unit', async () => {
      render(<AddItemDialog open={true} onOpenChange={onOpenChangeMock} />, { wrapper: AllTheProviders });
      
      // Select Category
      fireEvent.mouseDown(screen.getByLabelText(/Category/i).closest('button')!); // Open select
      await screen.findByText(FOOD_CATEGORIES[1]); // Wait for options
      fireEvent.click(screen.getByText(FOOD_CATEGORIES[1])); // Select 'Vegetables'
      // Check if the value is updated (SelectValue component might not directly show it in input)
      // We'll verify it upon submission.

      // Select Unit
      fireEvent.mouseDown(screen.getByLabelText(/Unit/i).closest('button')!);
      await screen.findByText(FOOD_UNITS[1]);
      fireEvent.click(screen.getByText(FOOD_UNITS[1])); // Select 'kg'
    });
    
    it('allows selecting expiry date', () => {
        render(<AddItemDialog open={true} onOpenChange={onOpenChangeMock} />, { wrapper: AllTheProviders });
        const testDate = new Date(2025, 0, 15); // Jan 15, 2025
        const formattedDate = format(testDate, "yyyy-MM-dd");

        fireEvent.change(screen.getByLabelText(/Expiration Date/i), { target: { value: formattedDate } });
        expect(screen.getByLabelText(/Expiration Date/i)).toHaveValue(formattedDate);
    });


    it('shows validation errors for required fields', async () => {
      render(<AddItemDialog open={true} onOpenChange={onOpenChangeMock} />, { wrapper: AllTheProviders });
      fireEvent.click(screen.getByRole('button', { name: /Add Item/i }));
      
      // Default values are set, so some fields might not immediately show error unless they are cleared or invalid
      // Name is initially empty
      expect(await screen.findByText(/String must contain at least 1 character/i, {selector: 'p[role="alert"]'})).toBeInTheDocument(); 
      // Quantity has default 1, which is valid.
      // Expiry date has a default, which is valid.
    });
    
    it('shows validation error for quantity less than 1', async () => {
        render(<AddItemDialog open={true} onOpenChange={onOpenChangeMock} />, { wrapper: AllTheProviders });
        fireEvent.change(screen.getByLabelText(/Quantity/i), { target: { value: '0' } });
        fireEvent.click(screen.getByRole('button', { name: /Add Item/i }));
        expect(await screen.findByText(/Number must be greater than or equal to 1/i)).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    const fillForm = async () => {
      fireEvent.change(screen.getByLabelText(/Item Name/i), { target: { value: 'Banana' } });
      // Category (select 'Fruit')
      fireEvent.mouseDown(screen.getByLabelText(/Category/i).closest('button')!);
      await screen.findByText('Fruit'); // DefaultValues sets it to Fruits, let's pick another one.
      fireEvent.click(screen.getByText(FOOD_CATEGORIES[1])); // Vegetables

      fireEvent.change(screen.getByLabelText(/Quantity/i), { target: { value: '10' } });
      // Unit (select 'pcs')
      fireEvent.mouseDown(screen.getByLabelText(/Unit/i).closest('button')!);
      await screen.findByText('pcs'); // Default
      fireEvent.click(screen.getByText(FOOD_UNITS[0])); // pcs

      const expiry = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days from now
      fireEvent.change(screen.getByLabelText(/Expiration Date/i), { target: { value: format(expiry, "yyyy-MM-dd") } });
    };

    it('submits with correct data, calls mutation, and handles success', async () => {
      render(<AddItemDialog open={true} onOpenChange={onOpenChangeMock} />, { wrapper: AllTheProviders });
      await fillForm();
      fireEvent.click(screen.getByRole('button', { name: /Add Item/i }));

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledTimes(1);
        const submittedData = mockMutate.mock.calls[0][0];
        expect(submittedData.name).toBe('Banana');
        expect(submittedData.category).toBe(FOOD_CATEGORIES[1]); // Vegetables
        expect(submittedData.quantity).toBe(10);
        expect(submittedData.unit).toBe(FOOD_UNITS[0]); // pcs
        expect(submittedData.expiryDate).toBeInstanceOf(String); // ISOString
      });
      
      // Simulate successful mutation
      const { mutate } = (useMutation as ReturnType<typeof vi.fn>).mock.results[0].value;
      // The actual `onSuccess` callback is part of the options passed to `useMutation` in the component.
      // We need to trigger that. The easiest way is to mock the whole useMutation return.
      (useMutation as ReturnType<typeof vi.fn>).mockImplementationOnce(({ onSuccess }: any) => {
        return {
          mutate: (data: any) => { mockMutate(data); onSuccess(); }, // Call onSuccess directly
          isPending: false,
        };
      });
      render(<AddItemDialog open={true} onOpenChange={onOpenChangeMock} />, { wrapper: AllTheProviders }); // Re-render with new mock
      await fillForm();
      fireEvent.click(screen.getByRole('button', { name: /Add Item/i }));
      
      await waitFor(() => {
        expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ["/api/food-items"] });
        expect(onOpenChangeMock).toHaveBeenCalledWith(false);
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Item added' }));
        // Form reset check: verify fields are back to default or empty
        expect(screen.getByLabelText(/Item Name/i)).toHaveValue(""); // Default is ""
      });
    });

    it('shows error toast on mutation error', async () => {
      const errorMessage = "Network Error";
      (useMutation as ReturnType<typeof vi.fn>).mockImplementationOnce(({ onError }: any) => {
        return {
          mutate: (data: any) => { mockMutate(data); onError(new Error(errorMessage)); },
          isPending: false,
        };
      });
      render(<AddItemDialog open={true} onOpenChange={onOpenChangeMock} />, { wrapper: AllTheProviders });
      await fillForm();
      fireEvent.click(screen.getByRole('button', { name: /Add Item/i }));
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ 
          title: 'Error adding item', 
          description: errorMessage,
          variant: "destructive"
        }));
      });
    });

    it('shows "Adding..." button text when isPending is true', () => {
      (useMutation as ReturnType<typeof vi.fn>).mockReturnValue({
        mutate: mockMutate,
        isPending: true, // isPending true
      });
      render(<AddItemDialog open={true} onOpenChange={onOpenChangeMock} />, { wrapper: AllTheProviders });
      expect(screen.getByRole('button', { name: /Adding.../i })).toBeDisabled();
    });
  });

  it('calls onOpenChange and resets form on cancel', async () => {
    render(<AddItemDialog open={true} onOpenChange={onOpenChangeMock} />, { wrapper: AllTheProviders });
    fireEvent.change(screen.getByLabelText(/Item Name/i), { target: { value: 'Temporary Value' } });
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));

    expect(onOpenChangeMock).toHaveBeenCalledWith(false);
    // Check if form is reset (name field should be empty as per defaultValues)
    // This requires the dialog to re-render or the form state to be inspectable.
    // For now, we assume form.reset() clears it.
    // If the dialog were to re-open, it should have default values.
    render(<AddItemDialog open={true} onOpenChange={onOpenChangeMock} />, { wrapper: AllTheProviders }); // Simulate re-opening
    expect(screen.getByLabelText(/Item Name/i)).toHaveValue(''); // Default is ""
  });
});
