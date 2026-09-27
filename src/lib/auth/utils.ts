/**
 * VarshaNetra Authentication & Government ID Mapping Utilities
 * Enforces secure normalization, deterministic auth identifiers, and input validation.
 */

/**
 * Normalizes user-entered Government ID into a consistent canonical uppercase string.
 * Example: "  mh rev 2024_889  " -> "MH-REV-2024-889"
 */
export function normalizeGovernmentId(rawId: string): string {
  if (!rawId) return "";
  return rawId
    .trim()
    .toUpperCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^A-Z0-9-]/g, "")
    .replace(/-+/g, "-");
}

/**
 * Safely maps a normalized Government ID into a deterministic internal email address
 * for standard Supabase Auth authentication.
 * Never exposes plaintext passwords and eliminates custom password hashing vulnerabilities.
 */
export function govIdToSyntheticEmail(normalizedGovId: string): string {
  const cleanKey = normalizedGovId
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_");
  return `govid_${cleanKey}@varshanetra.auth.internal`;
}

/**
 * Validates standard Indian mobile number format.
 * Accepts optional "+91" or leading "0" prefix, followed by 10 digits starting with 6, 7, 8, or 9.
 * Note: Validates syntax only; does NOT verify ownership (Rule 17).
 */
export function validateIndianMobileNumber(phone: string): {
  valid: boolean;
  normalized?: string;
  error?: string;
} {
  if (!phone || phone.trim().length === 0) {
    return { valid: true, normalized: "" };
  }

  // Remove spaces, hyphens, parentheses
  const cleaned = phone.replace(/[\s\-()]/g, "");

  // Match: +91XXXXXXXXXX, 91XXXXXXXXXX, 0XXXXXXXXXX, or XXXXXXXXXX
  const regex = /^(?:(?:\+|00)91|91|0)?([6-9]\d{9})$/;
  const match = cleaned.match(regex);

  if (!match) {
    return {
      valid: false,
      error: "Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.",
    };
  }

  const tenDigits = match[1];
  return {
    valid: true,
    normalized: `+91 ${tenDigits.slice(0, 5)} ${tenDigits.slice(5)}`,
  };
}

export interface PasswordStrength {
  score: number; // 0 to 4
  label: "Too Weak" | "Weak" | "Fair" | "Good" | "Strong";
  feedback: string[];
}

/**
 * Evaluates password strength and returns actionable guidance.
 */
export function evaluatePasswordStrength(password: string): PasswordStrength {
  const feedback: string[] = [];
  let score = 0;

  if (!password) {
    return { score: 0, label: "Too Weak", feedback: ["Password is required."] };
  }

  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push("At least 8 characters required.");
  }

  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push("Include at least one uppercase letter (A-Z).");
  }

  if (/[0-9]/.test(password)) {
    score += 1;
  } else {
    feedback.push("Include at least one numerical digit (0-9).");
  }

  if (/[^A-Za-z0-9]/.test(password)) {
    score += 1;
  } else {
    feedback.push("Include at least one special symbol (!@#$%^&*).");
  }

  const labels: PasswordStrength["label"][] = [
    "Too Weak",
    "Weak",
    "Fair",
    "Good",
    "Strong",
  ];

  return {
    score,
    label: labels[score],
    feedback,
  };
}
