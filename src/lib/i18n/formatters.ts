import { Locale } from "./context";
import { SeverityLevel } from "@/types";

/**
 * Maps locale codes to BCP 47 language tags with Indian regional context.
 * Uses Latin numerals (-u-nu-latn) so numerals stay readable and consistent (1,00,000).
 */
export function getIntlLocaleTag(locale: Locale): string {
  return locale === "hi" ? "hi-IN-u-nu-latn" : "en-IN";
}

const HINDI_MONTHS = [
  "जनवरी",
  "फ़रवरी",
  "मार्च",
  "अप्रैल",
  "मई",
  "जून",
  "जुलाई",
  "अगस्त",
  "सितंबर",
  "अक्टूबर",
  "नवंबर",
  "दिसंबर",
];

const ENGLISH_MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * Formats a Date or timestamp into a localized date string:
 * In Hindi: "15 जनवरी 2025"
 * In English: "15 Jan 2025"
 */
export function formatDate(
  dateInput: string | number | Date | null | undefined,
  locale: Locale = "en"
): string {
  if (!dateInput) return "—";
  try {
    const d = typeof dateInput === "object" ? dateInput : new Date(dateInput);
    if (isNaN(d.getTime())) return "—";

    const day = d.getDate();
    const monthIdx = d.getMonth();
    const year = d.getFullYear();

    if (locale === "hi") {
      return `${day} ${HINDI_MONTHS[monthIdx]} ${year}`;
    }
    return `${day} ${ENGLISH_MONTHS_SHORT[monthIdx]} ${year}`;
  } catch {
    return String(dateInput);
  }
}

/**
 * Formats a Date or timestamp into a localized time string:
 * In Hindi:
 *   - Morning (04:00 - 11:59): "सुबह 8 बजे" or "सुबह 8:30 बजे"
 *   - Afternoon (12:00 - 15:59): "दोपहर 2 बजे" or "दोपहर 2:15 बजे"
 *   - Evening (16:00 - 19:59): "शाम 6 बजे" or "शाम 6:45 बजे"
 *   - Night (20:00 - 03:59): "रात 10 बजे" or "रात 11:20 बजे"
 * In English: "08:00 AM" / "02:00 PM"
 */
export function formatTime(
  dateInput: string | number | Date | null | undefined,
  locale: Locale = "en"
): string {
  if (!dateInput) return "—";
  try {
    const d = typeof dateInput === "object" ? dateInput : new Date(dateInput);
    if (isNaN(d.getTime())) return "—";

    const hours = d.getHours();
    const minutes = d.getMinutes();

    if (locale === "hi") {
      let period = "सुबह";
      let hour12 = hours;

      if (hours >= 4 && hours < 12) {
        period = "सुबह";
        hour12 = hours;
      } else if (hours >= 12 && hours < 16) {
        period = "दोपहर";
        hour12 = hours === 12 ? 12 : hours - 12;
      } else if (hours >= 16 && hours < 20) {
        period = "शाम";
        hour12 = hours - 12;
      } else {
        period = "रात";
        hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      }

      const minuteStr = minutes === 0 ? "" : `:${minutes < 10 ? "0" + minutes : minutes}`;
      return `${period} ${hour12}${minuteStr} बजे`;
    }

    // English 12-hour format
    const ampm = hours >= 12 ? "PM" : "AM";
    const hour12 = hours % 12 || 12;
    const minuteStr = minutes < 10 ? `0${minutes}` : String(minutes);
    return `${hour12}:${minuteStr} ${ampm}`;
  } catch {
    return String(dateInput);
  }
}

/**
 * Formats a Date or timestamp into a localized human-readable date & time string.
 * Example in Hindi: "15 जनवरी 2025, दोपहर 2 बजे"
 * Example in English: "15 Jan 2025, 02:00 PM"
 */
export function formatDateTime(
  dateInput: string | number | Date | null | undefined,
  locale: Locale = "en"
): string {
  if (!dateInput) return "—";
  try {
    const d = typeof dateInput === "object" ? dateInput : new Date(dateInput);
    if (isNaN(d.getTime())) return "—";

    const dateStr = formatDate(d, locale);
    const timeStr = formatTime(d, locale);
    return `${dateStr}, ${timeStr}`;
  } catch {
    return String(dateInput);
  }
}

/**
 * Formats a localized relative timestamp (e.g. "5 minutes ago" / "5 मिनट पहले").
 */
