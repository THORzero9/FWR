import { useQuery } from "@tanstack/react-query";
import { useSharing } from "@/hooks/use-sharing";
import NearbyUserCard from "@/components/share/nearby-user-card";
import FoodBankCard from "@/components/share/food-bank-card";

export default function Share() {
  const { data: sharing, isLoading } = useSharing();

  if (isLoading) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="mt-4 text-neutral-500">Loading sharing options...</p>
      </div>
    );
  }

  const { nearbyUsers, foodBanks } = sharing || { nearbyUsers: [], foodBanks: [] };

  return (
    <div className="px-4 py-5">
      <h2 className="text-xl font-medium mb-5">Share & Donate</h2>
      
      {/* Nearby Sharing */}
      <div className="mb-6">
        <h3 className="font-medium mb-3">Nearby Food Sharing</h3>
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="h-40 mb-4 bg-neutral-100 rounded overflow-hidden">
            {/* Simple map placeholder using SVG */}
            <svg
              className="w-full h-full"
              viewBox="0 0 400 200"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="400" height="200" fill="#E5E7EB" />
              <path
                d="M0 80 L400 80"
                stroke="#D1D5DB"
                strokeWidth="2"
              />
              <path
                d="M0 120 L400 120"
                stroke="#D1D5DB"
                strokeWidth="2"
              />
              <path
                d="M160 0 L160 200"
                stroke="#D1D5DB"
                strokeWidth="2"
              />
              <path
                d="M240 0 L240 200"
                stroke="#D1D5DB"
                strokeWidth="2"
              />
              <circle cx="200" cy="100" r="10" fill="#4CAF50" />
              <circle cx="150" cy="80" r="8" fill="#FFC107" />
              <circle cx="250" cy="120" r="8" fill="#FFC107" />
              <circle cx="180" cy="150" r="8" fill="#FFC107" />
            </svg>
          </div>
          <div className="flex justify-between mb-4">
            <button className="bg-primary text-white px-4 py-2 rounded-lg flex-grow mr-2 flex items-center justify-center">
              <span className="material-icons text-sm mr-1">location_on</span> Find Nearby
            </button>
            <button className="bg-neutral-100 text-neutral-600 px-4 py-2 rounded-lg flex items-center justify-center">
              <span className="material-icons">filter_list</span>
            </button>
          </div>
          <div className="text-sm text-neutral-600">
            <p>Find nearby neighbors to share your extra food items with. Help reduce waste in your community!</p>
          </div>
        </div>

        {/* Nearby users */}
        <div className="space-y-3">
          {nearbyUsers.map(user => (
            <NearbyUserCard key={user.id} user={user} />
          ))}
        </div>
      </div>

      {/* Food Banks */}
      <div>
        <h3 className="font-medium mb-3">Local Food Banks</h3>
        <div className="space-y-3">
          {foodBanks.map(foodBank => (
            <FoodBankCard key={foodBank.id} foodBank={foodBank} />
          ))}
        </div>
      </div>
    </div>
  );
}
