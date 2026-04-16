import { useState, useCallback, useRef, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import DeviceModelTracker from './components/DeviceModelTracker'
import Hotspot from './components/Hotspot'
import AuthGate from './components/AuthGate'
import BOMPanel from './components/BOMPanel'
import DiagramPanel from './components/DiagramPanel'
import SchedulePanel from './components/SchedulePanel'
import MeetingsPanel from './components/MeetingsPanel'
import ActionsPanel from './components/ActionsPanel'
import ComponentPanel from './components/ComponentPanel'
import usePersistedState from './usePersistedState'
import ResearchLinks from './components/ResearchLinks'

const INITIAL_COMPONENTS = [
  { id: 'lens-barrel', name: 'Lens Assembly', subsystem: 'Camera', hotspot: [0.0, 0.0, -1.2], detail: 'FSM-IMX585 + A39N liquid lens + double convex + aspheric', questions: [], openItems: [] },
  { id: 'body-top', name: 'Body Shell', subsystem: 'Mechanical', hotspot: [0.5, 0.4, 0.2], detail: 'Polycarbonate housing, injection molded', questions: [], openItems: [] },
  { id: 'display', name: 'Round AMOLED', subsystem: 'Display', hotspot: [0.0, 0.0, 0.5], detail: 'Tianma 1.8\u2033 480\u00d7480 MIPI-DSI', questions: [], openItems: [] },
  { id: 'soc', name: 'Qualcomm AR1+', subsystem: 'SoC', hotspot: [0.0, -0.2, 0.0], detail: 'Main application processor + ISP', questions: [], openItems: [] },
  { id: 'imu', name: 'BMI270 IMU', subsystem: 'Sensors', hotspot: [0.4, -0.3, 0.3], detail: '6-axis IMU, Bosch', questions: [], openItems: [] },
  { id: 'wifi', name: 'Wi-Fi/BLE', subsystem: 'Connectivity', hotspot: [-0.4, -0.3, 0.3], detail: 'ESP32-C6-MINI-1', questions: [], openItems: [] },
  { id: 'battery', name: 'Battery', subsystem: 'Power', hotspot: [0.0, -0.5, 0.5], detail: 'Li-Po 2,000\u20132,500 mAh + BQ25895 PMIC', questions: [], openItems: [] },
  { id: 'haptics', name: 'Haptic Driver + LRA', subsystem: 'Haptics', hotspot: [0.5, 0.0, 0.0], detail: 'TI DRV2605L + LRA', questions: [], openItems: [] },
  { id: 'buttons', name: 'Buttons + LEDs', subsystem: 'I/O', hotspot: [0.7, 0.3, 0.0], detail: 'C&K / Vishay, shutter + mode', questions: [], openItems: [] },
  { id: 'touch-ring', name: 'Touch/Squeeze Ring', subsystem: 'Input', hotspot: [-0.5, 0.3, -0.6], detail: 'Azoteq IQS231', questions: [], openItems: [] },
]

const BOTTOM_PANELS = ['bom', 'schedule']
const RIGHT_PANELS = ['diagram', 'research', 'meetings', 'actions']
const ALL_PANELS = [...BOTTOM_PANELS, ...RIGHT_PANELS]

function useDrag(axis, initial, min, max) {
  const [size, setSize] = useState(initial)
  const dragging = useRef(false)
  const startPos = useRef(0)
  const startSize = useRef(0)

  const onMouseDown = useCallback((e) => {
    e.preventDefault()
    dragging.current = true
    startPos.current = axis === 'y' ? e.clientY : e.clientX
    startSize.current = size
    document.body.style.cursor = axis === 'y' ? 'row-resize' : 'col-resize'
    document.body.style.userSelect = 'none'
  }, [size, axis])

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!dragging.current) return
      const delta = axis === 'y'
        ? startPos.current - e.clientY
        : startPos.current - e.clientX
      const next = Math.min(max, Math.max(min, startSize.current + delta))
      setSize(next)
    }
    const onMouseUp = () => {
      dragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [axis, min, max])

  return [size, onMouseDown]
}

export default function TrackerApp() {
  return (
    <AuthGate>
      {({ userEmail, onLogout }) => <TrackerInner userEmail={userEmail} onLogout={onLogout} />}
    </AuthGate>
  )
}

