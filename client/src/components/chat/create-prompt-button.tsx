import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ClipboardCopy, Check } from "lucide-react";

interface CreatePromptButtonProps {
  prompt: string;
}

export function CreatePromptButton({ prompt }: CreatePromptButtonProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt)
      .then(() => {
        setCopied(true);
        toast({
          title: "Copied to clipboard",
          description: "Implementation prompt has been copied to your clipboard",
        });
        
        // Reset the copied state after 2 seconds
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => {
        console.error("Failed to copy:", err);
        toast({
          title: "Failed to copy",
          description: "Could not copy to clipboard. Please try again.",
          variant: "destructive",
        });
      });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="bg-primary-50 hover:bg-primary-100 text-primary-700 border-primary-100"
      onClick={handleCopy}
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 mr-1" />
          Copied!
        </>
      ) : (
        <>
          <ClipboardCopy className="h-4 w-4 mr-1" />
          Copy Prompt
        </>
      )}
    </Button>
  );
}
