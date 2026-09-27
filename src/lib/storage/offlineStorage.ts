/**
 * VarshaNetra ROAD-005: Offline IndexedDB Storage & Queue Manager
 *
 * Implements browser-native IndexedDB storage for:
 * - Structured offline telemetry cache with TTL expiration
 * - Persistent field report submission queue with automatic background synchronization
 * - Storage usage analytics and cache maintenance
 */

const DB_NAME = "VarshaNetra_OfflineDB";
const DB_VERSION = 1;
const CACHE_STORE = "telemetry_cache";
const QUEUE_STORE = "reports_queue";

export interface CacheEntry<T = unknown> {
  key: string;
  data: T;
  timestamp: number;
  expiryMinutes: number;
}

export interface QueuedFieldReport {
  localId: string;
  payload: Record<string, unknown>;
  queuedAt: string;
  retryCount: number;
  error?: string;
}

// Standard Cache Keys & Expiry per ROAD-005 Part 5
export const OFFLINE_CACHE_CONFIG = {
  weather_current: { expiryMinutes: 30, label: "Current Weather Telemetry" },
  flood_risk: { expiryMinutes: 30, label: "Flood Risk Assessment" },
  incidents_active: { expiryMinutes: 5, label: "Active Emergency Incidents" },
  teams_status: { expiryMinutes: 10, label: "Response Teams Status" },
  resources_status: { expiryMinutes: 10, label: "Tactical Resources Status" },
  shelters_status: { expiryMinutes: 15, label: "Evacuation Shelters Status" },
  alerts_active: { expiryMinutes: 5, label: "Active Early Warning Alerts" },
  district_config: { expiryMinutes: 1440, label: "District Geometry & Config" },
} as const;

export type StandardCacheKey = keyof typeof OFFLINE_CACHE_CONFIG;

/**
 * Initializes and upgrades the IndexedDB database.
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      return reject(new Error("IndexedDB is not supported in this runtime environment."));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(CACHE_STORE)) {
        db.createObjectStore(CACHE_STORE, { keyPath: "key" });
      }

      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        const queueStore = db.createObjectStore(QUEUE_STORE, { keyPath: "localId" });
        queueStore.createIndex("queuedAt", "queuedAt", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Failed to open IndexedDB"));
  });
}

// ==========================================
// 1. TELEMETRY CACHE FUNCTIONS
// ==========================================

/**
 * Saves arbitrary data to the offline cache with timestamp and expiration.
 */
export async function saveToOfflineCache(
  key: string,
  data: unknown,
  expiryMinutes: number
): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(CACHE_STORE, "readwrite");
      const store = tx.objectStore(CACHE_STORE);

      const entry: CacheEntry = {
        key,
        data,
        timestamp: Date.now(),
        expiryMinutes,
      };

      const req = store.put(entry);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn(`[VarshaNetra:OfflineStorage] Failed to cache key "${key}":`, err);
  }
}

/**
 * Retrieves data from the offline cache if not expired.
 * Returns null if expired or not found.
 */
export async function getFromOfflineCache<T>(key: string): Promise<T | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(CACHE_STORE, "readonly");
      const store = tx.objectStore(CACHE_STORE);
      const req = store.get(key);

      req.onsuccess = () => {
        const entry = req.result as CacheEntry<T> | undefined;
        if (!entry) {
          return resolve(null);
        }

        const ageMs = Date.now() - entry.timestamp;
        const maxAgeMs = entry.expiryMinutes * 60 * 1000;

        if (ageMs > maxAgeMs) {
          // Entry expired
          resolve(null);
        } else {
          resolve(entry.data);
        }
      };

      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

/**
 * Cleans up all expired cache entries and returns count of removed items.
 */
export async function clearExpiredCache(): Promise<number> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(CACHE_STORE, "readwrite");
      const store = tx.objectStore(CACHE_STORE);
      const req = store.openCursor();
      let purged = 0;

      req.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (cursor) {
          const entry = cursor.value as CacheEntry;
          const ageMs = Date.now() - entry.timestamp;
          const maxAgeMs = entry.expiryMinutes * 60 * 1000;

          if (ageMs > maxAgeMs) {
            cursor.delete();
            purged++;
          }
          cursor.continue();
        } else {
          resolve(purged);
        }
      };

      req.onerror = () => reject(req.error);
    });
  } catch {
    return 0;
  }
}

/**
 * Purges all cached telemetry entries from IndexedDB.
 */
export async function clearAllOfflineCache(): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(CACHE_STORE, "readwrite");
      const store = tx.objectStore(CACHE_STORE);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error("[VarshaNetra:OfflineStorage] Error clearing cache:", err);
  }
}

