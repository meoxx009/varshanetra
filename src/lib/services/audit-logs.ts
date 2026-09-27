/**
 * VarshaNetra - Centralized Immutable Audit Logging Service
 * In accordance with Directives #7, #8, #10, #16, and #20.
 * Logs all operational, state transition, resource, and governance events.
 * Strict sanitization removes secrets, credentials, tokens, or passwords before persistence.
 */

import { createAdminClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import {
  AuditLogItem,
  CreateAuditLogInput,
  AuditLogFilterOptions,
} from "@/types/audit-logs";
import * as fs from "fs";
import * as path from "path";

const AUDIT_STORE_DIR = path.join(process.cwd(), ".data");
const AUDIT_STORE_FILE = path.join(AUDIT_STORE_DIR, "audit_logs_store.json");

// Blacklisted keys that must NEVER be written to audit logs
const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /key/i,
  /service_role/i,
  /authorization/i,
  /bearer/i,
  /cookie/i,
  /session/i,
  /jwt/i,
  /credential/i,
];

/**
 * Recursively sanitizes any object or array to ensure credentials or tokens are never logged.
 */
export function sanitizeAuditMetadata(obj: unknown): Record<string, unknown> {
  if (!obj || typeof obj !== "object") {
    return {};
  }

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const isSensitive = SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
    if (isSensitive) {
      result[key] = "[REDACTED_CREDENTIAL]";
      continue;
    }

    if (value && typeof value === "object" && !Array.isArray(value)) {
      result[key] = sanitizeAuditMetadata(value);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        typeof item === "object" && item !== null
          ? sanitizeAuditMetadata(item)
          : item
      );
    } else {
      result[key] = value;
    }
  }

  return result;
}

// Fallback file persistence helpers
function readFallbackStore(): AuditLogItem[] {
  try {
    if (!fs.existsSync(AUDIT_STORE_FILE)) {
      return [];
    }
    const raw = fs.readFileSync(AUDIT_STORE_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeFallbackStore(logs: AuditLogItem[]): void {
  try {
    if (!fs.existsSync(AUDIT_STORE_DIR)) {
      fs.mkdirSync(AUDIT_STORE_DIR, { recursive: true });
    }
    fs.writeFileSync(AUDIT_STORE_FILE, JSON.stringify(logs, null, 2), "utf-8");
  } catch (err) {
    console.error("[AuditService] Failed to write fallback audit store:", err);
  }
}

/**
 * Appends an immutable audit log entry.
 * Attempts Supabase persistence first, and always saves to local fallback store.
 */
export async function recordAuditLog(input: CreateAuditLogInput): Promise<AuditLogItem> {
  const sanitizedMetadata = sanitizeAuditMetadata(input.metadata || {});
  const timestamp = input.created_at || new Date().toISOString();
  const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const auditEntry: AuditLogItem = {
    id,
    actor_id: input.actor_id || null,
    actor_name: input.actor_name || "System Operator",
    action: input.action,
    entity_type: input.entity_type,
    entity_id: input.entity_id,
    description: input.description,
    metadata: sanitizedMetadata,
    created_at: timestamp,
  };

  // 1. Try Supabase write
  if (isSupabaseConfigured()) {
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("audit_logs")
        .insert({
          id: auditEntry.id,
          actor_id: auditEntry.actor_id,
          actor_name: auditEntry.actor_name,
          action: auditEntry.action,
          entity_type: auditEntry.entity_type,
          entity_id: auditEntry.entity_id,
          description: auditEntry.description,
          metadata: auditEntry.metadata,
          created_at: auditEntry.created_at,
        })
        .select()
        .single();

      if (!error && data) {
        // Also update local fallback store for offline consistency
        const existing = readFallbackStore();
        const updated = [auditEntry, ...existing.filter((e) => e.id !== auditEntry.id)];
        writeFallbackStore(updated.slice(0, 1000));
        return data as AuditLogItem;
      }
    } catch (err) {
      console.warn("[AuditService] Supabase insert skipped or table missing, using local store:", err);
    }
  }

  // 2. Persist to local store
  const existing = readFallbackStore();
  const updated = [auditEntry, ...existing];
  writeFallbackStore(updated.slice(0, 1000));

  return auditEntry;
}

/**
 * Queries audit logs with filtering, search, and pagination.
 */
export async function getAuditLogs(filter?: AuditLogFilterOptions): Promise<AuditLogItem[]> {
  let logs: AuditLogItem[] = [];

  // 1. Try Supabase
  if (isSupabaseConfigured()) {
    try {
      const supabase = createAdminClient();
      let query = supabase.from("audit_logs").select("*").order("created_at", { ascending: false });

    if (filter?.entity_type) {
      query = query.eq("entity_type", filter.entity_type);
    }
    if (filter?.action) {
      query = query.eq("action", filter.action);
    }
    if (filter?.actor_id) {
      query = query.eq("actor_id", filter.actor_id);
    }
    if (filter?.startDate) {
      query = query.gte("created_at", filter.startDate);
    }
    if (filter?.endDate) {
      query = query.lte("created_at", filter.endDate);
    }
    if (filter?.limit) {
      const from = filter.offset || 0;
      query = query.range(from, from + filter.limit - 1);
    }

    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      logs = data as AuditLogItem[];
    } else {
      logs = readFallbackStore();
    }
  } catch {
    logs = readFallbackStore();
  }
} else {
  logs = readFallbackStore();
}

  // Apply in-memory filters if fallback was used or for full-text search
  if (filter?.entity_type) {
    logs = logs.filter((l) => l.entity_type === filter.entity_type);
  }
  if (filter?.action) {
    logs = logs.filter((l) => l.action === filter.action);
  }
  if (filter?.actor_id) {
    logs = logs.filter((l) => l.actor_id === filter.actor_id);
  }
  if (filter?.startDate) {
    const start = new Date(filter.startDate).getTime();
    logs = logs.filter((l) => new Date(l.created_at).getTime() >= start);
  }
  if (filter?.endDate) {
    const end = new Date(filter.endDate).getTime();
    logs = logs.filter((l) => new Date(l.created_at).getTime() <= end);
  }
  if (filter?.search) {
    const query = filter.search.toLowerCase().trim();
    logs = logs.filter(
      (l) =>
        l.description.toLowerCase().includes(query) ||
        l.entity_id.toLowerCase().includes(query) ||
        l.actor_name.toLowerCase().includes(query) ||
        l.action.toLowerCase().includes(query)
    );
  }

  // Sort descending
  logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (filter?.limit && filter?.offset !== undefined) {
    return logs.slice(filter.offset, filter.offset + filter.limit);
  } else if (filter?.limit) {
    return logs.slice(0, filter.limit);
  }

  return logs;
}

/**
 * Exports audit logs to CSV string.
 */
export function exportAuditLogsToCSV(logs: AuditLogItem[]): string {
  const headers = ["ID", "Timestamp (UTC)", "Actor Name", "Action", "Entity Type", "Entity ID", "Description", "Metadata"];
  const rows = logs.map((log) => [
    `"${log.id}"`,
    `"${log.created_at}"`,
    `"${(log.actor_name || "").replace(/"/g, '""')}"`,
    `"${log.action}"`,
    `"${log.entity_type}"`,
    `"${(log.entity_id || "").replace(/"/g, '""')}"`,
    `"${(log.description || "").replace(/"/g, '""')}"`,
    `"${JSON.stringify(log.metadata || {}).replace(/"/g, '""')}"`,
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}