export function formatRelativeTime(
  dateInput: string | number | Date | null | undefined,
  locale: Locale = "en"
): string {
  if (!dateInput) return "—";
  try {
    const d = typeof dateInput === "object" ? dateInput : new Date(dateInput);
    const now = Date.now();
    const diffMs = now - d.getTime();
    if (isNaN(diffMs)) return "—";

    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (locale === "hi") {
      if (diffSec < 60) return "अभी-अभी";
      if (diffMin === 1) return "1 मिनट पहले";
      if (diffMin < 60) return `${diffMin} मिनट पहले`;
      if (diffHours === 1) return "1 घंटे पहले";
      if (diffHours < 24) return `${diffHours} घंटे पहले`;
      if (diffDays === 1) return "कल";
      if (diffDays < 30) return `${diffDays} दिन पहले`;
      return formatDate(d, "hi");
    }

    // English
    if (diffSec < 60) return "Just now";
    if (diffMin === 1) return "1 minute ago";
    if (diffMin < 60) return `${diffMin} minutes ago`;
    if (diffHours === 1) return "1 hour ago";
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 30) return `${diffDays} days ago`;
    return formatDate(d, "en");
  } catch {
    return "—";
  }
}

/**
 * Formats a number using the Indian numbering system.
 * Shows 100000 as 1,00,000 not 100,000.
 * Shows 1000000 as 10,00,000.
 */
export function formatNumber(
  value: number | string | null | undefined,
  locale: Locale = "en",
  options?: Intl.NumberFormatOptions
): string {
  if (value === null || value === undefined || value === "") return "—";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return String(value);

  try {
    // Always use Indian grouping (en-IN gives 1,00,000 format)
    return new Intl.NumberFormat(getIntlLocaleTag(locale), options).format(num);
  } catch {
    return String(num);
  }
}

/**
 * Formats large quantities with Indian number system and optional Lakh / Crore labels.
 * Example:
 * 100000 -> "1.00 लाख" (or "1,00,000" if withLabels is false)
 * 10000000 -> "1.00 करोड़"
 */
export function formatIndianQuantity(
  value: number | string | null | undefined,
  locale: Locale = "en",
  withLabels: boolean = false
): string {
  if (value === null || value === undefined || value === "") return "—";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return String(value);

  if (withLabels) {
    if (num >= 10000000) {
      const crore = (num / 10000000).toFixed(2).replace(/\.00$/, "");
      return `${crore} ${locale === "hi" ? "करोड़" : "Crore"}`;
    }
    if (num >= 100000) {
      const lakh = (num / 100000).toFixed(2).replace(/\.00$/, "");
      return `${lakh} ${locale === "hi" ? "लाख" : "Lakh"}`;
    }
  }

  return formatNumber(num, locale);
}

/**
 * Localizes risk levels as per exact W-012 mapping:
 * SEVERE = अति गंभीर
 * HIGH = उच्च जोखिम
 * MODERATE = मध्यम जोखिम
 * LOW = कम जोखिम
 */
export function formatSeverity(
  severity: SeverityLevel | string | null | undefined,
  locale: Locale = "en"
): string {
  const norm = String(severity || "").trim().toUpperCase();

  const labels: Record<string, { en: string; hi: string }> = {
    // Exact W-012 mapping
    SEVERE: { en: "Severe", hi: "अति गंभीर" },
    CRITICAL: { en: "Critical", hi: "अति गंभीर" },
    EMERGENCY: { en: "Emergency", hi: "अति गंभीर" },
    HIGH: { en: "High", hi: "उच्च जोखिम" },
    ALERT: { en: "Alert", hi: "उच्च जोखिम" },
    WARNING: { en: "Warning", hi: "उच्च जोखिम" },
    MODERATE: { en: "Moderate", hi: "मध्यम जोखिम" },
    MEDIUM: { en: "Medium", hi: "मध्यम जोखिम" },
    ADVISORY: { en: "Advisory", hi: "मध्यम जोखिम" },
    WATCH: { en: "Watch", hi: "मध्यम जोखिम" },
    LOW: { en: "Low", hi: "कम जोखिम" },
    NORMAL: { en: "Normal", hi: "कम जोखिम" },
    SAFE: { en: "Safe", hi: "कम जोखिम" },
    ROUTINE: { en: "Routine", hi: "कम जोखिम" },
  };

  const match = labels[norm];
  if (match) {
    return locale === "hi" ? match.hi : match.en;
  }
  return String(severity || "");
}

