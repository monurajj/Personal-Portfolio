"use server";

import { redirect } from "next/navigation";
import { revalidatePath, updateTag } from "next/cache";
import { destroySession, issueOtp, requireAdmin, verifyOtp } from "@/lib/admin-auth";
import { addAdmin, isAllowedAdmin, removeAdmin, superAdminEmail } from "@/lib/admins";
import { sendOtpEmail } from "@/lib/mail";
import { deleteMessage, setMessageStatus, type MessageStatus } from "@/lib/messages";
import { deleteMedia, setMediaPublished, uploadMedia, type MediaItem } from "@/lib/cloudinary";
import { GALLERY_TAG } from "@/lib/gallery";

/* ----------------------------------------------------------------- login */

export type LoginState = {
  step: "email" | "code";
  email?: string;
  message?: string;
  error?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function requestOtp(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { step: "email", error: "Enter a valid email address." };

  if (!(await isAllowedAdmin(email))) {
    return { step: "email", error: "You are not allowed to visit this page." };
  }
  try {
    const code = await issueOtp(email);
    await sendOtpEmail(email, code);
  } catch (err) {
    console.error("[admin] could not send OTP:", err);
    return { step: "email", error: "Could not send the code. Check the mail settings and try again." };
  }
  return { step: "code", email, message: "A 6-digit code is on its way." };
}

export async function confirmOtp(prev: LoginState, formData: FormData): Promise<LoginState> {
  const code = String(formData.get("code") ?? "").replace(/\D/g, "");
  if (code.length !== 6) return { ...prev, step: "code", error: "Enter the 6-digit code." };
  const result = await verifyOtp(code);
  if (result === "ok") redirect("/admin");
  const error =
    result === "wrong"
      ? "That code is not right."
      : result === "expired"
        ? "That code has expired. Request a new one."
        : result === "locked"
          ? "Too many attempts. Request a new code."
          : "No code is pending. Request a new one.";
  return { step: result === "wrong" ? "code" : "email", email: prev.email, error };
}

export async function logout() {
  await destroySession();
  redirect("/admin/login");
}

/* -------------------------------------------------------------- messages */

export async function updateMessageStatus(id: string, status: MessageStatus) {
  await requireAdmin();
  await setMessageStatus(id, status);
  revalidatePath("/admin/messages");
}

export async function removeMessage(id: string) {
  await requireAdmin();
  await deleteMessage(id);
  revalidatePath("/admin/messages");
}

/* ----------------------------------------------------------------- media */

export type UploadState = { ok?: boolean; error?: string; item?: MediaItem };

const MAX_BYTES = 25 * 1024 * 1024;

export async function uploadMediaAction(_prev: UploadState, formData: FormData): Promise<UploadState> {
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a file first." };
  if (file.size > MAX_BYTES) return { error: "Files must be under 25 MB." };
  try {
    const item = await uploadMedia(file);
    revalidatePath("/admin/media");
    return { ok: true, item };
  } catch (err) {
    console.error("[admin] upload failed:", err);
    return { error: err instanceof Error ? err.message : "Upload failed." };
  }
}

export async function removeMediaAction(publicId: string, resourceType: MediaItem["resourceType"]) {
  await requireAdmin();
  await deleteMedia(publicId, resourceType);
  revalidatePath("/admin/media");
  updateTag(GALLERY_TAG);
}

/** "Show on website": tags the asset for the public gallery (or untags it) and refreshes the gallery cache. */
export async function setMediaVisibilityAction(
  publicId: string,
  resourceType: MediaItem["resourceType"],
  published: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  try {
    await setMediaPublished(publicId, resourceType, published);
  } catch (err) {
    console.error("[admin] visibility update failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : "Could not update." };
  }
  revalidatePath("/admin/media");
  updateTag(GALLERY_TAG);
  return { ok: true };
}

/* ---------------------------------------------------------------- admins */

export async function requireSuperAdmin() {
  const s = await requireAdmin();
  if (s.email !== superAdminEmail()) throw new Error("Only the super admin can manage admins.");
  return s;
}

export type AdminsState = { error?: string; ok?: string };

export async function addAdminAction(_prev: AdminsState, formData: FormData): Promise<AdminsState> {
  const me = await requireSuperAdmin();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { error: "Enter a valid email address." };
  try {
    await addAdmin(email, me.email);
  } catch (err) {
    console.error("[admins] add failed:", err);
    return { error: err instanceof Error ? err.message : "Could not add that admin." };
  }
  revalidatePath("/admin/admins");
  return { ok: `${email} can now sign in.` };
}

export async function removeAdminAction(email: string) {
  await requireSuperAdmin();
  await removeAdmin(email);
  revalidatePath("/admin/admins");
}
