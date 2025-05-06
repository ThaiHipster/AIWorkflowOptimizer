import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Chat } from "@shared/schema";
import { useMobile } from "@/hooks/use-mobile";

interface ChatHistoryProps {
  chats: Chat[];
  activeChatId: string | null;
  onChatSelect: (chatId: string) => void;
  onNewChat: () => void;
  className?: string;
}

export function ChatHistory({
  chats,
  activeChatId,
  onChatSelect,
  onNewChat,
  className,
}: ChatHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useMobile();

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const formatChatDate = (date: Date | string) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };

  // For mobile view
  if (isMobile) {
    return (
      <>
        {/* Mobile toggle button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
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
            <h2 className="text-lg font-medium text-gray-900">Chat History</h2>
            <Button variant="ghost" size="icon" onClick={toggleSidebar}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="p-4">
            <Button
              onClick={() => {
                onNewChat();
                setIsOpen(false);
              }}
              className="w-full bg-primary-600 text-white hover:bg-primary-700"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              New Workflow
            </Button>
          </div>

          <div className="py-2 overflow-y-auto max-h-[calc(100vh-140px)]">
            {chats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => {
                  onChatSelect(chat.id);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full text-left px-4 py-3 hover:bg-gray-50 focus:outline-none focus:bg-gray-50 transition duration-150 ease-in-out border-l-4",
                  chat.id === activeChatId
                    ? "border-primary-500 bg-primary-50"
                    : "border-transparent hover:border-primary-300"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="overflow-hidden">
                    <h3 className="text-sm font-medium text-gray-900 truncate max-w-[180px]">
                      {chat.title || "New Workflow"}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatChatDate(chat.created_at)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-xs px-2 py-1 rounded-full",
                      chat.completed
                        ? "bg-gray-100 text-gray-600"
                        : "bg-green-100 text-green-800"
                    )}
                  >
                    {chat.completed ? "Completed" : "Active"}
                  </span>
                </div>
              </button>
            ))}

            {chats.length === 0 && (
              <div className="px-4 py-8 text-center text-gray-500">
                <p>No chat history yet</p>
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
        "w-80 bg-white shadow-md overflow-y-auto border-r border-gray-200 hidden md:block",
        className
      )}
    >
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h2 className="text-lg font-medium text-gray-900">Chat History</h2>
      </div>

      <div className="p-4">
        <Button
          onClick={onNewChat}
          className="w-full bg-primary-600 text-white hover:bg-primary-700"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          New Workflow
        </Button>
      </div>

      <div className="py-2">
        {chats.map((chat) => (
          <button
            key={chat.id}
            onClick={() => onChatSelect(chat.id)}
            className={cn(
              "w-full text-left px-4 py-3 hover:bg-gray-50 focus:outline-none focus:bg-gray-50 transition duration-150 ease-in-out border-l-4",
              chat.id === activeChatId
                ? "border-primary-500 bg-primary-50"
                : "border-transparent hover:border-primary-300"
            )}
          >
            <div className="flex items-start justify-between">
              <div className="overflow-hidden">
                <h3 className="text-sm font-medium text-gray-900 truncate max-w-[180px]">
                  {chat.title || "New Workflow"}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {formatChatDate(chat.created_at)}
                </p>
              </div>
              <span
                className={cn(
                  "text-xs px-2 py-1 rounded-full",
                  chat.completed
                    ? "bg-gray-100 text-gray-600"
                    : "bg-green-100 text-green-800"
                )}
              >
                {chat.completed ? "Completed" : "Active"}
              </span>
            </div>
          </button>
        ))}

        {chats.length === 0 && (
          <div className="px-4 py-8 text-center text-gray-500">
            <p>No chat history yet</p>
            <p className="text-sm mt-2">
              Create a new workflow to get started
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
