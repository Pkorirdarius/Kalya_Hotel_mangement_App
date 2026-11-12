import { useState, type ReactNode } from 'react';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';

import { createQueryClient } from '../lib/query/queryClient';

interface QueryProviderProps {
  children: ReactNode;
  /** Injectable client for tests and server-side prefetching. */
  client?: QueryClient;
}

export function QueryProvider({ children, client }: QueryProviderProps) {
  const [defaultClient] = useState(() => createQueryClient());
  return (
    <QueryClientProvider client={client ?? defaultClient}>{children}</QueryClientProvider>
  );
}
