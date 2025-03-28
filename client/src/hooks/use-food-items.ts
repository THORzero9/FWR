import { useQuery } from "@tanstack/react-query";
import { FoodItem } from "@shared/schema";

export function useFoodItems() {
  return useQuery<FoodItem[]>({
    queryKey: ["/api/food-items"],
    refetchOnWindowFocus: true,
    staleTime: 60000, // 1 minute
  });
}
