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
      // If we have a stored user, use that instead of making a network request
      if (storedUser) return storedUser;
      
      try {
        const res = await apiRequest("GET", "/api/user");
        if (res.status === 401) return null;
        return await res.json();
      } catch (e) {
        return null;
      }
    },
    initialData: storedUser
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      // For demo purposes, just simulate login response
      // In a real app, you would make a real API call
      return new Promise<User>((resolve) => {
        setTimeout(() => {
          const mockUser = {
            id: 1,
            username: credentials.username,
            email: `${credentials.username}@example.com`,
          };
          
          // Store in localStorage for persistence
          localStorage.setItem(AUTH_KEY, JSON.stringify(mockUser));
          setStoredUser(mockUser);
          
          resolve(mockUser);
        }, 500);
      });
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user"], user);
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
      // For demo purposes, just simulate registration response
      // In a real app, you would make a real API call
      return new Promise<User>((resolve) => {
        setTimeout(() => {
          const mockUser = {
            id: 1,
            username: credentials.username,
            email: credentials.email,
          };
          
          // Store in localStorage for persistence
          localStorage.setItem(AUTH_KEY, JSON.stringify(mockUser));
          setStoredUser(mockUser);
          
          resolve(mockUser);
        }, 500);
      });
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user"], user);
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
      // For demo purposes, just clear local storage
      // In a real app, you would make a real API call
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          localStorage.removeItem(AUTH_KEY);
          setStoredUser(null);
          resolve();
        }, 500);
      });
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
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