import { useEffect } from 'react'

export function useDocumentTitle(title: string) {
  useEffect(() => {
    const previous = document.title
    const host = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : ''
    const isPolarisHost = host === 'polaris.smartslate.io' || host.startsWith('polaris.') || host.startsWith('polaris-') || host.split('.').includes('polaris')
    const nextTitle = isPolarisHost ? 'Smartslate | Polaris' : title
    document.title = nextTitle
    return () => {
      document.title = previous
    }
  }, [title])
}


