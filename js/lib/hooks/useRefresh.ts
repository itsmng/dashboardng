import { h, createContext, useState, useCallback, useContext } from '../preact.js';
import type { ComponentChildren, VNode } from 'preact';

// ========================================
// Type Definitions
// ========================================

interface RefreshContextValue {
    refreshSignal: number;
    triggerRefresh: () => void;
}

const RefreshContext = createContext<RefreshContextValue | null>(null);

/**
 * Provider component for refresh signal context
 * @component
 */
export const RefreshProvider = ({ children }: { children: ComponentChildren }): VNode => {
    const [refreshSignal, setRefreshSignal] = useState(0);

    const triggerRefresh = useCallback(() => {
        setRefreshSignal(prev => prev + 1);
    }, []);

    const value: RefreshContextValue = { refreshSignal, triggerRefresh };

    return h(RefreshContext.Provider, { value }, children);
};

/**
 * Hook to access refresh context
 * @returns {RefreshContextValue} { refreshSignal, triggerRefresh }
 * @throws {Error} If used outside RefreshProvider
 */
export const useRefresh = () => {
    const context = useContext(RefreshContext);
    if (!context) {
        throw new Error('useRefresh must be used within RefreshProvider');
    }
    return context;
};

export default RefreshContext;
