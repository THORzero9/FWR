import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import http from 'http';
import { createApp } from './index'; // Assuming createApp is exported from server/index.ts
import { IStorage, MemStorage } from './storage'; // Using MemStorage for testing or a mocked version
import { FoodItem, InsertFoodItem, Recipe, UserCredentials } from '@shared/schema';
import { sampleFoodItems } from './data/food-items';
import { sampleRecipes } from './data/recipes';

// Mock the actual storage implementation used by routes
// We will replace it with MemStorage or a fully controlled mock
vi.mock('./storage', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    storage: new MemStorage(), // Use MemStorage for predictable test data and behavior
  };
});

describe('API Endpoints Integration Tests', () => {
  let app: Express;
  let server: http.Server;
  let agent: request.SuperTest<request.Test>;
  let testStorage: IStorage;

  beforeAll(async () => {
    // Dynamically import the storage to get the instance used by the app (which is now MemStorage)
    const storageModule = await import('./storage');
    testStorage = storageModule.storage; // This is the MemStorage instance

    const appCreation = await createApp();
    app = appCreation.app;
    server = appCreation.server;
    agent = request.agent(app); // Use agent to persist cookies for auth tests
  });

  afterAll((done) => {
    server.close(done);
  });

  beforeEach(async () => {
    // Reset MemStorage before each test
    // This involves re-running its constructor which re-initializes users and sample data (associated with admin user ID 1)
    await (testStorage as MemStorage).constructor(); 
    
    // It's important that MemStorage is clean for each test.
    // The constructor of MemStorage adds a default 'admin' user (ID 1) and sample food items for this user.
    // We need to ensure that any items potentially added by other tests are cleared.
    // The constructor re-initializes `this.foodItems = new Map()`, so that should be fine.
    // However, the old test logic of manually deleting and re-adding items needs to be userId-aware.
    // For simplicity, we'll rely on the MemStorage constructor to provide a clean slate with its default admin user and items.
  });
  
  // Helper to login a user and preserve the session cookie
  // Returns the agent and the logged-in user's ID
  const loginUser = async (credentials: UserCredentials = { username: 'admin', password: 'password' }): Promise<{ agent: request.SuperTest<request.Test>, userId: number }> => {
    let user = await testStorage.getUserByUsername(credentials.username);
    if (!user) {
       // If user doesn't exist, create them. This is important for creating multiple users for tests.
       // Ensure password is provided for creation, even if it's a mock one.
       const userPassword = credentials.password || 'password'; // Default password if not provided
       user = await testStorage.createUser({
         username: credentials.username, 
         password: userPassword, // MemStorage's createUser doesn't hash, but auth flow does
         email: `${credentials.username}@example.com`,
         // Ensure createUser in MemStorage assigns an ID and returns it.
         // For this test, we'll assume 'admin' user (ID 1) exists due to MemStorage constructor.
         // If creating other users, their IDs will be different.
       });
    }

    const res = await agent.post('/api/login').send(credentials);
    expect(res.statusCode).toBe(200);
    expect(res.body.id).toBeDefined(); // Ensure login response includes user ID
    return { agent, userId: res.body.id as number };
  };


  describe('Authentication Routes', () => {
    it('POST /api/register - should register a new user', async () => {
      const newUser = { username: 'testuser', email: 'test@example.com', password: 'password123' };
      const res = await agent.post('/api/register').send(newUser);
      expect(res.statusCode).toBe(201);
      expect(res.body.message).toBe('User registered successfully');
      // Check if user is in storage (optional, as it's an integration test)
      const user = await testStorage.getUserByUsername(newUser.username);
      expect(user).toBeDefined();
      expect(user?.email).toBe(newUser.email);
    });

    it('POST /api/login - should login an existing user', async () => {
      // Assumes 'admin' user exists from MemStorage initialization
      const credentials = { username: 'admin', password: 'password' };
      const res = await agent.post('/api/login').send(credentials);
      expect(res.statusCode).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.username).toBe(credentials.username);
      expect(res.headers['set-cookie']).toBeDefined(); // Session cookie should be set
    });

    it('POST /api/login - should fail with invalid credentials', async () => {
      const credentials = { username: 'admin', password: 'wrongpassword' };
      const res = await agent.post('/api/login').send(credentials);
      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe('Invalid username or password');
    });

    it('GET /api/user - should return current user if authenticated', async () => {
      await loginUser(); // Logs in 'admin'
      const res = await agent.get('/api/user');
      expect(res.statusCode).toBe(200);
      expect(res.body.username).toBe('admin');
    });

    it('GET /api/user - should return 401 if not authenticated', async () => {
      const newAgent = request.agent(app); // Fresh agent, no cookies
      const res = await newAgent.get('/api/user');
      expect(res.statusCode).toBe(401);
    });

    it('POST /api/logout - should logout an authenticated user', async () => {
      await loginUser();
      const res = await agent.post('/api/logout').send();
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Logged out successfully');

      // Verify user is logged out
      const userRes = await agent.get('/api/user');
      expect(userRes.statusCode).toBe(401);
    });
  });

  describe('Food Items API (/api/food-items)', () => {
    let userAagent: request.SuperTest<request.Test>;
    let userAId: number;
    let userBagent: request.SuperTest<request.Test>; // For multi-user tests
    let userBId: number;

    // Sample items to be created by users
    const itemDataUserA: InsertFoodItem = { name: 'Apple A', category: 'Fruit', quantity: 5, unit: 'pcs', expiryDate: new Date(), favorite: false };
    const itemDataUserB: InsertFoodItem = { name: 'Banana B', category: 'Fruit', quantity: 3, unit: 'pcs', expiryDate: new Date(), favorite: true };

    beforeEach(async () => {
      // Login User A (admin, ID 1 from MemStorage default)
      const { agent: agentA, userId: idA } = await loginUser({ username: 'admin', password: 'password' });
      userAagent = agentA;
      userAId = idA;

      // Create and Login User B
      // Ensure User B is created in MemStorage if not existing
      let userB = await testStorage.getUserByUsername('userB');
      if (!userB) {
        userB = await testStorage.createUser({ username: 'userB', email: 'userB@example.com', password: 'passwordB' }); // MemStorage createUser
      }
      userBId = userB.id; // Get userB's ID
      
      // Create a new agent for User B to have a separate session
      const agentB_fresh = request.agent(app); // Use a fresh agent
      const loginResB = await agentB_fresh.post('/api/login').send({ username: 'userB', password: 'passwordB' });
      expect(loginResB.statusCode).toBe(200);
      userBagent = agentB_fresh;


      // Clear any items that might have been added by MemStorage's constructor for admin
      // This is important because MemStorage now auto-adds items for userId 1
      const adminItems = await testStorage.getFoodItems(userAId);
      for (const item of adminItems) {
        await testStorage.deleteFoodItem(item.id, userAId);
      }
    });

    it('GET /api/food-items - should return only items for the authenticated user', async () => {
      // User A adds an item
      const resA = await userAagent.post('/api/food-items').send(itemDataUserA);
      expect(resA.statusCode).toBe(201);

      // User B adds an item
      const resB = await userBagent.post('/api/food-items').send(itemDataUserB);
      expect(resB.statusCode).toBe(201);
      
      // User A gets items
      const getResA = await userAagent.get('/api/food-items');
      expect(getResA.statusCode).toBe(200);
      expect(getResA.body.length).toBe(1);
      expect(getResA.body[0].name).toBe(itemDataUserA.name);
      expect(getResA.body[0].userId).toBe(userAId);

      // User B gets items
      const getResB = await userBagent.get('/api/food-items');
      expect(getResB.statusCode).toBe(200);
      expect(getResB.body.length).toBe(1);
      expect(getResB.body[0].name).toBe(itemDataUserB.name);
      expect(getResB.body[0].userId).toBe(userBId);
    });
    
    it('GET /api/food-items - should return 401 if not authenticated', async () => {
      const unauthenticatedAgent = request.agent(app); // Fresh agent, no login
      const res = await unauthenticatedAgent.get('/api/food-items');
      expect(res.statusCode).toBe(401);
    });

    it('POST /api/food-items - should create an item associated with the authenticated user', async () => {
      const res = await userAagent.post('/api/food-items').send(itemDataUserA);
      expect(res.statusCode).toBe(201);
      expect(res.body.name).toBe(itemDataUserA.name);
      expect(res.body.userId).toBe(userAId); // Check if userId is correctly associated

      // Verify in storage
      const itemInDb = await testStorage.getFoodItem(res.body.id, userAId);
      expect(itemInDb).toBeDefined();
      expect(itemInDb?.userId).toBe(userAId);
    });
    
    it('GET /api/food-items/:id - should return item if owned by user, 404 otherwise', async () => {
      // User A creates an item
      const postResA = await userAagent.post('/api/food-items').send(itemDataUserA);
      const itemAId = postResA.body.id;

      // User A can get their item
      let getRes = await userAagent.get(`/api/food-items/${itemAId}`);
      expect(getRes.statusCode).toBe(200);
      expect(getRes.body.id).toBe(itemAId);

      // User B cannot get User A's item
      getRes = await userBagent.get(`/api/food-items/${itemAId}`);
      expect(getRes.statusCode).toBe(404); // Or 403, but 404 is common for "not found or not authorized"
    });
    
    it('PATCH /api/food-items/:id - should update item if owned by user, 404 otherwise', async () => {
      const postResA = await userAagent.post('/api/food-items').send(itemDataUserA);
      const itemAId = postResA.body.id;
      const updateData = { name: "Updated Apple A" };

      // User A can update their item
      let patchRes = await userAagent.patch(`/api/food-items/${itemAId}`).send(updateData);
      expect(patchRes.statusCode).toBe(200);
      expect(patchRes.body.name).toBe(updateData.name);

      // User B cannot update User A's item
      patchRes = await userBagent.patch(`/api/food-items/${itemAId}`).send({ name: "User B trying to update" });
      expect(patchRes.statusCode).toBe(404);
    });

    it('DELETE /api/food-items/:id - should delete item if owned by user, 404 otherwise', async () => {
      const postResA = await userAagent.post('/api/food-items').send(itemDataUserA);
      const itemAId = postResA.body.id;
      
      const postResB = await userBagent.post('/api/food-items').send(itemDataUserB);
      const itemBId = postResB.body.id;


      // User B cannot delete User A's item
      let deleteRes = await userBagent.delete(`/api/food-items/${itemAId}`);
      expect(deleteRes.statusCode).toBe(404);

      // User A can delete their item
      deleteRes = await userAagent.delete(`/api/food-items/${itemAId}`);
      expect(deleteRes.statusCode).toBe(204);
      
      // Verify item A is deleted
      const getResA = await userAagent.get(`/api/food-items/${itemAId}`);
      expect(getResA.statusCode).toBe(404);
      
      // Verify item B still exists and is owned by B
      const getResB = await userBagent.get(`/api/food-items/${itemBId}`);
      expect(getResB.statusCode).toBe(200);
      expect(getResB.body.id).toBe(itemBId);

    });

    it('POST /api/food-items - should return 400 for invalid data', async () => {
      const newItem = { name: 'Only Name' }; // Missing other required fields
      const res = await authenticatedAgent.post('/api/food-items').send(newItem);
      expect(res.statusCode).toBe(400);
      // Add more specific error message checks if your validation provides them
      expect(res.body.message).toContain("Validation failed");
    });


    it('PUT /api/food-items/:id - should update an existing food item', async () => {
      const allItems = await testStorage.getFoodItems();
      const itemToUpdateId = allItems[0].id;
      const updates = { name: 'Super Banana Updated', quantity: 10 };

      const res = await authenticatedAgent.put(`/api/food-items/${itemToUpdateId}`).send(updates);
      expect(res.statusCode).toBe(200);
      expect(res.body.name).toBe(updates.name);
      expect(res.body.quantity).toBe(updates.quantity);

      const itemInDb = await testStorage.getFoodItem(itemToUpdateId);
      expect(itemInDb?.name).toBe(updates.name);
    });
    
    it('PUT /api/food-items/:id - should return 404 if item to update not found', async () => {
      const res = await authenticatedAgent.put('/api/food-items/9999').send({ name: 'Ghost Item'});
      expect(res.statusCode).toBe(404);
    });
    
    it('PUT /api/food-items/:id - should return 400 for invalid update data', async () => {
       const allItems = await testStorage.getFoodItems();
       const itemToUpdateId = allItems[0].id;
       const updates = { quantity: "not-a-number" }; // Invalid data type
       const res = await authenticatedAgent.put(`/api/food-items/${itemToUpdateId}`).send(updates);
       expect(res.statusCode).toBe(400);
       expect(res.body.message).toContain("Validation failed");
    });

    it('DELETE /api/food-items/:id - should delete a food item', async () => {
      const allItems = await testStorage.getFoodItems();
      const itemToDeleteId = allItems[0].id;

      const res = await authenticatedAgent.delete(`/api/food-items/${itemToDeleteId}`);
      expect(res.statusCode).toBe(204); // No content

      const itemInDb = await testStorage.getFoodItem(itemToDeleteId);
      expect(itemInDb).toBeUndefined();
    });
    
    it('DELETE /api/food-items/:id - should return 404 if item to delete not found', async () => {
      const res = await authenticatedAgent.delete('/api/food-items/9999');
      expect(res.statusCode).toBe(404);
    });
  });

  describe('Recipes API (/api/recipes)', () => {
    // Recipes are public, no auth needed generally
     beforeEach(async () => {
      // MemStorage constructor populates sample recipes.
      // If we needed to clear and add specific recipes:
      // let existingRecipes = await testStorage.getRecipes();
      // for (const r of existingRecipes) { /* await testStorage.deleteRecipe(r.id); */ }
      // for (const rData of sampleRecipes.slice(0,2)) { /* await testStorage.addRecipe(rData); */ }
      // For now, assume MemStorage is reset to its default sample data state
      await (testStorage as MemStorage).constructor(); 
    });

    it('GET /api/recipes - should return all recipes', async () => {
      const res = await request(app).get('/api/recipes');
      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBe(sampleRecipes.length); // MemStorage adds all sample recipes
      expect(res.body[0].name).toBe(sampleRecipes[0].name);
    });

    it('GET /api/recipes/:id - should return a specific recipe', async () => {
      // MemStorage IDs start from 1 for recipes
      const recipeId = 1; 
      const expectedRecipe = sampleRecipes.find(r => r.id === recipeId) || sampleRecipes[0]; // simplified for test
      
      const res = await request(app).get(`/api/recipes/${recipeId}`);
      expect(res.statusCode).toBe(200);
      // Compare relevant fields as MemStorage might add an ID if original sample doesn't have it
      expect(res.body.name).toBe(expectedRecipe.name);
    });
    
    it('GET /api/recipes/:id - should return 404 for non-existent recipe', async () => {
      const res = await request(app).get('/api/recipes/9999');
      expect(res.statusCode).toBe(404);
    });

    it('GET /api/recipes/match/:ingredients - should return recipes matching ingredients', async () => {
      const ingredients = 'Tomato,Pasta'; // Comma-separated string
      // This relies on MemStorage's getRecipesForIngredients logic
      const expectedMatches = (await testStorage.getRecipesForIngredients(ingredients.split(','))).length;
      
      const res = await request(app).get(`/api/recipes/match/${ingredients}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBe(expectedMatches);
      // Further checks can be done if we know specific matching recipes from sample data
      if (expectedMatches > 0 && res.body.length > 0) {
         expect(res.body[0].ingredients.some((i: string) => i.toLowerCase().includes('tomato') || i.toLowerCase().includes('pasta'))).toBe(true);
      }
    });
    
    it('GET /api/recipes/match/:ingredients - should return empty array if no ingredients provided (or no match)', async () => {
      const resNoIngredient = await request(app).get('/api/recipes/match/'); // or /api/recipes/match/nonExistentIngredient
      expect(resNoIngredient.statusCode).toBe(200); // Route might still match, but return empty
      expect(resNoIngredient.body).toEqual([]);
      
      const resNonMatch = await request(app).get('/api/recipes/match/XyzAbc123');
      expect(resNonMatch.statusCode).toBe(200);
      expect(resNonMatch.body).toEqual([]);
    });
  });
  
  describe('Other Public APIs', () => {
    beforeEach(async () => {
      // Reset MemStorage to ensure sample data for FoodBanks, NearbyUsers
      await (testStorage as MemStorage).constructor(); 
    });

    it('GET /api/food-banks - should return food banks', async () => {
      const res = await request(app).get('/api/food-banks');
      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBeGreaterThan(0); // Assuming MemStorage populates some
      expect(res.body.length).toBe((await testStorage.getFoodBanks()).length);
    });

    it('GET /api/nearby-users - should return nearby users', async () => {
      const res = await request(app).get('/api/nearby-users');
      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBeGreaterThan(0); // Assuming MemStorage populates some
      expect(res.body.length).toBe((await testStorage.getNearbyUsers()).length);
    });

    it('GET /api/stats - should return waste stats', async () => {
      const res = await request(app).get('/api/stats');
      expect(res.statusCode).toBe(200);
      const expectedStats = await testStorage.getWasteStats(); // MemStorage returns static stats
      expect(res.body.co2Saved).toBe(expectedStats.co2Saved);
      expect(res.body.moneySaved).toBe(expectedStats.moneySaved);
    });
  });

});
