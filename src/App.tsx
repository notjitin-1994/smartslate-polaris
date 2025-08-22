import './index.css'
import { AuthPage } from './auth/AuthPage'
import { SwirlField } from './components/SwirlField'

function App() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-950 relative overflow-hidden">
      <SwirlField imageSrc="/images/logos/logo-swirl.png" count={84} minSize={20} maxSize={44} opacityMin={0.035} opacityMax={0.09} />
      <AuthPage />
    </div>
  )
}

export default App
