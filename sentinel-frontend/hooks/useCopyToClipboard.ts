import { useState, useCallback, useEffect, useRef } from 'react';

export function useCopyToClipboard(timeout = 2000) {
  const [isCopied, setIsCopied] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const copyToClipboard = useCallback(async (text: string) => {
    if (!navigator?.clipboard) {
      console.warn('Clipboard not supported');
      return false;
    }

    try {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      
      timeoutRef.current = setTimeout(() => {
        setIsCopied(false);
      }, timeout);

      return true;
    } catch (error) {
      console.error('Failed to copy text: ', error);
      setIsCopied(false);
      return false;
    }
  }, [timeout]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return { isCopied, copyToClipboard };
}
