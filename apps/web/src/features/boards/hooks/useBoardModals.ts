import { useReducer, useCallback } from 'react'

export type ModalName =
  | 'columnConfig'
  | 'addColumn'
  | 'exportMenu'
  | 'importModal'
  | 'activityLog'
  | 'saveAsTemplate'
  | 'accessModal'
  | 'moveModal'
  | 'generateDoc'
  | 'docTemplates'

type ModalState = Record<ModalName, boolean>

type ModalAction =
  | { type: 'open'; name: ModalName }
  | { type: 'close'; name: ModalName }
  | { type: 'toggle'; name: ModalName }

const initialState: ModalState = {
  columnConfig: false,
  addColumn: false,
  exportMenu: false,
  importModal: false,
  activityLog: false,
  saveAsTemplate: false,
  accessModal: false,
  moveModal: false,
  generateDoc: false,
  docTemplates: false,
}

function modalReducer(state: ModalState, action: ModalAction): ModalState {
  switch (action.type) {
    case 'open':
      return { ...state, [action.name]: true }
    case 'close':
      return { ...state, [action.name]: false }
    case 'toggle':
      return { ...state, [action.name]: !state[action.name] }
  }
}

export function useBoardModals() {
  const [modals, dispatch] = useReducer(modalReducer, initialState)

  const openModal = useCallback((name: ModalName) => dispatch({ type: 'open', name }), [])
  const closeModal = useCallback((name: ModalName) => dispatch({ type: 'close', name }), [])
  const toggleModal = useCallback((name: ModalName) => dispatch({ type: 'toggle', name }), [])

  return { modals, openModal, closeModal, toggleModal }
}
