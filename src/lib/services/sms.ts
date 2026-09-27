/**
 * VarshaNetra ROAD-004: Twilio SMS Service & Recipient Management
 *
 * Implements SMS broadcast capability via Twilio Node.js SDK with:
 * - Real Twilio API dispatch when TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are present
 * - Safe simulated sandbox fallback when credentials are unconfigured or in trial
 * - Recipient management (Officers, Pradhans, Principals, Hospital Admins, Media)
 * - Strict E.164 (+91) phone formatting and privacy masking (+91 ******1234)
 * - Rate limiting (Max 100 SMS per broadcast batch)
 * - Free Tier & NIC Gateway notices
 */

import twilio from "twilio";
import { createAdminClient } from "@/lib/supabase/server";
import {
  AlertRecipient,
  CreateRecipientInput,
  UpdateRecipientInput,
  SmsDeliveryRecord,
  SendSmsResponse,
  RecipientsCountByCategory,
  RecipientCategory,
} from "@/types";

// In-memory fallback stores for local sandbox testing
const inMemoryRecipients: AlertRecipient[] = [
  {
    id: "rec-01",
    name: "Dr. Rajesh Patil (Collector & DM)",
    phone: "+919822012345",
    category: "OFFICER",
    district: "Pune District",
    is_active: true,
    added_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    added_by: "System Admin",
  },
  {
    id: "rec-02",
    name: "Smt. Sunita Shinde (Addl Collector)",
    phone: "+919822023456",
    category: "OFFICER",
    district: "Pune District",
    is_active: true,
    added_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    added_by: "System Admin",
  },
  {
    id: "rec-03",
    name: "Shri Ganesh Deshmukh (SDM Haveli)",
    phone: "+919822034567",
    category: "OFFICER",
    district: "Pune District",
    is_active: true,
    added_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    added_by: "System Admin",
  },
  {
    id: "rec-04",
    name: "Rameshwar Jadhav (Gram Pradhan, Khadakwasla)",
    phone: "+919823011122",
    category: "PRADHAN",
    district: "Pune District",
    is_active: true,
    added_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    added_by: "System Admin",
  },
  {
    id: "rec-05",
    name: "Baburao Gaikwad (Gram Pradhan, Mulshi)",
    phone: "+919823022233",
    category: "PRADHAN",
    district: "Pune District",
    is_active: true,
    added_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    added_by: "System Admin",
  },
  {
    id: "rec-06",
    name: "Sister Maria Fernandez (Principal, St. Anne High School)",
    phone: "+919824033344",
    category: "SCHOOL_PRINCIPAL",
    district: "Pune District",
    is_active: true,
    added_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    added_by: "System Admin",
  },
  {
    id: "rec-07",
    name: "Prof. Arvind Joshi (Principal, ZP High School Sinhagad)",
    phone: "+919824044455",
    category: "SCHOOL_PRINCIPAL",
    district: "Pune District",
    is_active: true,
    added_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    added_by: "System Admin",
  },
  {
    id: "rec-08",
    name: "Dr. Sanjeev Kulkarni (Medical Superintendent, Sassoon Hospital)",
    phone: "+919825055566",
    category: "HOSPITAL_ADMIN",
    district: "Pune District",
    is_active: true,
    added_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    added_by: "System Admin",
  },
  {
    id: "rec-09",
    name: "Dr. Meera Rao (Administrator, Aundh District Hospital)",
    phone: "+919825066677",
    category: "HOSPITAL_ADMIN",
    district: "Pune District",
    is_active: true,
    added_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    added_by: "System Admin",
  },
  {
    id: "rec-10",
    name: "Bureau Chief, All India Radio Pune",
    phone: "+919826077788",
    category: "MEDIA",
    district: "Pune District",
    is_active: true,
    added_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    added_by: "System Admin",
  },
];

const inMemoryDeliveryLogs: SmsDeliveryRecord[] = [];

/**
 * Masks a phone number for privacy display (e.g., +919822012345 -> +91 ******2345).
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone || phone.length < 7) return phone;
  const last4 = phone.slice(-4);
  const prefix = phone.startsWith("+91") ? "+91 " : "";
  return `${prefix}******${last4}`;
}

/**
 * Validates and normalizes Indian phone numbers (+91XXXXXXXXXX).
 */
export function validateIndianPhoneNumber(phone: string): { valid: boolean; normalized?: string; error?: string } {
  if (!phone) return { valid: false, error: "Phone number is required." };
  const cleaned = phone.replace(/[\s\-()]/g, "");

  // Formats accepted: +919876543210, 919876543210, 9876543210, 09876543210
  let norm = cleaned;
  if (norm.startsWith("0")) norm = norm.slice(1);
  if (!norm.startsWith("+91")) {
    if (norm.startsWith("91") && norm.length === 12) {
      norm = `+${norm}`;
    } else if (norm.length === 10) {
      norm = `+91${norm}`;
    }
  }

  const phoneRegex = /^\+91[6-9][0-9]{9}$/;
  if (!phoneRegex.test(norm)) {
    return {
      valid: false,
      error: "Invalid phone number. Must be a valid 10-digit Indian mobile number with +91 prefix.",
    };
  }

  return { valid: true, normalized: norm };
}

