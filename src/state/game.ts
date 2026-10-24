import { create } from 'zustand'

export type ViewMode = 'explore' | 'overview'

interface GameState {
  viewMode: ViewMode
  /** Room the detective is currently standing in (null while outside every room). */
  currentRoomId: string | null
  /** True while an inspection panel, pause menu or similar owns the input. Movement is ignored. */
  frozen: boolean
  /** Bumped to request a teleport; Player reads `spawnRoomId` when it changes. */
  teleportNonce: number
  spawnRoomId: string
  /** Hotspot within reach of the detective right now (drives the Press E prompt). */
  nearbyId: string | null
  /** Hotspot currently being inspected; non-null means movement is frozen. */
  inspectingId: string | null
  inventoryOpen: boolean
  setViewMode: (m: ViewMode) => void
  setCurrentRoom: (id: string | null) => void
  setFrozen: (f: boolean) => void
  setNearby: (id: string | null) => void
  inspect: (id: string) => void
  closeInspection: () => void
  toggleInventory: (open?: boolean) => void
  teleportToRoom: (roomId: string) => void
}

export const useGame = create<GameState>((set) => ({
  viewMode: 'explore',
  currentRoomId: 'main-gallery',
  frozen: false,
  teleportNonce: 0,
  spawnRoomId: 'main-gallery',
  nearbyId: null,
  inspectingId: null,
  inventoryOpen: false,
  setViewMode: (viewMode) => set({ viewMode }),
  setCurrentRoom: (currentRoomId) => set((s) => (s.currentRoomId === currentRoomId ? s : { currentRoomId })),
  setFrozen: (frozen) => set({ frozen }),
  setNearby: (nearbyId) => set((s) => (s.nearbyId === nearbyId ? s : { nearbyId })),
  inspect: (id) => set({ inspectingId: id, frozen: true, inventoryOpen: false }),
  closeInspection: () => set({ inspectingId: null, frozen: false }),
  toggleInventory: (open) => set((s) => ({ inventoryOpen: open ?? !s.inventoryOpen })),
  teleportToRoom: (spawnRoomId) => set((s) => ({ spawnRoomId, inspectingId: null, frozen: false, teleportNonce: s.teleportNonce + 1, viewMode: 'explore', currentRoomId: spawnRoomId })),
}))