/**
 * Localizes status values as per exact W-012 mapping:
 * Available = उपलब्ध
 * Deployed = तैनात
 * En Route = रास्ते में
 * On Site = स्थल पर
 * Unavailable = अनुपलब्ध
 * Active = सक्रिय
 * Resolved = हल
 * Pending = प्रतीक्षा में
 * Approved = अनुमोदित
 * Issued = जारी
 * Cancelled = रद्द
 * Verified = सत्यापित
 * Unverified = असत्यापित
 * Rejected = अस्वीकृत
 */
export function formatStatus(
  status: string | null | undefined,
  locale: Locale = "en"
): string {
  const norm = String(status || "").trim().toUpperCase().replace(/[\s-]/g, "_");

  const labels: Record<string, { en: string; hi: string }> = {
    AVAILABLE: { en: "Available", hi: "उपलब्ध" },
    DEPLOYED: { en: "Deployed", hi: "तैनात" },
    EN_ROUTE: { en: "En Route", hi: "रास्ते में" },
    ON_SITE: { en: "On Site", hi: "स्थल पर" },
    UNAVAILABLE: { en: "Unavailable", hi: "अनुपलब्ध" },
    ACTIVE: { en: "Active", hi: "सक्रिय" },
    RESOLVED: { en: "Resolved", hi: "हल" },
    PENDING: { en: "Pending", hi: "प्रतीक्षा में" },
    APPROVED: { en: "Approved", hi: "अनुमोदित" },
    ISSUED: { en: "Issued", hi: "जारी" },
    CANCELLED: { en: "Cancelled", hi: "रद्द" },
    CANCELED: { en: "Cancelled", hi: "रद्द" },
    VERIFIED: { en: "Verified", hi: "सत्यापित" },
    UNVERIFIED: { en: "Unverified", hi: "असत्यापित" },
    REJECTED: { en: "Rejected", hi: "अस्वीकृत" },

    // Additional operational fallbacks
    OPEN: { en: "Open", hi: "सक्रिय" },
    ASSIGNED: { en: "Assigned", hi: "तैनात" },
    IN_PROGRESS: { en: "In Progress", hi: "सक्रिय" },
    CLOSED: { en: "Closed", hi: "हल" },
    DRAFT: { en: "Draft", hi: "प्रारूप" },
    STANDBY: { en: "On Standby", hi: "उपलब्ध" },
    FULL: { en: "At Capacity", hi: "क्षमता पूर्ण" },
    CLEAR: { en: "Clear / Passable", hi: "खुली" },
    PARTIALLY_BLOCKED: { en: "Partially Blocked", hi: "रास्ता बंद" },
    SUBMERGED_PASSABLE: { en: "Submerged", hi: "जलभराव" },
    IMPASSABLE_CLOSED: { en: "Closed", hi: "रास्ता बंद" },
  };

  const match = labels[norm];
  if (match) {
    return locale === "hi" ? match.hi : match.en;
  }
  return String(status || "");
}

/**
 * Localizes incident types as per exact W-012 mapping:
 * Waterlogging = जलभराव
 * Flash Flood = अचानक बाढ़
 * River Overflow = नदी उफान
 * Road Blocked = रास्ता बंद
 * Building Damage = इमारत क्षति
 * People Stranded = लोग फंसे
 * Medical Emergency = चिकित्सा आपात
 * Landslide = भूस्खलन
 */
export function formatIncidentType(
  type: string | null | undefined,
  locale: Locale = "en"
): string {
  const norm = String(type || "").trim().toLowerCase();

  const mapping: Record<string, { en: string; hi: string }> = {
    "waterlogging": { en: "Waterlogging", hi: "जलभराव" },
    "urban waterlogging": { en: "Waterlogging", hi: "जलभराव" },
    "flash flood": { en: "Flash Flood", hi: "अचानक बाढ़" },
    "flash_flood": { en: "Flash Flood", hi: "अचानक बाढ़" },
    "flood": { en: "Flash Flood", hi: "अचानक बाढ़" },
    "river overflow": { en: "River Overflow", hi: "नदी उफान" },
    "river_overflow": { en: "River Overflow", hi: "नदी उफान" },
    "road blocked": { en: "Road Blocked", hi: "रास्ता बंद" },
    "road_blocked": { en: "Road Blocked", hi: "रास्ता बंद" },
    "road obstruction": { en: "Road Blocked", hi: "रास्ता बंद" },
    "building damage": { en: "Building Damage", hi: "इमारत क्षति" },
    "building_damage": { en: "Building Damage", hi: "इमारत क्षति" },
    "structural collapse": { en: "Building Damage", hi: "इमारत क्षति" },
    "people stranded": { en: "People Stranded", hi: "लोग फंसे" },
    "people_stranded": { en: "People Stranded", hi: "लोग फंसे" },
    "trapped citizens": { en: "People Stranded", hi: "लोग फंसे" },
    "medical emergency": { en: "Medical Emergency", hi: "चिकित्सा आपात" },
    "medical_emergency": { en: "Medical Emergency", hi: "चिकित्सा आपात" },
    "landslide": { en: "Landslide", hi: "भूस्खलन" },
  };

  const match = mapping[norm];
  if (match) {
    return locale === "hi" ? match.hi : match.en;
  }
  return String(type || "");
}

