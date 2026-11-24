import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { HashRouter } from 'react-router-dom'
import { createApi } from '../shared/api/client'
import { getWebApp } from '../shared/telegram/webApp'
import { App } from './App'
import { createAppStore } from './store'
import './styles.css'

const root = document.getElementById('root')
if (!root) throw new Error('Missing app root')
const webApp = getWebApp()
const { api, demo } = createApi(webApp?.initData ?? '')
const store = createAppStore(api)
createRoot(root).render(<Provider store={store}><HashRouter><App webApp={webApp} demo={demo} /></HashRouter></Provider>)