/**
 * Fetches all registered alert recipients.
 */
export async function getAlertRecipients(district?: string): Promise<AlertRecipient[]> {
  try {
    const supabase = createAdminClient();
    let query = supabase.from("alert_recipients").select("*").order("name", { ascending: true });

    if (district) {
      query = query.ilike("district", `%${district}%`);
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      return district
        ? inMemoryRecipients.filter((r) => r.district.toLowerCase().includes(district.toLowerCase()))
        : inMemoryRecipients;
    }
    return data as AlertRecipient[];
  } catch {
    return district
      ? inMemoryRecipients.filter((r) => r.district.toLowerCase().includes(district.toLowerCase()))
      : inMemoryRecipients;
  }
}

/**
 * Computes recipient counts by category.
 */
export async function getRecipientsCountByCategory(district?: string): Promise<RecipientsCountByCategory> {
  const recipients = await getAlertRecipients(district);
  const counts: RecipientsCountByCategory = {
    OFFICER: 0,
    PRADHAN: 0,
    SCHOOL_PRINCIPAL: 0,
    HOSPITAL_ADMIN: 0,
    MEDIA: 0,
    OTHER: 0,
    TOTAL: recipients.length,
    ACTIVE: recipients.filter((r) => r.is_active).length,
  };

  for (const r of recipients) {
    if (r.category in counts) {
      counts[r.category]++;
    } else {
      counts.OTHER++;
    }
  }

  return counts;
}

/**
 * Creates a new recipient.
 */
export async function createAlertRecipient(
  input: CreateRecipientInput,
  userId?: string
): Promise<AlertRecipient> {
  const val = validateIndianPhoneNumber(input.phone);
  if (!val.valid || !val.normalized) {
    throw new Error(val.error || "Invalid phone number format.");
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("alert_recipients")
      .insert({
        name: input.name.trim(),
        phone: val.normalized,
        category: input.category,
        district: input.district.trim(),
        is_active: input.is_active ?? true,
        added_by: userId || "Officer",
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as AlertRecipient;
  } catch {
    // In-memory fallback
    const newRec: AlertRecipient = {
      id: `rec-${Date.now()}`,
      name: input.name.trim(),
      phone: val.normalized,
      category: input.category,
      district: input.district.trim(),
      is_active: input.is_active ?? true,
      added_at: new Date().toISOString(),
      added_by: userId || "Officer",
    };
    inMemoryRecipients.push(newRec);
    return newRec;
  }
}

/**
 * Updates a recipient.
 */
export async function updateAlertRecipient(
  id: string,
  input: UpdateRecipientInput
): Promise<AlertRecipient> {
  const updates: Record<string, unknown> = {};
  if (input.name) updates.name = input.name.trim();
  if (input.phone) {
    const val = validateIndianPhoneNumber(input.phone);
    if (!val.valid || !val.normalized) throw new Error(val.error);
    updates.phone = val.normalized;
  }
  if (input.category) updates.category = input.category;
  if (input.district) updates.district = input.district.trim();
  if (typeof input.is_active === "boolean") updates.is_active = input.is_active;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("alert_recipients")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as AlertRecipient;
  } catch {
    const idx = inMemoryRecipients.findIndex((r) => r.id === id);
    if (idx !== -1) {
      inMemoryRecipients[idx] = { ...inMemoryRecipients[idx], ...updates } as AlertRecipient;
      return inMemoryRecipients[idx];
    }
    throw new Error("Recipient not found");
  }
}

/**
 * Deletes a recipient.
 */
export async function deleteAlertRecipient(id: string): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("alert_recipients").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return true;
  } catch {
    const idx = inMemoryRecipients.findIndex((r) => r.id === id);
    if (idx !== -1) {
      inMemoryRecipients.splice(idx, 1);
      return true;
    }
    return false;
  }
}

/**
 * Parses raw CSV content into recipient records.
 */
