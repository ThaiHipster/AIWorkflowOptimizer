import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TextareaAutosize } from "@/components/ui/textarea-autosize";
import { useToast } from "@/hooks/use-toast";
import { useChat } from "@/hooks/use-chat";
import { Loader2 } from "lucide-react";

interface ChatInputProps {
  chatId: string;
  onMessageSent: (messages: any) => void;
  disabled?: boolean;
}

export function ChatInput({ chatId, onMessageSent, disabled = false }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { sendMessage } = useChat();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim() || isSubmitting || disabled) return;

    setIsSubmitting(true);

    try {
      await sendMessage(message.trim());
      setMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
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
