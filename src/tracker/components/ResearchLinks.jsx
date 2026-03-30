const RESEARCH = [
  {
    tag: 'Study',
    title: 'Sensor Study',
    desc: 'FSM-IMX585 vs IMX686 vs OV48B. Spec chains, crop factors, thermal.',
    href: '/internal/sensorystudy',
  },
  {
    tag: 'Study',
    title: 'Haptics Study',
    desc: 'LRA vs ERM, DRV2605L, waveform design, squeeze ring interaction.',
    href: '/internal/hapticsstudy',
  },
  {
    tag: 'UX Map',
    title: 'Physical Interaction Map',
    desc: 'Maxime le Grelle \u2014 MVP UX flow, physical interfaces, capture modes, settings.',
    href: '/internal/tracker/ux-map.pdf',
  },
]

export default function ResearchLinks() {
  return (
    <div className="cad-research">
      {RESEARCH.map(r => (
        <a key={r.title} href={r.href} className="cad-research-card" target="_blank" rel="noopener noreferrer">
          <div className="cad-research-tag">{r.tag}</div>
          <div className="cad-research-title">{r.title}</div>
          <div className="cad-research-desc">{r.desc}</div>
        </a>
      ))}
    </div>
  )
}
