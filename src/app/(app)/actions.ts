"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function switchEnvironnement(env: "DEMO" | "PRODUCTION") {
  const cookieStore = await cookies();
  cookieStore.set("crm-environnement", env, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}
