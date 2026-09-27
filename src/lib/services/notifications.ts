"use strict";

import fs from "fs";
import path from "path";
import {
  NotificationItem,
  CreateNotificationInput,
  NotificationFilterOptions,
} from "@/types/notifications";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { createAdminClient } from "@/lib/supabase/server";

// Realistic initial seed notifications for EOC operations
const INITIAL_SEED_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "notif-00000000-0000-0000-0000-000000000001",
    event_type: "ALERT_ISSUED",
    title: "Flash Flood Warning Issued: Mutha Basin",
    message: "Critical statutory evacuation alert issued for Deccan Gymkhana and Sinhagad Road river corridor.",
    severity: "CRITICAL",
    deep_link: "/alerts",
    related_id: "a0000000-0000-0000-0000-000000000001",
    read: false,
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    id: "notif-00000000-0000-0000-0000-000000000002",
    event_type: "RESPONSE_TEAM_ASSIGNMENT",
    title: "Tactical Squad Dispatched: SDRF Unit 1",
    message: "SDRF Unit 1 (30 personnel, 4 boats) dispatched to Ekta Nagar evacuation sector.",
    severity: "ALERT",
    deep_link: "/response",
    related_id: "team-001",
    read: false,
    created_at: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
  },
  {
    id: "notif-00000000-0000-0000-0000-000000000003",
    event_type: "NEW_FIELD_REPORT",
    title: "Ground Truth Observation: REP-2026-001",
    message: "Urban waterlogging (55cm) confirmed at Sinhagad Road Underpass. Passable only by high-clearance trucks.",
    severity: "ADVISORY",
    deep_link: "/field-reports",
    related_id: "rep-001",
    read: true,
    created_at: new Date(Date.now() - 95 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: "notif-00000000-0000-0000-0000-000000000004",
    event_type: "INCIDENT_ASSIGNED",
    title: "Incident Response Assigned: INC-2026-0001",
    message: "Deccan Gymkhana Submergence assigned to Municipal Disaster Quick Response Team.",
    severity: "ALERT",
    deep_link: "/incidents",
    related_id: "inc-001",
    read: true,
    created_at: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  },
];

// Persistent File Store Helper (used for Sandbox mode and seamless demo verification)
const STORE_DIR = path.resolve(process.cwd(), ".data");
const STORE_FILE = path.join(STORE_DIR, "notifications_store.json");

interface PersistedNotificationsStore {
  notifications: NotificationItem[];
}

function loadPersistedStore(): PersistedNotificationsStore {
  try {
    if (!fs.existsSync(STORE_DIR)) {
      fs.mkdirSync(STORE_DIR, { recursive: true });
    }
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, "utf8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.notifications)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("[VarshaNetra:Notifications] Could not read notifications store, using in-memory defaults:", err);
  }

  const initial = { notifications: [...INITIAL_SEED_NOTIFICATIONS] };
  savePersistedStore(initial);
  return initial;
}

function savePersistedStore(store: PersistedNotificationsStore): void {
  try {
    if (!fs.existsSync(STORE_DIR)) {
      fs.mkdirSync(STORE_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), "utf8");
  } catch (err) {
    console.error("[VarshaNetra:Notifications] Failed to write notifications store file:", err);
  }
}

/**
 * Retrieves notifications filtered by read status, severity, or event type.
 */
export async function getNotifications(filters: NotificationFilterOptions = {}): Promise<{
  notifications: NotificationItem[];
  unreadCount: number;
  totalCount: number;
}> {
  // If Supabase is configured, query Supabase
  if (isSupabaseConfigured()) {
    try {
      const supabase = createAdminClient();
      let query = supabase.from("notifications").select("*", { count: "exact" });

      if (typeof filters.read === "boolean") {
        query = query.eq("read", filters.read);
      }
      if (filters.event_type) {
        query = query.eq("event_type", filters.event_type);
      }
      if (filters.severity) {
        query = query.eq("severity", filters.severity);
      }

      query = query.order("created_at", { ascending: false });

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, count, error } = await query;
      if (!error && data) {
        // Query unread count
        const { count: unread } = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("read", false);

        return {
          notifications: data as NotificationItem[],
          unreadCount: unread ?? 0,
          totalCount: count ?? data.length,
        };
      }
    } catch (err) {
      console.warn("[VarshaNetra:Notifications] Supabase query failed, falling back to persistent store:", err);
    }
  }

  // Persistent File Store fallback
  const store = loadPersistedStore();
  let list = [...store.notifications];

  if (typeof filters.read === "boolean") {
    list = list.filter((n) => n.read === filters.read);
  }
  if (filters.event_type) {
    list = list.filter((n) => n.event_type === filters.event_type);
  }
  if (filters.severity) {
    list = list.filter((n) => n.severity === filters.severity);
  }

  // Sort descending by created_at
  list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (filters.limit && filters.limit > 0) {
    list = list.slice(0, filters.limit);
  }

  const unreadCount = store.notifications.filter((n) => !n.read).length;

  return {
    notifications: list,
    unreadCount,
    totalCount: store.notifications.length,
  };
}

