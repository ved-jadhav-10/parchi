import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

/**
 * Two messages from the service worker, both said out loud: "Ready to work offline" once every page and data file is stored
 * on this device (the proof that offline works), and "A new version is ready" with a Reload button when an update arrived.
 */
export const UpdateToast = () => {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  useEffect(() => {
    if (!offlineReady) return
    const t = setTimeout(() => setOfflineReady(false), 10_000)
    return () => clearTimeout(t)
  }, [offlineReady, setOfflineReady])

  if (!offlineReady && !needRefresh) return null
  return (
    <div className="toast" role="status">
      <span>{needRefresh ? 'A new version of Parchi is ready.' : 'Ready to work offline. Every check now runs without a connection.'}</span>
      {needRefresh && (
        <button type="button" className="btn btn--primary" onClick={() => updateServiceWorker(true)}>
          Reload
        </button>
      )}
      <button
        type="button"
        className="btn btn--secondary"
        onClick={() => {
          setOfflineReady(false)
          setNeedRefresh(false)
        }}
      >
        Dismiss
      </button>
    </div>
  )
}
