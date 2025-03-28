import { NearbyUser } from "@shared/schema";

// Sample nearby users without IDs (they'll be assigned in the storage)
export const sampleNearbyUsers: Omit<NearbyUser, "id">[] = [
  {
    name: "Sarah J.",
    distance: 5, // 0.5 miles
    rating: 45, // 4.5/5
    imageUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&q=80"
  },
  {
    name: "Michael T.",
    distance: 8, // 0.8 miles
    rating: 40, // 4.0/5
    imageUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&q=80"
  },
  {
    name: "Lisa K.",
    distance: 12, // 1.2 miles
    rating: 50, // 5.0/5
    imageUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&q=80"
  },
  {
    name: "Robert W.",
    distance: 15, // 1.5 miles
    rating: 35, // 3.5/5
    imageUrl: "https://images.unsplash.com/photo-1552058544-f2b08422138a?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&q=80"
  }
];