/**
 * Creates and stores a new operational notification.
 */
export async function createNotification(input: CreateNotificationInput): Promise<NotificationItem> {
  const now = new Date().toISOString();
  const newNotification: NotificationItem = {
    id: `notif-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`,
    event_type: input.event_type,
    title: input.title,
    message: input.message,
    severity: input.severity || "NORMAL",
    deep_link: input.deep_link,
    related_id: input.related_id || null,
    read: false,
    created_at: now,
    updated_at: now,
  };

  // If Supabase is configured
  if (isSupabaseConfigured()) {
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("notifications")
        .insert({
          event_type: newNotification.event_type,
          title: newNotification.title,
          message: newNotification.message,
          severity: newNotification.severity,
          deep_link: newNotification.deep_link,
          related_id: newNotification.related_id,
          read: false,
        })
        .select()
        .single();

      if (!error && data) {
        return data as NotificationItem;
      }
    } catch (err) {
      console.warn("[VarshaNetra:Notifications] Supabase insert failed, persisting to store:", err);
    }
  }

  // Persistent File Store fallback
  const store = loadPersistedStore();
  store.notifications.unshift(newNotification);
  savePersistedStore(store);

  return newNotification;
}

/**
 * Toggles the read status of a notification.
 */
export async function markNotificationAsRead(id: string, read = true): Promise<NotificationItem | null> {
  const now = new Date().toISOString();

  // If Supabase is configured
  if (isSupabaseConfigured()) {
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("notifications")
        .update({ read, updated_at: now })
        .eq("id", id)
        .select()
        .single();

      if (!error && data) {
        return data as NotificationItem;
      }
    } catch (err) {
      console.warn("[VarshaNetra:Notifications] Supabase update failed, updating store:", err);
    }
  }

  // Persistent File Store fallback
  const store = loadPersistedStore();
  const idx = store.notifications.findIndex((n) => n.id === id);
  if (idx === -1) return null;

  store.notifications[idx].read = read;
  store.notifications[idx].updated_at = now;
  savePersistedStore(store);

  return store.notifications[idx];
}

/**
 * Marks all notifications as read.
 */
export async function markAllNotificationsAsRead(): Promise<number> {
  const now = new Date().toISOString();

  // If Supabase is configured
  if (isSupabaseConfigured()) {
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("notifications")
        .update({ read: true, updated_at: now })
        .eq("read", false)
        .select();

      if (!error && data) {
        return data.length;
      }
    } catch (err) {
      console.warn("[VarshaNetra:Notifications] Supabase mark-all failed, updating store:", err);
    }
  }

  // Persistent File Store fallback
  const store = loadPersistedStore();
  let updatedCount = 0;
  for (const n of store.notifications) {
    if (!n.read) {
      n.read = true;
      n.updated_at = now;
      updatedCount++;
    }
  }
  savePersistedStore(store);

  return updatedCount;
}

/**
 * Deletes a notification by ID.
 */
export async function deleteNotification(id: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createAdminClient();
      const { error } = await supabase.from("notifications").delete().eq("id", id);
      if (!error) return true;
    } catch (err) {
      console.warn("[VarshaNetra:Notifications] Supabase delete failed, updating store:", err);
    }
  }

  const store = loadPersistedStore();
  const initialLength = store.notifications.length;
  store.notifications = store.notifications.filter((n) => n.id !== id);
  const deleted = store.notifications.length < initialLength;
  if (deleted) {
    savePersistedStore(store);
  }
  return deleted;
}
