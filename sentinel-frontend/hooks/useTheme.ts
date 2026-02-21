import { useState, useEffect } from 'react';

type Theme = 'dark' | 'light';

export const STORAGE_KEY = 'sentinel-theme';

export function useTheme() {
    const [theme, setTheme] = useState<Theme | null>(null);

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        const validStored = stored === 'dark' || stored === 'light' ? stored : null;
        const systemPrefers = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const initialTheme: Theme = validStored ?? (systemPrefers ? 'dark' : 'light');

        setTheme(initialTheme);
        document.documentElement.classList.toggle('light', initialTheme === 'light');
    }, []);

    const toggleTheme = () => {
        const newTheme: Theme = (theme ?? 'dark') === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        localStorage.setItem(STORAGE_KEY, newTheme);
        document.documentElement.classList.toggle('light', newTheme === 'light');
    };

    return { theme: theme ?? 'dark', toggleTheme, isThemeResolved: theme !== null };
}