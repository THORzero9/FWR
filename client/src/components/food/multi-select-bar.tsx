import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Trash2, Heart, X } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { FoodItem } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface MultiSelectBarProps {
  selectedItems: FoodItem[];
  onClearSelection: () => void;
}

export default function MultiSelectBar({ selectedItems, onClearSelection }: MultiSelectBarProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Mutation for bulk favorite
  const { mutate: bulkFavorite, isPending: isFavoritePending } = useMutation({
    mutationFn: async () => {
      const promises = selectedItems.map(item => 
        apiRequest("PATCH", `/api/food-items/${item.id}`, { favorite: true })
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/food-items"] });
      toast({
        title: "Items marked as favorite",
        description: `${selectedItems.length} items have been marked as favorite.`
      });
      onClearSelection();
    },
    onError: (error) => {
      toast({
        title: "Error marking items as favorite",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Mutation for bulk unfavorite
  const { mutate: bulkUnfavorite, isPending: isUnfavoritePending } = useMutation({
    mutationFn: async () => {
      const promises = selectedItems.map(item => 
        apiRequest("PATCH", `/api/food-items/${item.id}`, { favorite: false })
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/food-items"] });
      toast({
        title: "Items unmarked as favorite",
        description: `${selectedItems.length} items have been unmarked as favorite.`
      });
      onClearSelection();
    },
    onError: (error) => {
      toast({
        title: "Error unmarking items as favorite",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Mutation for bulk delete
  const { mutate: bulkDelete, isPending: isDeletePending } = useMutation({
    mutationFn: async () => {
      const promises = selectedItems.map(item => 
        apiRequest("DELETE", `/api/food-items/${item.id}`)
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/food-items"] });
      toast({
        title: "Items deleted",
        description: `${selectedItems.length} items have been removed from your inventory.`
      });
      setIsDeleteDialogOpen(false);
      onClearSelection();
    },
    onError: (error) => {
      toast({
        title: "Error deleting items",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleDeleteClick = () => {
    setIsDeleteDialogOpen(true);
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-md p-3 flex items-center gap-2 z-10">
        <div className="flex-1 flex items-center gap-2">
          <Button
            variant="outline" 
            size="sm"
            onClick={onClearSelection}
            className="gap-1"
          >
            <X size={14} />
            Clear ({selectedItems.length})
          </Button>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="default"
            size="sm"
            onClick={() => bulkFavorite()}
            disabled={isFavoritePending}
            className="bg-primary hover:bg-primary/90 gap-1"
          >
            <Heart size={14} />
            Favorite
          </Button>
          
          <Button 
            variant="outline"
            size="sm"
            onClick={() => bulkUnfavorite()}
            disabled={isUnfavoritePending}
            className="gap-1"
          >
            <Heart size={14} />
            Unfavorite
          </Button>
          
          <Button 
            variant="destructive"
            size="sm"
            onClick={handleDeleteClick}
            disabled={isDeletePending}
            className="gap-1"
          >
            <Trash2 size={14} />
            Delete
          </Button>
        </div>
      </div>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedItems.length} items from your inventory.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => bulkDelete()}
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeletePending}
            >
              {isDeletePending ? "Deleting..." : "Delete Items"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}