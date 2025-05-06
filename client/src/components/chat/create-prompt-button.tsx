import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ClipboardCopy, Check, LucideWand2 } from "lucide-react";
import { createImplementationPrompt } from "@/lib/api";

interface CreatePromptButtonProps {
  prompt: string;
}

export function CreatePromptButton({ prompt }: CreatePromptButtonProps) {
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null);
  const { toast } = useToast();

  const handleCopy = () => {
    const textToCopy = generatedPrompt || prompt;
    navigator.clipboard.writeText(textToCopy)
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

  const handleGeneratePrompt = async () => {
    setIsGenerating(true);
    try {
      // Extract the opportunity description from the prompt
      // Assuming the prompt starts with "Implementation Prompt:" and has description after it
      const description = prompt.replace("Implementation Prompt:", "").trim();
      
      const result = await createImplementationPrompt(description);
      
      if (result) {
        setGeneratedPrompt(result);
        toast({
          title: "Prompt generated",
          description: "A detailed implementation prompt has been created",
        });
      } else {
        toast({
          title: "Failed to generate prompt",
          description: "Could not create a detailed implementation prompt. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error generating implementation prompt:", error);
      toast({
        title: "Error",
        description: "An error occurred while generating the implementation prompt",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex space-x-2">
      {!generatedPrompt ? (
        <Button
          variant="outline"
          size="sm"
          className="bg-primary-50 hover:bg-primary-100 text-primary-700 border-primary-100"
          onClick={handleGeneratePrompt}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <div className="h-4 w-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mr-1"></div>
              Generating...
            </>
          ) : (
            <>
              <LucideWand2 className="h-4 w-4 mr-1" />
              Generate Detailed Prompt
            </>
          )}
        </Button>
      ) : (
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
      )}
    </div>
  );
}
