import { Recipe } from "@shared/schema";

interface SmallRecipeCardProps {
  recipe: Recipe;
}

export default function SmallRecipeCard({ recipe }: SmallRecipeCardProps) {
  // Format prep time
  const formatPrepTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} mins`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours} hr ${mins} mins` : `${hours} hr`;
  };
  
  // Format rating
  const formatRating = (rating: number | null | undefined) => {
    if (rating === null || rating === undefined) return "N/A";
    return (rating / 10).toFixed(1);
  };
  
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="h-24 bg-neutral-100">
        {recipe.imageUrl ? (
          <img 
            src={recipe.imageUrl} 
            alt={recipe.name} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-neutral-200">
            <span className="material-icons text-2xl text-neutral-400">restaurant</span>
          </div>
        )}
      </div>
      <div className="p-3">
        <h4 className="font-medium text-sm">{recipe.name}</h4>
        <div className="flex justify-between items-center mt-1">
          <span className="text-xs text-neutral-500">{formatPrepTime(recipe.prepTime)}</span>
          <span className="text-xs text-primary">{formatRating(recipe.rating)} ★</span>
        </div>
      </div>
    </div>
  );
}
