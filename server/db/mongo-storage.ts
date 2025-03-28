import { IStorage } from '../storage';
import { FoodItem as FoodItemModel, Recipe as RecipeModel, FoodBank as FoodBankModel, NearbyUser as NearbyUserModel } from './mongoose';
import { FoodItem, Recipe, FoodBank, NearbyUser, InsertFoodItem, FoodWasteStats, FOOD_CATEGORIES, FOOD_UNITS } from '@shared/schema';
import { sampleRecipes } from '../data/recipes';
import { sampleFoodBanks } from '../data/food-banks';
import { sampleNearbyUsers } from '../data/users';

// Helper function to convert MongoDB string IDs to numbers for our interface compatibility
function stringIdToNumber(id: string): number {
  // Use a simple hash function to convert the string to a number
  // This is just for compatibility with the interface
  return parseInt(id.substring(id.length - 8), 16);
}

export class MongoStorage implements IStorage {
  private async initializeDefaultData() {
    try {
      // Check if we need to initialize default data
      const recipesCount = await RecipeModel.countDocuments();
      if (recipesCount === 0) {
        // Add rating to sample recipes
        const recipesWithRating = sampleRecipes.map(recipe => ({
          ...recipe,
          rating: Math.floor(Math.random() * 5) + 1  // Random rating 1-5
        }));
        await RecipeModel.insertMany(recipesWithRating);
      }

      const foodBanksCount = await FoodBankModel.countDocuments();
      if (foodBanksCount === 0) {
        // Create sample food banks matching our schema
        const formattedFoodBanks = [
          {
            name: "Community Food Share",
            description: "Local food bank accepting all non-perishable food donations",
            distance: 25, // 2.5 miles
            openHours: "Mon-Fri: 9AM-5PM"
          },
          {
            name: "City Harvest",
            description: "Food rescue organization distributing food to those in need",
            distance: 42, // 4.2 miles
            openHours: "Mon-Sat: 8AM-6PM"
          },
          {
            name: "Neighborhood Pantry",
            description: "Volunteer-run pantry providing food to local families",
            distance: 18, // 1.8 miles
            openHours: "Tue & Thu: 10AM-2PM, Sat: 9AM-12PM"
          }
        ];
        await FoodBankModel.insertMany(formattedFoodBanks);
      }

      const nearbyUsersCount = await NearbyUserModel.countDocuments();
      if (nearbyUsersCount === 0) {
        // Create sample nearby users matching our schema
        const formattedUsers = [
          {
            name: "Alex Chen",
            distance: 5, // 0.5 miles
            rating: 5,
            imageUrl: null
          },
          {
            name: "Maya Johnson",
            distance: 12, // 1.2 miles
            rating: 4,
            imageUrl: null
          },
          {
            name: "Sam Rodriguez",
            distance: 8, // 0.8 miles
            rating: 5,
            imageUrl: null
          }
        ];
        await NearbyUserModel.insertMany(formattedUsers);
      }
    } catch (error) {
      console.error('Error initializing default data:', error);
    }
  }

  constructor() {
    // Initialize default data when constructing the storage
    this.initializeDefaultData().catch(err => console.error('Failed to initialize default data:', err));
  }

  // Food items
  async getFoodItems(): Promise<FoodItem[]> {
    const items = await FoodItemModel.find().sort({ expiryDate: 1 });
    return items.map(item => ({
      id: stringIdToNumber(item._id.toString()),
      name: item.name,
      category: item.category as typeof FOOD_CATEGORIES[number],
      quantity: item.quantity,
      unit: item.unit as typeof FOOD_UNITS[number],
      expiryDate: item.expiryDate,
      addedDate: item.addedDate,
      favorite: item.favorite || null
    }));
  }

  async getFoodItem(id: number): Promise<FoodItem | undefined> {
    try {
      // Note: In a production app, we'd need a way to map numeric IDs back to MongoDB ObjectIDs
      const items = await FoodItemModel.find().limit(100);
      const item = items.find(item => stringIdToNumber(item._id.toString()) === id);
      
      if (!item) return undefined;
      
      return {
        id: stringIdToNumber(item._id.toString()),
        name: item.name,
        category: item.category as typeof FOOD_CATEGORIES[number],
        quantity: item.quantity,
        unit: item.unit as typeof FOOD_UNITS[number],
        expiryDate: item.expiryDate,
        addedDate: item.addedDate,
        favorite: item.favorite || null
      };
    } catch (error) {
      console.error(`Error finding food item with id ${id}:`, error);
      return undefined;
    }
  }

  async addFoodItem(itemData: InsertFoodItem): Promise<FoodItem> {
    const item = await FoodItemModel.create(itemData);
    
    return {
      id: stringIdToNumber(item._id.toString()),
      name: item.name,
      category: item.category as typeof FOOD_CATEGORIES[number],
      quantity: item.quantity,
      unit: item.unit as typeof FOOD_UNITS[number],
      expiryDate: item.expiryDate,
      addedDate: item.addedDate,
      favorite: item.favorite || null
    };
  }

