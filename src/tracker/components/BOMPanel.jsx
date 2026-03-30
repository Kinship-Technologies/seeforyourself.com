import { useState } from 'react'
import { BOM } from './bomData'

const SUBSYSTEMS = ['All', ...new Set(BOM.map(b => b.subsystem))]

export default function BOMPanel() {
  const [filter, setFilter] = useState('All')
  const filtered = filter === 'All' ? BOM : BOM.filter(b => b.subsystem === filter)
  const baseCost = BOM.filter(b => !b.optional && b.qty > 0).reduce((s, b) => s + b.cost * b.qty, 0)

  return (
    <div className="cad-panel-inner">
      <div className="cad-bom-bar">
        <div className="cad-bom-filters">
          {SUBSYSTEMS.map(s => (
            <button
              key={s}
              className={`cad-bom-filter${filter === s ? ' active' : ''}`}
              onClick={() => setFilter(s)}
            >
              {s}
            </button>
          ))}
        </div>
        <span className="cad-panel-stat">~${Math.round(baseCost)} base</span>
      </div>

      <div className="cad-bom-table-wrap">
        <table className="cad-bom-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Subsystem</th>
              <th>Part</th>
              <th>Mfg</th>
              <th>Part #</th>
              <th>Qty</th>
              <th>Cost</th>
              <th>Lead</th>
              <th>Supplier</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(row => (
              <tr key={row.line} className={row.optional ? 'optional' : ''}>
                <td className="col-line">{row.line}</td>
                <td className="col-sub">{row.subsystem}</td>
                <td className="col-part">{row.part}</td>
                <td className="col-mfg">{row.mfg}</td>
                <td className="col-pn">{row.pn}</td>
                <td className="col-qty">{row.qty}</td>
                <td className="col-cost">${row.cost.toFixed(2)}</td>
                <td className="col-lead">{row.leadTime}</td>
                <td className="col-supplier">{row.supplier}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
