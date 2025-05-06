import { cn } from "@/lib/utils";
import { Markdown } from "@/components/ui/markdown";
import { CreatePromptButton } from "@/components/chat/create-prompt-button";
import { ViewDiagramButton } from "@/components/chat/view-diagram-button";
import { Message } from "@shared/schema";
import { useState, useEffect } from "react";

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
  const [aiOpportunities, setAiOpportunities] = useState<{ description: string, index: number }[]>([]);
  const [selectedOpportunity, setSelectedOpportunity] = useState<string | null>(null);
  
  // Check if message contains an implementation prompt section
  const hasImplementationPrompt = message.content.includes("Implementation Prompt:") && 
                                 !isUser;
  
  // Check if message asks about viewing diagram
  const hasViewDiagramOption = message.content.includes("View Diagram") &&
                              !isUser &&
                              message.content.includes("workflow diagram");
  
  // Check if message contains AI suggestions table
  const hasAiSuggestions = !isUser && 
                          (message.content.includes("| Step/Pain-point | Opportunity | Description |") ||
                           message.content.includes("| Opportunity | Description | Complexity |"));
  
  // Extract the implementation prompt section if it exists
  const extractPrompt = (content: string) => {
    const promptRegex = /Implementation Prompt:[\s\S]*?(?=\n\n|$)/;
    const match = content.match(promptRegex);
    return match ? match[0] : "";
  };
  
  // Extract AI opportunities from the message content
  useEffect(() => {
    if (hasAiSuggestions) {
      // Regular expression to match markdown table rows
      const rowRegex = /\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|/g;
      const content = message.content;
      
      const opportunities: { description: string, index: number }[] = [];
      let match;
      let index = 0;
      
      // Skip the header row and separator row by starting the index at 2
      let rowCount = 0;
      
      while ((match = rowRegex.exec(content)) !== null) {
        rowCount++;
        // Skip header and separator rows (first 2 rows typically)
        if (rowCount <= 2) continue;
        
        // Get opportunity name and description from the row
        // Format can be either:
        // | Step/Pain-point | Opportunity | Description | ...
        // or
        // | Opportunity | Description | Complexity | ...
        
        let opportunityName, description;
        
        if (content.includes("| Step/Pain-point | Opportunity | Description |")) {
          // Format: | Step/Pain-point | Opportunity | Description | ...
          opportunityName = match[2].trim();
          description = match[3].trim();
        } else {
          // Format: | Opportunity | Description | Complexity | ...
          opportunityName = match[1].trim();
          description = match[2].trim();
        }
        
        // Combine name and description
        const fullDescription = `${opportunityName}: ${description}`;
        
        opportunities.push({
          description: fullDescription,
          index: index++
        });
      }
      
      setAiOpportunities(opportunities);
    }
  }, [message.content, hasAiSuggestions]);
  
  const prompt = hasImplementationPrompt ? extractPrompt(message.content) : 
                 selectedOpportunity ? `Implementation Prompt: ${selectedOpportunity}` : "";

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
          <p className="whitespace-pre-wrap text-gray-800 leading-relaxed">{message.content}</p>
        ) : (
          <div className="markdown overflow-hidden">
            <Markdown content={message.content} className="text-sm sm:text-base" />
          </div>
        )}
        
        {/* View Diagram Button */}
        {hasViewDiagramOption && isLastMessage && (
          <div className="mt-5 pt-4 border-t border-gray-200">
            <ViewDiagramButton onClick={onViewDiagram} />
          </div>
        )}
        
        {/* Create Prompt Buttons for AI Suggestions */}
        {hasAiSuggestions && aiOpportunities.length > 0 && (
          <div className="mt-5 pt-4 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Generate implementation prompt for:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {aiOpportunities.map((opportunity) => (
                <button
                  key={opportunity.index}
                  className={cn(
                    "text-left px-3.5 py-2.5 rounded-md text-sm hover:bg-gray-100 border transition-colors duration-200 ease-in-out",
                    selectedOpportunity === opportunity.description
                      ? "bg-primary-50 border-primary-200 text-primary-700"
                      : "bg-gray-50 border-gray-200 text-gray-700"
                  )}
                  onClick={() => setSelectedOpportunity(opportunity.description)}
                >
                  {opportunity.description.length > 50 
                    ? opportunity.description.substring(0, 50) + '...' 
                    : opportunity.description}
                </button>
              ))}
            </div>
            
            {selectedOpportunity && (
              <div className="mt-4">
                <CreatePromptButton prompt={`Implementation Prompt: ${selectedOpportunity}`} />
              </div>
            )}
          </div>
        )}
        
        {/* Create Prompt Button for existing prompt */}
        {hasImplementationPrompt && (
          <div className="mt-5 pt-4 border-t border-gray-200">
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
