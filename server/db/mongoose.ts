import mongoose from 'mongoose';
import { log } from '../vite';
import { FOOD_CATEGORIES, FOOD_UNITS } from '@shared/schema';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/freshsave';

// Define schemas
const foodItemSchema = new mongoose.Schema({
  // We'll use the MongoDB _id as the primary key, but convert to number in the storage interface
  name: { type: String, required: true },
  category: { 
    type: String, 
    required: true,
    enum: FOOD_CATEGORIES 
  },
  quantity: { type: Number, required: true },
  unit: { 
    type: String, 
    required: true,
    enum: FOOD_UNITS 
  },
  expiryDate: { type: Date, required: true },
  addedDate: { type: Date, default: Date.now },
  favorite: { type: Boolean, default: false }
});

const recipeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  ingredients: [{ type: String, required: true }],
  instructions: { type: String, required: true },
  prepTime: { type: Number, required: true },
  imageUrl: { type: String, default: null },
  rating: { type: Number, default: null }
});

const foodBankSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  distance: { type: Number, required: true },
  openHours: { type: String, required: true }
});

const nearbyUserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  distance: { type: Number, required: true },
  rating: { type: Number, required: true },
  imageUrl: { type: String, default: null }
});

// Create models
export const FoodItem = mongoose.model('FoodItem', foodItemSchema);
export const Recipe = mongoose.model('Recipe', recipeSchema);
export const FoodBank = mongoose.model('FoodBank', foodBankSchema);
export const NearbyUser = mongoose.model('NearbyUser', nearbyUserSchema);

// Connect to MongoDB
export async function connectToDatabase() {
  try {
    if (mongoose.connection.readyState === 0) {
      log(`Connecting to MongoDB at ${MONGODB_URI}...`, 'mongodb');
      await mongoose.connect(MONGODB_URI);
      log('Successfully connected to MongoDB', 'mongodb');
    }
  } catch (error) {
    log(`MongoDB connection error: ${error}`, 'mongodb');
    throw error;
  }
}

export default mongoose;