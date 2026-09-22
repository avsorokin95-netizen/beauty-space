import type { ReactNode } from 'react';
import { PricesContext, usePublishedPrices } from '../hooks/usePrices';

export function PricesProvider({ children }: { children: ReactNode }) {
  const value = usePublishedPrices();
  return <PricesContext.Provider value={value}>{children}</PricesContext.Provider>;
}
