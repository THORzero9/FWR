import { FoodItem } from "@shared/schema";
import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { calculateExpiryProgress } from "@/lib/utils/date-utils";

interface ItemCardProps {
  item: FoodItem;
}

export default function ItemCard({ item }: ItemCardProps) {
  const queryClient = useQueryClient();
  
  // Mutation to toggle favorite status
  const { mutate: toggleFavorite } = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PATCH", `/api/food-items/${item.id}`, {
        favorite: !item.favorite
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/food-items"] });
    }
  });

  // Calculate days until expiry
  const daysUntilExpiry = Math.ceil(
    (new Date(item.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );
  
  // Calculate progress percentage for the expiry bar
  const progress = calculateExpiryProgress(item.expiryDate);
  
  return (
    <div className="bg-white rounded-lg shadow p-3">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium">{item.name}</h3>
          <p className="text-sm text-neutral-500">{item.quantity} {item.unit}</p>
        </div>
        <button onClick={() => toggleFavorite()}>
          <span className="material-icons text-neutral-300">
            {item.favorite ? "favorite" : "favorite_outline"}
          </span>
        </button>
      </div>
      <p className="text-xs text-neutral-500 mt-2">
        {daysUntilExpiry <= 0 
          ? "Expired!" 
          : `Expires in ${daysUntilExpiry} days`}
      </p>
      <div className="mt-2">
        <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
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
    </div>
  );
}
