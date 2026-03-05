import { z } from "zod";

export const objectifSchema = z.object({
  type: z.string().min(1),
  periode: z.string().min(1),
  annee: z.string().transform((v) => parseInt(v)),
  mois: z.string().optional().nullable().transform((v) => (v ? parseInt(v) : null)),
  trimestre: z.string().optional().nullable().transform((v) => (v ? parseInt(v) : null)),
  valeurCible: z.string().transform((v) => parseFloat(v)),
  userId: z.string().optional().nullable(),
});
