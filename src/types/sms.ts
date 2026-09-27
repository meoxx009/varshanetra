/**
 * VarshaNetra ROAD-004: SMS Alert Delivery & Recipient Types
 */

export type RecipientCategory =
  | "OFFICER"
  | "PRADHAN"
  | "SCHOOL_PRINCIPAL"
  | "HOSPITAL_ADMIN"
  | "MEDIA"
  | "OTHER";

export interface AlertRecipient {
  id: string;
  name: string;
  phone: string; // E.164 with +91
  category: RecipientCategory;
  district: string;
  is_active: boolean;
  added_by?: string | null;
  added_at: string;
}

export interface CreateRecipientInput {
  name: string;
  phone: string;
  category: RecipientCategory;
  district: string;
  is_active?: boolean;
}

export interface UpdateRecipientInput {
  name?: string;
  phone?: string;
  category?: RecipientCategory;
  district?: string;
  is_active?: boolean;
}

export interface SmsDeliveryRecord {
  id: string;
  alert_id: string;
  recipient_number: string; // Masked for privacy (+91 ******1234)
  message_sid: string | null;
  status: "sent" | "failed" | "delivered" | "simulated_trial";
  language: "en" | "hi";
  message_text?: string | null;
  error_message?: string | null;
  sent_at: string;
  sent_by?: string | null;
}

export interface SendSmsRequest {
  alertId: string;
  recipients: string[]; // E.164 phone numbers (+91XXXXXXXXXX)
  message: string;
  language: "en" | "hi";
}

export interface SendSmsResponse {
  success: boolean;
  total_sent: number;
  failed: number;
  message_sids: string[];
  records?: SmsDeliveryRecord[];
  mode: "LIVE_TWILIO" | "TRIAL_SIMULATED";
  error?: string;
}

export interface RecipientsCountByCategory {
  OFFICER: number;
  PRADHAN: number;
  SCHOOL_PRINCIPAL: number;
  HOSPITAL_ADMIN: number;
  MEDIA: number;
  OTHER: number;
  TOTAL: number;
  ACTIVE: number;
}
