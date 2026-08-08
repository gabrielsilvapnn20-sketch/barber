import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
  isStandalone,
  getPlatform,
  permissionState,
  requestNotificationPermission,
  notificationsSupported,
  subscribeToPush,
} from '../lib/notifications.js'

const PWAContext = createContext(null)
const DISMISS_KEY = 'barber.installBannerDismissed'

export function PWAProvider({ children }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [standalone, setStandalone] = useState(isStandalone())
  const [permission, setPermission] = useState(permissionState())
  const [bannerDismissed, setBannerDismissed] = useState(
    () => sessionStorage.getItem(DISMISS_KEY) === '1',
  )
  const platform = getPlatform()

  // Capture the install prompt (Android/desktop Chromium)
  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    const onInstalled = () => {
      setDeferredPrompt(null)
      setStandalone(true)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  // React to display-mode changes (installed / launched standalone)
  useEffect(() => {
    const mq = window.matchMedia('(display-mode: standalone)')
    const update = () => setStandalone(isStandalone())
    mq.addEventListener?.('change', update)
    return () => mq.removeEventListener?.('change', update)
  }, [])

  const canPromptInstall = !!deferredPrompt

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return { outcome: 'unavailable' }
    deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    return choice
  }, [deferredPrompt])

  const enableNotifications = useCallback(async () => {
    const result = await requestNotificationPermission()
    setPermission(result)
    if (result === 'granted') {
      // Assina o Web Push (scaffolding — envio real requer backend).
      try {
        await subscribeToPush()
      } catch (e) {
        // sem backend/HTTPS válido isso pode falhar silenciosamente
        console.info('Push subscription indisponível:', e?.message)
      }
    }
    return result
  }, [])

  const dismissBanner = useCallback(() => {
    sessionStorage.setItem(DISMISS_KEY, '1')
    setBannerDismissed(true)
  }, [])

  const value = {
    standalone,
    platform,
    canPromptInstall,
    promptInstall,
    permission,
    notificationsSupported: notificationsSupported(),
    enableNotifications,
    setPermission,
    bannerDismissed,
    dismissBanner,
    // O app deve empurrar a instalação quando NÃO estiver instalado
    needsInstall: !standalone,
  }

  return <PWAContext.Provider value={value}>{children}</PWAContext.Provider>
}

export const usePWA = () => useContext(PWAContext)
