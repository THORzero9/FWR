import {
  FoodItem, InsertFoodItem, Recipe, FoodBank, NearbyUser, FoodWasteStats,
  foodItems, recipes, foodBanks, nearbyUsers
} from "@shared/schema";
import { db, pool } from "./db";
import { eq, like, asc, desc, sql } from "drizzle-orm";
import { sampleRecipes } from "./data/recipes";
import { sampleFoodBanks } from "./data/food-banks";
import { sampleNearbyUsers } from "./data/users";
import { sampleFoodItems } from "./data/food-items";

// Import session packages
import session from "express-session";
import createMemoryStore from "memorystore";
import connectPg from "connect-pg-simple";

const MemoryStore = createMemoryStore(session);
const PostgresSessionStore = connectPg(session);

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
  
  // Sessions storage
  sessionStore: session.Store;
  
  // Users
  getUser(id: number): Promise<any | undefined>;
  getUserByUsername(username: string): Promise<any | undefined>;
  createUser(user: any): Promise<any>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private foodItems: Map<number, FoodItem>;
  private recipes: Map<number, Recipe>;
  private foodBanks: Map<number, FoodBank>;
  private nearbyUsers: Map<number, NearbyUser>;
  private users: Map<number, any>;
  private currentFoodItemId: number;
  private currentRecipeId: number;
  private currentFoodBankId: number;
  private currentNearbyUserId: number;
  private currentUserId: number;
  public sessionStore: session.Store;
  
  constructor() {
    this.foodItems = new Map();
    this.recipes = new Map();
    this.foodBanks = new Map();
    this.nearbyUsers = new Map();
    this.users = new Map();
    this.currentFoodItemId = 1;
    this.currentRecipeId = 1;
    this.currentFoodBankId = 1;
    this.currentNearbyUserId = 1;
    this.currentUserId = 1;
    
    // Create session store
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
    
    // Initialize with sample data
    this.initializeWithSampleData();
    
    // Add a default user
    this.users.set(1, {
      id: 1,
      username: "admin",
      email: "admin@example.com",
      password: "password"
    });
  }
  
  private initializeWithSampleData() {
    // Add sample recipes
    for (const recipeData of sampleRecipes) {
      const recipe: Recipe = {
        id: this.currentRecipeId++,
        ...recipeData
      };
      this.recipes.set(recipe.id, recipe);
    }
    
    // Add sample food banks
    for (const foodBankData of sampleFoodBanks) {
      const foodBank: FoodBank = {
        id: this.currentFoodBankId++,
        ...foodBankData
      };
      this.foodBanks.set(foodBank.id, foodBank);
    }
    
    // Add sample nearby users
    for (const userData of sampleNearbyUsers) {
      const user: NearbyUser = {
        id: this.currentNearbyUserId++,
        ...userData
      };
      this.nearbyUsers.set(user.id, user);
    }
    
    // Add sample food items
    for (const itemData of sampleFoodItems) {
      const item: FoodItem = {
        id: this.currentFoodItemId++,
        addedDate: new Date(),
        ...itemData
      };
      this.foodItems.set(item.id, item);
    }
  }
  
  async getFoodItems(): Promise<FoodItem[]> {
    return Array.from(this.foodItems.values()).sort((a, b) => 
      new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
    );
  }
  
  async getFoodItem(id: number): Promise<FoodItem | undefined> {
    return this.foodItems.get(id);
  }
  
  async addFoodItem(item: InsertFoodItem): Promise<FoodItem> {
    const newItem: FoodItem = {
      id: this.currentFoodItemId++,
      addedDate: new Date(),
      ...item
    };
    this.foodItems.set(newItem.id, newItem);
    return newItem;
  }
  
  async updateFoodItem(id: number, item: Partial<FoodItem>): Promise<FoodItem | undefined> {
    const existingItem = this.foodItems.get(id);
    if (!existingItem) {
      return undefined;
    }
    
    const updatedItem = { ...existingItem, ...item };
    this.foodItems.set(id, updatedItem);
    return updatedItem;
  }
  
  async deleteFoodItem(id: number): Promise<boolean> {
    return this.foodItems.delete(id);
  }
  
  async getRecipes(): Promise<Recipe[]> {
    return Array.from(this.recipes.values());
  }
  
  async getRecipe(id: number): Promise<Recipe | undefined> {
    return this.recipes.get(id);
  }
  
  async getRecipesForIngredients(ingredients: string[]): Promise<Recipe[]> {
    if (!ingredients.length) {
      return [];
    }
    
    return Array.from(this.recipes.values()).filter(recipe => {
      const matchCount = ingredients.filter(ingredient => 
        recipe.ingredients.some(recipeIngredient => 
          recipeIngredient.toLowerCase().includes(ingredient.toLowerCase())
        )
      ).length;
      
      // Return recipes that match at least one ingredient
      return matchCount > 0;
    });
  }
  
  async getFoodBanks(): Promise<FoodBank[]> {
    return Array.from(this.foodBanks.values());
  }
  
  async getNearbyUsers(): Promise<NearbyUser[]> {
    return Array.from(this.nearbyUsers.values());
  }
  
  async getWasteStats(): Promise<FoodWasteStats> {
    return {
      co2Saved: 125.5,
      waterSaved: 2300,
      moneySaved: 78.9,
      wasteReduced: 15.3,
      monthlyProgress: [
        { month: "Jan", amount: 8.2 },
        { month: "Feb", amount: 7.1 },
        { month: "Mar", amount: 6.5 },
        { month: "Apr", amount: 5.9 },
        { month: "May", amount: 4.8 },
        { month: "Jun", amount: 4.2 },
      ],
      wasteBreakdown: [
        { category: "Fruits", percentage: 28 },
        { category: "Vegetables", percentage: 35 },
        { category: "Dairy", percentage: 15 },
        { category: "Meat", percentage: 12 },
        { category: "Grains", percentage: 10 },
      ],
    };
  }
  
  // User management methods
  async getUser(id: number): Promise<any | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<any | undefined> {
    return Array.from(this.users.values()).find(
      user => user.username === username
    );
  }
  
  async createUser(userData: any): Promise<any> {
    const newUser = {
      id: this.currentUserId++,
      ...userData
    };
    this.users.set(newUser.id, newUser);
    return newUser;
  }
}

