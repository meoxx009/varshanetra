/**
 * VarshaNetra - Security Core: Strict Input Validation & PostgREST Sanitization
 *
 * Implements strict type, coordinate, numeric bounds, date, and query construction
 * validation to protect server endpoints against malformed payloads and injection attacks.
 */

export interface StrictCoordinateCheck {
  valid: boolean;
  lat: number;
  lon: number;
  error?: string;
}

const STRICT_NUMBER_REGEX = /^-?\d+(\.\d+)?$/;

/**
 * Strictly validates geographical latitude and longitude values.
 * Rejects NaN, Infinity, alphanumeric strings (e.g. '18.52abc'), and out-of-bounds coordinates.
 */
export function validateStrictCoordinates(latitude: unknown, longitude: unknown): StrictCoordinateCheck {
  if (latitude === undefined || latitude === null || longitude === undefined || longitude === null) {
    return {
      valid: false,
      lat: 0,
      lon: 0,
      error: "Latitude and longitude query parameters are required.",
    };
  }

  const latStr = String(latitude).trim();
  const lonStr = String(longitude).trim();

  if (!STRICT_NUMBER_REGEX.test(latStr) || !STRICT_NUMBER_REGEX.test(lonStr)) {
    return {
      valid: false,
      lat: 0,
      lon: 0,
      error: "Coordinates must be strictly numerical decimal values.",
    };
  }

  const lat = Number(latStr);
  const lon = Number(lonStr);

  if (!isFinite(lat) || !isFinite(lon)) {
    return {
      valid: false,
      lat: 0,
      lon: 0,
      error: "Coordinates must be finite numerical values.",
    };
  }

  if (lat < -90 || lat > 90) {
    return {
      valid: false,
      lat,
      lon,
      error: `Latitude (${lat}) is out of bounds. Must be between -90 and +90 degrees.`,
    };
  }

  if (lon < -180 || lon > 180) {
    return {
      valid: false,
      lat,
      lon,
      error: `Longitude (${lon}) is out of bounds. Must be between -180 and +180 degrees.`,
    };
  }

  return { valid: true, lat, lon };
}

/**
 * Strictly validates search radius in meters within safe computational limits.
 */
export function validateStrictRadius(
  radius: unknown,
  minMeters = 100,
  maxMeters = 25000,
  defaultRadius = 8000
): { valid: boolean; radius: number; error?: string } {
  if (radius === undefined || radius === null || String(radius).trim() === "") {
    return { valid: true, radius: defaultRadius };
  }

  const str = String(radius).trim();
  if (!/^\d+$/.test(str)) {
    return {
      valid: false,
      radius: defaultRadius,
      error: `Radius must be a positive whole integer between ${minMeters}m and ${maxMeters}m.`,
    };
  }

  const num = parseInt(str, 10);
  if (num < minMeters || num > maxMeters) {
    return {
      valid: false,
      radius: defaultRadius,
      error: `Radius (${num}m) is out of bounds. Allowed range: ${minMeters}m to ${maxMeters}m.`,
    };
  }

  return { valid: true, radius: num };
}

/**
 * Sanitizes search terms for PostgREST .or() filter expressions.
 * Strips syntax characters (commas, parentheses, colons, quotes, percentages)
 * that could otherwise alter PostgREST filter structure.
 */
export function sanitizePostgrestSearchTerm(input: unknown): string {
  if (typeof input !== "string") return "";
  // Strip control characters, commas, parens, quotes, and PostgREST operator tokens
  return input
    .replace(/[(),:;'"\\%]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}

/**
 * Validates calendar date range (YYYY-MM-DD) for historical queries.
 */
export function validateCalendarDateRange(
  startDate: unknown,
  endDate: unknown
): { valid: boolean; start: string; end: string; error?: string } {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

  const sStr = typeof startDate === "string" ? startDate.trim() : "";
  const eStr = typeof endDate === "string" ? endDate.trim() : "";

  if (!dateRegex.test(sStr)) {
    return { valid: false, start: "", end: "", error: "Start date must be formatted as YYYY-MM-DD." };
  }
  if (!dateRegex.test(eStr)) {
    return { valid: false, start: "", end: "", error: "End date must be formatted as YYYY-MM-DD." };
  }

  const sDate = new Date(sStr + "T00:00:00Z");
  const eDate = new Date(eStr + "T00:00:00Z");

  if (isNaN(sDate.getTime()) || isNaN(eDate.getTime())) {
    return { valid: false, start: "", end: "", error: "Dates must represent valid calendar days." };
  }

  if (sDate > eDate) {
    return { valid: false, start: sStr, end: eStr, error: "Start date cannot be after end date." };
  }

  // Max 31 days per replay session to prevent memory exhaustion
  const diffDays = Math.ceil((eDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays > 31) {
    return { valid: false, start: sStr, end: eStr, error: "Replay date range cannot exceed 31 days." };
  }

  return { valid: true, start: sStr, end: eStr };
}

/**
 * Validates image upload buffer, MIME type, and magic bytes header.
 */
export function validateImageUpload(
  buffer: Buffer,
  mimeType: string,
  filename: string,
  maxSizeBytes = 5 * 1024 * 1024
): { valid: boolean; error?: string; extension: string } {
  if (buffer.length === 0) {
    return { valid: false, error: "Uploaded file buffer is empty.", extension: "" };
  }

  if (buffer.length > maxSizeBytes) {
    return { valid: false, error: `File size (${(buffer.length / (1024 * 1024)).toFixed(1)}MB) exceeds 5MB limit.`, extension: "" };
  }

  const rawExt = filename.split(".").pop()?.toLowerCase() || "";
  const allowedExtensions = ["jpg", "jpeg", "png", "webp"];
  if (!allowedExtensions.includes(rawExt)) {
    return { valid: false, error: "Invalid file extension. Only .jpg, .jpeg, .png, and .webp are accepted.", extension: "" };
  }

  const allowedMimes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
  if (!allowedMimes.includes(mimeType.toLowerCase())) {
    return { valid: false, error: "Invalid MIME type. Must be image/jpeg, image/png, or image/webp.", extension: "" };
  }

  // Magic bytes verification
  // JPEG: FF D8 FF
  const isJpeg = buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const isPng =
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a;
  // WebP: RIFF ... WEBP
  const isWebp =
    buffer.length >= 12 &&
    buffer[0] === 0x52 && // R
    buffer[1] === 0x49 && // I
    buffer[2] === 0x46 && // F
    buffer[3] === 0x46 && // F
    buffer[8] === 0x57 && // W
    buffer[9] === 0x45 && // E
    buffer[10] === 0x42 && // B
    buffer[11] === 0x50; // P

  if (!isJpeg && !isPng && !isWebp) {
    return {
      valid: false,
      error: "File contents do not match authentic JPEG, PNG, or WebP binary header signatures.",
      extension: "",
    };
  }

  const normalizedExt = isPng ? "png" : isWebp ? "webp" : "jpg";
  return { valid: true, extension: normalizedExt };
}
