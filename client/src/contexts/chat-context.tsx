import { createContext, useState, useEffect, ReactNode } from "react";
import { Chat, Message } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

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

interface ChatProviderProps {
  children: ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Load chats when user changes
  useEffect(() => {
    if (user) {
      refreshChats();
    } else {
      setChats([]);
      setActiveChat(null);
    }
  }, [user]);

  const refreshChats = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const res = await apiRequest("GET", `/api/chats?userId=${user.id}`, undefined);
      const data = await res.json();

      if (data.success) {
        setChats(data.chats);
        
        // If we have an active chat, update it with the refreshed data
        if (activeChat) {
          const updatedActiveChat = data.chats.find((chat: Chat) => chat.id === activeChat.id);
          if (updatedActiveChat) {
            setActiveChat(updatedActiveChat);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching chats:", error);
      toast({
        title: "Error",
        description: "Failed to load chat history",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadChatById = async (chatId: string) => {
    setIsLoading(true);
    try {
      const res = await apiRequest("GET", `/api/chats/${chatId}`, undefined);
      const data = await res.json();

      if (data.success) {
        setActiveChat(data.chat);
        return data.chat;
      }
      return null;
    } catch (error) {
      console.error("Error loading chat:", error);
      toast({
        title: "Error",
        description: "Failed to load chat",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const createNewChat = async () => {
    if (!user) return null;

    setIsLoading(true);
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
      console.error("Error creating new chat:", error);
      toast({
        title: "Error",
        description: "Failed to create new workflow chat",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (content: string) => {
    if (!activeChat) return;

    setIsLoading(true);
    try {
      const res = await apiRequest("POST", `/api/chats/${activeChat.id}/messages`, { content });
      const data = await res.json();

      if (data.success) {
        // Update the active chat with the new messages and potentially updated chat data
        setActiveChat(data.chat);
        
        // Also refresh the chat list to update any titles that might have changed
        refreshChats();
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateAiSuggestions = async () => {
    if (!activeChat) return;

    setIsLoading(true);
    try {
      const res = await apiRequest("POST", `/api/chats/${activeChat.id}/generate-suggestions`, {});
      const data = await res.json();

      if (data.success) {
        // Update the active chat with the AI suggestions
        setActiveChat(data.chat);
        
        // Create a message with the AI suggestions
        if (data.chat.ai_suggestions_markdown) {
          await apiRequest("POST", `/api/chats/${activeChat.id}/messages`, { 
            content: data.chat.ai_suggestions_markdown
          });
          
          // Reload the chat to get the updated messages
          await loadChatById(activeChat.id);
        }
        
        // Also refresh the chat list
        await refreshChats();
      }
    } catch (error) {
      console.error("Error generating AI suggestions:", error);
      toast({
        title: "Error",
        description: "Failed to generate AI suggestions",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ChatContext.Provider
      value={{
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
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}
