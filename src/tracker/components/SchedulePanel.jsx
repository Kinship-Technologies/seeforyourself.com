import { BOM } from './bomData'

function parseLeadWeeks(lt) {
  if (!lt) return 0
  const nums = lt.match(/\d+/g)
  if (!nums) return 0
  return Math.max(...nums.map(Number))
}

function parseMinWeeks(lt) {
  if (!lt) return 0
  const nums = lt.match(/\d+/g)
  if (!nums) return 0
  return Math.min(...nums.map(Number))
}

const sorted = [...BOM]
  .filter(b => b.qty > 0)
  .map(b => ({ ...b, maxWeeks: parseLeadWeeks(b.leadTime), minWeeks: parseMinWeeks(b.leadTime) }))
  .sort((a, b) => b.maxWeeks - a.maxWeeks)

const maxWeeks = sorted.length > 0 ? sorted[0].maxWeeks : 16
const criticalThreshold = Math.ceil(maxWeeks * 0.6)

export default function SchedulePanel() {
  return (
    <div className="cad-panel-inner cad-schedule-body">
      {sorted.map(row => {
        const isCritical = row.maxWeeks >= criticalThreshold
        const barWidth = (row.maxWeeks / maxWeeks) * 100
        const minWidth = row.maxWeeks > 0 ? (row.minWeeks / row.maxWeeks) * 100 : 0
        return (
          <div key={row.line} className={`cad-sched-row${isCritical ? ' critical' : ''}${row.optional ? ' optional' : ''}`}>
            <div className="cad-sched-label">
              <span className="cad-sched-name">{row.part}</span>
              <span className="cad-sched-lead">{row.leadTime}</span>
            </div>
            <div className="cad-sched-track">
              <div className={`cad-sched-bar${isCritical ? ' bar-crit' : ''}`} style={{ width: `${barWidth}%` }}>
                <div className="cad-sched-bar-min" style={{ width: `${minWidth}%` }} />
              </div>
            </div>
          </div>
        )
      })}
      <div className="cad-sched-legend">
        <span><span className="cad-sched-dot dot-crit" /> Critical ({'\u2265'}{criticalThreshold}wk)</span>
        <span><span className="cad-sched-dot dot-norm" /> Standard</span>
        <span><span className="cad-sched-dot dot-min" /> Best-case</span>
      </div>
    </div>
  )
}
