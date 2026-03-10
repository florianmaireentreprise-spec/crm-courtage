"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { TYPES_PRODUITS } from "@/lib/constants";

const userSchema = z.object({
  prenom: z.string().min(1),
  nom: z.string().min(1),
  email: z.string().email(),
  role: z.string().default("gerant"),
  password: z.string().optional(),
});

export async function updateUser(userId: string, formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = userSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;
  const updateData: Record<string, unknown> = {
    prenom: data.prenom,
    nom: data.nom,
    email: data.email,
    role: data.role,
  };

  if (data.password && data.password.length > 0) {
    updateData.password = await bcrypt.hash(data.password, 12);
  }

  await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });

  revalidatePath("/parametres");
}

export async function createUser(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const schema = userSchema.extend({
    password: z.string().min(6, "Le mot de passe doit avoir au moins 6 caractères"),
  });
  const parsed = schema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;
  const hashedPassword = await bcrypt.hash(data.password, 12);

  await prisma.user.create({
    data: {
      prenom: data.prenom,
      nom: data.nom,
      email: data.email,
      role: data.role,
      password: hashedPassword,
    },
  });

  revalidatePath("/parametres");
}

// ── Taux de commission ──

export async function updateTauxCommission(formData: FormData) {
  const taux: Record<string, { apport: number; gestion: number }> = {};

  for (const key of Object.keys(TYPES_PRODUITS)) {
    const apportRaw = formData.get(`${key}_apport`);
    const gestionRaw = formData.get(`${key}_gestion`);

    const apport = parseFloat(String(apportRaw ?? "0")) / 100;
    const gestion = parseFloat(String(gestionRaw ?? "0")) / 100;

    if (isNaN(apport) || isNaN(gestion) || apport < 0 || apport > 1 || gestion < 0 || gestion > 1) {
      return { error: `Taux invalide pour ${key}` };
    }

    taux[key] = { apport, gestion };
  }

  await prisma.settings.upsert({
    where: { id: "default" },
    create: { tauxCommission: JSON.stringify(taux) },
    update: { tauxCommission: JSON.stringify(taux) },
  });

  revalidatePath("/parametres");
}

// ── Informations cabinet ──

const cabinetSchema = z.object({
  raisonSociale: z.string().min(1),
  formeJuridique: z.string().min(1),
  gerants: z.string().min(1),
  zone: z.string().min(1),
  cible: z.string().min(1),
});

export async function updateCabinetInfo(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = cabinetSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  await prisma.settings.upsert({
    where: { id: "default" },
    create: { ...data, tauxCommission: "{}" },
    update: data,
  });

  revalidatePath("/parametres");
}
