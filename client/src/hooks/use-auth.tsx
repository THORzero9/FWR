import { createContext, ReactNode, useContext, useState, useEffect } from "react";
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

// For demo purposes, we'll use localStorage for persistence
// In a real app, we would use secure cookies or tokens managed by the server
const AUTH_KEY = "freshsave_auth";

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [storedUser, setStoredUser] = useState<User | null>(null);
  
  // Initialize from localStorage
  useEffect(() => {
    const savedAuth = localStorage.getItem(AUTH_KEY);
    if (savedAuth) {
      try {
        setStoredUser(JSON.parse(savedAuth));
      } catch (e) {
        localStorage.removeItem(AUTH_KEY);
      }
    }
  }, []);
  
  const {
    data: user,
    error,
    isLoading,
    refetch
  } = useQuery<User | null, Error>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      console.log("Fetching user data, storedUser:", storedUser);
      
      // If we have a stored user, use that instead of making a network request
      if (storedUser) {
        console.log("Using stored user:", storedUser);
        return storedUser;
      }
      
      try {
        console.log("Making API request to /api/user");
        const res = await fetch("/api/user", {
          credentials: "include",
        });
        
        console.log("API response status:", res.status);
        
        if (res.status === 401) {
          console.log("User not authenticated");
          return null;
        }
        
        const userData = await res.json();
        console.log("User data from API:", userData);
        return userData;
      } catch (e) {
        console.error("Error fetching user:", e);
        return null;
      }
    },
    initialData: storedUser,
    staleTime: 0, // Always refetch when requested
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnMount: true // Refetch when component mounts
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      console.log("Login mutation called with:", credentials);
      try {
        // Use the actual API
        const res = await apiRequest("POST", "/api/login", credentials);
        const userData = await res.json();
        console.log("Login response:", userData);
        
        // Store in localStorage for persistence
        localStorage.setItem(AUTH_KEY, JSON.stringify(userData));
        setStoredUser(userData);
        
        return userData;
      } catch (error) {
        console.error("Login error:", error);
        throw error;
      }
    },
    onSuccess: (user: User) => {
      console.log("Login successful, updating query data and redirecting");
      queryClient.setQueryData(["/api/user"], user);
      
      // Force a page reload to ensure proper auth state
      window.location.href = "/";
      
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
      console.log("Register mutation called with:", credentials);
      try {
        // Use the actual API
        const res = await apiRequest("POST", "/api/register", credentials);
        const userData = await res.json();
        console.log("Register response:", userData);
        
        // Store in localStorage for persistence
        localStorage.setItem(AUTH_KEY, JSON.stringify(userData));
        setStoredUser(userData);
        
        return userData;
      } catch (error) {
        console.error("Register error:", error);
        throw error;
      }
    },
    onSuccess: (user: User) => {
      console.log("Registration successful, updating query data and redirecting");
      queryClient.setQueryData(["/api/user"], user);
      
      // Force a page reload to ensure proper auth state
      window.location.href = "/";
      
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
      console.log("Logout mutation called");
      try {
        // Use the actual API
        await apiRequest("POST", "/api/logout");
        
        // Clear localStorage
        localStorage.removeItem(AUTH_KEY);
        setStoredUser(null);
      } catch (error) {
        console.error("Logout error:", error);
        // Even if the API call fails, clear the local storage
        localStorage.removeItem(AUTH_KEY);
        setStoredUser(null);
        throw error;
      }
    },
    onSuccess: () => {
      console.log("Logout successful, updating query data and redirecting");
      queryClient.setQueryData(["/api/user"], null);
      
      // Force a page reload to ensure proper auth state
      window.location.href = "/auth";
      
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    },
    onError: (error: Error) => {
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