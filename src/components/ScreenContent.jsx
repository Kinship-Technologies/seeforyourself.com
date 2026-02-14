/**
 * ScreenContent — defines what shows on the device screen.
 *
 * This component can be used with @react-three/drei's <Html> component
 * to render full React UI onto the 3D device screen.
 *
 * For now, screen content is rendered via canvas in DeviceScreen.jsx.
 * To switch to HTML-based rendering, use:
 *
 *   <Html transform occlude position={[0, 0.1, 0.081]}
 *     style={{ width: 300, height: 540 }}>
 *     <ScreenContent />
 *   </Html>
 */
export default function ScreenContent() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 24,
        color: '#fff',
        fontFamily: '-apple-system, sans-serif',
      }}
    >
      <h1 style={{ fontSize: 28, marginTop: 20 }}>Talis</h1>
      <p style={{ fontSize: 14, opacity: 0.8 }}>See for yourself</p>
    </div>
  )
}
