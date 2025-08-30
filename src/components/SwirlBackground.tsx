import { memo } from 'react'

// Subtle full-page background with soft gradients; no external assets
const SwirlBackground = memo(() => {
  return (
    <div className="absolute inset-0 pointer-events-none select-none" aria-hidden="true">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(1200px 1200px at 80% 0%, rgba(167,218,219,0.08), transparent 60%),\
             radial-gradient(900px 900px at 0% 100%, rgba(167,218,219,0.06), transparent 55%)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          opacity: 0.05,
          backgroundImage:
            "url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22 viewBox=%220 0 40 40%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%222%22 stitchTiles=%22stitch%22/></filter><rect width=%2240%22 height=%2240%22 filter=%22url(%23n)%22 opacity=%220.35%22/></svg>')",
          backgroundRepeat: 'repeat',
        }}
      />
    </div>
  )
})

SwirlBackground.displayName = 'SwirlBackground'

export default SwirlBackground
export { SwirlBackground }


