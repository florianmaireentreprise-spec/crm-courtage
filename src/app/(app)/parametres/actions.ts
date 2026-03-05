"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";

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
