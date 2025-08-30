import { useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import ElementSwitch from '@/starmap/elements/ElementSwitch'
import { applyTheme } from '@/starmap/theme'
import type { VisualSchema } from '@/starmap/types/visual-schema'
import { isVisualSchema } from '@/starmap/utils/typeguards'

export default function VisualRenderer({ schema }: { schema: VisualSchema | any }) {
  useEffect(() => { if (schema?.theme) applyTheme(schema.theme) }, [schema])
  if (!schema || !isVisualSchema(schema) || !schema.sections?.length) return null

  const grid = schema.layout?.grid ?? { columns: { sm: 4, md: 8, lg: 12 }, gap: { sm: 8, md: 12, lg: 16 } }
  const reduceMotion = useReducedMotion()

  return (
    <div className="space-y-10">
      {schema.sections.map((section) => (
        <section key={section.id} aria-label={section.title} className="min-w-0">
          <h2 className="text-xl md:text-2xl font-semibold mb-3">{section.title}</h2>
          {section.subtitle && <p className="opacity-70 mb-4">{section.subtitle}</p>}
          {import.meta.env.DEV && (!Array.isArray(section.elements) || section.elements.length === 0) && (
            <div className="text-xs text-amber-400">[dev] Section has no elements: {section.id}</div>
          )}
          <div
            className="grid"
            style={{ gridTemplateColumns: `repeat(${grid.columns.lg}, minmax(0, 1fr))`, gap: grid.gap.lg }}
          >
            {section.elements?.map((el) => (
              <motion.div
                key={el.id}
                initial={reduceMotion ? undefined : { opacity: 0, y: 8 }}
                whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={reduceMotion ? undefined : { once: true, amount: 0.2 }}
                transition={reduceMotion ? undefined : { duration: 0.28 }}
                className="min-w-0"
                style={{ gridColumn: `span ${el?.layout?.span?.lg ?? 12} / span ${el?.layout?.span?.lg ?? 12}` }}
              >
                {import.meta.env.DEV && (!el?.type || !el?.data) && (
                  <div className="text-xs text-rose-400 mb-2">[dev] Element incomplete: id={el?.id} type={String(el?.type)}</div>
                )}
                <ElementSwitch spec={el as any} />
              </motion.div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}


