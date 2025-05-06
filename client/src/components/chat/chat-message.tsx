import { cn } from "@/lib/utils";
import { Markdown } from "@/components/ui/markdown";
import { CreatePromptButton } from "@/components/chat/create-prompt-button";
import { ViewDiagramButton } from "@/components/chat/view-diagram-button";
import { Message } from "@shared/schema";

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
  
  // Check if message contains an implementation prompt section
  const hasImplementationPrompt = message.content.includes("Implementation Prompt:") && 
                                 !isUser;
  
  // Check if message asks about viewing diagram
  const hasViewDiagramOption = message.content.includes("View Diagram") &&
                              !isUser &&
                              message.content.includes("workflow diagram");
  
  // Extract the implementation prompt section if it exists
  const extractPrompt = (content: string) => {
    const promptRegex = /Implementation Prompt:[\s\S]*?(?=\n\n|$)/;
    const match = content.match(promptRegex);
    return match ? match[0] : "";
  };
  
  const prompt = hasImplementationPrompt ? extractPrompt(message.content) : "";

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
          "rounded-lg shadow-sm p-4 max-w-3xl",
          isUser 
            ? "bg-primary-50 ml-12" 
            : "bg-white"
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="markdown">
            <Markdown content={message.content} />
          </div>
        )}
        
        {/* View Diagram Button */}
        {hasViewDiagramOption && isLastMessage && (
          <div className="mt-4 pt-3 border-t border-gray-200">
            <ViewDiagramButton onClick={onViewDiagram} />
          </div>
        )}
        
        {/* Create Prompt Button */}
        {hasImplementationPrompt && (
          <div className="mt-4 pt-3 border-t border-gray-200">
            <CreatePromptButton prompt={prompt} />
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex-shrink-0 ml-3">
          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-700 font-medium">
            {userInitials}
          </div>
        </div>
      )}
    </div>
  );
}
