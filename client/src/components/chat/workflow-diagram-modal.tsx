import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X, Download, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface WorkflowDiagramModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string | null;
  chatTitle: string;
}

export function WorkflowDiagramModal({
  isOpen,
  onClose,
  chatId,
  chatTitle
}: WorkflowDiagramModalProps) {
  const [diagramUrl, setDiagramUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && chatId) {
      loadDiagram();
    } else {
      // Clear diagram when modal closes
      setDiagramUrl(null);
      setError(null);
    }
  }, [isOpen, chatId]);

  const loadDiagram = async () => {
    if (!chatId) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await apiRequest("POST", `/api/chats/${chatId}/generate-diagram`, {});
      const data = await res.json();

      if (data.success && data.diagram && data.diagram.imageUrl) {
        setDiagramUrl(data.diagram.imageUrl);
      } else {
        throw new Error(data.message || "Failed to generate diagram");
      }
    } catch (error) {
      console.error("Error generating diagram:", error);
      setError("Failed to generate diagram. Please try again.");
      toast({
        title: "Error",
        description: "Failed to generate workflow diagram",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!diagramUrl) return;

    // Create a temporary anchor element to download the image
    const a = document.createElement("a");
    a.href = diagramUrl;
    a.download = `${chatTitle.replace(/\s+/g, "_")}_diagram.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl w-[90vw] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{chatTitle} Diagram</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
          <DialogDescription>
            Workflow diagram generated based on your description
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-4 min-h-[300px]">
          {isLoading ? (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary-500 mx-auto mb-4" />
                <p className="text-gray-500">Generating workflow diagram...</p>
                <p className="text-xs text-gray-400 mt-2">This may take a moment</p>
              </div>
            </div>
          ) : error ? (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center text-red-500">
                <p>{error}</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={loadDiagram}
                >
                  Try Again
                </Button>
              </div>
            </div>
          ) : diagramUrl ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center justify-center">
              <img 
                src={diagramUrl} 
                alt={`${chatTitle} Workflow Diagram`} 
                className="max-w-full max-h-[60vh]" 
              />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-gray-500">No diagram available</p>
            </div>
          )}
        </div>

        {diagramUrl && (
          <div className="p-4 border-t border-gray-200 flex justify-end">
            <Button onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download Diagram
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
