import type {
  Client,
  Contrat,
  Compagnie,
  Deal,
  Commission,
  Tache,
  User,
  Dirigeant,
  Prescripteur,
} from "@prisma/client";

// Re-export Prisma types
export type { Client, Contrat, Compagnie, Deal, Commission, Tache, User, Dirigeant, Prescripteur };

// Client with relations
export type ClientWithContrats = Client & {
  contrats: Contrat[];
};

export type ClientWithRelations = Client & {
  contrats: (Contrat & { compagnie: Compagnie | null; commissions: Commission[] })[];
  deals: Deal[];
  taches: Tache[];
  dirigeant: Dirigeant | null;
  prescripteur: Prescripteur | null;
};

// Contrat with relations
export type ContratWithRelations = Contrat & {
  client: Client;
  compagnie: Compagnie | null;
  commissions: Commission[];
};

// Deal with client
export type DealWithClient = Deal & {
  client: Client & { dirigeant?: Dirigeant | null };
  prescripteur?: Prescripteur | null;
};

// Commission with contrat and client
export type CommissionWithRelations = Commission & {
  contrat: Contrat & {
    client: Client;
    compagnie: Compagnie | null;
  };
};

// Tache with client
export type TacheWithClient = Tache & {
  client: Client | null;
};

// Dirigeant with client
export type DirigeantWithClient = Dirigeant & {
  client: Client;
};

// Prescripteur with relations
export type PrescripteurWithRelations = Prescripteur & {
  clients: Client[];
  deals: Deal[];
};

// Dashboard KPIs
export type DashboardKPIs = {
  caRecurrentMensuel: number;
  caRecurrentAnnuel: number;
  nbClientsActifs: number;
  nbContratsActifs: number;
  pipelineEnCours: number;
  nbTachesEnRetard: number;
  nbPrescripteurs: number;
  nbDirigeants: number;
  panierMoyen: number;
  tauxMultiEquipement: string;
  contratsARenouveler30j: number;
  totalPotentiel: number;
  sequencesActives: number;
};

// For the pipeline kanban
export type PipelineColumn = {
  id: string;
  label: string;
  color: string;
  description?: string;
  deals: DealWithClient[];
};
