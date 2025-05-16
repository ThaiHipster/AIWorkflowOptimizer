import React from 'react';
import { cn } from '@/lib/utils';

interface WorkflowEdgeProps {
  source: { x: number; y: number };
  target: { x: number; y: number };
  label?: string;
  className?: string;
}

export function WorkflowEdge({
  source,
  target,
  label,
  className
}: WorkflowEdgeProps) {
  // Calculate the angle and length of the edge
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  const length = Math.sqrt(dx * dx + dy * dy);

  // Calculate the position for the label
  const labelX = source.x + dx / 2;
  const labelY = source.y + dy / 2;

  return (
    <g className={cn('stroke-gray-400', className)}>
      {/* Draw the line */}
      <line
        x1={source.x}
        y1={source.y}
        x2={target.x}
        y2={target.y}
        strokeWidth={2}
        markerEnd="url(#arrowhead)"
      />
      
      {/* Draw the label if provided */}
      {label && (
        <text
          x={labelX}
          y={labelY}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-gray-600 text-sm"
          transform={`rotate(${angle}, ${labelX}, ${labelY})`}
        >
          {label}
        </text>
      )}
    </g>
  );
} 