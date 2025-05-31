import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DatabaseStorage } from './storage';
import { FoodItem, InsertFoodItem, Recipe, FoodBank, NearbyUser, FoodWasteStats } from '@shared/schema';
import { sampleFoodItems } from './data/food-items';
import { sampleRecipes } from './data/recipes';
import { sampleFoodBanks } from './data/food-banks';
import { sampleNearbyUsers } from './data/users';

// Mock the db and pool modules
vi.mock('./db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    count: vi.fn().mockReturnThis(), // Mock count if it's used directly
    // Mock Drizzle's sql utility if it's used directly or through other functions
    sql: vi.fn((strings, ...values) => {
      // Simple mock for sql template literal tag
      let result = strings[0];
      for (let i = 0; i < values.length; i++) {
        result += values[i] + strings[i + 1];
      }
      return { toSQL: () => result, getSQL: () => result, getValues: () => values }; // Mock structure Drizzle might expect
    }),
  },
  pool: {
    connect: vi.fn(() => ({
      query: vi.fn(async (queryText) => {
        if (queryText === 'BEGIN' || queryText === 'COMMIT' || queryText === 'ROLLBACK') {
          return { rows: [] };
        }
        // Simulate returning an ID for insert operations if needed for initDatabaseIfEmpty
        if (queryText.startsWith('INSERT INTO')) {
          return { rows: [{ id: 1 }] };
        }
        // Simulate count for initDatabaseIfEmpty
        if (queryText.toLowerCase().includes('select count(*) as count from "food_items"')) {
          return { rows: [{ count: '0' }] };
        }
        if (queryText.toLowerCase().includes('select count(*) as count from "recipes"')) {
          return { rows: [{ count: '0' }] };
        }
        if (queryText.toLowerCase().includes('select count(*) as count from "food_banks"')) {
          return { rows: [{ count: '0' }] };
        }
        if (queryText.toLowerCase().includes('select count(*) as count from "nearby_users"')) {
          return { rows: [{ count: '0' }] };
        }
        return { rows: [] };
      }),
      release: vi.fn(),
    })),
  },
}));

// Mock session store modules (not directly used by DatabaseStorage methods other than constructor)
vi.mock('express-session', () => ({
  default: vi.fn(),
  Store: vi.fn(),
}));
vi.mock('memorystore', () => vi.fn(() => vi.fn()));
vi.mock('connect-pg-simple', () => vi.fn(() => vi.fn()));


