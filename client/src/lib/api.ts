import { apiRequest } from "./queryClient";
import { Chat } from "@shared/schema";

// Chat-related API functions
export const createChat = async (userId: string): Promise<Chat | null> => {
  try {
    const response = await apiRequest("POST", "/api/chats", { userId });
    const data = await response.json();
    
    if (data.success && data.chat) {
      return data.chat;
    }
    return null;
  } catch (error) {
    console.error("Error creating chat:", error);
    return null;
  }
};

export const getChatById = async (chatId: string): Promise<Chat | null> => {
  try {
    const response = await apiRequest("GET", `/api/chats/${chatId}`, undefined);
    const data = await response.json();
    
    if (data.success && data.chat) {
      return data.chat;
    }
    return null;
  } catch (error) {
    console.error("Error getting chat:", error);
    return null;
  }
};

export const getUserChats = async (userId: string): Promise<Chat[]> => {
  try {
    const response = await apiRequest("GET", `/api/chats?userId=${userId}`, undefined);
    const data = await response.json();
    
    if (data.success && data.chats) {
      return data.chats;
    }
    return [];
  } catch (error) {
    console.error("Error getting user chats:", error);
    return [];
  }
};

export const sendMessage = async (chatId: string, content: string): Promise<any> => {
  try {
    const response = await apiRequest("POST", `/api/chats/${chatId}/messages`, { content });
    return await response.json();
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
};

export const generateDiagram = async (chatId: string): Promise<{imageUrl: string, mermaidSyntax: string} | null> => {
  try {
    const response = await apiRequest("POST", `/api/chats/${chatId}/generate-diagram`, {});
    const data = await response.json();
    
    if (data.success && data.diagram) {
      return data.diagram;
    }
    return null;
  } catch (error) {
    console.error("Error generating diagram:", error);
    return null;
  }
};

export const generateAiSuggestions = async (chatId: string): Promise<Chat | null> => {
  try {
    const response = await apiRequest("POST", `/api/chats/${chatId}/generate-suggestions`, {});
    const data = await response.json();
    
    if (data.success && data.chat) {
      return data.chat;
    }
    return null;
  } catch (error) {
    console.error("Error generating AI suggestions:", error);
    return null;
  }
};

export const createImplementationPrompt = async (description: string): Promise<string | null> => {
  try {
    const response = await apiRequest("POST", `/api/create-implementation-prompt`, { description });
    const data = await response.json();
    
    if (data.success && data.prompt) {
      return data.prompt;
    }
    return null;
  } catch (error) {
    console.error("Error creating implementation prompt:", error);
    return null;
  }
};
