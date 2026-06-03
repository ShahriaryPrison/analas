export function isAdmin(email?: string | null): boolean {
  if (!email) return false;
  const adminEmail = process.env.ADMIN_EMAIL || "admin@analas.ir";
  return email.toLowerCase() === adminEmail.toLowerCase();
}
