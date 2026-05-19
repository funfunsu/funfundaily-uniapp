import { afterEach, beforeEach, vi } from 'vitest'

/** 为单测提供最小 uni 运行时能力。 */
function createUniMock() {
  return {
    showToast: vi.fn(),
    getStorageSync: vi.fn(() => ''),
    setStorageSync: vi.fn(),
    removeStorageSync: vi.fn(),
    showModal: vi.fn(),
    navigateTo: vi.fn(),
    switchTab: vi.fn(),
    reLaunch: vi.fn(),
    pageScrollTo: vi.fn(),
    request: vi.fn(),
  }
}

beforeEach(() => {
  ;(globalThis as any).uni = createUniMock()
})

afterEach(() => {
  vi.clearAllMocks()
})
