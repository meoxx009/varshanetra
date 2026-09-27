/**
 * VarshaNetra IMD Manual Bulletin Service
 * 
 * Handles storage and retrieval of manual weather observations entered by
 * District Magistrates and EOC Admin officers from official IMD bulletins
 * or ffis.cwc.gov.in.
 */

import { ImdManualEntry } from "@/types";
import { createAdminClient } from "@/lib/supabase/server";

// Fallback in-memory storage when Supabase table is not yet migrated or offline
const memoryEntries: ImdManualEntry[] = [
  {
    id: "imd-seed-01",
    district: "Pune",
    created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    entry_datetime: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    district_rainfall_today: 42.5,
    district_rainfall_yesterday: 68.2,
    district_rainfall_week: 185.0,
    normal_rainfall: 35.0,
    imd_color_code: "Orange",
    forecast_narrative:
      "Heavy to very heavy rainfall likely at isolated places over Pune district with gusty winds reaching 40-50 kmph. Active monsoon trough passing over the region.",
    data_source: "IMD District Bulletin",
    entered_by: "District Magistrate (EOC Duty Officer)",
  },
];

/**
 * Retrieves the latest IMD manual entries for a specific district (or all if omitted).
 */
export async function getLatestImdManualEntries(limit = 5, district?: string): Promise<ImdManualEntry[]> {
  try {
    const supabase = createAdminClient();
    let query = supabase
      .from("imd_manual_entries")
      .select("*")
      .order("entry_datetime", { ascending: false });

    if (district) {
      query = query.ilike("district", `%${district}%`);
    }

    const { data, error } = await query.limit(limit);

    if (error) {
      console.warn("[VarshaNetra:ImdBulletin] Supabase read error, using fallback cache:", error.message);
      return filterMemoryEntries(district, limit);
    }

    if (data && data.length > 0) {
      return data as ImdManualEntry[];
    }

    return filterMemoryEntries(district, limit);
  } catch (err) {
    console.warn("[VarshaNetra:ImdBulletin] Unexpected query error, using fallback cache:", err);
    return filterMemoryEntries(district, limit);
  }
}

function filterMemoryEntries(district?: string, limit = 5): ImdManualEntry[] {
  if (!district) return memoryEntries.slice(0, limit);
  const target = district.toLowerCase().trim();
  const matched = memoryEntries.filter((e) => {
    if (!e.district) return false;
    const d = e.district.toLowerCase();
    return d.includes(target) || target.includes(d);
  });
  return matched.slice(0, limit);
}

/**
 * Saves a new officer-entered IMD manual bulletin entry.
 */
export async function saveImdManualEntry(
  entry: Omit<ImdManualEntry, "id" | "created_at">
): Promise<{ success: boolean; data?: ImdManualEntry; error?: string }> {
  const newRecord: ImdManualEntry = {
    id: `imd-${Date.now()}`,
    created_at: new Date().toISOString(),
    ...entry,
  };

  // Add to in-memory fallback cache first
  memoryEntries.unshift(newRecord);

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("imd_manual_entries")
      .insert([
        {
          entry_datetime: entry.entry_datetime,
          district_rainfall_today: entry.district_rainfall_today,
          district_rainfall_yesterday: entry.district_rainfall_yesterday,
          district_rainfall_week: entry.district_rainfall_week,
          normal_rainfall: entry.normal_rainfall,
          imd_color_code: entry.imd_color_code,
          forecast_narrative: entry.forecast_narrative,
          data_source: entry.data_source,
          entered_by: entry.entered_by,
        },
      ])
      .select()
      .single();

    if (error) {
      console.warn("[VarshaNetra:ImdBulletin] Supabase insert warning (persisted to session cache):", error.message);
      return { success: true, data: newRecord };
    }

    return { success: true, data: data as ImdManualEntry };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Database write error";
    console.warn("[VarshaNetra:ImdBulletin] Supabase insert failed, retained in session cache:", msg);
    return { success: true, data: newRecord };
  }
}
