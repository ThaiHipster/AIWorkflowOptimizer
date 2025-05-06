import React from "react";
import ReactMarkdown from "react-markdown";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface MarkdownProps {
  content: string;
  className?: string;
}

export function Markdown({ content, className }: MarkdownProps) {
  return (
    <ReactMarkdown
      className={cn("prose dark:prose-invert max-w-none break-words", className)}
      components={{
        h1: ({ className, ...props }) => (
          <h1 className={cn("text-2xl font-bold mt-6 mb-4", className)} {...props} />
        ),
        h2: ({ className, ...props }) => (
          <h2 className={cn("text-xl font-bold mt-6 mb-3", className)} {...props} />
        ),
        h3: ({ className, ...props }) => (
          <h3 className={cn("text-lg font-bold mt-4 mb-2", className)} {...props} />
        ),
        p: ({ className, ...props }) => (
          <p className={cn("mb-4 leading-7", className)} {...props} />
        ),
        ul: ({ className, ...props }) => (
          <ul className={cn("list-disc pl-6 mb-4", className)} {...props} />
        ),
        ol: ({ className, ...props }) => (
          <ol className={cn("list-decimal pl-6 mb-4", className)} {...props} />
        ),
        li: ({ className, ...props }) => (
          <li className={cn("mb-1", className)} {...props} />
        ),
        blockquote: ({ className, ...props }) => (
          <blockquote
            className={cn(
              "border-l-4 border-neutral-200 dark:border-neutral-700 pl-4 italic my-4",
              className
            )}
            {...props}
          />
        ),
        a: ({ className, ...props }) => (
          <a
            className={cn("text-primary-600 hover:underline", className)}
            target="_blank"
            rel="noopener noreferrer"
            {...props}
          />
        ),
        code: ({ className, ...props }) => (
          <code
            className={cn(
              "bg-muted p-1 rounded text-sm font-mono",
              className
            )}
            {...props}
          />
        ),
        pre: ({ className, ...props }) => (
          <pre
            className={cn(
              "bg-neutral-100 dark:bg-neutral-900 p-4 rounded-lg my-4 overflow-x-auto",
              className
            )}
            {...props}
          />
        ),
        table: ({ className, ...props }) => (
          <div className="my-4 w-full overflow-y-auto">
            <Table className={className} {...props} />
          </div>
        ),
        thead: ({ ...props }) => <TableHeader {...props} />,
        tbody: ({ ...props }) => <TableBody {...props} />,
        tr: ({ ...props }) => <TableRow {...props} />,
        th: ({ ...props }) => <TableHead {...props} />,
        td: ({ ...props }) => <TableCell {...props} />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
