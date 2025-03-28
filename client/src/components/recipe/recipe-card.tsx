import { Recipe, FoodItem } from "@shared/schema";

interface RecipeCardProps {
  recipe: Recipe;
  foodItems: FoodItem[];
}

export default function RecipeCard({ recipe, foodItems }: RecipeCardProps) {
  // Find matching ingredients from user's inventory
  const matchingIngredients = recipe.ingredients.filter(ingredient => 
    foodItems.some(item => 
      ingredient.toLowerCase().includes(item.name.toLowerCase())
    )
  );
  
  // Format prep time
  const formatPrepTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} mins`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours} hr ${mins} mins` : `${hours} hr`;
  };
  
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="h-40 bg-neutral-100 relative">
        {recipe.imageUrl ? (
          <img 
            src={recipe.imageUrl} 
            alt={recipe.name} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-neutral-200">
            <span className="material-icons text-4xl text-neutral-400">restaurant</span>
          </div>
        )}
        <div className="absolute top-2 right-2 bg-amber-700 text-white text-xs px-2 py-1 rounded-full">
          Uses {matchingIngredients.length} items
        </div>
      </div>
      <div className="p-4">
        <h4 className="font-medium mb-1">{recipe.name}</h4>
        <p className="text-sm text-neutral-500 mb-2">{recipe.description}</p>
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <span className="material-icons text-sm text-neutral-500 mr-1">schedule</span>
            <span className="text-xs text-neutral-500">{formatPrepTime(recipe.prepTime)}</span>
          </div>
          <div className="flex space-x-1">
            {/* Recipe ingredient icons - simplified to dots with colors */}
            {[...Array(Math.min(3, matchingIngredients.length))].map((_, i) => (
              <span 
                key={i} 
                className={`inline-block w-5 h-5 rounded-full overflow-hidden ${
                  i % 3 === 0 ? 'bg-primary-light' : 
                  i % 3 === 1 ? 'bg-red-200' : 
                  'bg-amber-200'
                }`}
              >
                <span className="flex items-center justify-center h-full text-xs">
                  {matchingIngredients[i][0]}
                </span>
              </span>
            ))}
            {matchingIngredients.length > 3 && (
              <span className="inline-block w-5 h-5 bg-neutral-200 rounded-full overflow-hidden flex items-center justify-center">
                <span className="text-xs">+{matchingIngredients.length - 3}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
