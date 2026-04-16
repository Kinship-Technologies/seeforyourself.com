import React from 'react'
import ReactDOM from 'react-dom/client'
import TrackerApp from './App'
import './tracker.css'

ReactDOM.createRoot(document.getElementById('tracker-root')).render(
  <React.StrictMode>
    <TrackerApp />
  </React.StrictMode>,
)
