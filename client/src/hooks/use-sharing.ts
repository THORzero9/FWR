import { useQuery } from "@tanstack/react-query";
import { FoodBank, NearbyUser } from "@shared/schema";

interface SharingData {
  foodBanks: FoodBank[];
  nearbyUsers: NearbyUser[];
}

export function useSharing() {
  const { data: foodBanks } = useQuery<FoodBank[]>({
    queryKey: ["/api/food-banks"],
    staleTime: 3600000, // 1 hour
  });

  const { data: nearbyUsers } = useQuery<NearbyUser[]>({
    queryKey: ["/api/nearby-users"],
    staleTime: 3600000, // 1 hour
  });

  return {
    data: {
      foodBanks: foodBanks || [],
      nearbyUsers: nearbyUsers || [],
    },
    isLoading: !foodBanks || !nearbyUsers,
  };
}
