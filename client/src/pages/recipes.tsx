import { useRecipes } from "@/hooks/use-recipes";
import { useFoodItems } from "@/hooks/use-food-items";
import RecipeCard from "@/components/recipe/recipe-card";
import SmallRecipeCard from "@/components/recipe/small-recipe-card";
import { useState, useEffect } from "react";
import { Recipe } from "@shared/schema";

export default function Recipes() {
  const { data: recipes, isLoading } = useRecipes();
  const { data: foodItems, isLoading: loadingFoodItems } = useFoodItems();
  const [expiringRecipes, setExpiringRecipes] = useState<Recipe[]>([]);
  const [popularRecipes, setPopularRecipes] = useState<Recipe[]>([]);

  useEffect(() => {
    if (!recipes || !foodItems) return;

    // Get names of expiring items (within 3 days)
    const expiringItemNames = foodItems
      .filter(item => {
        const daysUntilExpiry = Math.ceil(
          (new Date(item.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );
        return daysUntilExpiry <= 3;
      })
      .map(item => item.name.toLowerCase());

    // Find recipes that use expiring ingredients
    const matchingRecipes = recipes.filter(recipe => 
      recipe.ingredients.some(ingredient => 
        expiringItemNames.some(itemName => 
          ingredient.toLowerCase().includes(itemName)
        )
      )
    );

    setExpiringRecipes(matchingRecipes.slice(0, 3));

    // Sort recipes by rating for popular recipes
    const sortedRecipes = [...recipes].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    setPopularRecipes(sortedRecipes.slice(0, 4));
  }, [recipes, foodItems]);

  if (isLoading || loadingFoodItems) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="mt-4 text-neutral-500">Loading recipes...</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-5">
      <h2 className="text-xl font-medium mb-5">Recipe Suggestions</h2>
      
      {/* Based on your inventory */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-medium">Based on expiring items</h3>
          <button className="text-sm text-primary font-medium">See All</button>
        </div>
        
        {expiringRecipes.length > 0 ? (
          <div className="space-y-4">
            {expiringRecipes.map(recipe => (
              <RecipeCard 
                key={recipe.id} 
                recipe={recipe} 
                foodItems={foodItems || []}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-neutral-500">No recipes based on expiring items!</p>
            <p className="text-sm text-neutral-400 mt-1">
              Add more items to your inventory to get personalized recipe suggestions.
            </p>
          </div>
        )}
      </div>

      {/* Popular Recipes */}
      <div>
        <h3 className="font-medium mb-3">Popular Recipes</h3>
        <div className="grid grid-cols-2 gap-3">
          {popularRecipes.map(recipe => (
            <SmallRecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      </div>
    </div>
  );
}
