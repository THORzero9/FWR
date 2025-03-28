import { FoodBank } from "@shared/schema";

interface FoodBankCardProps {
  foodBank: FoodBank;
}

export default function FoodBankCard({ foodBank }: FoodBankCardProps) {
  // Format distance
  const formatDistance = (distance: number) => {
    // distance is stored as miles * 10 for precision
    return (distance / 10).toFixed(1);
  };
  
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-medium">{foodBank.name}</h4>
          <p className="text-sm text-neutral-500">{formatDistance(foodBank.distance)} miles away</p>
          <p className="text-xs text-neutral-500 mt-1">{foodBank.openHours}</p>
        </div>
        <button className="bg-blue-500 text-white px-3 py-1 rounded-lg text-sm">Directions</button>
      </div>
      <div className="mt-3">
        <p className="text-sm text-neutral-500">
          {foodBank.description}
        </p>
      </div>
    </div>
  );
}
