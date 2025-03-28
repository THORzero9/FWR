import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FoodItem } from "@shared/schema";
import { useFoodItems } from "@/hooks/use-food-items";
import CategoryFilter from "@/components/food/category-filter";
import ItemCard from "@/components/food/item-card";
import ExpiringItemCard from "@/components/food/expiring-item-card";
import { formatDistanceToNow } from "date-fns";

// Components for summary cards
const SummaryCard = ({ title, value, icon, color = "text-primary" }: { 
  title: string, 
  value: string | number, 
  icon: string, 
  color?: string
}) => {
  return (
    <div className="bg-white rounded-lg shadow p-4 min-w-[150px] flex-shrink-0">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-neutral-500">{title}</p>
          <p className={`text-2xl font-medium ${color}`}>{value}</p>
        </div>
        <span className={`material-icons ${color}`}>{icon}</span>
      </div>
    </div>
  );
};

export default function Inventory() {
  const { data: foodItems, isLoading } = useFoodItems();
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [expiringItems, setExpiringItems] = useState<FoodItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<FoodItem[]>([]);

  // Calculate stats based on food items
  const calculateStats = () => {
    if (!foodItems) return { totalItems: 0, expiringItems: 0, moneySaved: 0 };
    
    const totalItems = foodItems.length;
    
    // Items expiring within 3 days
    const soon = foodItems.filter(item => {
      const daysUntilExpiry = Math.ceil(
        (new Date(item.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysUntilExpiry <= 3;
    }).length;
    
    // Rough calculation based on average food item price
    const moneySaved = totalItems * 3.50;
    
    return {
      totalItems,
      expiringItems: soon,
      moneySaved: `$${moneySaved.toFixed(0)}`
    };
  };

  const stats = calculateStats();

  useEffect(() => {
    if (!foodItems) return;
    
    // Filter expiring items (within 3 days)
    const soon = foodItems.filter(item => {
      const daysUntilExpiry = Math.ceil(
        (new Date(item.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysUntilExpiry <= 3;
    });
    
    setExpiringItems(soon);
    
    // Filter by category
    if (selectedCategory === "All") {
      setFilteredItems(foodItems);
    } else {
      setFilteredItems(foodItems.filter(item => item.category === selectedCategory));
    }
  }, [foodItems, selectedCategory]);
  
  // Handle loading state
  if (isLoading) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="mt-4 text-neutral-500">Loading inventory...</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-5">
      {/* Summary Cards */}
      <div className="flex space-x-4 mb-6 overflow-x-auto pb-2">
        <SummaryCard 
          title="Items" 
          value={stats.totalItems} 
          icon="inventory_2" 
        />
        <SummaryCard 
          title="Expiring Soon" 
          value={stats.expiringItems} 
          icon="timer" 
          color="text-amber-600"
        />
        <SummaryCard 
          title="Saved" 
          value={stats.moneySaved} 
          icon="savings" 
          color="text-blue-600"
        />
      </div>

      {/* Category Filter */}
      <CategoryFilter 
        selectedCategory={selectedCategory} 
        onCategoryChange={setSelectedCategory} 
      />

      {/* Expiring Soon Section */}
      <h2 className="text-lg font-medium mb-3">Expiring Soon</h2>
      <div className="mb-6">
        {expiringItems.length > 0 ? (
          <div className="space-y-3">
            {expiringItems.map(item => (
              <ExpiringItemCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-neutral-500">No items expiring soon!</p>
            <p className="text-sm text-neutral-400 mt-1">
              Add items to your inventory to track expiration dates.
            </p>
          </div>
        )}
      </div>

      {/* Inventory Section */}
      <h2 className="text-lg font-medium mb-3">My Inventory</h2>
      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {filteredItems.map(item => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-neutral-500">
            {selectedCategory === "All" 
              ? "Your inventory is empty!" 
              : `No ${selectedCategory} items in your inventory!`}
          </p>
          <p className="text-sm text-neutral-400 mt-1">
            Add items to start tracking your food.
          </p>
        </div>
      )}
    </div>
  );
}
