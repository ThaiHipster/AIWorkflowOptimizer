import { cn } from "@/lib/utils";
import { Markdown } from "@/components/ui/markdown";
import { CreatePromptButton } from "@/components/chat/create-prompt-button";
import { ViewDiagramButton } from "@/components/chat/view-diagram-button";
import { Message } from "@shared/schema";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface ChatMessageProps {
  message: Message;
  isLastMessage: boolean;
  userInitials: string;
  chatId: string;
  onViewDiagram: () => void;
}

export function ChatMessage({ 
  message, 
  isLastMessage, 
  userInitials,
  chatId,
  onViewDiagram
}: ChatMessageProps) {
  const isUser = message.role === "user";
  const [localMessage, setLocalMessage] = useState(message);

  // Query for real-time message updates
  const { data: updatedMessage } = useQuery({
    queryKey: ['/api/chats', chatId, 'messages', message.id],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", `/api/chats/${chatId}/messages/${message.id}`);
        const data = await res.json();
        return data.success ? data.message : message;
      } catch (error) {
        console.error("Error fetching message update:", error);
        return message;
      }
    },
    refetchInterval: 2000, // Refetch every 2 seconds
    refetchOnWindowFocus: true,
  });

  // Update local message when new data arrives
  useEffect(() => {
    if (updatedMessage) {
      setLocalMessage(updatedMessage);
    }
  }, [updatedMessage]);

  // Check if this message has the view diagram option
  const hasViewDiagramOption = 
    !isUser && 
    isLastMessage && 
    localMessage.content.toLowerCase().includes("diagram") &&
    localMessage.content.toLowerCase().includes("generated");

  return (
    <div
      className={cn(
        "flex items-start mb-4",
        isUser ? "justify-end" : ""
      )}
    >
      {!isUser && (
        <div className="flex-shrink-0 mr-3">
          <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-primary-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </div>
        </div>
      )}

      <div
        className={cn(
          "rounded-lg shadow-md p-5 max-w-3xl",
          isUser 
            ? "bg-primary-50 ml-12 border border-primary-100" 
            : "bg-white border border-gray-100"
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap text-gray-800 leading-relaxed">{localMessage.content}</p>
        ) : (
          <div className="markdown overflow-hidden">
            <Markdown content={localMessage.content} className="text-sm sm:text-base" />
          </div>
        )}
        
        {/* View Diagram Button */}
        {hasViewDiagramOption && isLastMessage && (
          <div className="mt-5 pt-4 border-t border-gray-200">
            <ViewDiagramButton onClick={onViewDiagram} />
          </div>
        )}
        
        {/* Create Prompt Buttons for AI Suggestions */}
        {!isUser && localMessage.content.includes("| Step/Pain-point |") && (
          <div className="mt-5 pt-4 border-t border-gray-200">
            <CreatePromptButton 
              chatId={chatId}
              messageContent={localMessage.content}
            />
          </div>
        )}
      </div>
    </div>
  );
}
