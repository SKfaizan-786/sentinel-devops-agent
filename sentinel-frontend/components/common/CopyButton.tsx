import React from 'react';
import { Copy, Check } from 'lucide-react';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { cn } from '@/lib/utils';

interface CopyButtonProps {
  textToCopy: string;
  className?: string;
}

export function CopyButton({ textToCopy, className }: CopyButtonProps) {
  const { isCopied, copyToClipboard } = useCopyToClipboard();

  return (
    <button
      type="button"
      onClick={() => copyToClipboard(textToCopy)}
      className={cn(
        'p-1.5 rounded-md transition-all duration-200',
        'hover:bg-slate-200 dark:hover:bg-slate-700',
        'focus:outline-none focus:ring-2 focus:ring-blue-500/50',
        'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200',
        'opacity-0 group-hover:opacity-100', // ensure the parent has 'group' class to make this visible on hover
        className
      )}
      title="Copy to clipboard"
      aria-label="Copy to clipboard"
    >
      {isCopied ? (
        <Check className="w-4 h-4 text-green-500 dark:text-green-400" />
      ) : (
        <Copy className="w-4 h-4" />
      )}
    </button>
  );
}
