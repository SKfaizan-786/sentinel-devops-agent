'use client';

import { useEffect, useCallback, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';

type ShortcutHandler = () => void;

interface Shortcut {
    key: string;
    description: string;
    handler: ShortcutHandler;
}

export function useKeyboardShortcuts() {
    const router = useRouter();
    const [showHelp, setShowHelp] = useState(false);
    const [pendingKey, setPendingKey] = useState<string | null>(null);

    const shortcuts: Shortcut[] = useMemo(() => [
        // Navigation
        { key: 'j', description: 'Scroll Down / Next', handler: () => window.scrollBy({ top: 100, behavior: 'smooth' }) },
        { key: 'k', description: 'Scroll Up / Previous', handler: () => window.scrollBy({ top: -100, behavior: 'smooth' }) },
        { key: 'g+d', description: 'Go to Dashboard', handler: () => router.push('/dashboard') },
        { key: 'g+s', description: 'Go to Services', handler: () => router.push('/dashboard/services') },
        { key: 'g+i', description: 'Go to Incidents', handler: () => router.push('/dashboard/incidents') },
        { key: 'g+l', description: 'Go to Logs', handler: () => router.push('/dashboard/logs') },
        { key: 'g+a', description: 'Go to Analytics', handler: () => router.push('/dashboard/analytics') },

        // Actions
        { key: 'n', description: 'New Incident', handler: () => router.push('/dashboard/incidents/new') },
        {
            key: 'r',
            description: 'Refresh data',
            handler: () => {
                console.log('Refreshing data...');
                router.refresh();
            }
        },
        { key: 'c', description: 'Export Incidents', handler: () => document.getElementById('export-incidents-btn')?.click() },
        { 
            key: 's', 
            description: 'Save Changes', 
            handler: () => {
                const saveBtn = document.getElementById('save-settings-btn');
                if (saveBtn) {
                    saveBtn.click();
                }
            } 
        },

        // System
        { key: '?', description: 'Show keyboard shortcuts', handler: () => setShowHelp(true) },
        { key: 'Escape', description: 'Close modal', handler: () => setShowHelp(false) },
        {
            key: '/', description: 'Focus search', handler: () => {
                const searchInput = document.querySelector<HTMLInputElement>('[data-search]');
                if (searchInput) {
                    searchInput.focus();
                }
            }
        },
    ], [router]);

    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        // Ignore if typing in input
        if (['INPUT', 'TEXTAREA'].includes((event.target as HTMLElement).tagName)) {
            return;
        }

        const key = event.key.toLowerCase();

        // Handle two-key combos (g + ...)
        if (pendingKey === 'g') {
            const combo = `g+${key}`;
            const shortcut = shortcuts.find(s => s.key === combo);
            if (shortcut) {
                event.preventDefault();
                shortcut.handler();
            }
            setPendingKey(null);
            return;
        }

        // Start combo
        if (key === 'g') {
            setPendingKey('g');
            setTimeout(() => setPendingKey(null), 1000); // Reset after 1s
            return;
        }

        // Single key shortcuts
        let effectiveKey = key;
        if (event.key === '?' || (event.shiftKey && event.key === '/')) {
            effectiveKey = '?';
            event.preventDefault();
        } else if (event.key === '/') {
            effectiveKey = '/';
            event.preventDefault();
        }

        const shortcut = shortcuts.find(s => s.key === effectiveKey || s.key === event.key);
        if (shortcut) {
            shortcut.handler();
        }
    }, [pendingKey, shortcuts]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    return { showHelp, setShowHelp, shortcuts };
}
