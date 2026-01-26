import { h, createContext, useState, useCallback, useContext } from '../preact.js';

/** @type {import('preact').Context<RefreshContextValue|null>} */
const RefreshContext = createContext(undefined);

/**
 * Provider component for refresh signal context
 * @component
 * @param {Object} props
 * @param {import('preact').ComponentChildren} props.children - Child components
 * @returns {import('preact').VNode} Refresh context provider
 */
export const RefreshProvider = ({ children }) => {
    const [refreshSignal, setRefreshSignal] = useState(0);

    const triggerRefresh = useCallback(() => {
        setRefreshSignal(prev => prev + 1);
    }, []);

    /** @type {RefreshContextValue} */
    const value = { refreshSignal, triggerRefresh };

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

// ========================================
// Type Definitions
// ========================================

/**
 * @typedef {Object} RefreshContextValue
 * @property {number} refreshSignal - Counter that increments on refresh
 * @property {function(): void} triggerRefresh - Function to trigger refresh
 */
