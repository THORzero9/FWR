import { 
  FoodItem, 
  InsertFoodItem, 
  Recipe, 
  InsertRecipe,
  FoodBank,
  InsertFoodBank,
  NearbyUser,
  InsertNearbyUser,
  FoodWasteStats,
  foodItems
} from "@shared/schema";
import { sampleRecipes } from "./data/recipes";
import { sampleFoodBanks } from "./data/food-banks";
import { sampleNearbyUsers } from "./data/users";

export interface IStorage {
  // Food items
  getFoodItems(): Promise<FoodItem[]>;
  getFoodItem(id: number): Promise<FoodItem | undefined>;
  addFoodItem(item: InsertFoodItem): Promise<FoodItem>;
  updateFoodItem(id: number, item: Partial<FoodItem>): Promise<FoodItem | undefined>;
  deleteFoodItem(id: number): Promise<boolean>;
  
  // Recipes
  getRecipes(): Promise<Recipe[]>;
  getRecipe(id: number): Promise<Recipe | undefined>;
  getRecipesForIngredients(ingredients: string[]): Promise<Recipe[]>;
  
  // Food banks
  getFoodBanks(): Promise<FoodBank[]>;
  
  // Nearby users
  getNearbyUsers(): Promise<NearbyUser[]>;
  
  // Stats
  getWasteStats(): Promise<FoodWasteStats>;
}

export class MemStorage implements IStorage {
  private foodItems: Map<number, FoodItem>;
  private recipes: Map<number, Recipe>;
  private foodBanks: Map<number, FoodBank>;
  private nearbyUsers: Map<number, NearbyUser>;
  private currentFoodItemId: number;
  private currentRecipeId: number;
  private currentFoodBankId: number;
  private currentNearbyUserId: number;

  constructor() {
    this.foodItems = new Map();
    this.recipes = new Map();
    this.foodBanks = new Map();
    this.nearbyUsers = new Map();
    
    this.currentFoodItemId = 1;
    this.currentRecipeId = 1;
    this.currentFoodBankId = 1;
    this.currentNearbyUserId = 1;
    
    // Initialize with sample recipes
    sampleRecipes.forEach(recipe => {
      this.recipes.set(this.currentRecipeId, {
        ...recipe,
        id: this.currentRecipeId
      });
      this.currentRecipeId++;
    });
    
    // Initialize with sample food banks
    sampleFoodBanks.forEach(foodBank => {
      this.foodBanks.set(this.currentFoodBankId, {
        ...foodBank,
        id: this.currentFoodBankId
      });
      this.currentFoodBankId++;
    });
    
    // Initialize with sample nearby users
    sampleNearbyUsers.forEach(user => {
      this.nearbyUsers.set(this.currentNearbyUserId, {
        ...user,
        id: this.currentNearbyUserId
      });
      this.currentNearbyUserId++;
    });
  }

  // Food items methods
  async getFoodItems(): Promise<FoodItem[]> {
    return Array.from(this.foodItems.values());
  }

  async getFoodItem(id: number): Promise<FoodItem | undefined> {
    return this.foodItems.get(id);
  }

  async addFoodItem(item: InsertFoodItem): Promise<FoodItem> {
    const id = this.currentFoodItemId++;
    const newItem: FoodItem = {
      ...item,
      id,
      addedDate: new Date(),
      favorite: item.favorite || false
    };
    this.foodItems.set(id, newItem);
    return newItem;
  }

  async updateFoodItem(id: number, item: Partial<FoodItem>): Promise<FoodItem | undefined> {
    const existingItem = this.foodItems.get(id);
    if (!existingItem) return undefined;
    
    const updatedItem = {
      ...existingItem,
      ...item
    };
    this.foodItems.set(id, updatedItem);
    return updatedItem;
  }

  async deleteFoodItem(id: number): Promise<boolean> {
    return this.foodItems.delete(id);
  }

  // Recipe methods
  async getRecipes(): Promise<Recipe[]> {
    return Array.from(this.recipes.values());
  }

  async getRecipe(id: number): Promise<Recipe | undefined> {
    return this.recipes.get(id);
  }

  async getRecipesForIngredients(ingredients: string[]): Promise<Recipe[]> {
    if (!ingredients.length) return [];
    
    const lowerCaseIngredients = ingredients.map(i => i.toLowerCase());
    
    return Array.from(this.recipes.values()).filter(recipe => {
      const recipeIngredients = recipe.ingredients.map(i => i.toLowerCase());
      return lowerCaseIngredients.some(ingredient => 
        recipeIngredients.some(ri => ri.includes(ingredient))
      );
    });
  }

  // Food banks methods
  async getFoodBanks(): Promise<FoodBank[]> {
    return Array.from(this.foodBanks.values());
  }

  // Nearby users methods
  async getNearbyUsers(): Promise<NearbyUser[]> {
    return Array.from(this.nearbyUsers.values());
  }

  // Stats methods
  async getWasteStats(): Promise<FoodWasteStats> {
    // Generate waste stats based on current inventory
    const foodItems = await this.getFoodItems();
    
    // Calculate stats based on food items saved
    const totalItems = foodItems.length;
    const moneySaved = totalItems * 3.5; // Assuming $3.50 per item saved
    const co2Saved = totalItems * 1.2; // ~1.2kg CO2 per food item saved
    const waterSaved = totalItems * 48; // ~48L water per food item saved
    const wasteReduced = totalItems * 0.4; // ~0.4kg waste per food item saved
    
    // Sample monthly progress data
    const monthlyProgress = [
      { month: "Jan", amount: 2.5 },
      { month: "Feb", amount: 3.8 },
      { month: "Mar", amount: 2.9 },
      { month: "Apr", amount: 4.2 },
      { month: "May", amount: 3.7 },
      { month: "Jun", amount: 5.1 },
      { month: "Jul", amount: 7.3 },
      { month: "Aug", amount: 5.5 }
    ];
    
    // Sample waste breakdown by category
    const wasteBreakdown = [
      { category: "Fruits", percentage: 40 },
      { category: "Vegetables", percentage: 30 },
      { category: "Dairy", percentage: 20 },
      { category: "Other", percentage: 10 }
    ];
    
    return {
      co2Saved,
      waterSaved,
      moneySaved,
      wasteReduced,
      monthlyProgress,
      wasteBreakdown
    };
  }
}

export const storage = new MemStorage();
