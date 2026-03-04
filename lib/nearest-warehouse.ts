import { branchApi } from "./api"

// ─── Branch cache ────────────────────────────────────────────────
interface BranchInfo {
  id: number
  name: string
  address: string
  lat: number
  lng: number
}

let _branchesCache: BranchInfo[] | null = null
let _branchesFetchPromise: Promise<BranchInfo[]> | null = null

/**
 * Load branches from API and cache them.
 * Must be called once before using sync distance functions.
 */
export async function loadBranches(): Promise<BranchInfo[]> {
  if (_branchesCache) return _branchesCache
  if (_branchesFetchPromise) return _branchesFetchPromise
  _branchesFetchPromise = branchApi.getAll().then((data) => {
    _branchesCache = (Array.isArray(data) ? data : []).map((b: any) => ({
      id: b.id,
      name: b.name,
      address: b.address || "",
      lat: parseFloat(b.lat || 0),
      lng: parseFloat(b.lng || 0),
    }))
    return _branchesCache!
  }).catch(() => {
    _branchesCache = []
    return _branchesCache
  })
  return _branchesFetchPromise
}

/** Get cached branches (sync). Call loadBranches() first. */
function getCachedBranches(): BranchInfo[] {
  return _branchesCache || []
}

/**
 * Haversine formula – returns distance in km between two lat/lng points.
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371 // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export interface WarehouseDistance {
  warehouseName: string
  branchName: string
  distance: number // km
  lat: number
  lng: number
}

/**
 * Returns all branch warehouses sorted by distance from the given customer coordinates.
 * Does NOT include "Kho Hub" since Hub is a central warehouse, not a branch.
 */
export function getWarehousesByDistance(
  customerLat: number,
  customerLng: number
): WarehouseDistance[] {
  return getCachedBranches()
    .map((b) => ({
      warehouseName: `Kho ${b.name.replace("BadmintonHub ", "")}`,
      branchName: b.name,
      distance: haversineDistance(customerLat, customerLng, b.lat, b.lng),
      lat: b.lat,
      lng: b.lng,
    }))
    .sort((a, b) => a.distance - b.distance)
}

/**
 * Find the nearest warehouse to the customer.
 * Returns the warehouse name (e.g. "Kho Cầu Giấy") and distance.
 * Falls back to "Kho Hub" if no branches have coordinates.
 */
export function findNearestWarehouse(
  customerLat: number,
  customerLng: number
): { warehouseName: string; distance: number } {
  const sorted = getWarehousesByDistance(customerLat, customerLng)
  if (sorted.length === 0) {
    return { warehouseName: "Kho Hub", distance: 0 }
  }
  return {
    warehouseName: sorted[0].warehouseName,
    distance: sorted[0].distance,
  }
}

/**
 * Map branch ID to warehouse name
 */
export function branchIdToWarehouse(branchId: number): string {
  const branch = getCachedBranches().find((b) => b.id === branchId)
  if (!branch) return "Kho Hub"
  return `Kho ${branch.name.replace("BadmintonHub ", "")}`
}
