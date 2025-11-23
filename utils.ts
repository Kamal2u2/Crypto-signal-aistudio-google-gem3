// --- DEBUGGING UTILS ---

const DEBUG_MODE = true; // Easily toggle all debug logs

interface DebugLogger {
    log: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    error: (...args: any[]) => void;
    group: (label: string) => void;
    groupEnd: () => void;
}

/**
 * Creates a namespaced logger that can be toggled on/off.
 * @param namespace - The namespace for the logger (e.g., 'useCryptoData').
 * @returns A logger object with log, warn, and error methods.
 */
export const createLogger = (namespace: string): DebugLogger => {
    const prefix = `[${namespace}]`;
    return {
        log: (...args: any[]) => {
            if (DEBUG_MODE) {
                console.log(prefix, ...args);
            }
        },
        warn: (...args: any[]) => {
            if (DEBUG_MODE) {
                console.warn(prefix, ...args);
            }
        },
        error: (...args: any[]) => {
            console.error(prefix, ...args); // Always log errors
        },
        group: (label: string) => {
            if (DEBUG_MODE) {
                console.group(label);
            }
        },
        groupEnd: () => {
            if (DEBUG_MODE) {
                console.groupEnd();
            }
        }
    };
};


export const formatCurrency = (value: number, symbol: string = 'USDT') => {
  const isUSDT = symbol.endsWith('USDT');
  const precision = value > 1000 ? 2 : value > 1 ? 4 : 6;
  return new Intl.NumberFormat('en-US', {
    style: isUSDT ? 'currency' : 'decimal',
    currency: 'USD',
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(value);
};

export const formatPercentage = (value: number) => {
  return `${value.toFixed(2)}%`;
};

export const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

export const formatDateTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleString('en-US');
};

export const timeSince = (timestamp: number) => {
    const seconds = Math.floor((new Date().getTime() - timestamp) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
}

export const getPnlColor = (pnl: number) => {
    return pnl > 0 ? 'text-accent-green' : pnl < 0 ? 'text-accent-red' : 'text-dark-text-secondary';
}