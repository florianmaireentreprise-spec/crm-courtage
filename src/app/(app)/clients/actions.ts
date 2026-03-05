"use server";

import { prisma } from "@/lib/prisma";
import { clientSchema } from "@/lib/validators/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createClient(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = clientSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;
  const client = await prisma.client.create({
    data: {
      ...data,
      email: data.email || null,
      dateNaissance: data.dateNaissance ? new Date(data.dateNaissance) : null,
      nbSalaries: data.nbSalaries ?? null,
      chiffreAffaires: data.chiffreAffaires ?? null,
    },
  });

  revalidatePath("/clients");
  redirect(`/clients/${client.id}`);
}

export async function updateClient(id: string, formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = clientSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;
  await prisma.client.update({
    where: { id },
    data: {
      ...data,
      email: data.email || null,
      dateNaissance: data.dateNaissance ? new Date(data.dateNaissance) : null,
      nbSalaries: data.nbSalaries ?? null,
      chiffreAffaires: data.chiffreAffaires ?? null,
    },
  });

  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  redirect(`/clients/${id}`);
}

export async function deleteClient(id: string) {
  await prisma.client.delete({ where: { id } });
  revalidatePath("/clients");
  redirect("/clients");
}
