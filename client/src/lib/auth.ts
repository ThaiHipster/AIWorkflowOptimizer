import { apiRequest } from "./queryClient";
import { Login, User } from "@shared/schema";

export const login = async (
  credentials: Login
): Promise<{ success: boolean; user?: User; error?: string }> => {
  try {
    const response = await apiRequest("POST", "/api/auth/login", credentials);
    const data = await response.json();

    if (data.success && data.user) {
      // Store user data in localStorage for persistent login
      localStorage.setItem("user", JSON.stringify(data.user));
      return { success: true, user: data.user };
    } else {
      return { success: false, error: data.message || "Login failed" };
    }
  } catch (error) {
    console.error("Login error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unknown error occurred",
    };
  }
};

export const logout = (): void => {
  // Clear user data from localStorage
  localStorage.removeItem("user");
};

export const getStoredUser = (): User | null => {
  try {
    const userJson = localStorage.getItem("user");
    if (userJson) {
      return JSON.parse(userJson);
    }
    return null;
  } catch (error) {
    console.error("Error retrieving stored user:", error);
    return null;
  }
};
