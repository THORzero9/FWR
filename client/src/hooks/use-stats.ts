import { useQuery } from "@tanstack/react-query";
import { FoodWasteStats } from "@shared/schema";

export function useStats() {
  return useQuery<FoodWasteStats>({
    queryKey: ["/api/stats"],
    refetchOnWindowFocus: false,
    staleTime: 300000, // 5 minutes
  });
}
