import { Recipe } from "@shared/schema";

// Sample recipes without IDs (they'll be assigned in the storage)
export const sampleRecipes: Omit<Recipe, "id">[] = [
  {
    name: "Spinach and Tomato Salad",
    description: "Quick and healthy salad using your expiring spinach and tomatoes",
    prepTime: 15,
    imageUrl: "https://images.unsplash.com/photo-1505253758473-96b7015fcd40?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    ingredients: ["Spinach", "Tomatoes", "Eggs", "Olive oil", "Lemon juice", "Salt", "Pepper"],
    instructions: "1. Wash and dry spinach leaves.\n2. Slice tomatoes.\n3. Hard boil eggs, peel and slice.\n4. Combine all ingredients in a bowl.\n5. Drizzle with olive oil and lemon juice.\n6. Season with salt and pepper to taste.",
    rating: 48  // 4.8/10
  },
  {
    name: "Egg and Cheese Sandwich",
    description: "Easy breakfast using your eggs, cheese and bread",
    prepTime: 10,
    imageUrl: "https://images.unsplash.com/photo-1511994714008-b6d68a8b32a2?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    ingredients: ["Eggs", "Cheese", "Bread", "Butter", "Salt", "Pepper"],
    instructions: "1. Fry eggs in a pan to your liking.\n2. Toast bread slices.\n3. Place cheese on one slice of toast.\n4. Add the fried egg on top of cheese.\n5. Season with salt and pepper.\n6. Top with the second slice of toast.",
    rating: 46  // 4.6/10
  },
  {
    name: "Apple Pie",
    description: "Classic apple pie with a buttery crust",
    prepTime: 30,
    imageUrl: "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80",
    ingredients: ["Apples", "Flour", "Sugar", "Butter", "Cinnamon", "Nutmeg", "Salt"],
    instructions: "1. Preheat oven to 375°F.\n2. Prepare pie crust.\n3. Peel and slice apples.\n4. Mix apples with sugar and spices.\n5. Fill pie crust with apple mixture.\n6. Add top crust and seal edges.\n7. Bake for 45-50 minutes until golden brown.",
    rating: 48  // 4.8/10
  },
  {
    name: "Avocado Toast",
    description: "Simple and nutritious breakfast",
    prepTime: 5,
    imageUrl: "https://images.unsplash.com/photo-1548940740-204726a19be3?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80",
    ingredients: ["Avocado", "Bread", "Lemon juice", "Salt", "Pepper", "Red pepper flakes"],
    instructions: "1. Toast bread slices.\n2. Mash ripe avocado in a bowl.\n3. Add lemon juice, salt, and pepper to taste.\n4. Spread avocado mixture on toast.\n5. Sprinkle with red pepper flakes if desired.",
    rating: 45  // 4.5/10
  },
  {
    name: "Vegetable Soup",
    description: "Hearty soup with seasonal vegetables",
    prepTime: 45,
    imageUrl: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80",
    ingredients: ["Carrots", "Celery", "Onion", "Potatoes", "Tomatoes", "Vegetable broth", "Garlic", "Herbs", "Salt", "Pepper"],
    instructions: "1. Chop all vegetables.\n2. Sauté onion and garlic until translucent.\n3. Add remaining vegetables and cook for 5 minutes.\n4. Pour in vegetable broth and bring to a boil.\n5. Reduce heat and simmer for 30 minutes.\n6. Season with herbs, salt, and pepper to taste.",
    rating: 46  // 4.6/10
  },
  {
    name: "Fruit Salad",
    description: "Refreshing mix of seasonal fruits",
    prepTime: 10,
    imageUrl: "https://images.unsplash.com/photo-1563379926898-05f4575a45d8?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80",
    ingredients: ["Apples", "Bananas", "Oranges", "Grapes", "Strawberries", "Honey", "Lemon juice"],
    instructions: "1. Wash all fruits thoroughly.\n2. Peel and dice apples, bananas, and oranges.\n3. Slice strawberries and halve grapes if large.\n4. Combine all fruits in a large bowl.\n5. Drizzle with honey and lemon juice.\n6. Toss gently to coat.",
    rating: 49  // 4.9/10
  }
];