  async updateFoodItem(id: number, itemData: Partial<FoodItem>): Promise<FoodItem | undefined> {
    try {
      // Find the item with our numeric ID first
      const items = await FoodItemModel.find().limit(100);
      const existingItem = items.find(item => stringIdToNumber(item._id.toString()) === id);
      
      if (!existingItem) return undefined;
      
      // Now use the real MongoDB ID to update
      const item = await FoodItemModel.findByIdAndUpdate(
        existingItem._id, 
        itemData, 
        { new: true }
      );
      
      if (!item) return undefined;
      
      return {
        id: stringIdToNumber(item._id.toString()),
        name: item.name,
        category: item.category as typeof FOOD_CATEGORIES[number],
        quantity: item.quantity,
        unit: item.unit as typeof FOOD_UNITS[number],
        expiryDate: item.expiryDate,
        addedDate: item.addedDate,
        favorite: item.favorite || null
      };
    } catch (error) {
      console.error(`Error updating food item with id ${id}:`, error);
      return undefined;
    }
  }

  async deleteFoodItem(id: number): Promise<boolean> {
    try {
      // Find the item with our numeric ID first
      const items = await FoodItemModel.find().limit(100);
      const existingItem = items.find(item => stringIdToNumber(item._id.toString()) === id);
      
      if (!existingItem) return false;
      
      // Now use the real MongoDB ID to delete
      const result = await FoodItemModel.findByIdAndDelete(existingItem._id);
      return !!result;
    } catch (error) {
      console.error(`Error deleting food item with id ${id}:`, error);
      return false;
    }
  }

  // Recipes
  async getRecipes(): Promise<Recipe[]> {
    const recipes = await RecipeModel.find();
    return recipes.map(recipe => ({
      id: stringIdToNumber(recipe._id.toString()),
      name: recipe.name,
      description: recipe.description,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
      prepTime: recipe.prepTime,
      imageUrl: recipe.imageUrl || null,
      rating: recipe.rating || null
    }));
  }

  async getRecipe(id: number): Promise<Recipe | undefined> {
    try {
      const recipes = await RecipeModel.find().limit(100);
      const recipe = recipes.find(recipe => stringIdToNumber(recipe._id.toString()) === id);
      
      if (!recipe) return undefined;
      
      return {
        id: stringIdToNumber(recipe._id.toString()),
        name: recipe.name,
        description: recipe.description,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        prepTime: recipe.prepTime,
        imageUrl: recipe.imageUrl || null,
        rating: recipe.rating || null
      };
    } catch (error) {
      console.error(`Error finding recipe with id ${id}:`, error);
      return undefined;
    }
  }

  async getRecipesForIngredients(ingredients: string[]): Promise<Recipe[]> {
    if (!ingredients.length) return [];
    
    // Convert all ingredient names to lowercase for case-insensitive comparison
    const lowerCaseIngredients = ingredients.map(ing => ing.toLowerCase());
    
    // Find recipes that have at least one of the ingredients
    const recipes = await RecipeModel.find({
      ingredients: { $elemMatch: { $in: lowerCaseIngredients.map(ing => new RegExp(ing, 'i')) } }
    });
    
    // Map to the expected format
    return recipes.map(recipe => ({
      id: stringIdToNumber(recipe._id.toString()),
      name: recipe.name,
      description: recipe.description,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
      prepTime: recipe.prepTime,
      imageUrl: recipe.imageUrl || null,
      rating: recipe.rating || null
    }));
  }

  // Food banks
  async getFoodBanks(): Promise<FoodBank[]> {
    const foodBanks = await FoodBankModel.find();
    return foodBanks.map(bank => ({
      id: stringIdToNumber(bank._id.toString()),
      name: bank.name,
      description: bank.description,
      distance: bank.distance,
      openHours: bank.openHours
    }));
  }

  // Nearby users
  async getNearbyUsers(): Promise<NearbyUser[]> {
    const users = await NearbyUserModel.find();
    return users.map(user => ({
      id: stringIdToNumber(user._id.toString()),
      name: user.name,
      distance: user.distance,
      rating: user.rating,
      imageUrl: user.imageUrl
    }));
  }

  // Stats
  async getWasteStats(): Promise<FoodWasteStats> {
    // Calculate some simple stats based on the food items
    const foodItems = await this.getFoodItems();
    
    // Count expired items
    const now = new Date();
    const expiredItems = foodItems.filter(item => new Date(item.expiryDate) < now);
    
    // Calculate savings based on expired items
    // These are just sample calculations and should be refined
    const wasteReduced = expiredItems.length * 0.8; // kg
    const co2Saved = wasteReduced * 4.5; // kg CO2 equivalent
    const waterSaved = wasteReduced * 180; // liters
    const moneySaved = wasteReduced * 5; // dollars
    
    // Generate monthly progress data
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyProgress = monthNames.map((month, index) => ({
      month,
      amount: Math.round(Math.random() * 10) // Random data for demonstration
    }));
    
    // Generate waste breakdown by category
    const wasteBreakdown = Array.from(FOOD_CATEGORIES).map(category => ({
      category,
      percentage: Math.round(Math.random() * 30) // Random data for demonstration
    }));
    
    // Sort and normalize percentages to sum to 100%
    wasteBreakdown.sort((a, b) => b.percentage - a.percentage);
    const totalPercentage = wasteBreakdown.reduce((sum, item) => sum + item.percentage, 0);
    
    if (totalPercentage > 0) {
      wasteBreakdown.forEach(item => {
        item.percentage = Math.round((item.percentage / totalPercentage) * 100);
      });
    }
    
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

export const mongoStorage = new MongoStorage();