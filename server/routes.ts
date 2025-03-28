import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertFoodItemSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
  const apiRouter = express.Router();
  
  // Food Items API
  
  // GET all food items
  apiRouter.get("/food-items", async (req, res) => {
    try {
      const items = await storage.getFoodItems();
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Error fetching food items" });
    }
  });
  
  // GET a specific food item
  apiRouter.get("/food-items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      const item = await storage.getFoodItem(id);
      if (!item) {
        return res.status(404).json({ message: "Food item not found" });
      }
      
      res.json(item);
    } catch (error) {
      res.status(500).json({ message: "Error fetching food item" });
    }
  });
  
  // POST a new food item
  apiRouter.post("/food-items", async (req, res) => {
    try {
      console.log("Received POST request to /api/food-items with data:", req.body);
      const validationResult = insertFoodItemSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const errorMessage = fromZodError(validationResult.error).message;
        console.log("Validation error:", errorMessage);
        return res.status(400).json({ message: errorMessage });
      }
      
      const newItem = await storage.addFoodItem(validationResult.data);
      console.log("Successfully added new food item:", newItem);
      res.status(201).json(newItem);
    } catch (error) {
      console.error("Error creating food item:", error);
      res.status(500).json({ message: "Error creating food item" });
    }
  });
  
  // PATCH/UPDATE a food item
  apiRouter.patch("/food-items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      const updatedItem = await storage.updateFoodItem(id, req.body);
      if (!updatedItem) {
        return res.status(404).json({ message: "Food item not found" });
      }
      
      res.json(updatedItem);
    } catch (error) {
      res.status(500).json({ message: "Error updating food item" });
    }
  });
  
  // DELETE a food item
  apiRouter.delete("/food-items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      const success = await storage.deleteFoodItem(id);
      if (!success) {
        return res.status(404).json({ message: "Food item not found" });
      }
      
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Error deleting food item" });
    }
  });
  
  // Recipes API
  
  // GET all recipes
  apiRouter.get("/recipes", async (req, res) => {
    try {
      const recipes = await storage.getRecipes();
      res.json(recipes);
    } catch (error) {
      res.status(500).json({ message: "Error fetching recipes" });
    }
  });
  
  // GET recipes for ingredients - Order matters! This needs to come before the /:id route
  apiRouter.get("/recipes/match/:ingredients", async (req, res) => {
    try {
      const ingredients = req.params.ingredients.split(",");
      console.log("Finding recipes for ingredients:", ingredients);
      const recipes = await storage.getRecipesForIngredients(ingredients);
      res.json(recipes);
    } catch (error) {
      console.error("Error finding recipes for ingredients:", error);
      res.status(500).json({ message: "Error finding recipes for ingredients" });
    }
  });
  
  // GET a specific recipe
  apiRouter.get("/recipes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      const recipe = await storage.getRecipe(id);
      if (!recipe) {
        return res.status(404).json({ message: "Recipe not found" });
      }
      
      res.json(recipe);
    } catch (error) {
      res.status(500).json({ message: "Error fetching recipe" });
    }
  });
  
  // Food Banks API
  
  // GET all food banks
  apiRouter.get("/food-banks", async (req, res) => {
    try {
      const foodBanks = await storage.getFoodBanks();
      res.json(foodBanks);
    } catch (error) {
      res.status(500).json({ message: "Error fetching food banks" });
    }
  });
  
  // Nearby Users API
  
  // GET all nearby users
  apiRouter.get("/nearby-users", async (req, res) => {
    try {
      const users = await storage.getNearbyUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Error fetching nearby users" });
    }
  });
  
  // Stats API
  
  // GET waste statistics
  apiRouter.get("/stats", async (req, res) => {
    try {
      const stats = await storage.getWasteStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Error fetching waste statistics" });
    }
  });
  
  // Auth API (Mock implementation for frontend development)
  
  // GET current user
  apiRouter.get("/user", (req, res) => {
    // This would normally check session/JWT
    // For demo purposes, it will just return a 401 for the frontend to handle
    res.status(401).json({ message: "Not authenticated" });
  });
  
  // POST login
  apiRouter.post("/login", (req, res) => {
    try {
      const { username, password } = req.body;
      
      // Demo validation
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
      }
      
      // In a real app, you would verify credentials against the database
      // For now, mock a successful login
      res.json({
        id: 1,
        username,
        email: `${username}@example.com`
      });
    } catch (error) {
      res.status(500).json({ message: "Error during login" });
    }
  });
  
  // POST register
  apiRouter.post("/register", (req, res) => {
    try {
      const { username, email, password } = req.body;
      
      // Demo validation
      if (!username || !email || !password) {
        return res.status(400).json({ message: "All fields are required" });
      }
      
      // In a real app, you would create a user in the database
      // For now, mock a successful registration
      res.status(201).json({
        id: 1,
        username,
        email
      });
    } catch (error) {
      res.status(500).json({ message: "Error during registration" });
    }
  });
  
  // POST logout
  apiRouter.post("/logout", (req, res) => {
    // In a real app, you would destroy the session
    res.status(200).json({ message: "Logged out successfully" });
  });
  
  // Register API routes
  app.use("/api", apiRouter);
  
  const httpServer = createServer(app);
  
  return httpServer;
}
