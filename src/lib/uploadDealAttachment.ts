import { supabase } from "@/integrations/supabase/client";

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10MB

// Strict allowlist of safe image MIME types only. No executables, archives, or documents.
export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
] as const;

export const ALLOWED_IMAGE_EXTENSIONS = [
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  "heic",
  "heif",
] as const;

// Accept attribute string for <input type="file"> — keeps OS file pickers tight.
export const IMAGE_ACCEPT_ATTR = ALLOWED_IMAGE_MIME_TYPES.join(",");

export function isAllowedImage(file: File): boolean {
  const mime = (file.type || "").toLowerCase();
  if (mime && (ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(mime)) {
    return true;
  }
  // Fallback: some clipboards / browsers omit MIME — check extension.
  const ext = file.name.includes(".")
    ? file.name.split(".").pop()?.toLowerCase() ?? ""
    : "";
  return (ALLOWED_IMAGE_EXTENSIONS as readonly string[]).includes(ext);
}

export async function uploadDealAttachment(
  file: File,
  dealId: string,
  userId: string
): Promise<{ path: string; type: string; name: string }> {
  if (!isAllowedImage(file)) {
    throw new Error(
      "Only image files are allowed (PNG, JPEG, WEBP, GIF, HEIC)."
    );
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error("File too large (max 10MB).");
  }
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "";
  const safeBase = file.name
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 40);
  const filename = `${Date.now()}_${safeBase}${ext ? "." + ext : ""}`;
  const path = `${dealId}/${userId}/${filename}`;

  const { error } = await supabase.storage
    .from("deal-attachments")
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) throw error;

  return {
    path,
    type: file.type || "application/octet-stream",
    name: file.name,
  };
}
