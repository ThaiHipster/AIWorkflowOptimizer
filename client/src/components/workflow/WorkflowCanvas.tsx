import React, { useRef, useEffect, useState } from 'react';
import { WorkflowNode } from './WorkflowNode';
import { WorkflowEdge } from './WorkflowEdge';
import { cn } from '@/lib/utils';

interface Node {
  id: string;
  label: string;
  type: 'start' | 'end' | 'step';
  position: { x: number; y: number };
}

interface Edge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

interface EdgePosition {
  id: string;
  source: { x: number; y: number };
  target: { x: number; y: number };
  label?: string;
}

interface WorkflowCanvasProps {
  nodes: Node[];
  edges: Edge[];
  className?: string;
}

export function WorkflowCanvas({
  nodes,
  edges,
  className
}: WorkflowCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});

  // Update node positions when they change
  const handleNodePositionChange = (nodeId: string, position: { x: number; y: number }) => {
    setNodePositions(prev => ({
      ...prev,
      [nodeId]: position
    }));
  };

  // Calculate edge positions based on node positions
  const getEdgePositions = (): EdgePosition[] => {
    return edges
      .map(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);
        
        if (!sourceNode || !targetNode) return null;

        const edgePosition: EdgePosition = {
          id: edge.id,
          source: nodePositions[sourceNode.id] || sourceNode.position,
          target: nodePositions[targetNode.id] || targetNode.position,
          label: edge.label
        };

        return edgePosition;
      })
      .filter((edge): edge is EdgePosition => edge !== null);
  };

  return (
    <div
      ref={canvasRef}
      className={cn(
        'relative w-full h-full min-h-[400px] bg-white rounded-lg border border-gray-200',
        className
      )}
    >
      {/* SVG container for edges */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              className="fill-gray-400"
            />
          </marker>
        </defs>
        
        {/* Render edges */}
        {getEdgePositions().map(edge => (
          <WorkflowEdge
            key={edge.id}
            source={edge.source}
            target={edge.target}
            label={edge.label}
          />
        ))}
      </svg>

      {/* Render nodes */}
      {nodes.map(node => (
        <WorkflowNode
          key={node.id}
          id={node.id}
          label={node.label}
          type={node.type}
          position={nodePositions[node.id] || node.position}
          onPositionChange={(pos: { x: number; y: number }) => handleNodePositionChange(node.id, pos)}
        />
      ))}
    </div>
  );
} 