import type { Alert } from '../../engine/contracts'
import { AlertCard } from './AlertCard'

/** Silent alerts: logged, never interrupting. Collapsed by default, but always one click away, so nothing is hidden from the pharmacist. */
export const SilentLog = ({ alerts }: { alerts: Alert[] }) =>
  alerts.length === 0 ? null : (
    <details className="silent-log">
      <summary>{alerts.length} logged, not raised as alerts</summary>
      {alerts.map((a, i) => (
        <AlertCard key={`${a.type}-${a.ingredients.join()}-${i}`} alert={a} />
      ))}
    </details>
  )
