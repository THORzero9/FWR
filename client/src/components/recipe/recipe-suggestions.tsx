import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { FoodItem, Recipe } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { groupItemsByExpiryStatus } from "@/lib/utils/date-utils";
import { ChefHat, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import SmallRecipeCard from "./small-recipe-card";

interface RecipeSuggestionsProps {
  foodItems: FoodItem[];
}

export default function RecipeSuggestions({ foodItems }: RecipeSuggestionsProps) {
  const [itemsToUse, setItemsToUse] = useState<string[]>([]);
  
  // Group items by expiry status
  useEffect(() => {
    if (!foodItems || foodItems.length === 0) return;
    
    const { expired, expiringSoon } = groupItemsByExpiryStatus(foodItems);
    
    // Combine expired and expiring soon items to get the priority items to use
    const priorityItems = [...expired, ...expiringSoon].map(item => item.name);
    setItemsToUse(priorityItems.slice(0, 5)); // Limit to 5 items for query performance
  }, [foodItems]);
  
  // Query recipes that match the expiring ingredients
  const { data: suggestedRecipes, isLoading } = useQuery<Recipe[]>({
    queryKey: ["/api/recipes/match", itemsToUse.join(",")],
    queryFn: async () => {
      if (itemsToUse.length === 0) return [];
      const res = await fetch(`/api/recipes/match/${itemsToUse.join(",")}`);
      if (!res.ok) throw new Error("Failed to fetch recipe suggestions");
      return res.json();
    },
    enabled: itemsToUse.length > 0
  });
  
  if (isLoading || !foodItems.length) {
    return null;
  }
  
  if (!suggestedRecipes || suggestedRecipes.length === 0) {
    return null;
  }
  
  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChefHat className="h-5 w-5 text-amber-600" />
            <CardTitle className="text-base font-medium">Recipe Suggestions</CardTitle>
          </div>
          <Link href="/recipes">
            <Button variant="ghost" size="sm" className="gap-1 text-amber-600 hover:text-amber-700 hover:bg-amber-100">
              <span>All Recipes</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        <CardDescription>
          {itemsToUse.length > 0 ? (
            <>
              Recipes using: <span className="font-medium">{itemsToUse.join(", ")}</span>
            </>
          ) : (
            "Suggested recipes based on your inventory"
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {suggestedRecipes.slice(0, 2).map(recipe => (
            <SmallRecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}