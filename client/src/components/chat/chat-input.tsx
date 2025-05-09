import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { TextareaAutosize } from "@/components/ui/textarea-autosize";
import { useToast } from "@/hooks/use-toast";
import { useChat } from "@/hooks/use-chat";
import { Loader2 } from "lucide-react";
import { ApiError } from "@/lib/queryClient";

interface ChatInputProps {
  chatId: string;
  onMessageSent: (messages: any) => void;
  disabled?: boolean;
}

// Debounce timer (in ms) - set to 0 to disable client-side debounce
// Server-side deduplication is sufficient, so we'll disable client-side
const DEBOUNCE_TIME = 0;

export function ChatInput({ chatId, onMessageSent, disabled = false }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { sendMessage } = useChat();
  
  // Track last submitted message to prevent duplicates
  const lastMessageRef = useRef<{ text: string; timestamp: number } | null>(null);
  
  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      lastMessageRef.current = null;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedMessage = message.trim();
    
    // Don't send if empty or already sending
    if (!trimmedMessage || isSubmitting || disabled) return;
    
    // Check if this is a duplicate message sent within debounce window
    const now = Date.now();
    if (
      lastMessageRef.current && 
      lastMessageRef.current.text === trimmedMessage &&
      (now - lastMessageRef.current.timestamp) < DEBOUNCE_TIME
    ) {
      console.log("Preventing duplicate message submission", trimmedMessage);
      toast({
        title: "Slow down",
        description: "Please wait a moment before sending the same message again.",
        variant: "default",
      });
      return;
    }
    
    // Update last message reference
    lastMessageRef.current = {
      text: trimmedMessage,
      timestamp: now
    };
    
    setIsSubmitting(true);

    try {
      await sendMessage(trimmedMessage);
      setMessage("");
    } catch (error: any) {
      console.error("Error sending message:", error);
      
      // Handle ApiError with specific response handling
      if (error instanceof ApiError) {
        // Check if it's a duplicate message error (HTTP 429)
        if (error.response.status === 429) {
          toast({
            title: "Message already sent",
            description: "This message is already being processed. Please wait a moment.",
            variant: "default",
          });
          return;
        }
        
        // If we have responseData, use it for a more specific error message
        if (error.responseData) {
          toast({
            title: "Error",
            description: error.responseData.message || "Failed to send message",
            variant: "destructive",
          });
          return;
        }
      }
      
      // Handle other error cases by checking message
      if (error.message && error.message.includes('Duplicate message detected')) {
        toast({
          title: "Duplicate message",
          description: "This message is a duplicate. Please try a different message.",
          variant: "default",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to send message. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="border-t border-gray-200 bg-white p-4">
      <form onSubmit={handleSubmit} className="flex items-end space-x-2">
        <div className="flex-1">
          <TextareaAutosize
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            minRows={2}
            maxRows={5}
            disabled={disabled || isSubmitting}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
        </div>
        <Button
          type="submit"
          className="bg-primary-600 text-white rounded-lg p-2 h-10 w-10 flex items-center justify-center hover:bg-primary-700"
          disabled={disabled || isSubmitting || !message.trim()}
          aria-label="Send"
        >
          {isSubmitting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          )}
        </Button>
      </form>
    </div>
  );
}
