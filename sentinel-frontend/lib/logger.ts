/**
 * Structured Logging Utility
 * 
 * This utility provides a centralized way to log errors to external services
 * (like Sentry, Datadog, etc.) while falling back to console in development.
 */

type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
    message: string;
    level: LogLevel;
    error?: Error;
    context?: Record<string, unknown>;
    timestamp: string;
}

export const logger = {
    error: (error: Error, context?: Record<string, unknown>) => {
        const entry: LogEntry = {
            message: error.message,
            level: 'error',
            error,
            context,
            timestamp: new Date().toISOString(),
        };

        // Send to Sentry if configured (requires NEXT_PUBLIC_SENTRY_DSN)

        if (process.env.NODE_ENV === 'development') {
            console.error('🔴 [Logger]:', entry);
        } else {
            // Production logging fallback (e.g., stdout for container logs)
            console.error(JSON.stringify(entry));

            // Optional: forward to Sentry if a DSN is configured.
            const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
            if (dsn) {
                (async () => {
                    try {
                        // Dynamic import to avoid hard dependency
                        const Sentry = await import('@sentry/browser');
                        if (Sentry && !(Sentry as unknown as { _initialized: boolean })._initialized) {
                            Sentry.init({ dsn });
                            (Sentry as unknown as { _initialized: boolean })._initialized = true;
                        }
                        Sentry.captureException(error, { extra: context });
                    } catch {
                        // Silently ignore if Sentry isn't installed or configured
                    }
                })();
            }
        }
    },

    info: (message: string, context?: Record<string, unknown>) => {
        const entry: LogEntry = {
            message,
            level: 'info',
            context,
            timestamp: new Date().toISOString(),
        };

        if (process.env.NODE_ENV === 'development') {
            console.log('🔵 [Logger]:', entry);
        } else {
            console.log(JSON.stringify(entry));
        }
    }
};
