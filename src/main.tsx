import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { bootstrapPinnoco } from './app/bootstrap'
import './styles.css'

const pinnoco = bootstrapPinnoco()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App onboarding={pinnoco.onboarding} store={pinnoco.store} />
  </React.StrictMode>,
)

if (import.meta.hot) {
  import.meta.hot.dispose(() => pinnoco.dispose())
}
