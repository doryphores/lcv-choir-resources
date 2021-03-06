import { remote, ipcRenderer } from 'electron'
import React from 'react'
import ReactDOM from 'react-dom'
import { Provider } from 'react-redux'

import { configureStore } from './store'
import { TOGGLE_SETTINGS } from './actions'
import App from './components/app'

export function start (container: Element) {
  configureStore().then(store => {
    ReactDOM.render(
      <Provider store={store}>
        <App />
      </Provider>,
      container
    )

    store.subscribe(() => setTitle(store.getState()))
    setTitle(store.getState())

    if (store.getState().settings.password === '') {
      store.dispatch({ type: TOGGLE_SETTINGS })
    }

    ipcRenderer.on('dispatch-action', (_e: Electron.IpcMessageEvent, actionType: string) => {
      store.dispatch({ type: actionType })
    })
  }).catch(err => console.error(err))
}

function setTitle ({ selectedSong, selectedVoice }: ApplicationState) {
  let title = remote.app.getName()
  if (selectedVoice) title = `${selectedVoice} — ${title}`
  if (selectedSong) title = `${selectedSong} — ${title}`
  document.title = title
}
