import { cookies } from "next/headers";

export const COOKIE_SESSION = "marly_session";

export async function lireJeton(): Promise<string | undefined> {
  return (await cookies()).get(COOKIE_SESSION)?.value;
}