/**
 * Localizes resource types as per exact W-012 mapping:
 * Boats = नावें
 * Ambulances = एम्बुलेंस
 * Rescue Vehicles = बचाव वाहन
 * Medical Supplies = चिकित्सा सामग्री
 * Food Packs = खाद्य पैकेट
 * Water Tankers = पानी टैंकर
 * Generators = जनरेटर
 */
export function formatResourceType(
  type: string | null | undefined,
  locale: Locale = "en"
): string {
  const norm = String(type || "").trim().toLowerCase();

  const mapping: Record<string, { en: string; hi: string }> = {
    "boats": { en: "Boats", hi: "नावें" },
    "boat": { en: "Boats", hi: "नावें" },
    "rescue boat": { en: "Boats", hi: "नावें" },
    "ambulances": { en: "Ambulances", hi: "एम्बुलेंस" },
    "ambulance": { en: "Ambulances", hi: "एम्बुलेंस" },
    "rescue vehicles": { en: "Rescue Vehicles", hi: "बचाव वाहन" },
    "rescue vehicle": { en: "Rescue Vehicles", hi: "बचाव वाहन" },
    "rescue_vehicles": { en: "Rescue Vehicles", hi: "बचाव वाहन" },
    "vehicle": { en: "Rescue Vehicles", hi: "बचाव वाहन" },
    "medical supplies": { en: "Medical Supplies", hi: "चिकित्सा सामग्री" },
    "medical supply": { en: "Medical Supplies", hi: "चिकित्सा सामग्री" },
    "medical": { en: "Medical Supplies", hi: "चिकित्सा सामग्री" },
    "first aid": { en: "Medical Supplies", hi: "चिकित्सा सामग्री" },
    "food packs": { en: "Food Packs", hi: "खाद्य पैकेट" },
    "food pack": { en: "Food Packs", hi: "खाद्य पैकेट" },
    "food packets": { en: "Food Packs", hi: "खाद्य पैकेट" },
    "food": { en: "Food Packs", hi: "खाद्य पैकेट" },
    "water tankers": { en: "Water Tankers", hi: "पानी टैंकर" },
    "water tanker": { en: "Water Tankers", hi: "पानी टैंकर" },
    "generators": { en: "Generators", hi: "जनरेटर" },
    "generator": { en: "Generators", hi: "जनरेटर" },
  };

  const match = mapping[norm];
  if (match) {
    return locale === "hi" ? match.hi : match.en;
  }
  return String(type || "");
}

/**
 * Localizes weather parameters as per exact W-012 mapping:
 * Rainfall = वर्षा
 * Temperature = तापमान
 * Humidity = आर्द्रता
 * Wind Speed = हवा गति
 * Forecast = पूर्वानुमान
 * Historical = ऐतिहासिक
 */
export function formatWeatherTerm(
  term: string | null | undefined,
  locale: Locale = "en"
): string {
  const norm = String(term || "").trim().toLowerCase();

  const mapping: Record<string, { en: string; hi: string }> = {
    "rainfall": { en: "Rainfall", hi: "वर्षा" },
    "rain": { en: "Rainfall", hi: "वर्षा" },
    "precipitation": { en: "Rainfall", hi: "वर्षा" },
    "temperature": { en: "Temperature", hi: "तापमान" },
    "temp": { en: "Temperature", hi: "तापमान" },
    "humidity": { en: "Humidity", hi: "आर्द्रता" },
    "wind speed": { en: "Wind Speed", hi: "हवा गति" },
    "windspeed": { en: "Wind Speed", hi: "हवा गति" },
    "wind": { en: "Wind Speed", hi: "हवा गति" },
    "forecast": { en: "Forecast", hi: "पूर्वानुमान" },
    "historical": { en: "Historical", hi: "ऐतिहासिक" },
  };

  const match = mapping[norm];
  if (match) {
    return locale === "hi" ? match.hi : match.en;
  }
  return String(term || "");
}

