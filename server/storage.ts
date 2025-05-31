import pino from 'pino';
import logger from './logger';
import {
  FoodItem, InsertFoodItem, Recipe, FoodBank, NearbyUser, FoodWasteStats, User, InsertUser, // Added User, InsertUser
  foodItems, recipes, foodBanks, nearbyUsers, users as usersTable // Added usersTable
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
import connectPgSimple from "connect-pg-simple"; // Default import

const MemoryStore = createMemoryStore(session);
const PostgresSessionStore = connectPgSimple(session); // Use default import

export interface IStorage {
  // Food items
  getFoodItems(userId: number): Promise<FoodItem[]>;
  getFoodItem(id: number, userId: number): Promise<FoodItem | undefined>;
  addFoodItem(item: InsertFoodItem, userId: number): Promise<FoodItem>;
  updateFoodItem(id: number, item: Partial<FoodItem>, userId: number): Promise<FoodItem | undefined>;
  deleteFoodItem(id: number, userId: number): Promise<boolean>;
  
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
  private foodItems: Map<number, FoodItem & { userId: number }>; // Internal type includes userId
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
    logger.debug("MemStorage: Initializing with sample data...");
    // Add sample recipes
    for (const recipeData of sampleRecipes) {
      const recipe: Recipe = {
        id: this.currentRecipeId++,
        ...recipeData
      };
      this.recipes.set(recipe.id, recipe);
    }
    logger.debug({ count: this.recipes.size }, "MemStorage: Sample recipes added.");
    
    // Add sample food banks
    for (const foodBankData of sampleFoodBanks) {
      const foodBank: FoodBank = {
        id: this.currentFoodBankId++,
        ...foodBankData
      };
      this.foodBanks.set(foodBank.id, foodBank);
    }
    logger.debug({ count: this.foodBanks.size }, "MemStorage: Sample food banks added.");
    
    // Add sample nearby users
    for (const userData of sampleNearbyUsers) {
      const user: NearbyUser = {
        id: this.currentNearbyUserId++,
        ...userData
      };
      this.nearbyUsers.set(user.id, user);
    }
    logger.debug({ count: this.nearbyUsers.size }, "MemStorage: Sample nearby users added.");
    
    // Add sample food items
    // For MemStorage, let's assign all sample items to a default user (e.g., userId 1)
    // In a real scenario with DatabaseStorage, items would be tied to users upon creation.
    const defaultUserIdForSampleData = 1; 
    for (const itemData of sampleFoodItems) {
      const item: FoodItem & { userId: number } = {
        // Cast to FoodItem from shared schema might be needed if it doesn't yet include userId
        ...(itemData as Omit<FoodItem, 'id' | 'userId' | 'addedDate'>), 
        id: this.currentFoodItemId++,
        userId: defaultUserIdForSampleData, // Assign to default user
        addedDate: new Date(),
      };
      this.foodItems.set(item.id, item);
    }
    logger.debug({ count: this.foodItems.size, defaultUserIdForSampleData }, "MemStorage: Sample food items added.");
  }
  
  async getFoodItems(userId: number): Promise<FoodItem[]> {
    logger.debug({ userId }, "MemStorage: Getting food items for user");
    const userItems = Array.from(this.foodItems.values()).filter(item => item.userId === userId);
    return userItems.sort((a, b) => 
      new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
    );
  }
  
  async getFoodItem(id: number, userId: number): Promise<FoodItem | undefined> {
    logger.debug({ foodItemId: id, userId }, "MemStorage: Getting food item by ID for user");
    const item = this.foodItems.get(id);
    if (item && item.userId === userId) {
      return item;
    }
    if (item && item.userId !== userId) {
        logger.warn({ foodItemId: id, itemUserId: item.userId, requestedUserId: userId }, "MemStorage: Authorization failed - user does not own item");
    }
    return undefined;
  }
  
  async addFoodItem(item: InsertFoodItem, userId: number): Promise<FoodItem> {
    const newItem: FoodItem & { userId: number } = {
      // Cast to FoodItem from shared schema might be needed if it doesn't yet include userId
      ...(item as Omit<FoodItem, 'id' | 'userId' | 'addedDate'>),
      id: this.currentFoodItemId++,
      userId, // Assign to the provided user
      addedDate: new Date(),
    };
    this.foodItems.set(newItem.id, newItem);
    logger.info({ foodItemId: newItem.id, name: newItem.name, userId }, "MemStorage: Added new food item");
    return newItem;
  }
  
  async updateFoodItem(id: number, item: Partial<FoodItem>, userId: number): Promise<FoodItem | undefined> {
    const existingItem = this.foodItems.get(id);
    if (!existingItem) {
      logger.warn({ foodItemId: id, userId }, "MemStorage: Update failed - item not found");
      return undefined;
    }
    if (existingItem.userId !== userId) {
      logger.warn({ foodItemId: id, itemUserId: existingItem.userId, requestedUserId: userId }, "MemStorage: Update failed - user does not own item");
      return undefined; // Authorization failure
    }
    
    const updatedItem = { ...existingItem, ...item } as FoodItem & { userId: number };
    this.foodItems.set(id, updatedItem);
    logger.info({ foodItemId: id, userId }, "MemStorage: Updated food item");
    return updatedItem;
  }
  
  async deleteFoodItem(id: number, userId: number): Promise<boolean> {
    const item = this.foodItems.get(id);
    if (!item) {
      logger.warn({ foodItemId: id, userId }, "MemStorage: Delete failed - item not found");
      return false;
    }
    if (item.userId !== userId) {
      logger.warn({ foodItemId: id, itemUserId: item.userId, requestedUserId: userId }, "MemStorage: Delete failed - user does not own item");
      return false; // Authorization failure
    }
    const result = this.foodItems.delete(id);
    if (result) {
      logger.info({ foodItemId: id, userId }, "MemStorage: Deleted food item");
    } else {
      logger.warn({ foodItemId: id }, "MemStorage: Delete failed - item not found");
    }
    return result;
  }
  
  async getRecipes(): Promise<Recipe[]> {
    logger.debug("MemStorage: Getting all recipes");
    return Array.from(this.recipes.values());
  }
  
  async getRecipe(id: number): Promise<Recipe | undefined> {
    logger.debug({ recipeId: id }, "MemStorage: Getting recipe by ID");
    return this.recipes.get(id);
  }
  
  async getRecipesForIngredients(ingredients: string[]): Promise<Recipe[]> {
    logger.debug({ ingredients }, "MemStorage: Getting recipes for ingredients");
    if (!ingredients.length) {
      return [];
    }
    
    return Array.from(this.recipes.values()).filter(recipe => {
      const matchCount = ingredients.filter(ingredient => 
        recipe.ingredients.some(recipeIngredient => 
          recipeIngredient.toLowerCase().includes(ingredient.toLowerCase())
        )
      ).length;
      return matchCount > 0;
    });
  }
  
  async getFoodBanks(): Promise<FoodBank[]> {
    logger.debug("MemStorage: Getting all food banks");
    return Array.from(this.foodBanks.values());
  }
  
  async getNearbyUsers(): Promise<NearbyUser[]> {
    logger.debug("MemStorage: Getting all nearby users");
    return Array.from(this.nearbyUsers.values());
  }
  
  async getWasteStats(): Promise<FoodWasteStats> {
    logger.debug("MemStorage: Getting waste stats (sample data)");
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
  async getUser(id: number): Promise<User | undefined> {
    logger.debug({ userId: id }, "MemStorage: Getting user by ID");
    const user = this.users.get(id);
    if (user) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { hashedPassword, ...userWithoutPassword } = user;
      return userWithoutPassword as User;
    }
    return undefined;
  }
  
  async getUserByUsername(username: string): Promise<(User & { hashedPassword?: string }) | undefined> {
    logger.debug({ username }, "MemStorage: Getting user by username");
    // This will return the user with hashedPassword for auth purposes
    return Array.from(this.users.values()).find(
      user => user.username === username
    );
  }
  
  async createUser(userData: InsertUser): Promise<User> {
    // MemStorage createUser needs to handle the InsertUser type which includes hashedPassword
    const newId = this.currentUserId++;
    const newUser = {
      id: newId,
      username: userData.username,
      email: userData.email,
      hashedPassword: userData.hashedPassword, // Store the hash
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(newId, newUser);
    logger.info({ userId: newUser.id, username: newUser.username }, "MemStorage: Created new user");
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { hashedPassword, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
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
      logger.info("DatabaseStorage: Starting database initialization check...");
      
      // Check if tables have data
      const foodItemsCountResult = await db.select({ count: sql<number>`count(*)` }).from(foodItems);
      const foodItemsCount = Number(foodItemsCountResult[0]?.count);
      logger.debug({ count: foodItemsCount }, "DatabaseStorage: Food items count fetched");
      
      const recipesCountResult = await db.select({ count: sql<number>`count(*)` }).from(recipes);
      const recipesCount = Number(recipesCountResult[0]?.count);
      logger.debug({ count: recipesCount }, "DatabaseStorage: Recipes count fetched");
      
      const foodBanksCountResult = await db.select({ count: sql<number>`count(*)` }).from(foodBanks);
      const foodBanksCount = Number(foodBanksCountResult[0]?.count);
      logger.debug({ count: foodBanksCount }, "DatabaseStorage: Food banks count fetched");
      
      const nearbyUsersCountResult = await db.select({ count: sql<number>`count(*)` }).from(nearbyUsers);
      const nearbyUsersCount = Number(nearbyUsersCountResult[0]?.count);
      logger.debug({ count: nearbyUsersCount }, "DatabaseStorage: Nearby users count fetched");
      
      // Initialize with sample data if empty
      if (foodBanksCount === 0) {
        logger.info("DatabaseStorage: Inserting sample food banks...");
        // Using Drizzle ORM insert (safer and more abstract than direct SQL)
        try {
          await db.insert(foodBanks).values(typedSampleFoodBanks).execute();
          logger.info("DatabaseStorage: Successfully inserted sample food banks via Drizzle.");
        } catch (err: any) {
          logger.error({ error: err.message, stack: err.stack }, "DatabaseStorage: Error inserting sample food banks via Drizzle");
        }
      }
      
      if (nearbyUsersCount === 0) {
        logger.info("DatabaseStorage: Inserting sample nearby users...");
        try {
          await db.insert(nearbyUsers).values(typedSampleNearbyUsers).execute();
          logger.info("DatabaseStorage: Successfully inserted sample nearby users via Drizzle.");
        } catch (err: any) {
          logger.error({ error: err.message, stack: err.stack }, "DatabaseStorage: Error inserting sample nearby users via Drizzle");
        }
      }
      
      if (recipesCount === 0) {
        logger.info("DatabaseStorage: Inserting sample recipes...");
        try {
          // Drizzle requires ingredients to be explicitly typed as text[] for PostgreSQL
          const recipesToInsert = typedSampleRecipes.map(r => ({
            ...r,
            // Drizzle handles array conversion, no need for manual pg array string
          }));
          await db.insert(recipes).values(recipesToInsert).execute();
          logger.info("DatabaseStorage: Successfully inserted sample recipes via Drizzle.");
        } catch (err: any) {
          logger.error({ error: err.message, stack: err.stack }, "DatabaseStorage: Error inserting sample recipes via Drizzle");
        }
      }
      
      if (foodItemsCount === 0) {
        logger.info("DatabaseStorage: Inserting sample food items...");
        try {
          await db.insert(foodItems).values(typedSampleFoodItems).execute();
          logger.info("DatabaseStorage: Successfully inserted sample food items via Drizzle.");
        } catch (err: any) {
          logger.error({ error: err.message, stack: err.stack }, "DatabaseStorage: Error inserting sample food items via Drizzle");
        }
      }
      
      logger.info("DatabaseStorage: Database initialization completed successfully");
    } catch (error: any) {
      logger.error({ error: error.message, stack: error.stack }, "DatabaseStorage: Error during database initialization");
    }
  }
  
  public sessionStore: session.Store;
  
  constructor() {
    logger.info("DatabaseStorage: Constructor called, initializing session store and checking DB.");
    
    // Initialize PostgreSQL session store
    this.sessionStore = new PostgresSessionStore({
      pool,
      tableName: 'session',
      createTableIfMissing: true, // Ensure table is created if it doesn't exist
      pruneSessionInterval: 60 * 15, // Prune expired sessions every 15 minutes
      errorLog: (err: any) => { // Pass logger to session store for its errors
        logger.error({ error: err.message, stack: err.stack, source: 'connect-pg-simple' }, "Error from session store");
      }
    });
    logger.info("DatabaseStorage: PostgreSQL session store configured.");
    
    // Add a small delay to ensure database connection is fully established
    // and to avoid issues if the app starts too quickly in some environments.
    // Also, ensure sample data in DB gets a userId if initDatabaseIfEmpty runs for the first time.
    // This is complex as initDatabaseIfEmpty doesn't know about users.
    // For now, sample data added by initDatabaseIfEmpty won't have userId and will be inaccessible
    // unless manually updated or if routes allow admin access to all items.
    // This is a limitation of the current sample data approach.
    setTimeout(() => {
      logger.debug("DatabaseStorage: Starting database initialization after delay...");
      this.initDatabaseIfEmpty().catch(error => {
        // This catch is for unhandled promise rejection from initDatabaseIfEmpty itself
        logger.error({ error: error.message, stack: error.stack }, "DatabaseStorage: Unhandled error from initDatabaseIfEmpty promise");
      });
    }, 1000);  // 1 second delay, can be adjusted or made conditional
  }

  async getFoodItems(userId: number): Promise<FoodItem[]> {
    logger.debug({ userId }, "DatabaseStorage: Getting food items for user");
    return await db.select().from(foodItems).where(eq(foodItems.userId, userId)).orderBy(asc(foodItems.expiryDate));
  }

  async getFoodItem(id: number, userId: number): Promise<FoodItem | undefined> {
    logger.debug({ foodItemId: id, userId }, "DatabaseStorage: Getting food item by ID for user");
    // Ensure userId is part of the where clause for authorization
    const result = await db.select().from(foodItems).where(
      sql`${foodItems.id} = ${id} AND ${foodItems.userId} = ${userId}`
    );
    return result[0];
  }

  async addFoodItem(item: InsertFoodItem, userId: number): Promise<FoodItem> {
    logger.debug({ userId, itemName: item.name }, "DatabaseStorage: Adding food item for user");
    // Ensure the 'item' type matches what 'foodItems' table expects,
    // and that 'userId' is correctly included.
    // The 'insertFoodItemSchema' might not include 'userId' if it's server-assigned.
    const itemToInsert = { ...item, userId };
    const [newItem] = await db.insert(foodItems).values(itemToInsert).returning();
    logger.info({ foodItemId: newItem.id, userId }, "DatabaseStorage: Added new food item");
    return newItem;
  }

  async updateFoodItem(id: number, item: Partial<FoodItem>, userId: number): Promise<FoodItem | undefined> {
    logger.debug({ foodItemId: id, userId, itemData: item }, "DatabaseStorage: Updating food item for user");
    // To ensure user can only update their own items, we must include userId in the where clause.
    const [updatedItem] = await db
      .update(foodItems)
      .set(item)
      .where(sql`${foodItems.id} = ${id} AND ${foodItems.userId} = ${userId}`)
      .returning();
    
    if (!updatedItem) {
        logger.warn({ foodItemId: id, userId }, "DatabaseStorage: Update failed - item not found or user does not own item.");
        return undefined;
    }
    logger.info({ foodItemId: id, userId }, "DatabaseStorage: Updated food item");
    return updatedItem;
  }

  async deleteFoodItem(id: number, userId: number): Promise<boolean> {
    logger.debug({ foodItemId: id, userId }, "DatabaseStorage: Deleting food item for user");
    // To ensure user can only delete their own items, we must include userId in the where clause.
    const result = await db
      .delete(foodItems)
      .where(sql`${foodItems.id} = ${id} AND ${foodItems.userId} = ${userId}`)
      .returning({ id: foodItems.id });
    
    const success = result.length > 0;
    if (success) {
      logger.info({ foodItemId: id, userId }, "DatabaseStorage: Deleted food item");
    } else {
      logger.warn({ foodItemId: id, userId }, "DatabaseStorage: Delete failed - item not found or user does not own item.");
    }
    return success;
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
  async getUser(id: number): Promise<User | undefined> {
    const requestId = 'storage-getUser'; // Placeholder for actual request ID if available
    try {
      logger.debug({ requestId, userId: id }, "DatabaseStorage: Getting user by ID");
      const result = await db.select({
        id: usersTable.id,
        username: usersTable.username,
        email: usersTable.email,
        createdAt: usersTable.createdAt,
        updatedAt: usersTable.updatedAt,
      }).from(usersTable).where(eq(usersTable.id, id)).limit(1);
      return result[0];
    } catch (error: any) {
      logger.error({ requestId, userId: id, error: error.message, stack: error.stack }, "DatabaseStorage: Error getting user by ID");
      throw new Error("Error fetching user from database.");
    }
  }
  
  async getUserByUsername(username: string): Promise<(User & { hashedPassword?: string }) | undefined> {
    const requestId = 'storage-getUserByUsername';
    try {
      logger.debug({ requestId, username }, "DatabaseStorage: Getting user by username");
      // Select hashedPassword here for authentication purposes
      const result = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
      return result[0] as (User & { hashedPassword?: string }) | undefined;
    } catch (error: any) {
      logger.error({ requestId, username, error: error.message, stack: error.stack }, "DatabaseStorage: Error getting user by username");
      throw new Error("Error fetching user from database.");
    }
  }
  
  async createUser(userData: InsertUser): Promise<User> {
    const requestId = 'storage-createUser';
    try {
      logger.info({ requestId, username: userData.username, email: userData.email }, "DatabaseStorage: Creating user");
      // userData should include hashedPassword already
      const [newUser] = await db.insert(usersTable).values(userData).returning({
        id: usersTable.id,
        username: usersTable.username,
        email: usersTable.email,
        createdAt: usersTable.createdAt,
        updatedAt: usersTable.updatedAt,
      });
      logger.info({ requestId, userId: newUser.id, username: newUser.username }, "DatabaseStorage: User created successfully");
      return newUser;
    } catch (error: any) {
      logger.error({ requestId, username: userData.username, error: error.message, stack: error.stack }, "DatabaseStorage: Error creating user");
      // Check for unique constraint errors (e.g., username or email already exists)
      if (error.message && (error.message.includes('duplicate key value violates unique constraint "users_username_unique"') || error.message.includes('UNIQUE constraint failed: users.username'))) {
        throw new Error("Username already exists.");
      }
      if (error.message && (error.message.includes('duplicate key value violates unique constraint "users_email_unique"') || error.message.includes('UNIQUE constraint failed: users.email'))) {
        throw new Error("Email already exists.");
      }
      throw new Error("Error creating user in database.");
    }
  }
}

// Switch to the database storage
export const storage = new DatabaseStorage();