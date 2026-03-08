'use client';

import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { KeyboardShortcutsModal } from '@/components/modals/KeyboardShortcutsModal';

export function GlobalShortcuts() {
    const { showHelp, setShowHelp } = useKeyboardShortcuts();

    return (
        <KeyboardShortcutsModal
            isOpen={showHelp}
            onClose={() => setShowHelp(false)}
        />
    );
}
