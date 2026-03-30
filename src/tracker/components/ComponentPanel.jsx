import { useState } from 'react'

const SUBSYSTEMS = ['Camera', 'Mechanical', 'Display', 'SoC', 'Sensors', 'Connectivity', 'Power', 'Haptics', 'I/O', 'Input', 'Audio', 'Storage']

export default function ComponentPanel({ component, onClose, onUpdate }) {
  const [questionInput, setQuestionInput] = useState('')
  const [itemInput, setItemInput] = useState('')

  const addQuestion = () => {
    if (!questionInput.trim()) return
    onUpdate(component.id, { questions: [...component.questions, questionInput.trim()] })
    setQuestionInput('')
  }

  const addOpenItem = () => {
    if (!itemInput.trim()) return
    onUpdate(component.id, { openItems: [...component.openItems, itemInput.trim()] })
    setItemInput('')
  }

  const removeQuestion = (idx) => onUpdate(component.id, { questions: component.questions.filter((_, i) => i !== idx) })
  const removeOpenItem = (idx) => onUpdate(component.id, { openItems: component.openItems.filter((_, i) => i !== idx) })

  const setHotspot = (axis, val) => {
    const next = [...component.hotspot]
    next[axis] = parseFloat(val)
    onUpdate(component.id, { hotspot: next })
  }

  return (
    <div className="cad-panel-inner cad-component-detail">
      {/* Editable name */}
      <div className="cad-detail-section">
        <div className="cad-detail-section-title">Name</div>
        <input
          type="text"
          value={component.name}
          onChange={e => onUpdate(component.id, { name: e.target.value })}
          className="cad-detail-input"
          style={{ fontWeight: 500 }}
        />
      </div>

      {/* Subsystem selector */}
      <div className="cad-detail-section">
        <div className="cad-detail-section-title">Subsystem</div>
        <select
          value={component.subsystem}
          onChange={e => onUpdate(component.id, { subsystem: e.target.value })}
          className="cad-detail-input cad-select"
        >
          {SUBSYSTEMS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Detail */}
      <div className="cad-detail-section">
        <div className="cad-detail-section-title">Detail</div>
        <input
          type="text"
          value={component.detail}
          onChange={e => onUpdate(component.id, { detail: e.target.value })}
          className="cad-detail-input"
          placeholder="Component description..."
        />
      </div>

      {/* Hotspot position */}
      <div className="cad-detail-section">
        <div className="cad-detail-section-title">3D Position</div>
        {['X', 'Y', 'Z'].map((label, i) => (
          <div key={label} className="cad-slider-row">
            <span className="cad-slider-label">{label}</span>
            <input
              type="range"
              min="-2"
              max="2"
              step="0.05"
              value={component.hotspot[i]}
              onChange={e => setHotspot(i, e.target.value)}
              className="cad-slider"
            />
            <span className="cad-slider-val">{component.hotspot[i].toFixed(2)}</span>
          </div>
        ))}
      </div>

      {/* Questions */}
      <div className="cad-detail-section">
        <div className="cad-detail-section-title">
          Questions
          <span className="cad-detail-count">{component.questions.length}</span>
        </div>
        {component.questions.map((q, i) => (
          <div key={i} className="cad-detail-list-item">
            <span>{q}</span>
            <button className="cad-detail-remove" onClick={() => removeQuestion(i)}>&times;</button>
          </div>
        ))}
        <div className="cad-detail-input-row">
          <input
            type="text"
            placeholder="Add question..."
            value={questionInput}
            onChange={e => setQuestionInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addQuestion()}
            className="cad-detail-input"
          />
          <button className="cad-detail-add" onClick={addQuestion}>+</button>
        </div>
      </div>

      {/* Open Items */}
      <div className="cad-detail-section">
        <div className="cad-detail-section-title">
          Open Items
          <span className="cad-detail-count">{component.openItems.length}</span>
        </div>
        {component.openItems.map((item, i) => (
          <div key={i} className="cad-detail-list-item">
            <span>{item}</span>
            <button className="cad-detail-remove" onClick={() => removeOpenItem(i)}>&times;</button>
          </div>
        ))}
        <div className="cad-detail-input-row">
          <input
            type="text"
            placeholder="Add open item..."
            value={itemInput}
            onChange={e => setItemInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addOpenItem()}
            className="cad-detail-input"
          />
          <button className="cad-detail-add" onClick={addOpenItem}>+</button>
        </div>
      </div>
    </div>
  )
}
