import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

const path = window.location.pathname
const variant = path === '/seeforyourself' ? 'demo' : path === '/forbidden' ? 'eden' : 'landing'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App variant={variant} />
  </React.StrictMode>,
)
