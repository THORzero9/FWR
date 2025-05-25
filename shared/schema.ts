import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm"; // Import relations
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Food item categories
export const FOOD_CATEGORIES = [
  "Fruits",
  "Vegetables",
  "Dairy",
  "Meat",
  "Grains",
  "Other"
] as const;

// Units of measurement
export const FOOD_UNITS = [
  "pcs",
  "g",
  "kg",
  "ml",
  "L",
  "cup(s)"
] as const;

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  email: text("email").unique().notNull(),
  hashedPassword: text("hashed_password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Main food item table
export const foodItems = pgTable("food_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  category: text("category")
    .notNull()
    .$type<(typeof FOOD_CATEGORIES)[number]>(),
  quantity: integer("quantity").notNull(),
  unit: text("unit")
    .notNull()
    .$type<(typeof FOOD_UNITS)[number]>(),
  expiryDate: timestamp("expiry_date").notNull(),
  favorite: boolean("favorite").default(false),
  addedDate: timestamp("added_date").defaultNow().notNull(),
});

// Define relations after all tables are defined
export const usersRelations = relations(users, ({ many }) => ({
  foodItems: many(foodItems),
}));

export const foodItemsRelations = relations(foodItems, ({ one }) => ({
  user: one(users, {
    fields: [foodItems.userId],
    references: [users.id],
  }),
}));


// Recipes table
export const recipes = pgTable("recipes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  prepTime: integer("prep_time").notNull(), // in minutes
  imageUrl: text("image_url"),
  ingredients: text("ingredients").array().notNull(),
  instructions: text("instructions").notNull(),
  rating: integer("rating"),
});

// Food banks table
export const foodBanks = pgTable("food_banks", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  distance: integer("distance").notNull(), // in miles (x10 for precision)
  openHours: text("open_hours").notNull(),
  description: text("description").notNull(),
});

// Nearby users for sharing
export const nearbyUsers = pgTable("nearby_users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  distance: integer("distance").notNull(), // in miles (x10 for precision)
  rating: integer("rating").notNull(), // out of 5
  imageUrl: text("image_url"),
});

// Insert schemas
export const insertFoodItemSchema = createInsertSchema(foodItems).omit({
  id: true,
  addedDate: true,
  // userId will be set by the server based on authenticated user, not client input for creation
  // However, for validation purposes, if we were to include it from client, it should be here.
  // For now, let's assume userId is handled server-side and not part of direct client insert schema.
  // If it needs to be part of the Zod schema for some reason, it would be:
  // userId: z.number().int().positive(), 
}).extend({
  // Override the expiryDate field to accept strings as well as Date objects
  expiryDate: z.union([z.string(), z.date()]).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  ),
});

export const insertRecipeSchema = createInsertSchema(recipes).omit({
  id: true,
});

export const insertFoodBankSchema = createInsertSchema(foodBanks).omit({
  id: true,
});

export const insertNearbyUserSchema = createInsertSchema(nearbyUsers).omit({
  id: true,
});

// Types
export type FoodItem = typeof foodItems.$inferSelect;
export type InsertFoodItem = z.infer<typeof insertFoodItemSchema>;

export type Recipe = typeof recipes.$inferSelect;
export type InsertRecipe = z.infer<typeof insertRecipeSchema>;

export type FoodBank = typeof foodBanks.$inferSelect;
export type InsertFoodBank = z.infer<typeof insertFoodBankSchema>;

export type NearbyUser = typeof nearbyUsers.$inferSelect;
export type InsertNearbyUser = z.infer<typeof insertNearbyUserSchema>;

// User types
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;


// Food waste statistics type
export type FoodWasteStats = {
  co2Saved: number; // in kg
  waterSaved: number; // in liters
  moneySaved: number; // in dollars
  wasteReduced: number; // in kg
  monthlyProgress: {
    month: string;
    amount: number;
  }[];
  wasteBreakdown: {
    category: string;
    percentage: number;
  }[];
};
