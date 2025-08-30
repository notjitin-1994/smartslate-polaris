import type { ElementSpec, ElementType, SectionSpec, VisualSchema } from '@/starmap/types/visual-schema'

export function isElementType(value: any): value is ElementType {
  const allowed: ElementType[] = [
    'kpi_card_group','timeline','milestone_map','gantt',
    'risk_matrix','bar_chart','stacked_bar_chart','line_chart','area_chart',
    'donut_chart','radar_chart','bubble_chart','heatmap','funnel_chart',
    'sankey','journey_map','progress_ring','table','grid_of_cards',
    'infographic_composition','flowchart','markdown_block','media'
  ]
  return allowed.includes(value)
}

export function isElementSpec(input: any): input is ElementSpec {
  return !!input && typeof input === 'object' && typeof input.id === 'string' && isElementType(input.type)
}

export function isSectionSpec(input: any): input is SectionSpec {
  return !!input && typeof input === 'object' && typeof input.id === 'string' && Array.isArray((input as any).elements)
}

export function isVisualSchema(input: any): input is VisualSchema {
  if (!input || typeof input !== 'object') return false
  const sections = (input as any).sections
  return Array.isArray(sections) && sections.every(isSectionSpec)
}


