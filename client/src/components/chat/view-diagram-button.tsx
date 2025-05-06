import { Button } from "@/components/ui/button";
import { Layout } from "lucide-react";

interface ViewDiagramButtonProps {
  onClick: () => void;
}

export function ViewDiagramButton({ onClick }: ViewDiagramButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="bg-primary-50 hover:bg-primary-100 text-primary-700 border-primary-100"
      onClick={onClick}
    >
      <Layout className="h-4 w-4 mr-1" />
      View Workflow Diagram
    </Button>
  );
}
