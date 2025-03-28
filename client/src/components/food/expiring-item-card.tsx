import { FoodItem } from "@shared/schema";
import { calculateExpiryProgress } from "@/lib/utils/date-utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRecipes } from "@/hooks/use-recipes";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

interface ExpiringItemCardProps {
  item: FoodItem;
}

export default function ExpiringItemCard({ item }: ExpiringItemCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: recipes } = useRecipes();
  
  // Get category icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Fruits": return "eco";
      case "Vegetables": return "eco";
      case "Dairy": return "egg";
      case "Meat": return "shopping_basket";
      case "Grains": return "grain";
      default: return "kitchen";
    }
  };
  
  // Get category color
  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Fruits": return "bg-amber-200 text-amber-800";
      case "Vegetables": return "bg-green-200 text-green-800";
      case "Dairy": return "bg-amber-200 text-amber-800";
      case "Meat": return "bg-red-200 text-red-800";
      case "Grains": return "bg-amber-200 text-amber-800";
      default: return "bg-blue-200 text-blue-800";
    }
  };
  
  // Calculate days until expiry
  const daysUntilExpiry = Math.ceil(
    (new Date(item.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );
  
  // Calculate progress percentage for the expiry bar
  const progress = calculateExpiryProgress(item.expiryDate);
  
  // Get expiry text
  const getExpiryText = () => {
    if (daysUntilExpiry < 0) return "Expired!";
    if (daysUntilExpiry === 0) return "Expires today!";
    if (daysUntilExpiry === 1) return "Expires tomorrow";
    return `Expires in ${daysUntilExpiry} days`;
  };
  
  // Delete mutation
  const { mutate: deleteItem } = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/food-items/${item.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/food-items"] });
      toast({
        title: "Item deleted",
        description: `${item.name} has been removed from your inventory.`,
      });
    }
  });
  
  // Find matching recipes
  const matchingRecipes = recipes ? recipes.filter(recipe => 
    recipe.ingredients.some(ingredient => 
      ingredient.toLowerCase().includes(item.name.toLowerCase())
    )
  ) : [];
  
  // Handle share
  const handleShare = () => {
    toast({
      title: "Item shared",
      description: `${item.name} has been shared with nearby users.`,
    });
  };
  
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex space-x-3 items-center">
            <div className={`${getCategoryColor(item.category)} rounded-full w-10 h-10 flex items-center justify-center`}>
              <span className="material-icons">{getCategoryIcon(item.category)}</span>
            </div>
            <div>
              <h3 className="font-medium">{item.name}</h3>
              <p className={`text-sm ${daysUntilExpiry <= 0 ? "text-red-500" : "text-neutral-500"}`}>
                {item.quantity} {item.unit} - {getExpiryText()}
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1">
                <span className="material-icons text-neutral-500">more_vert</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => deleteItem()}>
                <span className="material-icons mr-2 text-sm">delete</span>
                Delete Item
              </DropdownMenuItem>
              <DropdownMenuItem>
                <span className="material-icons mr-2 text-sm">edit</span>
                Edit Item
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="mt-3">
          <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
            <div 
              className={`h-full ${
                progress <= 0.1 ? "bg-red-500" :
                progress <= 0.3 ? "bg-amber-500" :
                "bg-primary"
              }`}
              style={{ width: `${Math.max(progress * 100, 5)}%` }}
            ></div>
          </div>
        </div>
        <div className="mt-3 flex justify-between">
          <Link href="/recipes">
            <div 
              className={`text-sm font-medium flex items-center ${
                matchingRecipes.length > 0 ? 'text-blue-600 cursor-pointer' : 'text-neutral-400'
              }`}
            >
              <span className="material-icons text-sm mr-1">restaurant</span> 
              {matchingRecipes.length > 0 ? 'Recipes' : 'No Recipes'}
            </div>
          </Link>
          <button 
            className="text-primary text-sm font-medium flex items-center"
            onClick={handleShare}
          >
            <span className="material-icons text-sm mr-1">share</span> 
            Share
          </button>
        </div>
      </div>
    </div>
  );
}
