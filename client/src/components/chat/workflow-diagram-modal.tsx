import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { WorkflowCanvas } from '@/components/workflow/WorkflowCanvas';
import { generateDiagram } from '@/lib/api';

interface WorkflowDiagramModalProps {
  chatId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface DiagramData {
  nodes: Array<{
    id: string;
    label: string;
    type: 'start' | 'end' | 'step';
    position: { x: number; y: number };
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    label?: string;
  }>;
}

function parseMermaidToDiagramData(mermaidSyntax: string): DiagramData {
  const nodes: DiagramData['nodes'] = [];
  const edges: DiagramData['edges'] = [];
  const nodePositions: Record<string, { x: number; y: number }> = {};
  
  // Split the Mermaid syntax into lines
  const lines = mermaidSyntax.split('\n');
  
  // Calculate initial positions
  let yOffset = 100;
  const xSpacing = 200;
  const ySpacing = 150;
  
  // First pass: identify nodes and their types
  lines.forEach(line => {
    const trimmedLine = line.trim();
    
    // Skip empty lines and comments
    if (!trimmedLine || trimmedLine.startsWith('%')) return;
    
    // Parse node definitions
    if (trimmedLine.includes('[') && trimmedLine.includes(']')) {
      const match = trimmedLine.match(/(\w+)\s*\[(.*?)\]/);
      if (match) {
        const [, id, label] = match;
        const type = id.toLowerCase().includes('start') ? 'start' :
                    id.toLowerCase().includes('end') ? 'end' : 'step';
        
        nodes.push({
          id,
          label,
          type,
          position: { x: 0, y: 0 } // Will be updated in the next pass
        });
      }
    }
    
    // Parse edge definitions
    if (trimmedLine.includes('-->')) {
      const [source, target] = trimmedLine.split('-->').map(s => s.trim());
      const sourceId = source.replace(/\[.*?\]/, '');
      const targetId = target.replace(/\[.*?\]/, '');
      
      // Extract label if present
      const labelMatch = target.match(/\[(.*?)\]/);
      const label = labelMatch ? labelMatch[1] : undefined;
      
      edges.push({
        id: `${sourceId}-${targetId}`,
        source: sourceId,
        target: targetId,
        label
      });
    }
  });
  
  // Second pass: calculate positions
  const nodeLevels: Record<string, number> = {};
  const visited = new Set<string>();
  
  // Find start nodes (nodes with no incoming edges)
  const startNodes = nodes.filter(node => 
    !edges.some(edge => edge.target === node.id)
  );
  
  // Assign levels using BFS
  const queue = startNodes.map(node => ({ node, level: 0 }));
  while (queue.length > 0) {
    const { node, level } = queue.shift()!;
    if (visited.has(node.id)) continue;
    
    visited.add(node.id);
    nodeLevels[node.id] = level;
    
    // Add connected nodes to queue
    edges
      .filter(edge => edge.source === node.id)
      .forEach(edge => {
        const targetNode = nodes.find(n => n.id === edge.target);
        if (targetNode) {
          queue.push({ node: targetNode, level: level + 1 });
        }
      });
  }
  
  // Calculate positions based on levels
  const levelNodes: Record<number, string[]> = {};
  Object.entries(nodeLevels).forEach(([nodeId, level]) => {
    if (!levelNodes[level]) levelNodes[level] = [];
    levelNodes[level].push(nodeId);
  });
  
  Object.entries(levelNodes).forEach(([level, nodeIds]) => {
    const levelNum = parseInt(level);
    const xOffset = (window.innerWidth - (nodeIds.length - 1) * xSpacing) / 2;
    
    nodeIds.forEach((nodeId, index) => {
      nodePositions[nodeId] = {
        x: xOffset + index * xSpacing,
        y: yOffset + levelNum * ySpacing
      };
    });
  });
  
  // Update node positions
  nodes.forEach(node => {
    node.position = nodePositions[node.id] || { x: 0, y: 0 };
  });
  
  return { nodes, edges };
}

export function WorkflowDiagramModal({
  chatId,
  isOpen,
  onClose
}: WorkflowDiagramModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diagramData, setDiagramData] = useState<DiagramData | null>(null);

  useEffect(() => {
    if (isOpen && !diagramData) {
      loadDiagram();
    }
  }, [isOpen, diagramData]);

  const loadDiagram = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await generateDiagram(chatId);
      
      if (data && data.mermaidSyntax) {
        const parsedData = parseMermaidToDiagramData(data.mermaidSyntax);
        setDiagramData(parsedData);
      } else {
        throw new Error('No diagram data received');
      }
    } catch (err) {
      setError('Failed to load diagram. Please try again.');
      console.error('Error loading diagram:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh]">
        <DialogHeader>
          <DialogTitle>Workflow Diagram</DialogTitle>
        </DialogHeader>

        <div className="flex-1 relative">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <p className="text-red-500">{error}</p>
              <Button onClick={loadDiagram}>Retry</Button>
            </div>
          ) : diagramData ? (
            <WorkflowCanvas
              nodes={diagramData.nodes}
              edges={diagramData.edges}
              className="h-full"
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
