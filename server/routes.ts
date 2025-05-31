import express, { type Request, type Express } from "express";
import { createServer, type Server } from "http";
import logger from "./logger";
import { storage } from "./storage";
import { insertFoodItemSchema } from "@shared/schema";
import { fromZodError, type ZodError } from "zod-validation-error";
import { setupAuth } from "./auth";
import { isAuthenticated } from "./middleware/isAuthenticated"; // Import the middleware

// Helper to get request ID
const getRequestId = (req: Request) => (req as any).id || 'unknown';

/**
 * Registers all API routes, middleware, and authentication on the provided Express app and returns an HTTP server instance.
 *
 * Sets up protected and public endpoints for food items, recipes, food banks, nearby users, and statistics, applying authentication and validation where required. All routes include structured logging and appropriate error handling.
 *
 * @returns An HTTP server instance with all API routes and middleware configured.
 */
export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes and middleware
  setupAuth(app);
  const apiRouter = express.Router();
  
  // Food Items API - Protected by isAuthenticated middleware
  
  // GET all food items for the authenticated user
  apiRouter.get("/food-items", isAuthenticated, async (req, res) => {
    const requestId = getRequestId(req);
    const userId = req.user!.id; // req.user is guaranteed by isAuthenticated
    try {
      logger.debug({ requestId, userId, route: "/food-items", method: "GET" }, "Fetching all food items for user");
      const items = await storage.getFoodItems(userId);
      logger.info({ requestId, userId, count: items.length }, "Successfully fetched all food items for user");
      res.json(items);
    } catch (error: any) {
      logger.error({ requestId, userId, error: error.message, stack: error.stack }, "Error fetching food items for user");
      res.status(500).json({ message: "Error fetching food items. Please try again later." });
    }
  });
  
  // GET a specific food item for the authenticated user
  apiRouter.get("/food-items/:id", isAuthenticated, async (req, res) => {
    const requestId = getRequestId(req);
    const userId = req.user!.id;
    const { id: itemId } = req.params;
    try {
      logger.debug({ requestId, userId, route: `/food-items/${itemId}`, method: "GET" }, "Fetching food item by ID for user");
      const id = parseInt(itemId);
      if (isNaN(id)) {
        logger.warn({ requestId, userId, itemId }, "Invalid food item ID format");
        return res.status(400).json({ message: "Invalid ID format. ID must be a number." });
      }
      
      const item = await storage.getFoodItem(id, userId);
      if (!item) {
        logger.warn({ requestId, userId, itemId: id }, "Food item not found or not owned by user");
        return res.status(404).json({ message: `Food item with ID ${id} not found.` });
      }
      
      logger.info({ requestId, userId, itemId: id }, "Successfully fetched food item by ID for user");
      res.json(item);
    } catch (error: any) {
      logger.error({ requestId, userId, itemId, error: error.message, stack: error.stack }, "Error fetching food item by ID for user");
      res.status(500).json({ message: "Error fetching food item. Please try again later." });
    }
  });
  
  // POST a new food item for the authenticated user
  apiRouter.post("/food-items", isAuthenticated, async (req, res) => {
    const requestId = getRequestId(req);
    const userId = req.user!.id;
    try {
      logger.debug({ requestId, userId, route: "/food-items", method: "POST", body: req.body }, "Attempting to add new food item for user");
      const validationResult = insertFoodItemSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const validationError = fromZodError(validationResult.error as ZodError);
        logger.warn({ requestId, userId, validationErrors: validationError.details }, "Food item validation failed");
        return res.status(400).json({ 
          message: "Validation failed. Please check the provided data.",
          details: validationError.details 
        });
      }
      
      const newItem = await storage.addFoodItem(validationResult.data, userId);
      logger.info({ requestId, userId, itemId: newItem.id }, "Successfully added new food item for user");
      res.status(201).json(newItem);
    } catch (error: any) {
      logger.error({ requestId, userId, error: error.message, stack: error.stack, body: req.body }, "Error creating food item for user");
      res.status(500).json({ message: "Error creating food item. Please try again later." });
    }
  });
  
  // PATCH/UPDATE a food item for the authenticated user
  apiRouter.patch("/food-items/:id", isAuthenticated, async (req, res) => {
    const requestId = getRequestId(req);
    const userId = req.user!.id;
    const { id: itemId } = req.params;
    try {
      logger.debug({ requestId, userId, route: `/food-items/${itemId}`, method: "PATCH", body: req.body }, "Attempting to update food item for user");
      const id = parseInt(itemId);
      if (isNaN(id)) {
        logger.warn({ requestId, userId, itemId }, "Invalid food item ID format for update");
        return res.status(400).json({ message: "Invalid ID format. ID must be a number." });
      }
      
      // Add validation for the body if needed, e.g. using a partial schema
      // For now, assuming storage.updateFoodItem handles partial updates correctly.

      const updatedItem = await storage.updateFoodItem(id, req.body, userId);
      if (!updatedItem) {
        logger.warn({ requestId, userId, itemId: id }, "Food item not found for update or not owned by user");
        return res.status(404).json({ message: `Food item with ID ${id} not found.` });
      }
      
      logger.info({ requestId, userId, itemId: id }, "Successfully updated food item for user");
      res.json(updatedItem);
    } catch (error: any) {
      logger.error({ requestId, userId, itemId, error: error.message, stack: error.stack, body: req.body }, "Error updating food item for user");
      res.status(500).json({ message: "Error updating food item. Please try again later." });
    }
  });
  
  // DELETE a food item for the authenticated user
  apiRouter.delete("/food-items/:id", isAuthenticated, async (req, res) => {
    const requestId = getRequestId(req);
    const userId = req.user!.id;
    const { id: itemId } = req.params;
    try {
      logger.debug({ requestId, userId, route: `/food-items/${itemId}`, method: "DELETE" }, "Attempting to delete food item for user");
      const id = parseInt(itemId);
      if (isNaN(id)) {
        logger.warn({ requestId, userId, itemId }, "Invalid food item ID format for delete");
        return res.status(400).json({ message: "Invalid ID format. ID must be a number." });
      }
      
      const success = await storage.deleteFoodItem(id, userId);
      if (!success) {
        logger.warn({ requestId, userId, itemId: id }, "Food item not found for delete or not owned by user");
        return res.status(404).json({ message: `Food item with ID ${id} not found.` });
      }
      
      logger.info({ requestId, userId, itemId: id }, "Successfully deleted food item for user");
      res.status(204).end();
    } catch (error: any) {
      logger.error({ requestId, userId, itemId, error: error.message, stack: error.stack }, "Error deleting food item for user");
      res.status(500).json({ message: "Error deleting food item. Please try again later." });
    }
  });
  
  // Recipes API (Public - No specific user data, so no isAuthenticated needed here for now)
  
  // GET all recipes
  apiRouter.get("/recipes", async (req, res) => {
    const requestId = getRequestId(req);
    try {
      logger.debug({ requestId, route: "/recipes", method: "GET" }, "Fetching all recipes");
      const recipes = await storage.getRecipes();
      logger.info({ requestId, count: recipes.length }, "Successfully fetched all recipes");
      res.json(recipes);
    } catch (error: any) {
      logger.error({ requestId, error: error.message, stack: error.stack }, "Error fetching recipes");
      res.status(500).json({ message: "Error fetching recipes. Please try again later." });
    }
  });
  
  // GET recipes for ingredients
  apiRouter.get("/recipes/match/:ingredients", async (req, res) => {
    const requestId = getRequestId(req);
    const { ingredients: ingredientsParam } = req.params;
    try {
      const ingredients = ingredientsParam.split(",");
      logger.debug({ requestId, route: `/recipes/match/${ingredientsParam}`, method: "GET", ingredients }, "Finding recipes for ingredients");
      const recipes = await storage.getRecipesForIngredients(ingredients);
      logger.info({ requestId, ingredients, count: recipes.length }, "Successfully found recipes for ingredients");
      res.json(recipes);
    } catch (error: any) {
      logger.error({ requestId, ingredientsParam, error: error.message, stack: error.stack }, "Error finding recipes for ingredients");
      res.status(500).json({ message: "Error finding recipes for ingredients. Please try again later." });
    }
  });
  
  // GET a specific recipe
  apiRouter.get("/recipes/:id", async (req, res) => {
    const requestId = getRequestId(req);
    const { id: recipeId } = req.params;
    try {
      logger.debug({ requestId, route: `/recipes/${recipeId}`, method: "GET" }, "Fetching recipe by ID");
      const id = parseInt(recipeId);
      if (isNaN(id)) {
        logger.warn({ requestId, recipeId }, "Invalid recipe ID format");
        return res.status(400).json({ message: "Invalid ID format. ID must be a number." });
      }
      
      const recipe = await storage.getRecipe(id);
      if (!recipe) {
        logger.warn({ requestId, recipeId: id }, "Recipe not found");
        return res.status(404).json({ message: `Recipe with ID ${id} not found.` });
      }
      
      logger.info({ requestId, recipeId: id }, "Successfully fetched recipe by ID");
      res.json(recipe);
    } catch (error: any) {
      logger.error({ requestId, recipeId, error: error.message, stack: error.stack }, "Error fetching recipe by ID");
      res.status(500).json({ message: "Error fetching recipe. Please try again later." });
    }
  });
  
  // Food Banks API
  
  // GET all food banks
  apiRouter.get("/food-banks", async (req, res) => {
    const requestId = getRequestId(req);
    try {
      logger.debug({ requestId, route: "/food-banks", method: "GET" }, "Fetching all food banks");
      const foodBanks = await storage.getFoodBanks();
      logger.info({ requestId, count: foodBanks.length }, "Successfully fetched all food banks");
      res.json(foodBanks);
    } catch (error: any) {
      logger.error({ requestId, error: error.message, stack: error.stack }, "Error fetching food banks");
      res.status(500).json({ message: "Error fetching food banks. Please try again later." });
    }
  });
  
  // Nearby Users API
  
  // GET all nearby users
  apiRouter.get("/nearby-users", async (req, res) => {
    const requestId = getRequestId(req);
    try {
      logger.debug({ requestId, route: "/nearby-users", method: "GET" }, "Fetching all nearby users");
      const users = await storage.getNearbyUsers();
      logger.info({ requestId, count: users.length }, "Successfully fetched all nearby users");
      res.json(users);
    } catch (error: any) {
      logger.error({ requestId, error: error.message, stack: error.stack }, "Error fetching nearby users");
      res.status(500).json({ message: "Error fetching nearby users. Please try again later." });
    }
  });
  
  // Stats API
  
  // GET waste statistics
  apiRouter.get("/stats", async (req, res) => {
    const requestId = getRequestId(req);
    try {
      logger.debug({ requestId, route: "/stats", method: "GET" }, "Fetching waste statistics");
      const stats = await storage.getWasteStats();
      logger.info({ requestId }, "Successfully fetched waste statistics");
      res.json(stats);
    } catch (error: any) {
      logger.error({ requestId, error: error.message, stack: error.stack }, "Error fetching waste statistics");
      res.status(500).json({ message: "Error fetching waste statistics. Please try again later." });
    }
  });
  
  // Auth API is now handled by setupAuth() in auth.ts
  
  // Register API routes
  app.use("/api", apiRouter);
  
  const httpServer = createServer(app);
  
  return httpServer;
}
