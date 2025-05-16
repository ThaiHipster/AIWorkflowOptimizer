import React, { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface WorkflowNodeProps {
  id: string;
  label: string;
  type: 'start' | 'end' | 'step';
  position: { x: number; y: number };
  onPositionChange: (id: string, position: { x: number; y: number }) => void;
  className?: string;
}

export function WorkflowNode({
  id,
  label,
  type,
  position,
  onPositionChange,
  className
}: WorkflowNodeProps) {
  const nodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (nodeRef.current) {
      const rect = nodeRef.current.getBoundingClientRect();
      onPositionChange(id, {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      });
    }
  }, [id, onPositionChange]);

  const getNodeStyle = () => {
    switch (type) {
      case 'start':
        return 'bg-green-100 border-green-500 text-green-700';
      case 'end':
        return 'bg-red-100 border-red-500 text-red-700';
      default:
        return 'bg-blue-100 border-blue-500 text-blue-700';
    }
  };

  return (
    <div
      ref={nodeRef}
      className={cn(
        'absolute transform -translate-x-1/2 -translate-y-1/2',
        'px-4 py-2 rounded-lg border-2',
        'shadow-sm cursor-move',
        getNodeStyle(),
        className
      )}
      style={{
        left: position.x,
        top: position.y
      }}
    >
      {label}
    </div>
  );
} 