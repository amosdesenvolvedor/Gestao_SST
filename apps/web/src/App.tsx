import { AppProviders } from '@/app/providers'
import { AppRouter } from '@/app/app-router'

export default function App() {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  )
}
