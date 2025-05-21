import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Header } from "@/components/layout/header";
import { ChatHistory } from "@/components/chat/chat-history";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatMessage } from "@/components/chat/chat-message";
import { WorkflowDiagramModal } from "@/components/chat/workflow-diagram-modal";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useChat } from "@/hooks/use-chat";
import { Button } from "@/components/ui/button";
import { DEFAULT_CHAT_TITLE } from "@shared/constants";

export default function ChatPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { 
    chats, 
    activeChat, 
    isLoading: chatLoading,
    createNewChat,
    setActiveChat,
    sendMessage,
    generateAiSuggestions
  } = useChat();
  const [, setLocation] = useLocation();
  const [diagramModalOpen, setDiagramModalOpen] = useState(false);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Now using ProtectedRoute, so no need to redirect manually

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesContainerRef.current && activeChat?.messages?.length) {
      const container = messagesContainerRef.current;
      container.scrollTop = container.scrollHeight;
    }
  }, [activeChat?.messages]);

  const handleNewChat = async () => {
    await createNewChat();
  };

  const handleChatSelect = (chatId: string) => {
    const selectedChat = chats.find(chat => chat.id === chatId);
    if (selectedChat) {
      setActiveChat(selectedChat);
    }
  };

  const handleMessageSent = (data: any) => {
    // This is handled by the chat context, which will update the active chat
  };

  const handleViewDiagram = () => {
    setDiagramModalOpen(true);
  };

  const handleGenerateAiSuggestions = async () => {
    if (!activeChat) return;
    
    setIsSuggestionsLoading(true);
    try {
      await generateAiSuggestions();
    } finally {
      setIsSuggestionsLoading(false);
    }
  };

  // Generate user initials from company name
  const getUserInitials = (): string => {
    if (!user) return "";
    
    return user.company_name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col z-40">
      <Header />

      <main className="flex-1 flex overflow-hidden">
        {/* Chat History Sidebar */}
        <ChatHistory />

        {/* Chat Content */}
        <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
          {activeChat ? (
            <>
              {/* Status Panel */}
              <div className="bg-white p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-gray-900">
                    {activeChat.title || DEFAULT_CHAT_TITLE}
                  </h2>
                  <div className="flex space-x-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800">
                      Phase {activeChat.phase}: {activeChat.phase === 1 ? "Workflow Mapping" : activeChat.phase === 2 ? "Diagram Generation" : "AI Opportunities"}
                    </span>
                  </div>
                </div>
                
                {/* Workflow Progress Bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-gray-500">Progress</div>
                    <div className="text-xs text-gray-500">
                      Phase {activeChat.phase} of 3
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-primary-600 h-2.5 rounded-full"
                      style={{
                        width: `${(activeChat.phase / 3) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Chat Messages */}
              <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4" id="messages-container">
                {activeChat.messages?.map((message, index) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    isLastMessage={index === activeChat.messages.length - 1}
                    userInitials={getUserInitials()}
                    chatId={activeChat.id}
                    onViewDiagram={handleViewDiagram}
                  />
                ))}
                
                {/* Loading Message */}
                {chatLoading && (
                  <div className="flex items-center justify-center p-4">
                    <div className="h-5 w-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                    <p className="text-sm text-gray-500">Loading...</p>
                  </div>
                )}
                
                {/* Generate AI Suggestions Button (only show in Phase 3) */}
                {activeChat.phase === 3 && !activeChat.ai_suggestions_markdown && (
                  <div className="flex items-center justify-center p-4">
                    <Button 
                      onClick={handleGenerateAiSuggestions}
                      disabled={isSuggestionsLoading}
                      className="bg-primary-600 hover:bg-primary-700"
                    >
                      {isSuggestionsLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Analyzing Workflow...
                        </>
                      ) : (
                        "Generate AI Opportunity Suggestions"
                      )}
                    </Button>
                  </div>
                )}
              </div>

              {/* Input Area */}
              <ChatInput 
                chatId={activeChat.id} 
                onMessageSent={handleMessageSent}
                disabled={chatLoading || isSuggestionsLoading}
              />
              
              {/* Diagram Modal */}
              <WorkflowDiagramModal
                isOpen={diagramModalOpen}
                onClose={() => setDiagramModalOpen(false)}
                chatId={activeChat.id}
                chatTitle={activeChat.title || "Workflow"}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-16 w-16 text-gray-400 mx-auto mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No active workflow
                </h3>
                <p className="text-gray-500 mb-6">
                  Start a new workflow or select one from the history
                </p>
                <Button
                  onClick={handleNewChat}
                  className="bg-primary-600 hover:bg-primary-700"
                >
                  Start {DEFAULT_CHAT_TITLE}
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
      
      {/* Add a spacer to ensure there's room for the debug panel */}
      <div className="h-16"></div>
    </div>
  );
}