function TrackerInner({ userEmail, onLogout }) {
  const [components, setComponents] = usePersistedState('model_components', INITIAL_COMPONENTS)
  const [selectedId, setSelectedId] = useState(null)
  const [openPanels, setOpenPanels] = useState(new Set())
  const [visibleSubsystems, setVisibleSubsystems] = useState(new Set(INITIAL_COMPONENTS.map(c => c.subsystem)))
  const [bottomTab, setBottomTab] = useState('bom')
  const [rightTab, setRightTab] = useState('diagram')
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [mobileSidebar, setMobileSidebar] = useState(false)
  const [mobilePanel, setMobilePanel] = useState(null) // which panel is full-screen on mobile

  const initials = userEmail ? userEmail.split('@')[0].slice(0, 2).toUpperCase() : '?'

  const [bottomH, onBottomDrag] = useDrag('y', 260, 120, 500)
  const [rightW, onRightDrag] = useDrag('x', 360, 200, 600)

  const selected = components.find(c => c.id === selectedId) || null
  const visibleComponents = components.filter(c => visibleSubsystems.has(c.subsystem))
  const allSubsystems = [...new Set(components.map(c => c.subsystem))]

  const hasBottom = BOTTOM_PANELS.some(p => openPanels.has(p))
  const hasRight = RIGHT_PANELS.some(p => openPanels.has(p))

  const handleSelect = useCallback((id) => {
    setSelectedId(prev => prev === id ? null : id)
  }, [])

  const togglePanel = (panel) => {
    setOpenPanels(prev => {
      const next = new Set(prev)
      if (next.has(panel)) {
        next.delete(panel)
      } else {
        next.add(panel)
        if (BOTTOM_PANELS.includes(panel)) setBottomTab(panel)
        if (RIGHT_PANELS.includes(panel)) setRightTab(panel)
      }
      return next
    })
  }

  const toggleSubsystem = (sub) => {
    setVisibleSubsystems(prev => {
      const next = new Set(prev)
      if (next.has(sub)) next.delete(sub)
      else next.add(sub)
      return next
    })
  }

  const toggleAll = () => {
    if (visibleSubsystems.size === allSubsystems.length) {
      setVisibleSubsystems(new Set())
    } else {
      setVisibleSubsystems(new Set(allSubsystems))
    }
  }

  const updateComponent = useCallback((id, updates) => {
    setComponents(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c))
  }, [setComponents])

  const removeComponent = useCallback((id) => {
    setComponents(prev => prev.filter(c => c.id !== id))
    if (selectedId === id) setSelectedId(null)
  }, [selectedId, setComponents])

  const addComponent = useCallback(() => {
    const id = 'comp-' + Date.now()
    const newComp = { id, name: 'New Component', subsystem: 'Mechanical', hotspot: [0, 0, 0], detail: '', questions: [], openItems: [] }
    setComponents(prev => [...prev, newComp])
    setSelectedId(id)
  }, [setComponents])

  return (
    <div className="cad-root">
      {/* Top bar */}
      <div className="cad-topbar">
        <div className="cad-topbar-left">
          <button className="cad-mobile-menu" onClick={() => setMobileSidebar(v => !v)}>&#9776;</button>
          <span className="cad-logo">Kinship / Camera</span>
          <span className="cad-title">Program Tracker</span>
        </div>
        <div className="cad-topbar-right">
          {ALL_PANELS.map(p => (
            <button
              key={p}
              className={`cad-topbar-btn${openPanels.has(p) ? ' active' : ''}`}
              onClick={() => togglePanel(p)}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Main body: columns then rows */}
      <div className="cad-body">
        {/* Left sidebar */}
        <div className={`cad-sidebar${mobileSidebar ? ' mobile-open' : ''}`}>
          <button className="cad-mobile-close" onClick={() => setMobileSidebar(false)}>&times;</button>
          <div className="cad-sidebar-title">
            Layers
            <button className="cad-sidebar-toggle" onClick={toggleAll}>
              {visibleSubsystems.size === allSubsystems.length ? 'hide all' : 'show all'}
            </button>
          </div>
          {allSubsystems.map(sub => (
            <label key={sub} className="cad-layer">
              <input
                type="checkbox"
                checked={visibleSubsystems.has(sub)}
                onChange={() => toggleSubsystem(sub)}
              />
              <span className="cad-layer-name">{sub}</span>
              <span className="cad-layer-count">
                {components.filter(c => c.subsystem === sub).length}
              </span>
            </label>
          ))}
          <div className="cad-sidebar-title" style={{ marginTop: 24 }}>
            Components
            <button className="cad-sidebar-toggle" onClick={addComponent}>+ add</button>
          </div>
          <div className="cad-component-list">
            {visibleComponents.map(c => (
              <div
                key={c.id}
                className={`cad-component-item${selectedId === c.id ? ' selected' : ''}`}
                onClick={() => handleSelect(c.id)}
              >
                <span className="cad-component-name">{c.name}</span>
                <span className="cad-component-sub">{c.subsystem}</span>
                <button className="cad-component-delete" onClick={e => { e.stopPropagation(); removeComponent(c.id) }} title="Remove">&times;</button>
              </div>
            ))}
          </div>

          <div className="cad-sidebar-user">
            <button className="cad-avatar" onClick={() => setShowUserMenu(v => !v)}>
              {initials}
            </button>
            {showUserMenu && (
              <div className="cad-user-menu">
                <div className="cad-user-email">{userEmail}</div>
                <button className="cad-user-logout" onClick={onLogout}>Log out</button>
              </div>
            )}
          </div>
        </div>

        {/* Center + bottom column */}
        <div className="cad-center">
          {/* Top row: canvas + right dock */}
          <div className="cad-center-top">
            <div className="cad-canvas">
              <Canvas
                camera={{ position: [4, 3, 5], fov: 40 }}
                gl={{ antialias: true, alpha: false }}
                onPointerMissed={() => handleSelect(null)}
              >
                <color attach="background" args={['#ffffff']} />
                <ambientLight intensity={0.6} />
                <directionalLight position={[10, 10, 5]} intensity={0.8} />
                <Environment preset="studio" environmentIntensity={0.4} />
                <OrbitControls
                  makeDefault
                  enableDamping
                  dampingFactor={0.05}
                  minDistance={2}
                  maxDistance={12}
                  enablePan={false}
                />
                <DeviceModelTracker />
                {visibleComponents.map(comp => (
                  <Hotspot
                    key={comp.id}
                    component={comp}
                    isSelected={comp.id === selectedId}
                    onSelect={handleSelect}
                  />
                ))}
              </Canvas>
              <div className="cad-hint">Drag to orbit &middot; Scroll to zoom</div>
            </div>

            {/* Right dock */}
            {(hasRight || selected) && (
              <div className="cad-right-dock" style={{ width: rightW }}>
                <div className="cad-drag-handle-v" onMouseDown={onRightDrag} />
                <div className="cad-dock-inner">
                  {/* Right dock tabs */}
                  {hasRight && (
                    <>
                      <div className="cad-dock-tabs">
                        {RIGHT_PANELS.filter(p => openPanels.has(p)).map(p => (
                          <button
                            key={p}
                            className={`cad-dock-tab${rightTab === p ? ' active' : ''}`}
                            onClick={() => setRightTab(p)}
                          >
                            {p}
                          </button>
                        ))}
                        {selected && (
                          <button
                            className={`cad-dock-tab${rightTab === '_component' ? ' active' : ''}`}
                            onClick={() => setRightTab('_component')}
                          >
                            {selected.name}
                          </button>
                        )}
                      </div>
                      <div className="cad-dock-content">
                        {rightTab === 'diagram' && openPanels.has('diagram') && <DiagramPanel />}
                        {rightTab === 'research' && openPanels.has('research') && <ResearchLinks />}
                        {rightTab === 'meetings' && openPanels.has('meetings') && <MeetingsPanel />}
                        {rightTab === 'actions' && openPanels.has('actions') && <ActionsPanel />}
                        {rightTab === '_component' && selected && (
                          <ComponentPanel
                            component={selected}
                            onClose={() => handleSelect(null)}
                            onUpdate={updateComponent}
                          />
                        )}
                      </div>
                    </>
                  )}
                  {!hasRight && selected && (
                    <ComponentPanel
                      component={selected}
                      onClose={() => handleSelect(null)}
                      onUpdate={updateComponent}
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Bottom dock */}
          {hasBottom && (
            <div className="cad-bottom-dock" style={{ height: bottomH }}>
              <div className="cad-drag-handle-h" onMouseDown={onBottomDrag} />
              <div className="cad-dock-tabs">
                {BOTTOM_PANELS.filter(p => openPanels.has(p)).map(p => (
                  <button
                    key={p}
                    className={`cad-dock-tab${bottomTab === p ? ' active' : ''}`}
                    onClick={() => setBottomTab(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <div className="cad-dock-content">
                {bottomTab === 'bom' && openPanels.has('bom') && <BOMPanel />}
                {bottomTab === 'schedule' && openPanels.has('schedule') && <SchedulePanel />}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
