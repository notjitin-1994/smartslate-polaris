type SiteFooterProps = {
  className?: string
}

export default function SiteFooter({ className }: SiteFooterProps) {
  return (
    <footer
      className={
        `w-full border-t border-white/10 bg-gradient-to-b from-transparent to-black/40 backdrop-blur-sm ${
          className || ''
        }`
      }
      aria-label="Site footer"
    >
      <div className="container mx-auto px-4 py-10 md:py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2">
              <img src="/images/logos/logo.png" alt="SmartSlate" className="h-7 w-auto" />
            </div>
            <p className="mt-3 text-sm text-white/60 font-['Lato'] max-w-xs">
              Empowering teams to create, collaborate, and launch better.
            </p>
          </div>
          <div className="grid grid-cols-2 md:col-span-3 gap-8">
            <div>
              <h4 className="text-white/80 font-['Quicksand'] text-sm font-semibold tracking-wide">Product</h4>
              <ul className="mt-4 space-y-2 text-sm text-white/60 font-['Lato']">
                <li>Polaris</li>
                <li>Constellation</li>
                <li>Nova</li>
                <li>Orbit</li>
                <li>Spectrum</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white/80 font-['Quicksand'] text-sm font-semibold tracking-wide">Company</h4>
              <ul className="mt-4 space-y-2 text-sm text-white/60 font-['Lato']">
                <li>Home</li>
                <li>Ignite</li>
                <li>Strategic Skills Architecture</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white/80 font-['Quicksand'] text-sm font-semibold tracking-wide">Resources</h4>
              <ul className="mt-4 space-y-2 text-sm text-white/60 font-['Lato']">
                <li>Get Started</li>
                <li>Documentation</li>
                <li>Tutorials</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white/80 font-['Quicksand'] text-sm font-semibold tracking-wide">Legal</h4>
              <ul className="mt-4 space-y-2 text-sm text-white/60 font-['Lato']">
                <li>Privacy Policy</li>
                <li>Terms of Service</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/50 font-['Lato']">© {new Date().getFullYear()} SmartSlate. All rights reserved.</p>
          <div className="flex items-center gap-3 text-white/40"></div>
        </div>
      </div>
    </footer>
  )
}