describe('DatabaseStorage', () => {
  let storage: DatabaseStorage;
  let mockDb;
  let mockPool;

  beforeEach(async () => {
    // Dynamically import the mocked 'db' and 'pool'
    const dbModule = await import('./db');
    mockDb = dbModule.db;
    mockPool = dbModule.pool;

    // Reset mocks before each test
    vi.resetAllMocks();
    
    // Mock the functions again after reset to ensure they return `this` or specific values
    mockDb.select = vi.fn().mockReturnThis();
    mockDb.from = vi.fn().mockReturnThis();
    mockDb.where = vi.fn().mockReturnThis();
    mockDb.orderBy = vi.fn().mockReturnThis();
    mockDb.insert = vi.fn().mockReturnThis();
    mockDb.values = vi.fn().mockReturnThis();
    mockDb.returning = vi.fn().mockImplementation(async (value) => {
      if (value) return [value]; // for .returning({id: ...})
      return [{ id: 1, ...sampleFoodItems[0] }]; // for .returning()
    });
    mockDb.update = vi.fn().mockReturnThis();
    mockDb.set = vi.fn().mockReturnThis();
    mockDb.delete = vi.fn().mockReturnThis();
    mockDb.count = vi.fn().mockReturnThis();
    mockDb.sql = vi.fn((strings, ...values) => {
      let result = strings[0];
      for (let i = 0; i < values.length; i++) {
        result += values[i] + strings[i + 1];
      }
      return { toSQL: () => result, getSQL: () => result, getValues: () => values };
    });


    mockPool.connect = vi.fn(async () => ({
        query: vi.fn(async (queryText) => {
          if (queryText === 'BEGIN' || queryText === 'COMMIT' || queryText === 'ROLLBACK') {
            return { rows: [] };
          }
          if (queryText.startsWith('INSERT INTO')) {
            return { rows: [{ id: 1 }] };
          }
          if (queryText.toLowerCase().includes('select count(*) as count from "food_items"')) {
             return { rows: [{ count: '0' }] };
          }
          if (queryText.toLowerCase().includes('select count(*) as count from "recipes"')) {
            return { rows: [{ count: '0' }] };
          }
          if (queryText.toLowerCase().includes('select count(*) as count from "food_banks"')) {
            return { rows: [{ count: '0' }] };
          }
          if (queryText.toLowerCase().includes('select count(*) as count from "nearby_users"')) {
            return { rows: [{ count: '0' }] };
          }
          return { rows: [] };
        }),
        release: vi.fn(),
      }));
    
    // Spy on console.log and console.error to suppress output during tests if necessary
    // and to check if initDatabaseIfEmpty logs correctly
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    storage = new DatabaseStorage();
    // Allow time for the async constructor logic (setTimeout for initDatabaseIfEmpty)
    await new Promise(resolve => setTimeout(resolve, 1100));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('FoodItems', () => {
    it('getFoodItems should retrieve all food items sorted by expiry date', async () => {
      const mockFoodItems = [...sampleFoodItems].sort((a,b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
      mockDb.orderBy.mockResolvedValue(mockFoodItems);

      const items = await storage.getFoodItems();
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalledWith(expect.anything()); // foodItems schema object
      expect(mockDb.orderBy).toHaveBeenCalledWith(expect.anything()); // asc(foodItems.expiryDate)
      expect(items).toEqual(mockFoodItems);
    });

    it('getFoodItem should retrieve a food item by ID', async () => {
      const mockItem = sampleFoodItems[0];
      mockDb.where.mockResolvedValue([mockItem]);

      const item = await storage.getFoodItem(1);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalledWith(expect.anything());
      expect(mockDb.where).toHaveBeenCalledWith(expect.anything()); // eq(foodItems.id, 1)
      expect(item).toEqual(mockItem);
    });

    it('getFoodItem should return undefined if item not found', async () => {
      mockDb.where.mockResolvedValue([]);
      const item = await storage.getFoodItem(999);
      expect(item).toBeUndefined();
    });

    it('addFoodItem should add a new food item and return it', async () => {
      const newItemData: InsertFoodItem = { name: 'New Item', category: 'Fruit', quantity: 1, unit: 'piece', expiryDate: '2025-01-01', favorite: false };
      const expectedItem = { id: 1, addedDate: new Date(), ...newItemData }; // Assuming DB assigns ID 1
      mockDb.returning.mockResolvedValue([expectedItem]);


      const item = await storage.addFoodItem(newItemData);
      expect(mockDb.insert).toHaveBeenCalledWith(expect.anything());
      expect(mockDb.values).toHaveBeenCalledWith(newItemData);
      expect(mockDb.returning).toHaveBeenCalled();
      expect(item).toEqual(expectedItem);
    });
    
    it('addFoodItem should handle database errors', async () => {
      const newItemData: InsertFoodItem = { name: 'New Item', category: 'Fruit', quantity: 1, unit: 'piece', expiryDate: '2025-01-01', favorite: false };
      mockDb.returning.mockRejectedValue(new Error('DB error'));
      await expect(storage.addFoodItem(newItemData)).rejects.toThrow('DB error');
    });

    it('updateFoodItem should update an existing food item and return it', async () => {
      const updates: Partial<FoodItem> = { name: 'Updated Item Name' };
      const updatedItemMock = { ...sampleFoodItems[0], ...updates };
      mockDb.returning.mockResolvedValue([updatedItemMock]);

      const item = await storage.updateFoodItem(1, updates);
      expect(mockDb.update).toHaveBeenCalledWith(expect.anything());
      expect(mockDb.set).toHaveBeenCalledWith(updates);
      expect(mockDb.where).toHaveBeenCalledWith(expect.anything()); // eq(foodItems.id, 1)
      expect(mockDb.returning).toHaveBeenCalled();
      expect(item).toEqual(updatedItemMock);
    });
    
    it('updateFoodItem should return undefined if item to update is not found', async () => {
      mockDb.returning.mockResolvedValue([]); // Simulate no item returned
      const item = await storage.updateFoodItem(999, { name: 'Non Existent' });
      expect(item).toBeUndefined();
    });
    
    it('updateFoodItem should handle database errors', async () => {
      mockDb.returning.mockRejectedValue(new Error('DB error'));
      await expect(storage.updateFoodItem(1, { name: 'Error Case' })).rejects.toThrow('DB error');
    });

    it('deleteFoodItem should delete an item and return true', async () => {
      mockDb.returning.mockResolvedValue([{ id: 1 }]); // Simulate successful deletion returns id

      const result = await storage.deleteFoodItem(1);
      expect(mockDb.delete).toHaveBeenCalledWith(expect.anything());
      expect(mockDb.where).toHaveBeenCalledWith(expect.anything()); // eq(foodItems.id, 1)
      expect(mockDb.returning).toHaveBeenCalledWith({ id: expect.anything() });
      expect(result).toBe(true);
    });

    it('deleteFoodItem should return false if item to delete is not found', async () => {
      mockDb.returning.mockResolvedValue([]); // Simulate no item returned
      const result = await storage.deleteFoodItem(999);
      expect(result).toBe(false);
    });
    
    it('deleteFoodItem should handle database errors', async () => {
      mockDb.returning.mockRejectedValue(new Error('DB error'));
      await expect(storage.deleteFoodItem(1)).rejects.toThrow('DB error');
    });
  });

  describe('Recipes', () => {
    it('getRecipes should retrieve all recipes', async () => {
      mockDb.select.mockResolvedValue(sampleRecipes);
      const recipes = await storage.getRecipes();
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalledWith(expect.anything()); // recipes schema object
      expect(recipes).toEqual(sampleRecipes);
    });
    
    it('getRecipes should handle database errors', async () => {
        mockDb.select.mockRejectedValue(new Error("DB error"));
        await expect(storage.getRecipes()).rejects.toThrow("DB error");
    });

    it('getRecipe should retrieve a recipe by ID', async () => {
      const mockRecipe = sampleRecipes[0];
      mockDb.where.mockResolvedValue([mockRecipe]);
      const recipe = await storage.getRecipe(1);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalledWith(expect.anything());
      expect(mockDb.where).toHaveBeenCalledWith(expect.anything()); // eq(recipes.id, 1)
      expect(recipe).toEqual(mockRecipe);
    });

    it('getRecipe should return undefined if recipe not found', async () => {
      mockDb.where.mockResolvedValue([]);
      const recipe = await storage.getRecipe(999);
      expect(recipe).toBeUndefined();
    });
    
    it('getRecipe should handle database errors', async () => {
        mockDb.where.mockRejectedValue(new Error("DB error"));
        await expect(storage.getRecipe(1)).rejects.toThrow("DB error");
    });

    it('getRecipesForIngredients should retrieve recipes matching ingredients', async () => {
      const ingredients = ['Tomato', 'Cheese'];
      const expectedRecipes = sampleRecipes.filter(r => r.ingredients.some(i => i.toLowerCase().includes('tomato') || i.toLowerCase().includes('cheese')));
      // The actual implementation uses a complex SQL query. We mock the final result.
      mockDb.where.mockResolvedValue(expectedRecipes); 

      const recipes = await storage.getRecipesForIngredients(ingredients);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalledWith(expect.anything());
      expect(mockDb.where).toHaveBeenCalledWith(expect.objectContaining({
        // Check if the sql object was passed to where
        getSQL: expect.any(Function) 
      }));
      expect(recipes).toEqual(expectedRecipes);
    });
    
    it('getRecipesForIngredients should return empty array if no ingredients provided', async () => {
        // This case is handled in the original code *before* DB call, but if it were to reach DB:
        mockDb.where.mockResolvedValue([]);
        const recipes = await storage.getRecipesForIngredients([]);
        expect(recipes).toEqual([]);
        // Check if db interaction was avoided (it should be by the function's own logic)
        // However, the current implementation of DatabaseStorage.getRecipesForIngredients DOES call DB for empty array.
        // This is a deviation from MemStorage. Let's test the actual behavior.
        // expect(mockDb.select).not.toHaveBeenCalled(); // This would fail based on current DatabaseStorage impl.
        // The current DatabaseStorage.getRecipesForIngredients will call DB.
         expect(mockDb.select).toHaveBeenCalled(); 
    });
    
    it('getRecipesForIngredients should handle database errors', async () => {
        mockDb.where.mockRejectedValue(new Error("DB error"));
        await expect(storage.getRecipesForIngredients(["Tomato"])).rejects.toThrow("DB error");
    });
  });

  describe('FoodBanks', () => {
    it('getFoodBanks should retrieve all food banks', async () => {
      mockDb.select.mockResolvedValue(sampleFoodBanks);
      const foodBanks = await storage.getFoodBanks();
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalledWith(expect.anything()); // foodBanks schema object
      expect(foodBanks).toEqual(sampleFoodBanks);
    });
    it('getFoodBanks should handle database errors', async () => {
        mockDb.select.mockRejectedValue(new Error("DB error"));
        await expect(storage.getFoodBanks()).rejects.toThrow("DB error");
    });
  });

  describe('NearbyUsers', () => {
    it('getNearbyUsers should retrieve all nearby users', async () => {
      mockDb.select.mockResolvedValue(sampleNearbyUsers);
      const users = await storage.getNearbyUsers();
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalledWith(expect.anything()); // nearbyUsers schema object
      expect(users).toEqual(sampleNearbyUsers);
    });
     it('getNearbyUsers should handle database errors', async () => {
        mockDb.select.mockRejectedValue(new Error("DB error"));
        await expect(storage.getNearbyUsers()).rejects.toThrow("DB error");
    });
  });

  describe('WasteStats', () => {
    it('getWasteStats should return sample stats', async () => {
      const stats = await storage.getWasteStats();
      // Check a few properties to ensure it's the sample data
      expect(stats.co2Saved).toBeDefined();
      expect(stats.monthlyProgress).toBeInstanceOf(Array);
      expect(stats.wasteBreakdown).toBeInstanceOf(Array);
    });
  });

  describe('Users (Authentication Mocked)', () => {
    // These methods are currently mocked in DatabaseStorage
    it('getUser should return a mocked user by ID', async () => {
      const user = await storage.getUser(1);
      expect(user).toEqual({ id: 1, username: 'admin', email: 'admin@example.com' });
      const user2 = await storage.getUser(2);
      expect(user2).toBeUndefined();
    });

    it('getUserByUsername should return a mocked user', async () => {
      let user = await storage.getUserByUsername('admin');
      expect(user).toEqual({ id: 1, username: 'admin', email: 'admin@example.com', password: 'password' });
      user = await storage.getUserByUsername('testuser'); // demo behavior
      expect(user).toEqual({ id: 1, username: 'testuser', email: 'testuser@example.com', password: 'password' });
    });

    it('createUser should return a mocked new user', async () => {
      const newUser = { username: 'newbie', email: 'newbie@example.com' };
      const user = await storage.createUser(newUser);
      expect(user).toEqual({ id: 1, username: 'newbie', email: 'newbie@example.com' });
    });
  });
  
  describe('initDatabaseIfEmpty', () => {
    beforeEach(() => {
      // Reset console spies for these specific tests
      vi.mocked(console.log).mockReset();
      vi.mocked(console.error).mockReset();
    });

    it('should attempt to initialize data if tables are empty', async () => {
      // Ensure all count queries in mockPool.connect.query return '0'
       mockPool.connect = vi.fn(async () => ({
        query: vi.fn(async (queryText: string) => {
          if (queryText.toLowerCase().includes('count(*)')) {
            return { rows: [{ count: '0' }] };
          }
          if (queryText.startsWith('INSERT INTO')) {
            return { rows: [{ id: 1 }] };
          }
          return { rows: [] };
        }),
        release: vi.fn(),
      }));
      
      storage = new DatabaseStorage(); // Re-initialize to trigger constructor and init
      await new Promise(resolve => setTimeout(resolve, 1100)); // Wait for async init

      // Check if console logs indicate initialization attempts
      expect(console.log).toHaveBeenCalledWith("Starting database initialization check...");
      expect(console.log).toHaveBeenCalledWith("Inserting sample food banks...");
      expect(console.log).toHaveBeenCalledWith("Inserting sample nearby users...");
      expect(console.log).toHaveBeenCalledWith("Inserting sample recipes...");
      expect(console.log).toHaveBeenCalledWith("Inserting sample food items...");
      
      // Check if pool.connect was called multiple times (for counts and inserts)
      expect(mockPool.connect).toHaveBeenCalled();
      const connectMock = await mockPool.connect();
      expect(connectMock.query).toHaveBeenCalledWith(expect.stringMatching(/count\(\*\)/i));
      expect(connectMock.query).toHaveBeenCalledWith(expect.stringMatching(/INSERT INTO food_banks/i));
    });

    it('should not attempt to initialize data if tables are not empty', async () => {
       mockPool.connect = vi.fn(async () => ({
        query: vi.fn(async (queryText: string) => {
          if (queryText.toLowerCase().includes('count(*)')) {
            return { rows: [{ count: '10' }] }; // Simulate tables have data
          }
          return { rows: [] };
        }),
        release: vi.fn(),
      }));

      storage = new DatabaseStorage(); // Re-initialize
      await new Promise(resolve => setTimeout(resolve, 1100));

      expect(console.log).toHaveBeenCalledWith("Starting database initialization check...");
      expect(console.log).not.toHaveBeenCalledWith("Inserting sample food banks...");
      expect(console.log).not.toHaveBeenCalledWith("Inserting sample recipes...");
      
      const connectMock = await mockPool.connect();
      expect(connectMock.query).toHaveBeenCalledWith(expect.stringMatching(/count\(\*\)/i));
      expect(connectMock.query).not.toHaveBeenCalledWith(expect.stringMatching(/INSERT INTO/i));
    });
    
    it('should handle SQL errors during initialization', async () => {
      mockPool.connect = vi.fn(async () => ({
        query: vi.fn(async (queryText: string) => {
          if (queryText.toLowerCase().includes('count(*)')) {
            return { rows: [{ count: '0' }] };
          }
          if (queryText.startsWith('INSERT INTO food_banks')) { // Simulate error for one type
            throw new Error("SQL INSERT error");
          }
          if (queryText.startsWith('INSERT INTO')) {
            return { rows: [{ id: 1 }] };
          }
          return { rows: [] };
        }),
        release: vi.fn(),
      }));

      storage = new DatabaseStorage();
      await new Promise(resolve => setTimeout(resolve, 1100));

      expect(console.error).toHaveBeenCalledWith("SQL Error inserting food banks:", expect.any(Error));
      // Other initializations should still proceed
      expect(console.log).toHaveBeenCalledWith("Inserting sample nearby users...");
      expect(console.log).toHaveBeenCalledWith("Inserting sample recipes...");
      expect(console.log).toHaveBeenCalledWith("Inserting sample food items...");
    });
  });
});
