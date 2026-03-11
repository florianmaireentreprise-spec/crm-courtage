import { cookies } from "next/headers";

export type Environnement = "DEMO" | "PRODUCTION";

const COOKIE_NAME = "crm-environnement";

export async function getEnvironnement(): Promise<Environnement> {
  const cookieStore = await cookies();
  const value = cookieStore.get(COOKIE_NAME)?.value;
  if (value === "PRODUCTION") return "PRODUCTION";
  return "DEMO";
}
