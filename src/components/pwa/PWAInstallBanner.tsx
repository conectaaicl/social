'use client'
import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PWAInstallBanner() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [showIOSSteps, setShowIOSSteps] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }
    if (localStorage.getItem('social_pwa_dismissed')) {
      setDismissed(true)
      return
    }
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOS(ios)

    const handler = (e: Event) => {
      e.preventDefault()
      setPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!prompt) return
    await prompt.prompt()
    const choice = await prompt.userChoice
    if (choice.outcome === 'accepted') setIsInstalled(true)
    setPrompt(null)
  }

  const handleDismiss = () => {
    localStorage.setItem('social_pwa_dismissed', '1')
    setDismissed(true)
    setPrompt(null)
  }

  if (isInstalled || dismissed) return null
  if (!prompt && !isIOS) return null

  return (
    <div className="mx-4 mt-4 rounded-xl border border-indigo-500/30 bg-gradient-to-r from-violet-600/15 to-indigo-600/15 p-3.5">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-100">Instalar ConectaAI Social</p>
          <p className="text-xs text-gray-400 mt-0.5">Accede mas rapido desde tu celular, como una app.</p>
          {isIOS && !showIOSSteps && (
            <button onClick={() => setShowIOSSteps(true)} className="mt-1.5 text-xs font-semibold text-indigo-400 underline underline-offset-2">
              Como instalar en iPhone/iPad
            </button>
          )}
          {isIOS && showIOSSteps && (
            <p className="mt-1.5 text-xs text-gray-400">
              Toca <strong>Compartir</strong> en Safari y luego <strong>Anadir a inicio</strong>.
            </p>
          )}
          {!isIOS && (
            <button onClick={handleInstall} className="mt-2 px-3 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs rounded-lg font-semibold hover:from-violet-500 hover:to-indigo-500 transition-all">
              Instalar ahora
            </button>
          )}
        </div>
        <button onClick={handleDismiss} aria-label="Cerrar" className="text-gray-500 hover:text-gray-300 shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
