import { h, createContext, useState, useContext } from '../lib/preact.js';
import { PERIODS } from '../lib/config.js';

/** @type {import('preact').Context<PeriodContextValue|null>} */
const PeriodContext = createContext(null);

/**
 * Provider component for period context
 * @component
 * @param {Object} props
 * @param {import('preact').ComponentChildren} props.children - Child components
 * @returns {import('preact').VNode} Period context provider
 */
export const PeriodProvider = ({ children }) => {
    const [period, setPeriod] = useState(0);

    /** @type {PeriodContextValue} */
    const periodValue = {
        period,
        setPeriod,
        getPeriodLabel: () => {
            const p = PERIODS.find(p => p.value === period);
            return p ? p.label : '';
        }
    };

    return h(PeriodContext.Provider, { value: periodValue }, children);
};

/**
 * Hook to access period context
 * @returns {PeriodContextValue} { period, setPeriod, getPeriodLabel }
 * @throws {Error} If used outside PeriodProvider
 */
export const usePeriod = () => {
    const context = useContext(PeriodContext);
    if (!context) {
        throw new Error('usePeriod must be used within PeriodProvider');
    }
    return context;
};

export default PeriodContext;

// ========================================
// Type Definitions
// ========================================

/**
 * @typedef {Object} PeriodContextValue
 * @property {number} period - Current period value (0-7)
 * @property {function(number): void} setPeriod - Function to set period
 * @property {function(): string} getPeriodLabel - Function to get period label
 */
