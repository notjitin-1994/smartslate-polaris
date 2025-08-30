import KPIGroup from '@/starmap/elements/KPIGroup'
import DonutChart from '@/starmap/elements/DonutChart'
import Timeline from '@/starmap/elements/Timeline'
import RiskMatrix from '@/starmap/elements/RiskMatrix'
import DataTable from '@/starmap/elements/DataTable'
import MarkdownBlock from '@/starmap/elements/MarkdownBlock'
import MediaBlock from '@/starmap/elements/MediaBlock'
import ProgressRing from '@/starmap/elements/ProgressRing'
import MilestoneMap from '@/starmap/elements/MilestoneMap'
import BarChart from '@/starmap/elements/BarChart'
import SankeyChart from '@/starmap/elements/SankeyChart'
import BulletChart from '@/starmap/elements/BulletChart'
import LineChart from '@/starmap/elements/LineChart'
import AreaChart from '@/starmap/elements/AreaChart'

export default function ElementSwitch({ spec }: { spec: any }) {
  if (import.meta.env.DEV) {
    const emptyData = !spec?.data || (typeof spec.data === 'object' && Object.keys(spec.data).length === 0)
    if (emptyData) {
      // eslint-disable-next-line no-console
      console.warn('[dev] Empty data for element', { id: spec?.id, type: spec?.type, spec })
    }
  }
  switch (spec.type) {
    case 'kpi_card_group': return <KPIGroup spec={spec} />
    case 'donut_chart':    return <DonutChart spec={spec} />
    case 'timeline':       return <Timeline spec={spec} />
    case 'risk_matrix':    return <RiskMatrix spec={spec} />
    case 'table':          return <DataTable spec={spec} />
    case 'markdown_block': return <MarkdownBlock spec={spec} />
    case 'media':          return <MediaBlock spec={spec} />
    case 'progress_ring':  return <ProgressRing spec={spec} />
    case 'milestone_map':  return <MilestoneMap spec={spec} />
    case 'bar_chart':      return <BarChart spec={spec} />
    case 'line_chart':     return <LineChart spec={spec} />
    case 'area_chart':     return <AreaChart spec={spec} />
    case 'sankey':         return <SankeyChart spec={spec} />
    case 'bullet_chart':   return <BulletChart spec={spec} />
    default:
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.warn('[dev] Unsupported element type', { id: spec?.id, type: spec?.type, spec })
      }
      return <div className="text-sm opacity-70">Unsupported element: <code>{spec.type}</code></div>
  }
}


