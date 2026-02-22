import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

const variant = window.location.pathname === '/seeforyourself' ? 'demo' : 'eden'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App variant={variant} />
  </React.StrictMode>,
)
