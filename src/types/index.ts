import type {
  Client,
  Contrat,
  Compagnie,
  Deal,
  Commission,
  Tache,
  User,
} from "@prisma/client";

// Re-export Prisma types
export type { Client, Contrat, Compagnie, Deal, Commission, Tache, User };

// Client with relations
export type ClientWithContrats = Client & {
  contrats: Contrat[];
};

export type ClientWithRelations = Client & {
  contrats: (Contrat & { compagnie: Compagnie | null; commissions: Commission[] })[];
  deals: Deal[];
  taches: Tache[];
};

// Contrat with relations
export type ContratWithRelations = Contrat & {
  client: Client;
  compagnie: Compagnie | null;
  commissions: Commission[];
};

// Deal with client
export type DealWithClient = Deal & {
  client: Client;
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

// Dashboard KPIs
export type DashboardKPIs = {
  caRecurrentMensuel: number;
  caRecurrentAnnuel: number;
  nbClientsActifs: number;
  nbContratsActifs: number;
  pipelineEnCours: number;
  nbTachesEnRetard: number;
};

// For the pipeline kanban
export type PipelineColumn = {
  id: string;
  label: string;
  color: string;
  deals: DealWithClient[];
};
