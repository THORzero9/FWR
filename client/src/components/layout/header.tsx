import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { LogOut, User, ChevronDown } from "lucide-react";

export default function Header() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Search",
      description: `Searching for "${searchQuery}"...`,
    });
    setSearchOpen(false);
    setSearchQuery("");
  };

  const handleLogout = () => {
    logoutMutation.mutate();
    setLocation("/auth");
  };

  return (
    <header className="bg-primary shadow-md z-10">
      <div className="px-4 py-3 flex justify-between items-center">
        <Link href="/">
          <h1 className="text-white text-xl font-medium cursor-pointer">FreshSave</h1>
        </Link>
        <div className="flex items-center space-x-3">
          <button 
            className="text-white p-1 hover:bg-white/10 rounded-full"
            onClick={() => setSearchOpen(true)}
            aria-label="Search"
          >
            <span className="material-icons">search</span>
          </button>
          <button 
            className="text-white p-1 hover:bg-white/10 rounded-full"
            onClick={() => {
              setNotificationsOpen(true);
              toast({
                title: "Notifications",
                description: "You have no new notifications."
              });
            }}
            aria-label="Notifications"
          >
            <span className="material-icons">notifications</span>
          </button>
          
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="text-white hover:bg-white/10 p-1 rounded-full flex items-center gap-1"
                >
                  <User size={20} />
                  <span className="hidden sm:inline text-sm font-medium">{user.username}</span>
                  <ChevronDown size={16} className="hidden sm:inline" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleLogout} className="text-red-500">
                  <LogOut size={16} className="mr-2" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/auth">
              <Button 
                variant="ghost" 
                className="text-white hover:bg-white/10"
                size="sm"
              >
                Login
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Search Dialog */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Search Inventory</DialogTitle>
            <DialogDescription>
              Enter keywords to search for items in your inventory.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSearch} className="space-y-4">
            <Input
              placeholder="Search for items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mt-2"
              autoFocus
            />
            <DialogFooter className="flex space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setSearchOpen(false)}
                className="flex-grow"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="flex-grow"
                disabled={!searchQuery.trim()}
              >
                Search
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </header>
  );
}
