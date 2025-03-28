import { Recipe } from "@shared/schema";
import { Clock, ChefHat } from "lucide-react";
import { Link } from "wouter";

interface SmallRecipeCardProps {
  recipe: Recipe;
}

export default function SmallRecipeCard({ recipe }: SmallRecipeCardProps) {
  // Get the first 3 ingredients to display
  const displayIngredients = recipe.ingredients.slice(0, 3);
  const moreIngredients = recipe.ingredients.length > 3 
    ? `+${recipe.ingredients.length - 3} more` 
    : "";
  
  return (
    <Link href={`/recipes/${recipe.id}`}>
      <div className="bg-white rounded-lg shadow p-3 cursor-pointer hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="font-medium text-base">{recipe.name}</h3>
            <p className="text-xs text-neutral-500 mt-1 line-clamp-2">
              {recipe.description}
            </p>
          </div>
          <div className="bg-primary/10 rounded-full w-8 h-8 flex items-center justify-center text-primary">
            <ChefHat size={16} />
          </div>
        </div>
        
        <div className="mt-2 flex items-center text-xs text-neutral-500">
          <Clock size={14} />
          <span className="ml-1">{recipe.prepTime} min</span>
          
          <div className="ml-auto flex items-center">
            <span className="material-icons" style={{ fontSize: '14px' }}>star</span>
            <span className="ml-1">{(recipe.rating !== null ? recipe.rating / 10 : 5.0).toFixed(1)}</span>
          </div>
        </div>
        
        <div className="mt-2">
          <p className="text-xs text-neutral-600 font-medium">Ingredients:</p>
          <p className="text-xs text-neutral-500 mt-0.5">
            {displayIngredients.join(", ")}
            {moreIngredients && <span className="text-neutral-400"> {moreIngredients}</span>}
          </p>
        </div>
      </div>
    </Link>
  );
}