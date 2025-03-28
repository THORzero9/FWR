import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import Header from "@/components/layout/header";
import BottomNav from "@/components/layout/bottom-nav";
import { useState } from "react";
import AddItemDialog from "@/components/food/add-item-dialog";

// Pages
import Inventory from "@/pages/inventory";
import Stats from "@/pages/stats";
import Recipes from "@/pages/recipes";
import Share from "@/pages/share";
import NotFound from "@/pages/not-found";

function App() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <Header />
      
      <main className="flex-grow overflow-y-auto pb-16">
        <Switch>
          <Route path="/" component={Inventory} />
          <Route path="/stats" component={Stats} />
          <Route path="/recipes" component={Recipes} />
          <Route path="/share" component={Share} />
          <Route component={NotFound} />
        </Switch>
      </main>

      {/* Floating Action Button */}
      <button 
        className="fixed z-20 bottom-24 right-5 bg-primary text-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors"
        onClick={() => setIsAddDialogOpen(true)}
        aria-label="Add food item"
      >
        <span className="material-icons text-2xl">add</span>
      </button>

      <BottomNav />
      
      <AddItemDialog 
        open={isAddDialogOpen} 
        onOpenChange={setIsAddDialogOpen} 
      />
      
      <Toaster />
    </div>
  );
}

export default App;