// ==========================================
// 2. OFFLINE FIELD REPORT QUEUE (ROAD-005 PART 6)
// ==========================================

/**
 * Enqueues a field report when device is offline.
 * Returns the generated temporary local ID (e.g., LOCAL-1727280000000).
 */
export async function enqueueOfflineReport(payload: Record<string, unknown>): Promise<string> {
  const localId = `LOCAL-${Date.now()}`;
  const record: QueuedFieldReport = {
    localId,
    payload,
    queuedAt: new Date().toISOString(),
    retryCount: 0,
  };

  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, "readwrite");
    const store = tx.objectStore(QUEUE_STORE);
    const req = store.add(record);

    req.onsuccess = () => {
      // Notify components about queue change
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("varshanetra:queue-updated"));
      }
      resolve(localId);
    };

    req.onerror = () => reject(req.error);
  });
}

/**
 * Retrieves all pending field reports from the offline queue.
 */
export async function getQueuedOfflineReports(): Promise<QueuedFieldReport[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, "readonly");
      const store = tx.objectStore(QUEUE_STORE);
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

/**
 * Removes a successfully synchronized report from the queue.
 */
export async function removeQueuedOfflineReport(localId: string): Promise<boolean> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, "readwrite");
      const store = tx.objectStore(QUEUE_STORE);
      const req = store.delete(localId);

      req.onsuccess = () => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("varshanetra:queue-updated"));
        }
        resolve(true);
      };

      req.onerror = () => reject(req.error);
    });
  } catch {
    return false;
  }
}

/**
 * Returns current count of pending queued reports.
 */
export async function getQueuedReportsCount(): Promise<number> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, "readonly");
      const store = tx.objectStore(QUEUE_STORE);
      const req = store.count();

      req.onsuccess = () => resolve(req.result || 0);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return 0;
  }
}

/**
 * Synchronizes all queued reports to the backend one by one.
 */
export async function syncQueuedOfflineReports(
  onProgress?: (current: number, total: number) => void
): Promise<{ successful: number; failed: number; errors: string[] }> {
  const queued = await getQueuedOfflineReports();
  if (queued.length === 0) {
    return { successful: 0, failed: 0, errors: [] };
  }

  let successful = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < queued.length; i++) {
    const item = queued[i];
    if (onProgress) {
      onProgress(i + 1, queued.length);
    }

    try {
      const res = await fetch("/api/field-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...item.payload,
          _offline_sync: true,
          _local_id: item.localId,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }

      await removeQueuedOfflineReport(item.localId);
      successful++;
    } catch (err: unknown) {
      failed++;
      const msg = err instanceof Error ? err.message : "Sync error";
      errors.push(`${item.localId}: ${msg}`);
      console.warn(`[VarshaNetra:Sync] Failed to sync ${item.localId}:`, msg);
    }
  }

  return { successful, failed, errors };
}

// ==========================================
// 3. STORAGE TELEMETRY & STATS
// ==========================================

export async function getOfflineStorageStats(): Promise<{
  cachedItemsCount: number;
  queuedReportsCount: number;
  estimatedSizeMb: number;
  lastOnline: string | null;
  serviceWorkerActive: boolean;
}> {
  let cachedItemsCount = 0;
  let queuedReportsCount = 0;

  try {
    const db = await openDatabase();
    cachedItemsCount = await new Promise<number>((res) => {
      const tx = db.transaction(CACHE_STORE, "readonly");
      const req = tx.objectStore(CACHE_STORE).count();
      req.onsuccess = () => res(req.result || 0);
      req.onerror = () => res(0);
    });

    queuedReportsCount = await new Promise<number>((res) => {
      const tx = db.transaction(QUEUE_STORE, "readonly");
      const req = tx.objectStore(QUEUE_STORE).count();
      req.onsuccess = () => res(req.result || 0);
      req.onerror = () => res(0);
    });
  } catch {
    // Graceful fallback
  }

  // Storage estimate via StorageManager
  let estimatedSizeMb = 0.5;
  if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.estimate) {
    try {
      const est = await navigator.storage.estimate();
      if (est.usage) {
        estimatedSizeMb = parseFloat((est.usage / (1024 * 1024)).toFixed(2));
      }
    } catch {
      // Estimate fallback
    }
  }

  const lastOnline = typeof window !== "undefined" ? localStorage.getItem("varshanetra_last_online") : null;
  const serviceWorkerActive =
    typeof navigator !== "undefined" && "serviceWorker" in navigator && Boolean(navigator.serviceWorker.controller);

  return {
    cachedItemsCount,
    queuedReportsCount,
    estimatedSizeMb,
    lastOnline,
    serviceWorkerActive,
  };
}
