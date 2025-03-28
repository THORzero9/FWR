import { FoodBank } from "@shared/schema";

// Sample food banks without IDs (they'll be assigned in the storage)
export const sampleFoodBanks: Omit<FoodBank, "id">[] = [
  {
    name: "Community Food Bank",
    distance: 12, // 1.2 miles
    openHours: "Open today until 6:00 PM",
    description: "Accepting all non-perishable foods and fresh produce. Please check their website for specific needs."
  },
  {
    name: "Harvest Food Pantry",
    distance: 25, // 2.5 miles
    openHours: "Open Tue-Sat, 9:00 AM - 5:00 PM",
    description: "Currently in need of: fresh vegetables, canned goods, and baby food."
  },
  {
    name: "City Mission Outreach",
    distance: 18, // 1.8 miles
    openHours: "Open daily 8:00 AM - 8:00 PM",
    description: "Accepts donations of all kinds including fresh, frozen and packaged foods."
  },
  {
    name: "Neighborhood Food Assistance",
    distance: 30, // 3.0 miles
    openHours: "Open Mon-Fri, 10:00 AM - 4:00 PM",
    description: "Serving families in need. Currently seeking donations of rice, beans, and canned vegetables."
  }
];
