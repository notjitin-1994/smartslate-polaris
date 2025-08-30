export default function MediaBlock({ spec }: { spec: any }) {
  const src: string | undefined = spec?.data?.src
  const alt: string = spec?.a11y?.altText || spec?.title || 'Media'
  if (!src) return <div className="text-sm opacity-70">No media source provided.</div>
  return (
    <figure className="rounded-xl overflow-hidden border border-white/10 bg-white/5">
      <img src={src} alt={alt} className="w-full h-auto" />
      {(spec?.title || spec?.description) && (
        <figcaption className="px-3 py-2 text-xs text-white/70">{spec?.title}{spec?.description ? ` — ${spec.description}` : ''}</figcaption>
      )}
    </figure>
  )
}


