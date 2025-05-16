import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface CreatePromptButtonProps {
  chatId: string;
  messageContent: string;
}

export function CreatePromptButton({ chatId, messageContent }: CreatePromptButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleCreatePrompt = async () => {
    setIsLoading(true);
    try {
      const res = await apiRequest("POST", `/api/chats/${chatId}/create-prompt`, {
        messageContent
      });
      const data = await res.json();
      
      if (data.success) {
        toast({
          title: "Success",
          description: "Implementation prompt created successfully",
        });
      } else {
        throw new Error(data.message || "Failed to create implementation prompt");
      }
    } catch (error) {
      console.error("Error creating implementation prompt:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create implementation prompt",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleCreatePrompt}
      disabled={isLoading}
      className="w-full bg-primary hover:bg-primary/90"
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Creating Prompt...
        </>
      ) : (
        "Create Implementation Prompt"
      )}
    </Button>
  );
}
