import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { createAdminClient } from "@/lib/supabase/server";

import { authenticateApiRequest, createUnauthorizedResponse } from "@/lib/security/auth-guard";
import { checkRateLimit } from "@/lib/security/rate-limiter";
import { validateImageUpload } from "@/lib/security/validation";
import { sanitizeErrorMessage } from "@/lib/security/error-handler";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // 1. Authentication check
  const auth = await authenticateApiRequest(request);
  if (!auth.isAuthenticated || !auth.user) {
    return createUnauthorizedResponse("Authentication required to upload field evidence.");
  }

  // 2. Rate limiting check (10 uploads / min)
  const rl = checkRateLimit(request, "upload");
  if (!rl.allowed && rl.response) {
    return rl.response;
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "No image file provided." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // 3. Strict image validation (size, extension, MIME, and binary magic bytes)
    const imgCheck = validateImageUpload(buffer, file.type, file.name);
    if (!imgCheck.valid) {
      return NextResponse.json({ success: false, error: imgCheck.error }, { status: 400 });
    }

    const ext = imgCheck.extension;
    const filename = `evidence_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;

    // Try Supabase Storage upload first
    if (isSupabaseConfigured()) {
      try {
        const supabase = createAdminClient();
        const { data, error } = await supabase.storage
          .from("field-reports")
          .upload(`observations/${filename}`, buffer, {
            contentType: file.type,
            upsert: false,
          });

        if (!error && data) {
          const { data: publicData } = supabase.storage
            .from("field-reports")
            .getPublicUrl(`observations/${filename}`);

          return NextResponse.json({
            success: true,
            url: publicData.publicUrl,
            thumbnailUrl: publicData.publicUrl,
            storage: "supabase",
          });
        }
        console.warn("[VarshaNetra] Supabase storage upload failed, saving to local file uploads:", error);
      } catch (e) {
        console.warn("[VarshaNetra] Error uploading to Supabase storage:", e);
      }
    }

    // Local filesystem fallback (public/uploads/field-reports)
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "field-reports");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const localFilePath = path.join(uploadsDir, filename);
    fs.writeFileSync(localFilePath, buffer);

    const publicUrl = `/uploads/field-reports/${filename}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      thumbnailUrl: publicUrl,
      storage: "local-fallback",
    });
  } catch (err: unknown) {
    const message = sanitizeErrorMessage(err, "Error uploading evidence photo");
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
