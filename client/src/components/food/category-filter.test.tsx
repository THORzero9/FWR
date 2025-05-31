import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CategoryFilter from './category-filter'; // Adjust path as needed
import { FOOD_CATEGORIES } from '@shared/schema';

describe('CategoryFilter Component', () => {
  const allCategories = ["All", ...FOOD_CATEGORIES];
describe('CategoryFilter Component', () => {
  const allCategories = ["All", ...FOOD_CATEGORIES];
  const mockOnCategoryChange = vi.fn();

  beforeEach(() => {
    mockOnCategoryChange.mockClear();
  });

  // ...rest of your tests
});

  it('renders all categories including "All"', () => {
    render(<CategoryFilter selectedCategory="All" onCategoryChange={mockOnCategoryChange} />);
    allCategories.forEach(category => {
      expect(screen.getByRole('button', { name: category })).toBeInTheDocument();
    });
  });

  it('applies active styling to the selected category button', () => {
    const selected = FOOD_CATEGORIES[1]; // e.g., "Vegetables"
    render(<CategoryFilter selectedCategory={selected} onCategoryChange={mockOnCategoryChange} />);
    
    const selectedButton = screen.getByRole('button', { name: selected });
    const allButton = screen.getByRole('button', { name: "All" });

    // Active class: "bg-primary text-white"
    // Inactive class: "bg-white shadow text-neutral-600 hover:bg-neutral-100"
    expect(selectedButton).toHaveClass('bg-primary', 'text-white');
    expect(allButton).toHaveClass('bg-white', 'text-neutral-600'); // Assuming "All" is not selected
  });
  
  it('applies active styling to "All" category when selected', () => {
    render(<CategoryFilter selectedCategory="All" onCategoryChange={mockOnCategoryChange} />);
    const allButton = screen.getByRole('button', { name: "All" });
    expect(allButton).toHaveClass('bg-primary', 'text-white');
  });

  it('calls onCategoryChange with the correct category when a button is clicked', () => {
    const categoryToClick = FOOD_CATEGORIES[2]; // e.g., "Dairy"
    render(<CategoryFilter selectedCategory="All" onCategoryChange={mockOnCategoryChange} />);
    
    const buttonToClick = screen.getByRole('button', { name: categoryToClick });
    fireEvent.click(buttonToClick);
    
    expect(mockOnCategoryChange).toHaveBeenCalledWith(categoryToClick);
  });
  
  it('calls onCategoryChange when "All" button is clicked', () => {
    // Select a different category initially
    render(<CategoryFilter selectedCategory={FOOD_CATEGORIES[0]} onCategoryChange={mockOnCategoryChange} />);
    
    const allButton = screen.getByRole('button', { name: "All" });
    fireEvent.click(allButton);
    
    expect(mockOnCategoryChange).toHaveBeenCalledWith("All");
  });
});
