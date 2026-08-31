import bcrypt from "bcryptjs";

const ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, ROUNDS);
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export function passwordPolicy(password: string): string | null {
  if (password.length < 10) return "رمز عبور باید حداقل ۱۰ نویسه باشد.";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "رمز عبور باید شامل حرف و عدد باشد.";
  }
  return null;
}
