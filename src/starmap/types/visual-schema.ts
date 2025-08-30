// Visual schema spec

export type Semantic = 'info' | 'success' | 'warning' | 'danger'

export interface VisualSchema {
  version: string
  meta: {
    report_id: string
    generated_at: string // ISO
    generated_for_user_id: string
    title: string
    subtitle?: string | null
    description?: string | null
  }
  theme: ThemeSpec
  accessibility: AccessibilitySpec
  layout: LayoutSpec
  sections: SectionSpec[]
}

export interface ThemeSpec {
  brand: { name: string; logo_url?: string | null; favicon_url?: string | null }
  color: {
    primary: string; secondary: string; accent: string
    neutral: Record<'900'|'700'|'500'|'300'|'100', string>
    semantic: Record<'success'|'info'|'warning'|'danger', string>
    background: { app: string; surface: string; elevated: string }
    chart_palettes: { default: string[]; color_blind_safe: string[] }
  }
  typography: {
    font_family: { display: string; body: string; mono: string }
    scale: Record<'xs'|'sm'|'md'|'lg'|'xl'|'2xl'|'3xl'|'4xl'|'5xl', number>
    line_height: Record<'tight'|'normal'|'relaxed', number>
    weight: Record<'regular'|'medium'|'semibold'|'bold', number>
  }
  spacing: Record<'xxs'|'xs'|'sm'|'md'|'lg'|'xl'|'2xl', number>
  radius: Record<'sm'|'md'|'lg'|'pill', number>
  shadow: Record<'sm'|'md'|'lg', string>
  motion: {
    duration: { fast: number; base: number; slow: number; hero: number }
    easing: { enter: string; exit: string; emphasized: string }
    stagger_ms: number; reduce_motion_respect: boolean
  }
}

export interface AccessibilitySpec {
  min_contrast_ratio: number
  color_blind_mode_available: boolean
  high_contrast_theme_available: boolean
  aria_landmarks: Array<'banner'|'navigation'|'main'|'complementary'|'contentinfo'>
  keyboard_focus_ring: boolean
  skip_to_content_enabled: boolean
}

export interface LayoutSpec {
  grid: {
    columns: { sm: number; md: number; lg: number }
    gap: { sm: number; md: number; lg: number }
  }
  breakpoints: { sm: number; md: number; lg: number }
}

export interface SectionSpec {
  id: string
  title: string
  subtitle?: string | null
  intro?: string | null
  layout_hint?: 'hero'|'default'
  elements: ElementSpec[]
}

export type ElementType =
  | 'kpi_card_group' | 'timeline' | 'milestone_map' | 'gantt'
  | 'risk_matrix' | 'bar_chart' | 'stacked_bar_chart' | 'line_chart' | 'area_chart'
  | 'donut_chart' | 'radar_chart' | 'bubble_chart' | 'heatmap' | 'funnel_chart'
  | 'sankey' | 'journey_map' | 'progress_ring' | 'table' | 'grid_of_cards'
  | 'infographic_composition' | 'flowchart' | 'markdown_block' | 'media'

export interface ElementSpec {
  id: string
  type: ElementType
  title?: string | null
  subtitle?: string | null
  description?: string | null
  a11y?: { ariaLabel?: string; longDescription?: string | null; altText?: string | null }
  layout?: {
    span?: { sm: number; md: number; lg: number }
    order?: { sm: number; md: number; lg: number }
    padding?: 'none'|'sm'|'md'|'lg'
    variant?: 'card'|'edge'|'inset'|'hero'
  }
  style_overrides?: {
    background?: string
    border?: { style: 'none'|'solid'|'dashed'; color?: string; width?: number }
    radius?: 'sm'|'md'|'lg'|'pill'
    shadow?: 'sm'|'md'|'lg'|'none'
  }
  animation?: {
    enter?: 'fade'|'fade-rise'|'slide-up'|'slide-right'|'scale'|'flip'|'blur'
    exit?: 'fade'|'slide-down'|'scale'
    duration_ms?: number; delay_ms?: number; easing?: string; stagger?: boolean
    scroll_linked?: { enabled: boolean; start?: string; end?: string; parallax?: { enabled: boolean; strength: number } }
    loop?: { enabled: boolean; interval_ms: number }
  }
  interactions?: {
    tooltip?: boolean; hover_emphasis?: boolean; selectable?: boolean
    drilldown?: { enabled: boolean; target_section_id?: string | null }
    filters?: Array<{ id: string; label: string; type: 'single_select'|'multi_select'; options: string[] }>
    export?: { png: boolean; pdf: boolean; csv: boolean }
  }
  data: any
}



