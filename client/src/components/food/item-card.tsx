import { FoodItem } from "@shared/schema";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { calculateExpiryProgress, formatRelativeDate } from "@/lib/utils/date-utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import EditItemDialog from "./edit-item-dialog";
import { Pencil, CheckCircle } from "lucide-react";

interface ItemCardProps {
  item: FoodItem;
  selectable?: boolean;
  isSelected?: boolean;
  onSelectToggle?: (item: FoodItem) => void;
}

export default function ItemCard({ 
  item, 
  selectable = false, 
  isSelected = false, 
  onSelectToggle 
}: ItemCardProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  // Mutation to toggle favorite status
  const { mutate: toggleFavorite } = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PATCH", `/api/food-items/${item.id}`, {
        favorite: !item.favorite
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/food-items"] });
    }
  });
  
  // We'll use the delete functionality from EditItemDialog

  // Calculate days until expiry
  const daysUntilExpiry = Math.ceil(
    (new Date(item.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );
  
  // Calculate progress percentage for the expiry bar
  const progress = calculateExpiryProgress(item.expiryDate);
  
  // Get category icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Fruits": return "nutrition";
      case "Vegetables": return "grass";
      case "Dairy": return "breakfast_dining";
      case "Meat": return "lunch_dining";
      case "Grains": return "breakfast_dining";
      case "Seafood": return "set_meal";
      case "Nuts": return "egg_alt";
      case "Bakery": return "bakery_dining";
      case "Frozen": return "ac_unit";
      case "Canned": return "dinner_dining";
      case "Beverages": return "local_cafe";
      case "Snacks": return "cookie";
      case "Condiments": return "sauce";
      default: return "restaurant";
    }
  };
  
  return (
    <>
      <div 
        className={`bg-white rounded-lg shadow p-3 cursor-pointer hover:shadow-md transition-all ${
          isSelected 
            ? 'ring-2 ring-primary border-primary bg-primary/5' 
            : selectable 
              ? 'hover:border-gray-200 border border-transparent' 
              : ''
        }`}
        onClick={(e) => {
          if (selectable && onSelectToggle) {
            e.preventDefault();
            onSelectToggle(item);
          } else {
            setDialogOpen(true);
          }
        }}
      >
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            {selectable ? (
              <div 
                className={`rounded-full w-7 h-7 flex items-center justify-center transition-colors ${
                  isSelected 
                    ? 'bg-primary text-white' 
                    : 'bg-gray-100 text-gray-400'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onSelectToggle) onSelectToggle(item);
                }}
              >
                {isSelected && <CheckCircle size={16} />}
              </div>
            ) : (
              <div className="bg-primary/10 rounded-full w-7 h-7 flex items-center justify-center text-primary text-sm">
                <span className="material-icons" style={{ fontSize: '16px' }}>{getCategoryIcon(item.category)}</span>
              </div>
            )}
            <div>
              <h3 className="font-medium">{item.name}</h3>
              <p className="text-sm text-neutral-500">{item.quantity} {item.unit}</p>
            </div>
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation(); // Prevent dialog from opening
              toggleFavorite();
            }}
          >
            <span className={`material-icons ${item.favorite ? "text-red-500" : "text-neutral-300"}`}>
              {item.favorite ? "favorite" : "favorite_outline"}
            </span>
          </button>
        </div>
        <p className={`text-xs mt-2 ${daysUntilExpiry <= 0 ? "text-red-500" : "text-neutral-500"}`}>
          {daysUntilExpiry <= 0 
            ? "Expired!" 
            : `Expires in ${daysUntilExpiry} days`}
        </p>
        <div className="mt-2">
          <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
            <div 
              className={`h-full ${
                progress <= 0.1 ? "bg-red-500" :
                progress <= 0.3 ? "bg-amber-500" :
                "bg-primary"
              }`}
              style={{ width: `${Math.max(progress * 100, 5)}%` }}
            ></div>
          </div>
        </div>
      </div>
      
      {/* Item Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Food Item Details</DialogTitle>
            <DialogDescription>
              View detailed information about this item including expiration dates and storage details.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center text-primary">
                <span className="material-icons">{getCategoryIcon(item.category)}</span>
              </div>
              <div>
                <h3 className="text-lg font-medium">{item.name}</h3>
                <p className="text-sm text-neutral-500">{item.category}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-neutral-50 p-3 rounded">
                <p className="text-sm text-neutral-500">Quantity</p>
                <p className="font-medium">{item.quantity} {item.unit}</p>
              </div>
              <div className="bg-neutral-50 p-3 rounded">
                <p className="text-sm text-neutral-500">Added On</p>
                <p className="font-medium">{format(new Date(item.addedDate), "MMM d, yyyy")}</p>
              </div>
            </div>
            
            <div className="bg-neutral-50 p-3 rounded">
              <p className="text-sm text-neutral-500">Expiration Date</p>
              <p className={`font-medium ${daysUntilExpiry <= 0 ? "text-red-500" : ""}`}>
                {format(new Date(item.expiryDate), "MMM d, yyyy")} 
                <span className="text-sm text-neutral-500 ml-2">
                  ({formatRelativeDate(item.expiryDate)})
                </span>
              </p>
              <div className="mt-2">
                <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${
                      progress <= 0.1 ? "bg-red-500" :
                      progress <= 0.3 ? "bg-amber-500" :
                      "bg-primary"
                    }`}
                    style={{ width: `${Math.max(progress * 100, 5)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button 
              variant="outline"
              className="flex-1"
              onClick={() => setDialogOpen(false)}
            >
              Close
            </Button>
            <Button 
              variant="default"
              className="flex-1 bg-primary hover:bg-primary/90 flex items-center justify-center gap-1"
              onClick={() => {
                setDialogOpen(false);
                setEditDialogOpen(true);
              }}
            >
              <Pencil size={16} />
              Edit
            </Button>
            <Button 
              variant="destructive"
              className="flex-1"
              onClick={() => {
                setDialogOpen(false);
                setEditDialogOpen(true);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      {editDialogOpen && (
        <EditItemDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          item={item}
        />
      )}
    </>
  );
}