export function parseRecipientsCsv(
  csvText: string,
  defaultDistrict = "Pune District"
): Array<{ name: string; phone: string; category: string; district: string }> {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return [];

  const results: Array<{ name: string; phone: string; category: string; district: string }> = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Check if header line
    if (i === 0 && line.toLowerCase().includes("phone") && line.toLowerCase().includes("name")) {
      continue;
    }

    const parts = line.split(",").map((p) => p.trim().replace(/^["']|["']$/g, ""));
    if (parts.length >= 2) {
      const name = parts[0] || `Recipient ${results.length + 1}`;
      const phone = parts[1] || "";
      const category = parts[2] || "OTHER";
      const district = parts[3] || defaultDistrict;

      if (phone) {
        results.push({ name, phone, category, district });
      }
    }
  }

  return results;
}

/**
 * Bulk imports recipients from parsed CSV records.
 */
export async function bulkImportRecipients(
  records: Array<{ name: string; phone: string; category: string; district: string }>,
  userId?: string
): Promise<{ imported: number; failed: number; errors: string[] }> {
  let imported = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    try {
      const validCategories: RecipientCategory[] = [
        "OFFICER",
        "PRADHAN",
        "SCHOOL_PRINCIPAL",
        "HOSPITAL_ADMIN",
        "MEDIA",
        "OTHER",
      ];
      let cat: RecipientCategory = "OTHER";
      const upperCat = (row.category || "").toUpperCase().replace(/\s+/g, "_");
      if (validCategories.includes(upperCat as RecipientCategory)) {
        cat = upperCat as RecipientCategory;
      }

      await createAlertRecipient(
        {
          name: row.name || `Recipient ${i + 1}`,
          phone: row.phone,
          category: cat,
          district: row.district || "Pune District",
          is_active: true,
        },
        userId
      );
      imported++;
    } catch (err: unknown) {
      failed++;
      errors.push(`Row ${i + 1} (${row.name || row.phone}): ${err instanceof Error ? err.message : "Error"}`);
    }
  }

  return { imported, failed, errors };
}

/**
 * Fetches SMS delivery logs for an alert.
 */
export async function getSmsDeliveryLogs(alertId: string): Promise<SmsDeliveryRecord[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("sms_delivery_log")
      .select("*")
      .eq("alert_id", alertId)
      .order("sent_at", { ascending: false });

    if (error || !data) {
      return inMemoryDeliveryLogs.filter((l) => l.alert_id === alertId);
    }
    return data as SmsDeliveryRecord[];
  } catch {
    return inMemoryDeliveryLogs.filter((l) => l.alert_id === alertId);
  }
}

/**
 * PART 2 - TWILIO SMS DISPATCH ENGINE
 *
 * Sends SMS to an array of recipient numbers with:
 * - Rate limiting (Max 100 SMS per batch)
 * - Individual try/catch per message
 * - Delivery logging into sms_delivery_log
 * - Automatic masking for recipient numbers
 */
export async function sendAlertSms(params: {
  alertId: string;
  recipients: string[];
  message: string;
  language: "en" | "hi";
  userId?: string;
}): Promise<SendSmsResponse> {
  const { alertId, recipients, message, language, userId } = params;

  // 1. Rate Limiting: Max 100 SMS per batch
  const MAX_BATCH_LIMIT = 100;
  const targetRecipients = recipients.slice(0, MAX_BATCH_LIMIT);

  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const fromNumber = process.env.TWILIO_PHONE_NUMBER?.trim();

  const isTwilioConfigured = Boolean(accountSid && authToken && fromNumber);
  const mode = isTwilioConfigured ? "LIVE_TWILIO" : "TRIAL_SIMULATED";

  let twilioClient: twilio.Twilio | null = null;
  if (isTwilioConfigured && accountSid && authToken) {
    try {
      twilioClient = twilio(accountSid, authToken);
    } catch (err) {
      console.error("[sms-service] Twilio client initialization failed:", err);
    }
  }

  let total_sent = 0;
  let failed = 0;
  const message_sids: string[] = [];
  const logRecords: SmsDeliveryRecord[] = [];

  const supabase = createAdminClient();

  for (const rawPhone of targetRecipients) {
    const val = validateIndianPhoneNumber(rawPhone);
    const phone = val.valid && val.normalized ? val.normalized : rawPhone;
    const masked = maskPhoneNumber(phone);
    const sentAt = new Date().toISOString();

    let sid: string | null = null;
    let status: "sent" | "failed" | "simulated_trial" = "sent";
    let errorMsg: string | null = null;

    if (twilioClient && fromNumber) {
      try {
        const res = await twilioClient.messages.create({
          body: message,
          from: fromNumber,
          to: phone,
        });
        sid = res.sid;
        status = "sent";
        total_sent++;
        message_sids.push(res.sid);
      } catch (err: unknown) {
        status = "failed";
        failed++;
        errorMsg = err instanceof Error ? err.message : "Twilio delivery failure";
        console.warn(`[sms-service] Failed to send SMS to ${masked}:`, errorMsg);
      }
    } else {
      // Graceful simulated delivery (Free trial sandbox mode)
      sid = `SM_trial_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      status = "simulated_trial";
      total_sent++;
      message_sids.push(sid);
    }

    const record: SmsDeliveryRecord = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      alert_id: alertId,
      recipient_number: masked,
      message_sid: sid,
      status,
      language,
      message_text: message,
      error_message: errorMsg,
      sent_at: sentAt,
      sent_by: userId || "Incident Commander",
    };

    logRecords.push(record);
    inMemoryDeliveryLogs.unshift(record);

    // Persist to Supabase if configured
    try {
      await supabase.from("sms_delivery_log").insert({
        alert_id: alertId,
        recipient_number: masked,
        message_sid: sid,
        status,
        language,
        message_text: message,
        error_message: errorMsg,
        sent_at: sentAt,
        sent_by: userId || "Incident Commander",
      });
    } catch {
      // Memory store already captured
    }
  }

  return {
    success: total_sent > 0,
    total_sent,
    failed,
    message_sids,
    records: logRecords,
    mode,
  };
}
