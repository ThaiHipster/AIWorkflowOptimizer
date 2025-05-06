import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TextareaAutosize } from "@/components/ui/textarea-autosize";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ChatInputProps {
  chatId: string;
  onMessageSent: (messages: any) => void;
  disabled?: boolean;
}

export function ChatInput({ chatId, onMessageSent, disabled = false }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim() || isLoading) return;

    setIsLoading(true);

    try {
      const res = await apiRequest("POST", `/api/chats/${chatId}/messages`, {
        content: message.trim(),
      });

      const data = await res.json();
      
      if (data.success) {
        setMessage("");
        onMessageSent(data);
      } else {
        throw new Error(data.message || "Failed to send message");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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
            disabled={disabled || isLoading}
          />
        </div>
        <Button
          type="submit"
          className="bg-primary-600 text-white rounded-lg p-2 h-10 w-10 flex items-center justify-center hover:bg-primary-700"
          disabled={disabled || isLoading || !message.trim()}
          aria-label="Send"
        >
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
        </Button>
      </form>
    </div>
  );
}
