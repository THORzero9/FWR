import { useQuery } from "@tanstack/react-query";
import { Recipe } from "@shared/schema";

export function useRecipes() {
  return useQuery<Recipe[]>({
    queryKey: ["/api/recipes"],
    refetchOnWindowFocus: false,
    staleTime: 3600000, // 1 hour
  });
}

export function useRecipesForIngredients(ingredients: string[]) {
  return useQuery<Recipe[]>({
    queryKey: ["/api/recipes/match", ingredients.join(",")],
    refetchOnWindowFocus: false,
    staleTime: 3600000, // 1 hour
    enabled: ingredients.length > 0,
  });
}
