import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Toggle theme"
        >
            {!mounted ? (
                <div className="w-5 h-5" /> // Placeholder to avoid hydration mismatch
            ) : theme === 'dark' ? (
                <Sun size={20} className="text-white" />
            ) : (
                <Moon size={20} className="text-gray-800" />
            )}
        </button>
    );
}
