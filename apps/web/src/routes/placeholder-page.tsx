import { Card } from '@/components/card'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'

type Props = {
  title: string
}

export function PlaceholderPage({ title }: Props) {
  return (
    <div>
      <PageHeader title={title} subtitle="Fundacao inicial do modulo" />
      <Card>
        <EmptyState title="Modulo em desenvolvimento" description="Este modulo sera implementado nas proximas fases do roadmap." />
      </Card>
    </div>
  )
}