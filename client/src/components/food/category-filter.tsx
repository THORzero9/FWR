import { FOOD_CATEGORIES } from "@shared/schema";

interface CategoryFilterProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export default function CategoryFilter({ selectedCategory, onCategoryChange }: CategoryFilterProps) {
  // Add "All" category to the list
  const categories = ["All", ...FOOD_CATEGORIES];

  return (
    <div className="mb-5">
      <h2 className="text-lg font-medium mb-3">Categories</h2>
      <div className="flex space-x-2 overflow-x-auto pb-2">
        {categories.map((category) => (
          <button
            key={category}
            className={`px-4 py-2 rounded-full text-sm font-medium flex-shrink-0 transition-colors ${
              selectedCategory === category
                ? "bg-primary text-white"
                : "bg-white shadow text-neutral-600 hover:bg-neutral-100"
            }`}
            onClick={() => onCategoryChange(category)}
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );
}
