export const TEAM = {
  'hana': { name: 'Hana Azab', email: 'hana@kinship.inc' },
  'maxime': { name: 'Maxime le Grelle', email: '' },
  'abtin': { name: 'Abtin', email: '' },
  'hakan': { name: 'Hakan Ohlgren', email: '' },
}

export const MEETINGS = [
  {
    id: 'idme-workshop-0330',
    title: 'Camera: ID/ME Workshop',
    date: '2026-03-30',
    participants: ['Hana Azab', 'Maxime le Grelle', 'Abtin', 'Hakan Ohlgren'],
    decisions: [
      'MVP interaction model: physical button (wake), touchscreen (capture modes), capacitive touch slider (lens adjustment)',
      'UI philosophy: features must fight for their life to make it onto the product \u2014 start from nothing, not from a feature list',
      'AR1+ remains primary SOC candidate due to pop memory package (RAM + flash) and small die size optimized for wearables',
      'Alternative SOCs to evaluate: MediaTek Genio, Qualcomm DragonWing \u2014 Hana to share comparison doc',
      'Display: AMOLED strongly preferred, 1500\u20132000 nits target, Tianma via Rutronik distributor',
      'Full round display with center FPC is the goal \u2014 no D-shape, no visible bezel',
      'Battery: EU regulation requires user-replaceable battery \u2014 team commits to no external seam on device, will find clever solutions',
      'Haptics: thin film piezoelectric on capacitive touch rim \u2014 no audible noise, no interference with liquid lens, needs physical testing',
      'Orientation: 1:1 square format reduces rotation processing burden \u2014 post-processing in cloud acceptable for MVP',
      'Computational pipeline will be determined downstream of architecture decisions',
    ],
    openQuestions: [
      'AR1+ ISP access \u2014 requires licensing agreement with Qualcomm, need to understand tooling requirements',
      'Does AR1+ support the megapixel count we need? Binning required if sensor exceeds ISP capability',
      'IMX989 availability and cost from Sony/Framos \u2014 would enable optical zoom with dual liquid lenses',
      'Qualcomm availability, pricing, and platform lifecycle for AR1+',
      'Display NRE cost: AMOLED vs SFT \u2014 can Tianma break out fingerprint sensor cost separately?',
      'Power budget unknown \u2014 display + sensor consumption drives SOC decision, ~1600\u20131800 mAh battery estimate',
      'Can Tianma deliver full round display with center FPC?',
      'GPU processing for real-time rotation vs post-processing tradeoff \u2014 thermal and power implications',
      'How to hide battery access with no seam \u2014 bayonet lens mount as potential access point?',
      'Thin film piezoelectric haptics \u2014 does it actually work in integrated prototype?',
    ],
    summary: 'First cross-functional workshop with ID (Maxime), ME (Abtin), and system architecture (Hakan/Sigma). Reviewed Maxime\'s UX map defining MVP interaction model. Major discussion on SOC selection (AR1+ vs alternatives), display sourcing (Tianma AMOLED with custom NRE), and power/thermal budget constraints. Key insight: AR1+ pop memory package is uniquely small but may lack GPU/ISP power. Team aligned on testing thin film piezoelectric haptics on v0 prototype. Critical path items: Qualcomm meeting for AR1+ access, Tianma for display samples, Sony/Framos for IMX989 sensor.',
    artifacts: [
      { label: 'UX Interaction Map (Maxime)', url: '/internal/tracker/ux-map.pdf' },
    ],
  },
]

export const ACTION_ITEMS = [
  { id: 'ai-001', meeting: 'idme-workshop-0330', assignee: 'Hakan Ohlgren', email: '', description: 'Set up meeting with Qualcomm for AR1+ access, availability, pricing, and lifecycle', priority: 'critical', status: 'open', due: '2026-04-10', subsystem: 'SoC', notes: [], links: [] },
  { id: 'ai-002', meeting: 'idme-workshop-0330', assignee: 'Hakan Ohlgren', email: '', description: 'Share Qualcomm contact info with Hana', priority: 'high', status: 'open', due: '2026-03-31', subsystem: 'SoC', notes: [], links: [] },
  { id: 'ai-003', meeting: 'idme-workshop-0330', assignee: 'Hakan Ohlgren', email: '', description: 'Send mail to Tianma/Rutronik: lead times, samples, full round display with center FPC, fingerprint sensor cost breakdown', priority: 'critical', status: 'open', due: '2026-03-31', subsystem: 'Display', notes: [], links: [] },
  { id: 'ai-004', meeting: 'idme-workshop-0330', assignee: 'Hana Azab', email: 'hana@kinship.inc', description: 'Talk to Framos about IMX989 availability \u2014 ask if datasheets can be shared with Sigma', priority: 'critical', status: 'open', due: '2026-04-04', subsystem: 'Camera', notes: [], links: [] },
  { id: 'ai-005', meeting: 'idme-workshop-0330', assignee: 'Hana Azab', email: 'hana@kinship.inc', description: 'Share SOC comparison document (AR1+, MediaTek Genio, Qualcomm DragonWing)', priority: 'high', status: 'open', due: '2026-04-01', subsystem: 'SoC', notes: [], links: [] },
  { id: 'ai-006', meeting: 'idme-workshop-0330', assignee: 'Hana Azab', email: 'hana@kinship.inc', description: 'Get thin film piezoelectric samples and test on current ESP32 prototype', priority: 'high', status: 'open', due: '2026-04-07', subsystem: 'Haptics', notes: [], links: [] },
  { id: 'ai-007', meeting: 'idme-workshop-0330', assignee: 'Hana Azab', email: 'hana@kinship.inc', description: 'Circulate Maxime\'s UX interaction map to the team', priority: 'medium', status: 'open', due: '2026-03-31', subsystem: 'Input', notes: [], links: [] },
  { id: 'ai-008', meeting: 'idme-workshop-0330', assignee: 'Hana Azab', email: 'hana@kinship.inc', description: 'Add component datasheets to tracker for cross-referencing requirements and conflicts', priority: 'medium', status: 'open', due: '2026-04-07', subsystem: 'SoC', notes: [], links: [] },
  { id: 'ai-009', meeting: 'idme-workshop-0330', assignee: 'Abtin', email: '', description: 'Work on mechanical stack-up to establish power budget constraints and volume allocation', priority: 'high', status: 'open', due: '2026-04-07', subsystem: 'Power', notes: [], links: [] },
  { id: 'ai-010', meeting: 'idme-workshop-0330', assignee: 'Hana Azab', email: 'hana@kinship.inc', description: 'Get sensor access visibility (optic sprint starts next week)', priority: 'critical', status: 'open', due: '2026-04-04', subsystem: 'Camera', notes: [], links: [] },
]
