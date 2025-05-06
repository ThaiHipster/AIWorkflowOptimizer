import React from "react";
import ReactMarkdown from "react-markdown";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface MarkdownProps {
  content: string;
  className?: string;
}

export function Markdown({ content, className }: MarkdownProps) {
  // Apply the className to a wrapper div instead of directly to ReactMarkdown
  return (
    <div className={cn("prose dark:prose-invert max-w-none break-words", className)}>
      <ReactMarkdown
        components={{
          h1: ({ ...props }) => (
            <h1 className="text-2xl font-bold mt-6 mb-4" {...props} />
          ),
          h2: ({ ...props }) => (
            <h2 className="text-xl font-bold mt-6 mb-3" {...props} />
          ),
          h3: ({ ...props }) => (
            <h3 className="text-lg font-bold mt-4 mb-2" {...props} />
          ),
          p: ({ ...props }) => (
            <p className="mb-4 leading-7" {...props} />
          ),
          ul: ({ ...props }) => (
            <ul className="list-disc pl-6 mb-4" {...props} />
          ),
          ol: ({ ...props }) => (
            <ol className="list-decimal pl-6 mb-4" {...props} />
          ),
          li: ({ ...props }) => (
            <li className="mb-1" {...props} />
          ),
          blockquote: ({ ...props }) => (
            <blockquote
              className="border-l-4 border-neutral-200 dark:border-neutral-700 pl-4 italic my-4"
              {...props}
            />
          ),
          a: ({ ...props }) => (
            <a
              className="text-primary-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
          code: ({ ...props }) => (
            <code
              className="bg-muted p-1 rounded text-sm font-mono"
              {...props}
            />
          ),
          pre: ({ ...props }) => (
            <pre
              className="bg-neutral-100 dark:bg-neutral-900 p-4 rounded-lg my-4 overflow-x-auto"
              {...props}
            />
          ),
          table: ({ ...props }) => (
            <div className="my-4 w-full overflow-y-auto">
              <Table {...props} />
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
    </div>
  );
}
