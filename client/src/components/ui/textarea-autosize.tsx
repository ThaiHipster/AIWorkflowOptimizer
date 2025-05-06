import React, { useRef, useEffect, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface TextareaAutosizeProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className"> {
  className?: string;
  minRows?: number;
  maxRows?: number;
}

export const TextareaAutosize = React.forwardRef<HTMLTextAreaElement, TextareaAutosizeProps>(
  ({ className, minRows = 1, maxRows = 5, onChange, onKeyDown, ...props }, ref) => {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const combinedRef = (node: HTMLTextAreaElement) => {
      textareaRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    };

    const adjustHeight = () => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      textarea.style.height = "auto";
      
      const lineHeight = parseInt(getComputedStyle(textarea).lineHeight);
      const paddingY = 
        parseInt(getComputedStyle(textarea).paddingTop) +
        parseInt(getComputedStyle(textarea).paddingBottom);
      
      const minHeight = lineHeight * minRows + paddingY;
      const maxHeight = lineHeight * maxRows + paddingY;
      
      const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
      textarea.style.height = `${newHeight}px`;
    };

    useEffect(() => {
      adjustHeight();
    }, [props.value]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (onChange) onChange(e);
      adjustHeight();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Submit on Enter unless Shift is pressed
      if (e.key === "Enter" && !e.shiftKey && !props.disabled) {
        e.preventDefault();
        const form = textareaRef.current?.closest("form");
        if (form) {
          const submitEvent = new Event("submit", { bubbles: true, cancelable: true });
          form.dispatchEvent(submitEvent);
        }
      }
      
      if (onKeyDown) onKeyDown(e);
    };

    return (
      <textarea
        ref={combinedRef}
        className={cn(
          "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none overflow-hidden",
          className
        )}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        rows={minRows}
        {...props}
      />
    );
  }
);

TextareaAutosize.displayName = "TextareaAutosize";
