import { useState, useRef, useEffect } from 'react'
import { ACTION_ITEMS, TEAM } from './meetingsData'
import usePersistedState from '../usePersistedState'

const TEAM_LIST = Object.values(TEAM)
const STATUSES = ['all', 'open', 'done']
const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 }

function toCalendarDate(d) { return d && !d.includes(' ') ? d.replace(/-/g, '') + 'T090000' : null }

function googleCalUrl(item) {
  const s = toCalendarDate(item.due); if (!s) return null
  return `https://calendar.google.com/calendar/render?${new URLSearchParams({ action: 'TEMPLATE', text: `[${item.subsystem}] ${item.description}`, dates: `${s}/${s.replace('090000','100000')}`, details: `Assignee: ${item.assignee}\nPriority: ${item.priority}` })}`
}

function outlookCalUrl(item) {
  const s = toCalendarDate(item.due); if (!s) return null
  return `https://outlook.office.com/calendar/0/deeplink/compose?${new URLSearchParams({ path: '/calendar/action/compose', rru: 'addevent', subject: `[${item.subsystem}] ${item.description}`, startdt: item.due+'T09:00:00', enddt: item.due+'T10:00:00' })}`
}

function downloadIcs(item) {
  const s = toCalendarDate(item.due); if (!s) return
  const d = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nDTSTART:${s}\r\nDTEND:${s.replace('090000','100000')}\r\nSUMMARY:[${item.subsystem}] ${item.description}\r\nEND:VEVENT\r\nEND:VCALENDAR`
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([d], { type: 'text/calendar' })); a.download = `${item.id}.ics`; a.click()
}

// Render text with @mentions highlighted
function renderWithMentions(text) {
  const parts = text.split(/(@\w+)/g)
  return parts.map((p, i) => {
    if (p.startsWith('@')) {
      const key = p.slice(1).toLowerCase()
      const member = TEAM[key]
      return <span key={i} className="action-mention" title={member ? member.email || member.name : p}>{p}</span>
    }
    return p
  })
}

export default function ActionsPanel() {
  const [items, setItems] = usePersistedState('action_items', ACTION_ITEMS)
  const [filterAssignee, setFilterAssignee] = useState('All')
  const [filterStatus, setFilterStatus] = useState('all')
  const [expandedId, setExpandedId] = useState(null)
  const [noteInput, setNoteInput] = useState('')
  const [linkLabel, setLinkLabel] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [showAssignMenu, setShowAssignMenu] = useState(null)
  const [showTagMenu, setShowTagMenu] = useState(false)
  const noteRef = useRef(null)

  const assignees = ['All', ...new Set(items.map(a => a.assignee))]

  let filtered = items
  if (filterAssignee !== 'All') filtered = filtered.filter(a => a.assignee === filterAssignee)
  if (filterStatus !== 'all') filtered = filtered.filter(a => a.status === filterStatus)
  filtered = [...filtered].sort((a, b) => {
    // Done items sink to bottom
    if (a.status === 'done' && b.status !== 'done') return 1
    if (a.status !== 'done' && b.status === 'done') return -1
    return (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9)
  })

  const openCount = items.filter(a => a.status === 'open').length
  const critCount = items.filter(a => a.priority === 'critical' && a.status === 'open').length

  const toggleStatus = (id) => {
    setItems(prev => prev.map(a => a.id === id ? { ...a, status: a.status === 'open' ? 'done' : 'open' } : a))
  }

  const reassign = (id, name, email) => {
    setItems(prev => prev.map(a => a.id === id ? { ...a, assignee: name, email } : a))
    setShowAssignMenu(null)
  }

  const addNote = (id) => {
    if (!noteInput.trim()) return
    setItems(prev => prev.map(a => a.id === id ? { ...a, notes: [...a.notes, noteInput.trim()] } : a))
    setNoteInput('')
    setShowTagMenu(false)
  }

  const addLink = (id) => {
    if (!linkUrl.trim()) return
    setItems(prev => prev.map(a => a.id === id ? { ...a, links: [...a.links, { label: linkLabel.trim() || linkUrl.trim(), url: linkUrl.trim() }] } : a))
    setLinkLabel(''); setLinkUrl('')
  }

  const removeNote = (id, idx) => setItems(prev => prev.map(a => a.id === id ? { ...a, notes: a.notes.filter((_, i) => i !== idx) } : a))
  const removeLink = (id, idx) => setItems(prev => prev.map(a => a.id === id ? { ...a, links: a.links.filter((_, i) => i !== idx) } : a))

  const insertTag = (name) => {
    const key = Object.entries(TEAM).find(([, v]) => v.name === name)?.[0] || name.split(' ')[0].toLowerCase()
    setNoteInput(prev => prev + `@${key} `)
    setShowTagMenu(false)
    noteRef.current?.focus()
  }

  const handleNoteKeyDown = (e, id) => {
    if (e.key === 'Enter') addNote(id)
    if (e.key === '@') setShowTagMenu(true)
  }

  // Close tag menu when note input loses @
  useEffect(() => {
    if (showTagMenu && !noteInput.includes('@')) setShowTagMenu(false)
  }, [noteInput, showTagMenu])

  return (
    <div className="cad-panel-inner">
      <div className="actions-bar">
        <div className="actions-filters">
          {assignees.map(a => (
            <button key={a} className={`cad-bom-filter${filterAssignee === a ? ' active' : ''}`} onClick={() => setFilterAssignee(a)}>
              {a === 'All' ? 'All' : a.split(' ')[0]}
            </button>
          ))}
          <span className="actions-sep" />
          {STATUSES.map(s => (
            <button key={s} className={`cad-bom-filter${filterStatus === s ? ' active' : ''}`} onClick={() => setFilterStatus(s)}>
              {s}
            </button>
          ))}
        </div>
        <span className="cad-panel-stat">{openCount} open &middot; {critCount} critical</span>
      </div>

      <div className="actions-list">
        {filtered.map(item => {
          const expanded = expandedId === item.id
          const isDone = item.status === 'done'
          const gcalUrl = googleCalUrl(item)
          const olUrl = outlookCalUrl(item)
          return (
            <div key={item.id} className={`action-item priority-${item.priority}${expanded ? ' expanded' : ''}${isDone ? ' done' : ''}`}>
              <div className="action-row">
                <button
                  className={`action-check${isDone ? ' checked' : ''}`}
                  onClick={e => { e.stopPropagation(); toggleStatus(item.id) }}
                  title={isDone ? 'Reopen' : 'Mark done'}
                />
                <div className="action-body" onClick={() => { setExpandedId(expanded ? null : item.id); setNoteInput(''); setLinkLabel(''); setLinkUrl(''); setShowTagMenu(false) }} style={{ cursor: 'pointer' }}>
                  <div className="action-desc">{item.description}</div>
                  <div className="action-meta">
                    <span className="action-assignee">
                      {item.assignee}
                      {item.email && <a href={`mailto:${item.email}`} className="action-email" onClick={e => e.stopPropagation()}>{item.email}</a>}
                    </span>
                    <span className="action-sub">{item.subsystem}</span>
                    {item.due && <span className="action-due">Due: {item.due}</span>}
                  </div>
                </div>
                <div className="action-right">
                  <div className="action-priority">{item.priority}</div>
                  {(item.notes.length > 0 || item.links.length > 0) && (
                    <span className="action-badge">{item.notes.length + item.links.length}</span>
                  )}
                </div>
              </div>

              {expanded && (
                <div className="action-detail">
                  {/* Reassign */}
                  <div className="action-detail-section">
                    <div className="action-detail-title">Assigned to</div>
                    <div className="action-assign-row">
                      <button className="action-assign-btn" onClick={() => setShowAssignMenu(showAssignMenu === item.id ? null : item.id)}>
                        {item.assignee} {item.email ? `(${item.email})` : ''} <span className="action-assign-arrow">&#9662;</span>
                      </button>
                      {showAssignMenu === item.id && (
                        <div className="action-assign-menu">
                          {TEAM_LIST.map(t => (
                            <button key={t.name} className="action-assign-option" onClick={() => reassign(item.id, t.name, t.email)}>
                              <span>{t.name}</span>
                              {t.email && <span className="action-assign-email">{t.email}</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="action-detail-section">
                    <div className="action-detail-title">Notes ({item.notes.length})</div>
                    {item.notes.map((n, i) => (
                      <div key={i} className="action-detail-item">
                        <span>{renderWithMentions(n)}</span>
                        <button className="cad-detail-remove" onClick={() => removeNote(item.id, i)}>&times;</button>
                      </div>
                    ))}
                    <div className="cad-detail-input-row" style={{ position: 'relative' }}>
                      <input
                        ref={noteRef}
                        type="text"
                        placeholder="Add note... (type @ to tag)"
                        value={noteInput}
                        onChange={e => setNoteInput(e.target.value)}
                        onKeyDown={e => handleNoteKeyDown(e, item.id)}
                        className="cad-detail-input"
                        onClick={e => e.stopPropagation()}
                      />
                      <button className="cad-detail-add" onClick={() => addNote(item.id)}>+</button>
                      {showTagMenu && (
                        <div className="action-tag-menu">
                          {TEAM_LIST.map(t => (
                            <button key={t.name} className="action-tag-option" onClick={() => insertTag(t.name)}>
                              {t.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Links */}
                  <div className="action-detail-section">
                    <div className="action-detail-title">Links ({item.links.length})</div>
                    {item.links.map((l, i) => (
                      <div key={i} className="action-detail-item">
                        <a href={l.url} target="_blank" rel="noopener noreferrer" className="action-link-a" onClick={e => e.stopPropagation()}>{l.label}</a>
                        <button className="cad-detail-remove" onClick={() => removeLink(item.id, i)}>&times;</button>
                      </div>
                    ))}
                    <div className="cad-detail-input-row">
                      <input type="text" placeholder="Label" value={linkLabel} onChange={e => setLinkLabel(e.target.value)} className="cad-detail-input" style={{ flex: '0 0 80px' }} onClick={e => e.stopPropagation()} />
                      <input type="url" placeholder="URL" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && addLink(item.id)} className="cad-detail-input" onClick={e => e.stopPropagation()} />
                      <button className="cad-detail-add" onClick={() => addLink(item.id)}>+</button>
                    </div>
                  </div>

                  {/* Calendar */}
                  {gcalUrl && (
                    <div className="action-detail-section">
                      <div className="action-detail-title">Add to Calendar</div>
                      <div className="action-cal-row">
                        <a href={gcalUrl} target="_blank" rel="noopener noreferrer" className="action-cal-link" onClick={e => e.stopPropagation()}>Google</a>
                        {olUrl && <a href={olUrl} target="_blank" rel="noopener noreferrer" className="action-cal-link" onClick={e => e.stopPropagation()}>Outlook</a>}
                        <button className="action-cal-link" onClick={e => { e.stopPropagation(); downloadIcs(item) }}>.ics</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
