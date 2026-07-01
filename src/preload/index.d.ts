import type { CompApi } from './index'

declare global {
  interface Window {
    comp: CompApi
  }
}
