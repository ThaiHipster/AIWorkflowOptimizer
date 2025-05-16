import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Chat } from "@shared/schema";
import { useMobile } from "@/hooks/use-mobile";
import { useChat } from "@/hooks/use-chat";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface ChatHistoryProps {
  className?: string;
}

export function ChatHistory({ className }: ChatHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useMobile();
  const { chats, activeChat, isLoading, setActiveChat, createNewChat } = useChat();

  // Additional query for real-time updates
  const { data: realtimeChats = chats } = useQuery({
    queryKey: ['/api/chats/realtime'],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/chats/realtime");
        const data = await res.json();
        return data.success ? data.chats : chats;
      } catch (error) {
        console.error("Error fetching realtime chats:", error);
        return chats;
      }
    },
    refetchInterval: 2000, // Refetch every 2 seconds
    refetchOnWindowFocus: true,
  });

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const formatChatDate = (date: Date | string) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };

  const handleChatSelect = (chatId: string) => {
    const selectedChat = realtimeChats.find((chat: Chat) => chat.id === chatId);
    if (selectedChat) {
      setActiveChat(selectedChat);
    }
    if (isMobile) {
      setIsOpen(false);
    }
  };

  const handleNewChat = async () => {
    await createNewChat();
    if (isMobile) {
      setIsOpen(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // For mobile view
  if (isMobile) {
    return (
      <>
        {/* Mobile toggle button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden fixed top-4 left-4 z-50"
          onClick={toggleSidebar}
          aria-label="Toggle chat history"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
          </svg>
        </Button>

        {/* Mobile sidebar */}
        <div
          className={cn(
            "fixed inset-0 z-40 bg-white transform transition-transform duration-300 ease-in-out md:hidden",
            isOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Workflow History</h2>
            <Button variant="ghost" size="icon" onClick={toggleSidebar}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="p-4">
            <Button
              onClick={handleNewChat}
              className="w-full bg-primary text-white hover:bg-primary/90"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              New Workflow
            </Button>
          </div>

          <div className="py-2 overflow-y-auto max-h-[calc(100vh-140px)]">
            {realtimeChats.map((chat: Chat) => (
              <button
                key={chat.id}
                onClick={() => handleChatSelect(chat.id)}
                className={cn(
                  "w-full text-left px-4 py-3 hover:bg-accent focus:outline-none focus:bg-accent transition duration-150 ease-in-out border-l-4",
                  activeChat?.id === chat.id
                    ? "border-primary bg-accent"
                    : "border-transparent hover:border-primary/50"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="overflow-hidden">
                    <h3 className="text-sm font-medium text-foreground truncate max-w-[180px]">
                      {chat.title || "New Workflow"}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatChatDate(chat.created_at)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-xs px-2 py-1 rounded-full",
                      chat.completed
                        ? "bg-muted text-muted-foreground"
                        : "bg-green-100 text-green-800"
                    )}
                  >
                    {chat.completed ? "Completed" : "Active"}
                  </span>
                </div>
              </button>
            ))}

            {realtimeChats.length === 0 && (
              <div className="px-4 py-8 text-center text-muted-foreground">
                <p>No workflow history yet</p>
                <p className="text-sm mt-2">
                  Create a new workflow to get started
                </p>
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  // Desktop view
  return (
    <aside
      className={cn(
        "w-80 bg-background border-r border-border overflow-y-auto hidden md:block h-full",
        className
      )}
    >
      <div className="p-4 border-b border-border bg-muted/50">
        <h2 className="text-lg font-medium text-foreground">Workflow History</h2>
      </div>

      <div className="p-4">
        <Button
          onClick={handleNewChat}
          className="w-full"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          New Workflow
        </Button>
      </div>

      <div className="py-2">
        {realtimeChats.map((chat: Chat) => (
          <button
            key={chat.id}
            onClick={() => handleChatSelect(chat.id)}
            className={cn(
              "w-full text-left px-4 py-3 hover:bg-accent focus:outline-none focus:bg-accent transition duration-150 ease-in-out border-l-4",
              activeChat?.id === chat.id
                ? "border-primary bg-accent"
                : "border-transparent hover:border-primary/50"
            )}
          >
            <div className="flex items-start justify-between">
              <div className="overflow-hidden">
                <h3 className="text-sm font-medium text-foreground truncate max-w-[180px]">
                  {chat.title || "New Workflow"}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatChatDate(chat.created_at)}
                </p>
              </div>
              <span
                className={cn(
                  "text-xs px-2 py-1 rounded-full",
                  chat.completed
                    ? "bg-muted text-muted-foreground"
                    : "bg-green-100 text-green-800"
                )}
              >
                {chat.completed ? "Completed" : "Active"}
              </span>
            </div>
          </button>
        ))}

        {realtimeChats.length === 0 && (
          <div className="px-4 py-8 text-center text-muted-foreground">
            <p>No workflow history yet</p>
            <p className="text-sm mt-2">
              Create a new workflow to get started
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
