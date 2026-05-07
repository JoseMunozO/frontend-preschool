import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import type { ReactNode } from 'react'

type AppProvidersProps = {
  children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
          },
        },
      }),
  )

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
