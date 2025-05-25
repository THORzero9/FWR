import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import RecipeCard from './recipe-card'; // Adjust path as needed
import { Recipe, FoodItem } from '@shared/schema';

const sampleRecipe: Recipe = {
  id: 1,
  name: 'Test Pasta',
  description: 'A delicious test pasta dish.',
  prepTime: 75, // 1 hr 15 mins
  imageUrl: 'http://example.com/pasta.jpg',
  ingredients: ['Pasta', 'Tomato Sauce', 'Cheese', 'Basil'],
  instructions: 'Cook pasta. Add sauce. Add cheese. Add basil.',
  rating: 4.5,
};

const sampleFoodItems: FoodItem[] = [
  { id: 1, name: 'Pasta', category: 'Pantry', quantity: 1, unit: 'box', expiryDate: '', addedDate: new Date(), favorite: false },
  { id: 2, name: 'Cheese', category: 'Dairy', quantity: 200, unit: 'g', expiryDate: '', addedDate: new Date(), favorite: false },
  { id: 3, name: 'Salt', category: 'Pantry', quantity: 1, unit: 'shaker', expiryDate: '', addedDate: new Date(), favorite: false }, // Not in recipe
];

const recipeNoImage: Recipe = {
    ...sampleRecipe,
    id: 2,
    name: "Soup without Image",
    imageUrl: "" 
};

const recipeShortPrep: Recipe = {
    ...sampleRecipe,
    id: 3,
    prepTime: 45 // 45 mins
};
const recipeHourPrep: Recipe = {
    ...sampleRecipe,
    id: 4,
    prepTime: 60 // 1 hr
};


describe('RecipeCard Component', () => {
  it('renders recipe name, description, and formatted prep time', () => {
    render(<RecipeCard recipe={sampleRecipe} foodItems={sampleFoodItems} />);
    expect(screen.getByText(sampleRecipe.name)).toBeInTheDocument();
    expect(screen.getByText(sampleRecipe.description)).toBeInTheDocument();
    expect(screen.getByText('1 hr 15 mins')).toBeInTheDocument(); // Formatted prep time
  });
  
  it('formats prep time correctly for < 1 hour', () => {
    render(<RecipeCard recipe={recipeShortPrep} foodItems={[]} />);
    expect(screen.getByText('45 mins')).toBeInTheDocument();
  });
  
  it('formats prep time correctly for exactly 1 hour', () => {
    render(<RecipeCard recipe={recipeHourPrep} foodItems={[]} />);
    expect(screen.getByText('1 hr')).toBeInTheDocument();
  });

  it('renders recipe image if imageUrl is provided', () => {
    render(<RecipeCard recipe={sampleRecipe} foodItems={sampleFoodItems} />);
    const img = screen.getByRole('img', { name: sampleRecipe.name });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', sampleRecipe.imageUrl);
  });

  it('renders placeholder icon if imageUrl is not provided', () => {
    render(<RecipeCard recipe={recipeNoImage} foodItems={sampleFoodItems} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('restaurant')).toBeInTheDocument(); // Material icon placeholder
  });

  it('displays correct count of matching ingredients in the badge', () => {
    // sampleFoodItems: Pasta, Cheese, Salt. Recipe ingredients: Pasta, Tomato Sauce, Cheese, Basil
    // Matching: Pasta, Cheese (2 items)
    render(<RecipeCard recipe={sampleRecipe} foodItems={sampleFoodItems} />);
    expect(screen.getByText(/Uses 2 items/i)).toBeInTheDocument();
  });
  
  it('displays "Uses 0 items" if no matching ingredients', () => {
    render(<RecipeCard recipe={sampleRecipe} foodItems={[{...sampleFoodItems[2]}]} />); // Only Salt
    expect(screen.getByText(/Uses 0 items/i)).toBeInTheDocument();
  });

  it('renders correct number of ingredient icons (dots)', () => {
    render(<RecipeCard recipe={sampleRecipe} foodItems={sampleFoodItems} />);
    // 2 matching ingredients: Pasta, Cheese. Should show 2 dots.
    const ingredientIconContainer = screen.getByText('schedule').closest('div.flex.items-center')?.nextElementSibling;
    expect(ingredientIconContainer).toBeDefined();
    const dots = within(ingredientIconContainer!).getAllByRole('img', {hidden: true}); // Role for span with background
    expect(dots.length).toBe(2); 
    // Check first letter of ingredient in dots
    expect(dots[0]).toHaveTextContent(sampleFoodItems[0].name[0]); // P for Pasta
    expect(dots[1]).toHaveTextContent(sampleFoodItems[1].name[0]); // C for Cheese
  });

  it('renders max 3 ingredient icons with a +N indicator if more than 3 matches', () => {
    const manyMatchingItems: FoodItem[] = [
      { id: 1, name: 'Pasta', category: 'Pantry', quantity: 1, unit: 'box', expiryDate: '', addedDate: new Date(), favorite: false },
      { id: 2, name: 'Tomato Sauce', category: 'Pantry', quantity: 1, unit: 'can', expiryDate: '', addedDate: new Date(), favorite: false },
      { id: 3, name: 'Cheese', category: 'Dairy', quantity: 1, unit: 'block', expiryDate: '', addedDate: new Date(), favorite: false },
      { id: 4, name: 'Basil', category: 'Produce', quantity: 1, unit: 'bunch', expiryDate: '', addedDate: new Date(), favorite: false },
      { id: 5, name: 'Olive Oil', category: 'Pantry', quantity: 1, unit: 'bottle', expiryDate: '', addedDate: new Date(), favorite: false }, // Not in this recipe
    ];
     const recipeWithManyIngredients: Recipe = {
        ...sampleRecipe,
        ingredients: ['Pasta', 'Tomato Sauce', 'Cheese', 'Basil', 'Garlic'] // 5 ingredients
    };
    // Matching items: Pasta, Tomato Sauce, Cheese, Basil (4 items)
    render(<RecipeCard recipe={recipeWithManyIngredients} foodItems={manyMatchingItems} />);
    
    const ingredientIconContainer = screen.getByText('schedule').closest('div.flex.items-center')?.nextElementSibling;
    expect(ingredientIconContainer).toBeDefined();
    
    const dots = within(ingredientIconContainer!).queryAllByRole('img', {hidden: true});
    expect(dots.length).toBe(3); // Max 3 dots
    
    const plusIndicator = within(ingredientIconContainer!).getByText(/\+1/i); // + (4-3)
    expect(plusIndicator).toBeInTheDocument();
  });
  
   it('renders 0 ingredient icons if no matching ingredients', () => {
    render(<RecipeCard recipe={sampleRecipe} foodItems={[{...sampleFoodItems[2]}]} />); // Only Salt
    const ingredientIconContainer = screen.getByText('schedule').closest('div.flex.items-center')?.nextElementSibling;
    expect(ingredientIconContainer).toBeDefined();
    const dots = within(ingredientIconContainer!).queryAllByRole('img', {hidden: true});
    expect(dots.length).toBe(0);
  });
});