// Ensure sample data matches the schema types
const typedSampleFoodBanks = sampleFoodBanks.map(bank => ({
  name: bank.name,
  distance: bank.distance,
  openHours: bank.openHours,
  description: bank.description
}));

const typedSampleNearbyUsers = sampleNearbyUsers.map(user => ({
  name: user.name,
  distance: user.distance,
  rating: user.rating,
  imageUrl: user.imageUrl
}));

const typedSampleRecipes = sampleRecipes.map(recipe => ({
  name: recipe.name,
  description: recipe.description,
  prepTime: recipe.prepTime,
  imageUrl: recipe.imageUrl,
  ingredients: recipe.ingredients,
  instructions: recipe.instructions,
  rating: recipe.rating
}));

// Ensure food items have the proper format for database insertion
const typedSampleFoodItems = sampleFoodItems.map(item => ({
  name: item.name,
  category: item.category,
  quantity: item.quantity,
  unit: item.unit,
  expiryDate: item.expiryDate,
  favorite: item.favorite,
  addedDate: new Date() // Add the current date as the added date
}));

// PostgreSQL database storage implementation
export class DatabaseStorage implements IStorage {
  // Initialize with default data if needed
  private async initDatabaseIfEmpty() {
    try {
      console.log("Starting database initialization check...");
      
      // Check if tables have data
      const foodItemsCount = await db.select({ count: sql<number>`count(*)` }).from(foodItems);
      console.log("Food items count:", foodItemsCount[0]?.count, "Type:", typeof foodItemsCount[0]?.count);
      
      const recipesCount = await db.select({ count: sql<number>`count(*)` }).from(recipes);
      console.log("Recipes count:", recipesCount[0]?.count, "Type:", typeof recipesCount[0]?.count);
      
      const foodBanksCount = await db.select({ count: sql<number>`count(*)` }).from(foodBanks);
      console.log("Food banks count:", foodBanksCount[0]?.count, "Type:", typeof foodBanksCount[0]?.count);
      
      const nearbyUsersCount = await db.select({ count: sql<number>`count(*)` }).from(nearbyUsers);
      console.log("Nearby users count:", nearbyUsersCount[0]?.count, "Type:", typeof nearbyUsersCount[0]?.count);
      
      console.log("Should initialize food items (=== 0):", foodItemsCount[0]?.count === 0);
      console.log("Should initialize food items (Number === 0):", Number(foodItemsCount[0]?.count) === 0);
      console.log("Food items count value:", Number(foodItemsCount[0]?.count));
      
      // Initialize with sample data if empty
      // Explicitly convert to number to ensure proper comparison
      if (Number(foodBanksCount[0]?.count) === 0) {
        console.log("Inserting sample food banks...");
        try {
          console.log("Food banks data to insert:", JSON.stringify(typedSampleFoodBanks, null, 2));
          
          // Try direct SQL insertion for troubleshooting
          const client = await pool.connect();
          try {
            await client.query('BEGIN');
            
            for (const foodBank of typedSampleFoodBanks) {
              const result = await client.query(
                'INSERT INTO food_banks (name, distance, open_hours, description) VALUES ($1, $2, $3, $4) RETURNING id',
                [foodBank.name, foodBank.distance, foodBank.openHours, foodBank.description]
              );
              console.log(`Inserted food bank with ID: ${result.rows[0].id}`);
            }
            
            await client.query('COMMIT');
            console.log("Successfully inserted all food banks via direct SQL");
          } catch (sqlErr: any) {
            await client.query('ROLLBACK');
            console.error("SQL Error inserting food banks:", sqlErr);
            console.error("Detailed error:", sqlErr.stack);
          } finally {
            client.release();
          }
        } catch (err) {
          console.error("Error inserting food banks:", err);
        }
      }
      
      // Explicitly convert to number to ensure proper comparison
      if (Number(nearbyUsersCount[0]?.count) === 0) {
        console.log("Inserting sample nearby users...");
        try {
          console.log("Nearby users data to insert:", JSON.stringify(typedSampleNearbyUsers, null, 2));
          
          // Try direct SQL insertion for troubleshooting
          const client = await pool.connect();
          try {
            await client.query('BEGIN');
            
            for (const user of typedSampleNearbyUsers) {
              const result = await client.query(
                'INSERT INTO nearby_users (name, distance, rating, image_url) VALUES ($1, $2, $3, $4) RETURNING id',
                [user.name, user.distance, user.rating, user.imageUrl]
              );
              console.log(`Inserted nearby user with ID: ${result.rows[0].id}`);
            }
            
            await client.query('COMMIT');
            console.log("Successfully inserted all nearby users via direct SQL");
          } catch (sqlErr: any) {
            await client.query('ROLLBACK');
            console.error("SQL Error inserting nearby users:", sqlErr);
            console.error("Detailed error:", sqlErr.stack);
          } finally {
            client.release();
          }
        } catch (err) {
          console.error("Error inserting nearby users:", err);
        }
      }
      
      // Explicitly convert to number to ensure proper comparison
      if (Number(recipesCount[0]?.count) === 0) {
        console.log("Inserting sample recipes...");
        try {
          console.log("Recipes data to insert:", JSON.stringify(typedSampleRecipes, null, 2));
          
          // Try direct SQL insertion for troubleshooting
          const client = await pool.connect();
          try {
            await client.query('BEGIN');
            
            for (const recipe of typedSampleRecipes) {
              // Convert the JavaScript array to a PostgreSQL array string format
              const pgIngredientsArray = `{${recipe.ingredients.map(i => `"${i.replace(/"/g, '\\"')}"`).join(',')}}`;
              
              console.log(`Converting ingredients array for recipe ${recipe.name}:`, recipe.ingredients);
              console.log(`PostgreSQL array format: ${pgIngredientsArray}`);
              
              const result = await client.query(
                'INSERT INTO recipes (name, description, prep_time, image_url, ingredients, instructions, rating) VALUES ($1, $2, $3, $4, $5::text[], $6, $7) RETURNING id',
                [
                  recipe.name,
                  recipe.description,
                  recipe.prepTime,
                  recipe.imageUrl,
                  pgIngredientsArray,
                  recipe.instructions,
                  recipe.rating
                ]
              );
              console.log(`Inserted recipe with ID: ${result.rows[0].id}`);
            }
            
            await client.query('COMMIT');
            console.log("Successfully inserted all recipes via direct SQL");
          } catch (sqlErr: any) {
            await client.query('ROLLBACK');
            console.error("SQL Error inserting recipes:", sqlErr);
            console.error("Detailed error:", sqlErr.stack);
          } finally {
            client.release();
          }
        } catch (err) {
          console.error("Error inserting recipes:", err);
        }
      }
      
