import { InsertFoodItem, FOOD_CATEGORIES, FOOD_UNITS } from "@shared/schema";

// Type-safe categories and units
const Fruits = FOOD_CATEGORIES[0];
const Vegetables = FOOD_CATEGORIES[1];
const Dairy = FOOD_CATEGORIES[2];
const Meat = FOOD_CATEGORIES[3];
const Grains = FOOD_CATEGORIES[4];
const Other = FOOD_CATEGORIES[5];

const Pieces = FOOD_UNITS[0]; // "pcs"
const Grams = FOOD_UNITS[1];  // "g"
const Kilograms = FOOD_UNITS[2]; // "kg"
const Milliliters = FOOD_UNITS[3]; // "ml"
const Liters = FOOD_UNITS[4]; // "L"
const Cups = FOOD_UNITS[5]; // "cup(s)"

// Sample food items
export const sampleFoodItems: InsertFoodItem[] = [
  {
    name: "Organic Apples",
    category: Fruits,
    quantity: 5,
    unit: Pieces,
    expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
    favorite: true
  },
  {
    name: "Bananas",
    category: Fruits,
    quantity: 6,
    unit: Pieces,
    expiryDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // 4 days from now
    favorite: false
  },
  {
    name: "Spinach",
    category: Vegetables,
    quantity: 1,
    unit: Pieces,
    expiryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    favorite: false
  },
  {
    name: "Milk",
    category: Dairy,
    quantity: 1,
    unit: Liters,
    expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    favorite: true
  },
  {
    name: "Eggs",
    category: Dairy,
    quantity: 12,
    unit: Pieces,
    expiryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
    favorite: true
  },
  {
    name: "Ground Beef",
    category: Meat,
    quantity: 500,
    unit: Grams,
    expiryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
    favorite: false
  },
  {
    name: "Tomatoes",
    category: Vegetables,
    quantity: 4,
    unit: Pieces,
    expiryDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), // 6 days from now
    favorite: false
  },
  {
    name: "Bread",
    category: Grains,
    quantity: 1,
    unit: Pieces,
    expiryDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // 4 days from now
    favorite: true
  },
  {
    name: "Cheese",
    category: Dairy,
    quantity: 250,
    unit: Grams,
    expiryDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000), // 8 days from now
    favorite: true
  },
  {
    name: "Carrots",
    category: Vegetables,
    quantity: 6,
    unit: Pieces,
    expiryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
    favorite: false
  },
  {
    name: "Chicken Breast",
    category: Meat,
    quantity: 400,
    unit: Grams,
    expiryDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day from now (expiring soon)
    favorite: false
  },
  {
    name: "Bell Peppers",
    category: Vegetables,
    quantity: 3,
    unit: Pieces,
    expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    favorite: false
  },
  {
    name: "Yogurt",
    category: Dairy,
    quantity: 2,
    unit: Pieces,
    expiryDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000), // 9 days from now
    favorite: false
  },
  {
    name: "Rice",
    category: Grains,
    quantity: 1,
    unit: Kilograms,
    expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
    favorite: true
  },
  {
    name: "Strawberries",
    category: Fruits,
    quantity: 250,
    unit: Grams,
    expiryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    favorite: true
  }
];