/**
 * Localizes common button actions as per exact W-012 mapping:
 * Submit = जमा करें
 * Cancel = रद्द करें
 * Save = सहेजें
 * Delete = हटाएं
 * Edit = संपादित करें
 * View Details = विवरण देखें
 * Assign = आवंटित करें
 * Deploy = तैनात करें
 * Verify = सत्यापित करें
 * Approve = अनुमोदित करें
 * Issue Alert = चेतावनी जारी करें
 */
export function formatButtonText(
  action: string | null | undefined,
  locale: Locale = "en"
): string {
  const norm = String(action || "").trim().toLowerCase();

  const mapping: Record<string, { en: string; hi: string }> = {
    "submit": { en: "Submit", hi: "जमा करें" },
    "cancel": { en: "Cancel", hi: "रद्द करें" },
    "save": { en: "Save", hi: "सहेजें" },
    "delete": { en: "Delete", hi: "हटाएं" },
    "edit": { en: "Edit", hi: "संपादित करें" },
    "view details": { en: "View Details", hi: "विवरण देखें" },
    "view_details": { en: "View Details", hi: "विवरण देखें" },
    "details": { en: "View Details", hi: "विवरण देखें" },
    "assign": { en: "Assign", hi: "आवंटित करें" },
    "deploy": { en: "Deploy", hi: "तैनात करें" },
    "verify": { en: "Verify", hi: "सत्यापित करें" },
    "approve": { en: "Approve", hi: "अनुमोदित करें" },
    "issue alert": { en: "Issue Alert", hi: "चेतावनी जारी करें" },
    "issue_alert": { en: "Issue Alert", hi: "चेतावनी जारी करें" },
  };

  const match = mapping[norm];
  if (match) {
    return locale === "hi" ? match.hi : match.en;
  }
  return String(action || "");
}

/**
 * Translates WMO weather condition code to localized display text.
 */
export function formatWeatherCondition(wmoCode: number | null | undefined, locale: Locale = "en"): string {
  if (wmoCode === null || wmoCode === undefined) {
    return locale === "hi" ? "अज्ञात मौसमी स्थिति" : "Unknown Condition";
  }
  const conditions: Record<number, { en: string; hi: string }> = {
    0: { en: "Clear Sky", hi: "साफ आसमान" },
    1: { en: "Mainly Clear", hi: "मुख्यतः साफ" },
    2: { en: "Partly Cloudy", hi: "आंशिक रूप से बादल" },
    3: { en: "Overcast", hi: "बादल छाए हुए" },
    45: { en: "Foggy", hi: "कोहरा" },
    48: { en: "Depositing Rime Fog", hi: "घना कोहरा" },
    51: { en: "Light Drizzle", hi: "हल्की बूंदाबांदी" },
    53: { en: "Moderate Drizzle", hi: "मध्यम बूंदाबांदी" },
    55: { en: "Dense Drizzle", hi: "घनी बूंदाबांदी" },
    61: { en: "Slight Rain", hi: "हल्की वर्षा" },
    63: { en: "Moderate Rain", hi: "मध्यम वर्षा" },
    65: { en: "Heavy Rain", hi: "भारी वर्षा" },
    71: { en: "Slight Snow Fall", hi: "हल्की बर्फबारी" },
    73: { en: "Moderate Snow Fall", hi: "मध्यम बर्फबारी" },
    75: { en: "Heavy Snow Fall", hi: "भारी बर्फबारी" },
    80: { en: "Slight Rain Showers", hi: "हल्की वर्षा की बौछारें" },
    81: { en: "Moderate Rain Showers", hi: "मध्यम वर्षा की बौछारें" },
    82: { en: "Violent Rain Showers", hi: "तेज मूसलाधार बौछारें" },
    95: { en: "Thunderstorm", hi: "गरज के साथ तूफान" },
    96: { en: "Thunderstorm with Slight Hail", hi: "ओलावृष्टि के साथ तूफान" },
    99: { en: "Thunderstorm with Heavy Hail", hi: "भारी ओलावृष्टि के साथ तीव्र तूफान" },
  };

  const match = conditions[wmoCode];
  if (match) {
    return locale === "hi" ? match.hi : match.en;
  }
  return locale === "hi" ? "अज्ञात मौसमी स्थिति" : "Unknown Condition";
}
