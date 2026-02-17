import { h, createContext, useState, useContext, type ComponentChildren } from '../lib/preact.js';
import { PERIODS, type PeriodOption } from '../lib/config.js';

export interface PeriodContextValue {
    period: number;
    setPeriod: (period: number) => void;
    getPeriodLabel: () => string;
}

const PeriodContext = createContext<PeriodContextValue | undefined>(undefined);

interface PeriodProviderProps {
    children: ComponentChildren;
}

export const PeriodProvider = ({ children }: PeriodProviderProps) => {
    const [period, setPeriod] = useState(0);

    const periodValue: PeriodContextValue = {
        period,
        setPeriod,
        getPeriodLabel: () => {
            const p = PERIODS.find((p: PeriodOption) => p.value === period);
            return p ? p.label : '';
        }
    };

    return (
        <PeriodContext.Provider value={periodValue}>
            {children}
        </PeriodContext.Provider>
    );
};

export const usePeriod = (): PeriodContextValue => {
    const context = useContext(PeriodContext);
    if (!context) {
        throw new Error('usePeriod must be used within PeriodProvider');
    }
    return context;
};

export default PeriodContext;