      // Explicitly convert to number to ensure proper comparison
      if (Number(foodItemsCount[0]?.count) === 0) {
        console.log("Inserting sample food items...");
        try {
          console.log("Food items data to insert:", JSON.stringify(typedSampleFoodItems, null, 2));
          
          // Try direct SQL insertion for troubleshooting
          const client = await pool.connect();
          try {
            await client.query('BEGIN');
            
            for (const item of typedSampleFoodItems) {
              const result = await client.query(
                'INSERT INTO food_items (name, category, quantity, unit, expiry_date, favorite, added_date) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
                [
                  item.name,
                  item.category,
                  item.quantity,
                  item.unit,
                  item.expiryDate,
                  item.favorite,
                  item.addedDate
                ]
              );
              console.log(`Inserted food item with ID: ${result.rows[0].id}`);
            }
            
            await client.query('COMMIT');
            console.log("Successfully inserted all food items via direct SQL");
          } catch (sqlErr: any) {
            await client.query('ROLLBACK');
            console.error("SQL Error inserting food items:", sqlErr);
            console.error("Detailed error:", sqlErr.stack);
          } finally {
            client.release();
          }
        } catch (err) {
          console.error("Error inserting food items:", err);
        }
      }
      
      console.log("Database initialization completed successfully");
    } catch (error) {
      console.error("Error initializing database:", error);
    }
  }
  
  public sessionStore: session.Store;
  
  constructor() {
    console.log("DatabaseStorage constructor called");
    
    // Initialize PostgreSQL session store
    this.sessionStore = new PostgresSessionStore({
      pool,
      tableName: 'session',
      createTableIfMissing: true,
      pruneSessionInterval: 60 * 15 // 15 minutes
    });
    
    // Add a small delay to ensure database connection is fully established
    setTimeout(() => {
      console.log("Starting database initialization after delay...");
      this.initDatabaseIfEmpty().catch(error => {
        console.error("Error initializing database:", error);
      });
    }, 1000);  // 1 second delay
  }

  async getFoodItems(): Promise<FoodItem[]> {
    return await db.select().from(foodItems).orderBy(asc(foodItems.expiryDate));
  }

  async getFoodItem(id: number): Promise<FoodItem | undefined> {
    const result = await db.select().from(foodItems).where(eq(foodItems.id, id));
    return result[0];
  }

  async addFoodItem(item: InsertFoodItem): Promise<FoodItem> {
    const [newItem] = await db.insert(foodItems).values(item).returning();
    return newItem;
  }

  async updateFoodItem(id: number, item: Partial<FoodItem>): Promise<FoodItem | undefined> {
    const [updatedItem] = await db
      .update(foodItems)
      .set(item)
      .where(eq(foodItems.id, id))
      .returning();
    return updatedItem;
  }

  async deleteFoodItem(id: number): Promise<boolean> {
    const result = await db
      .delete(foodItems)
      .where(eq(foodItems.id, id))
      .returning({ id: foodItems.id });
    return result.length > 0;
  }

  async getRecipes(): Promise<Recipe[]> {
    return await db.select().from(recipes);
  }

  async getRecipe(id: number): Promise<Recipe | undefined> {
    const result = await db.select().from(recipes).where(eq(recipes.id, id));
    return result[0];
  }

  async getRecipesForIngredients(ingredients: string[]): Promise<Recipe[]> {
    // For each ingredient, find recipes that contain that ingredient
    // In PostgreSQL, checking if an array contains a value can be done with the @> operator
    // But Drizzle doesn't have direct support for that, so we need to use SQL
    const recipeResults = await db.select()
      .from(recipes)
      .where(
        sql`EXISTS (
          SELECT 1 
          FROM unnest(${recipes.ingredients}) as ingredient 
          WHERE ${sql.join(
            ingredients.map(ingredient => 
              sql`ingredient ILIKE ${`%${ingredient}%`}`
            ),
            sql` OR `
          )}
        )`
      );
      
    return recipeResults;
  }

  async getFoodBanks(): Promise<FoodBank[]> {
    return await db.select().from(foodBanks);
  }

  async getNearbyUsers(): Promise<NearbyUser[]> {
    return await db.select().from(nearbyUsers);
  }

  async getWasteStats(): Promise<FoodWasteStats> {
    // Since waste stats aren't stored in the database yet, we'll return sample stats
    return {
      co2Saved: 125.5,
      waterSaved: 2300,
      moneySaved: 78.9,
      wasteReduced: 15.3,
      monthlyProgress: [
        { month: "Jan", amount: 8.2 },
        { month: "Feb", amount: 7.1 },
        { month: "Mar", amount: 6.5 },
        { month: "Apr", amount: 5.9 },
        { month: "May", amount: 4.8 },
        { month: "Jun", amount: 4.2 },
      ],
      wasteBreakdown: [
        { category: "Fruits", percentage: 28 },
        { category: "Vegetables", percentage: 35 },
        { category: "Dairy", percentage: 15 },
        { category: "Meat", percentage: 12 },
        { category: "Grains", percentage: 10 },
      ],
    };
  }
  
  // User management methods for authentication
  async getUser(id: number): Promise<any | undefined> {
    try {
      // For now we're mocking this until we add a users table
      if (id === 1) {
        return {
          id: 1,
          username: "admin",
          email: "admin@example.com"
        };
      }
      return undefined;
    } catch (error) {
      console.error("Error getting user:", error);
      return undefined;
    }
  }
  
  async getUserByUsername(username: string): Promise<any | undefined> {
    try {
      // For now we're mocking this until we add a users table
      if (username === "admin") {
        return {
          id: 1,
          username: "admin",
          email: "admin@example.com",
          password: "password" // In a real app, this would be hashed
        };
      }
      // For demo purposes, accept any username
      return {
        id: 1,
        username: username,
        email: `${username}@example.com`,
        password: "password" 
      };
    } catch (error) {
      console.error("Error getting user by username:", error);
      return undefined;
    }
  }
  
  async createUser(userData: any): Promise<any> {
    try {
      // For now we're mocking this until we add a users table
      return {
        id: 1,
        username: userData.username,
        email: userData.email
      };
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }
}

// Switch to the database storage
export const storage = new DatabaseStorage();