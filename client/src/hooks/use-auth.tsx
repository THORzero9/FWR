import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type User = {
  id: number;
  username: string;
  email: string;
};

type LoginData = {
  username: string;
  password: string;
  rememberMe?: boolean;
};

type RegisterData = {
  username: string;
  email: string;
  password: string;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, RegisterData>;
};

// AUTH_KEY constant removed - no more localStorage

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  // storedUser state and associated useEffect removed
  
  const {
    data: user,
    error,
    isLoading,
    // refetch // refetch might still be useful if needed explicitly
  } = useQuery<User | null, Error>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      // console.log("Fetching user data"); // storedUser logic removed
      
      // Always fetch from /api/user to determine auth state via session cookie
      try {
        // console.log("Making API request to /api/user");
        const res = await fetch("/api/user", {
          credentials: "include", // Ensures cookies are sent
        });
        
        // console.log("API response status:", res.status);
        
        if (res.status === 401) {
          // console.log("User not authenticated");
          return null; // Not logged in
        }
        if (!res.ok) {
          // Handle other non-401 errors if necessary
          throw new Error(`API request failed: ${res.status} ${res.statusText}`);
        }
        
        const userData = await res.json();
        // console.log("User data from API:", userData);
        return userData;
      } catch (e) {
        // console.error("Error fetching user:", e);
        // Do not treat network errors as "not logged in", let error propagate
        // or handle specific error types if needed. For now, return null.
        // This query should ideally not throw for auth status, but for network/server errors.
        // If it's a network error, React Query will handle it.
        // If it's a 401, we return null. Other errors could be thrown or returned as error objects.
        if (e instanceof Error && e.message.includes("401")) {
            return null;
        }
        throw e; // Re-throw other errors to be handled by React Query's error state
      }
    },
    initialData: null, // Start with no user, rely on fetch
    staleTime: 5 * 60 * 1000, // Cache user data for 5 minutes
    refetchOnWindowFocus: true, 
    refetchOnMount: true, // Ensures user state is checked on mount
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      // console.log("Login mutation called with:", credentials);
      // apiRequest already includes credentials: "include"
      const res = await apiRequest("POST", "/api/login", credentials);
      const userData = await res.json();
      // console.log("Login response:", userData);
      // localStorage.setItem and setStoredUser removed
      return userData;
    },
    onSuccess: (user: User) => {
      // console.log("Login successful, updating query data and redirecting");
      queryClient.setQueryData(["/api/user"], user); // Update React Query cache
      
      window.location.href = "/"; // Redirect
      
      toast({
        title: "Login successful",
        description: `Welcome back, ${user.username}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: RegisterData) => {
      // console.log("Register mutation called with:", credentials);
      const res = await apiRequest("POST", "/api/register", credentials);
      const userData = await res.json();
      // console.log("Register response:", userData);
      // localStorage.setItem and setStoredUser removed
      return userData;
    },
    onSuccess: (user: User) => {
      // console.log("Registration successful, updating query data and redirecting");
      queryClient.setQueryData(["/api/user"], user); // Update React Query cache
      
      window.location.href = "/"; // Redirect
      
      toast({
        title: "Registration successful",
        description: `Welcome, ${user.username}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      // console.log("Logout mutation called");
      await apiRequest("POST", "/api/logout");
      // localStorage.removeItem and setStoredUser removed
    },
    onSuccess: () => {
      // console.log("Logout successful, updating query data and redirecting");
      queryClient.setQueryData(["/api/user"], null); // Clear user in cache
      
      window.location.href = "/auth"; // Redirect
      
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    },
    onError: (error: Error) => { // Still clear cache on error, as session might be invalid
      queryClient.setQueryData(["/api/user"], null);
      window.location.href = "/auth"; // Redirect to auth page even on logout error
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}