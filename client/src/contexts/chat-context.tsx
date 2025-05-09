import { createContext, useState, useEffect, ReactNode, useRef } from "react";
import { Chat, Message } from "@shared/schema";
import { apiRequest, queryClient, ApiError } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

interface ChatContextType {
  chats: Chat[];
  activeChat: Chat | null;
  isLoading: boolean;
  setActiveChat: (chat: Chat | null) => void;
  createNewChat: () => Promise<Chat | null>;
  sendMessage: (content: string) => Promise<void>;
  refreshChats: () => Promise<void>;
  generateAiSuggestions: () => Promise<void>;
}

const defaultContextValue: ChatContextType = {
  chats: [],
  activeChat: null,
  isLoading: false,
  setActiveChat: () => {},
  createNewChat: async () => null,
  sendMessage: async () => {},
  refreshChats: async () => {},
  generateAiSuggestions: async () => {},
};

export const ChatContext = createContext<ChatContextType>(defaultContextValue);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [manualLoading, setManualLoading] = useState<boolean>(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch user's chats
  const { 
    data: chats = [], 
    isLoading: isChatsLoading, 
    refetch: refetchChats 
  } = useQuery({
    queryKey: ['/api/chats', user?.id],
    queryFn: async () => {
      if (!user) return [];
      try {
        const res = await apiRequest("GET", `/api/chats?userId=${user.id}`);
        const data = await res.json();
        return data.success ? data.chats : [];
      } catch (error) {
        console.error("Error fetching chats:", error);
        return [];
      }
    },
    enabled: !!user,
  });
  
  // Keep track of overall loading state
  const isLoading = isChatsLoading || manualLoading;

  // Clear active chat when user logs out
  useEffect(() => {
    if (!user) {
      setActiveChat(null);
    }
  }, [user]);

  // Refresh chats data
  const refreshChats = async () => {
    try {
      await refetchChats();
    } catch (error) {
      console.error("Error refreshing chats:", error);
    }
  };

  // Load a specific chat by ID
  const loadChatById = async (chatId: string) => {
    setManualLoading(true);
    try {
      const res = await apiRequest("GET", `/api/chats/${chatId}`);
      const data = await res.json();
      
      if (data.success) {
        setActiveChat(data.chat);
        return data.chat;
      }
      return null;
    } catch (error) {
      console.error("Error loading chat:", error);
      
      if (error instanceof ApiError && error.responseData?.message) {
        toast({
          title: "Error",
          description: error.responseData.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to load chat",
          variant: "destructive",
        });
      }
      return null;
    } finally {
      setManualLoading(false);
    }
  };

  // Create a new chat
  const createNewChat = async () => {
    if (!user) return null;
    
    setManualLoading(true);
    try {
      const res = await apiRequest("POST", "/api/chats", { userId: user.id });
      const data = await res.json();
      
      if (data.success) {
        await refreshChats();
        setActiveChat(data.chat);
        return data.chat;
      }
      return null;
    } catch (error) {
      console.error("Error creating chat:", error);
      
      if (error instanceof ApiError && error.responseData?.message) {
        toast({
          title: "Error",
          description: error.responseData.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to create new workflow",
          variant: "destructive",
        });
      }
      return null;
    } finally {
      setManualLoading(false);
    }
  };

  // Track ongoing message requests to prevent duplicates
  const messageRequestsInProgress = useRef<Record<string, Promise<any>>>({});
  
  // Send a message in the active chat
  const sendMessage = async (content: string) => {
    if (!activeChat) return;
    
    // Create a unique key for this message
    const requestKey = `${activeChat.id}:${content.substring(0, 50)}`;
    
    // Check if we're already processing this message
    if (Object.prototype.hasOwnProperty.call(messageRequestsInProgress.current, requestKey)) {
      console.log(`Message request already in progress: ${requestKey}`);
      return messageRequestsInProgress.current[requestKey];
    }
    
    setManualLoading(true);
    
    // Create the promise for this request
    const requestPromise = (async () => {
      try {
        console.log(`Sending message to chat ${activeChat.id}`);
        const res = await apiRequest("POST", `/api/chats/${activeChat.id}/messages`, { content });
        const data = await res.json();
        
        if (data.success) {
          setActiveChat(data.chat);
          // Refresh chats after a small delay to ensure the backend has processed everything
          setTimeout(() => {
            refreshChats();
          }, 300);
          return data;
        }
        throw new Error("Request failed");
      } catch (error) {
        console.error("Error sending message:", error);
        
        // Handle specific errors with better messages
        if (error instanceof ApiError) {
          // Check for duplicate message error
          if (error.response.status === 429) {
            toast({
              title: "Duplicate Message",
              description: "This message is already being processed",
              variant: "default",
            });
          } else if (error.responseData?.message) {
            // Use the server's specific error message when available
            toast({
              title: "Error",
              description: error.responseData.message,
              variant: "destructive",
            });
          } else {
            // Generic API error
            toast({
              title: "Server Error",
              description: `Error ${error.response.status}: Failed to send message`,
              variant: "destructive",
            });
          }
        } else {
          // Generic error fallback
          toast({
            title: "Error",
            description: "Failed to send message",
            variant: "destructive",
          });
        }
        
        throw error;
      } finally {
        // Clean up after this request finishes
        delete messageRequestsInProgress.current[requestKey];
        setManualLoading(false);
      }
    })();
    
    // Register this promise
    messageRequestsInProgress.current[requestKey] = requestPromise;
    
    return requestPromise;
  };

  // Generate AI suggestions for the active chat
  const generateAiSuggestions = async () => {
    if (!activeChat) return;
    
    setManualLoading(true);
    try {
      const res = await apiRequest("POST", `/api/chats/${activeChat.id}/generate-suggestions`, {});
      const data = await res.json();
      
      if (data.success) {
        setActiveChat(data.chat);
        
        if (data.chat.ai_suggestions_markdown) {
          await apiRequest("POST", `/api/chats/${activeChat.id}/messages`, { 
            content: data.chat.ai_suggestions_markdown 
          });
          
          await loadChatById(activeChat.id);
        }
        
        refreshChats();
      }
    } catch (error) {
      console.error("Error generating AI suggestions:", error);
      
      if (error instanceof ApiError && error.responseData?.message) {
        toast({
          title: "Error",
          description: error.responseData.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to generate AI suggestions",
          variant: "destructive",
        });
      }
    } finally {
      setManualLoading(false);
    }
  };

  const contextValue: ChatContextType = {
    chats,
    activeChat,
    isLoading,
    setActiveChat: async (chat) => {
      if (chat) {
        await loadChatById(chat.id);
      } else {
        setActiveChat(null);
      }
    },
    createNewChat,
    sendMessage,
    refreshChats,
    generateAiSuggestions,
  };

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
}
