import { useState } from 'react'
import { MEETINGS } from './meetingsData'

export default function MeetingsPanel() {
  const [expandedId, setExpandedId] = useState(MEETINGS[0]?.id || null)

  return (
    <div className="cad-panel-inner cad-meetings">
      {MEETINGS.map(m => {
        const expanded = expandedId === m.id
        return (
          <div key={m.id} className="mtg-item">
            <button
              className={`mtg-header${expanded ? ' expanded' : ''}`}
              onClick={() => setExpandedId(expanded ? null : m.id)}
            >
              <div className="mtg-header-left">
                <span className="mtg-date">{m.date}</span>
                <span className="mtg-title">{m.title}</span>
              </div>
              <span className="mtg-participants">{m.participants.length} participants</span>
            </button>
            {expanded && (
              <div className="mtg-body">
                <div className="mtg-meta">
                  {m.participants.map((p, i) => (
                    <span key={i} className="mtg-participant">{p}</span>
                  ))}
                </div>

                <p className="mtg-summary">{m.summary}</p>

                {m.artifacts && m.artifacts.length > 0 && (
                  <div className="mtg-section">
                    <div className="mtg-section-title">Artifacts</div>
                    {m.artifacts.map((a, i) => (
                      <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" className="mtg-artifact">
                        {a.label}
                      </a>
                    ))}
                  </div>
                )}

                <div className="mtg-section">
                  <div className="mtg-section-title">Decisions ({m.decisions.length})</div>
                  {m.decisions.map((d, i) => (
                    <div key={i} className="mtg-decision">{d}</div>
                  ))}
                </div>

                <div className="mtg-section">
                  <div className="mtg-section-title">Open Questions ({m.openQuestions.length})</div>
                  {m.openQuestions.map((q, i) => (
                    <div key={i} className="mtg-question">{q}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
