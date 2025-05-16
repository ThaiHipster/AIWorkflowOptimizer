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

  // Fetch user's chats with automatic refetching
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
    refetchInterval: 5000, // Refetch every 5 seconds
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });

  // Query for active chat with automatic refetching
  const { 
    data: activeChatData,
    isLoading: isActiveChatLoading,
    refetch: refetchActiveChat
  } = useQuery({
    queryKey: ['/api/chats', activeChat?.id],
    queryFn: async () => {
      if (!activeChat?.id) return null;
      try {
        const res = await apiRequest("GET", `/api/chats/${activeChat.id}`);
        const data = await res.json();
        return data.success ? data.chat : null;
      } catch (error) {
        console.error("Error fetching active chat:", error);
        return null;
      }
    },
    enabled: !!activeChat?.id,
    refetchInterval: 2000, // Refetch every 2 seconds
    refetchOnWindowFocus: true,
  });

  // Update active chat when data changes
  useEffect(() => {
    if (activeChatData) {
      setActiveChat(activeChatData);
    }
  }, [activeChatData]);

  // Keep track of overall loading state
  const isLoading = isChatsLoading || isActiveChatLoading || manualLoading;

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
        await refetchChats(); // Use refetchChats instead of refreshChats
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
          // Invalidate and refetch both the chats list and active chat
          await Promise.all([
            refetchChats(),
            refetchActiveChat()
          ]);
          return data;
        }
        throw new Error("Request failed");
      } catch (error) {
        console.error("Error sending message:", error);
        throw error;
      } finally {
        setManualLoading(false);
        delete messageRequestsInProgress.current[requestKey];
      }
    })();
    
    // Store the promise
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
          
          // Invalidate and refetch both the chats list and active chat
          await Promise.all([
            refetchChats(),
            refetchActiveChat()
          ]);
        }
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
