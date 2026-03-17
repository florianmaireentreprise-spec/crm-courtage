/**
 * Tests for deleteClient guard, archiveClient, unarchiveClient.
 * These server actions depend on Prisma + auth — we mock both.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ──

// Mock auth — always returns a valid session
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(() => Promise.resolve({ user: { id: "user-test-001" } })),
}));

// Mock Next.js server functions
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

// Mock audit
const mockLogAudit = vi.fn();
vi.mock("@/lib/audit", () => ({
  logAudit: (...args: unknown[]) => mockLogAudit(...args),
  getActorId: (session: { user?: { id?: string } } | null) => session?.user?.id ?? null,
}));

// Mock n8n
vi.mock("@/lib/n8n", () => ({
  emitN8nEvent: vi.fn(),
}));

// Mock Prisma — per-model mocks
const mockPrismaClient = {
  count: vi.fn(() => Promise.resolve(0)),
};
const mockPrismaContrat = { count: vi.fn(() => Promise.resolve(0)) };
const mockPrismaDeal = { count: vi.fn(() => Promise.resolve(0)) };
const mockPrismaDocument = { count: vi.fn(() => Promise.resolve(0)) };
const mockPrismaOpportuniteCommerciale = { count: vi.fn(() => Promise.resolve(0)) };
const mockPrismaDirigeant = { count: vi.fn(() => Promise.resolve(0)) };
const mockPrismaSequenceInscription = { count: vi.fn(() => Promise.resolve(0)) };
const mockPrismaSignalCommercial = { count: vi.fn(() => Promise.resolve(0)) };
const mockPrismaPreconisation = { count: vi.fn(() => Promise.resolve(0)) };

const mockPrisma = {
  client: {
    update: vi.fn(() => Promise.resolve({ id: "client-1" })),
    delete: vi.fn(() => Promise.resolve({ id: "client-1" })),
  },
  contrat: mockPrismaContrat,
  deal: mockPrismaDeal,
  document: mockPrismaDocument,
  opportuniteCommerciale: mockPrismaOpportuniteCommerciale,
  dirigeant: mockPrismaDirigeant,
  sequenceInscription: mockPrismaSequenceInscription,
  signalCommercial: mockPrismaSignalCommercial,
  preconisation: mockPrismaPreconisation,
};

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

// ── Import after mocks ──
const { deleteClient, archiveClient, unarchiveClient } = await import("./actions");

// ── Tests ──

describe("deleteClient guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset all counts to 0 (deletable)
    mockPrismaContrat.count.mockResolvedValue(0);
    mockPrismaDeal.count.mockResolvedValue(0);
    mockPrismaDocument.count.mockResolvedValue(0);
    mockPrismaOpportuniteCommerciale.count.mockResolvedValue(0);
    mockPrismaDirigeant.count.mockResolvedValue(0);
    mockPrismaSequenceInscription.count.mockResolvedValue(0);
    mockPrismaSignalCommercial.count.mockResolvedValue(0);
    mockPrismaPreconisation.count.mockResolvedValue(0);
  });

  it("blocks deletion when client has contrats", async () => {
    mockPrismaContrat.count.mockResolvedValue(2);
    const result = await deleteClient("client-1");
    expect(result?.error).toContain("2 contrats");
    expect(result?.error).toContain("Impossible de supprimer");
    expect(mockPrisma.client.delete).not.toHaveBeenCalled();
  });

  it("blocks deletion when client has deals", async () => {
    mockPrismaDeal.count.mockResolvedValue(1);
    const result = await deleteClient("client-1");
    expect(result?.error).toContain("1 deal");
    expect(mockPrisma.client.delete).not.toHaveBeenCalled();
  });

  it("blocks deletion when client has documents", async () => {
    mockPrismaDocument.count.mockResolvedValue(3);
    const result = await deleteClient("client-1");
    expect(result?.error).toContain("3 documents");
    expect(mockPrisma.client.delete).not.toHaveBeenCalled();
  });

  it("blocks deletion when client has opportunites", async () => {
    mockPrismaOpportuniteCommerciale.count.mockResolvedValue(4);
    const result = await deleteClient("client-1");
    expect(result?.error).toContain("4 opportunites");
    expect(mockPrisma.client.delete).not.toHaveBeenCalled();
  });

  it("blocks deletion when client has dirigeant", async () => {
    mockPrismaDirigeant.count.mockResolvedValue(1);
    const result = await deleteClient("client-1");
    expect(result?.error).toContain("1 dirigeant");
    expect(mockPrisma.client.delete).not.toHaveBeenCalled();
  });

  it("blocks deletion when client has sequence inscriptions", async () => {
    mockPrismaSequenceInscription.count.mockResolvedValue(2);
    const result = await deleteClient("client-1");
    expect(result?.error).toContain("2 inscriptions sequence");
    expect(mockPrisma.client.delete).not.toHaveBeenCalled();
  });

  it("blocks deletion when client has signaux commerciaux", async () => {
    mockPrismaSignalCommercial.count.mockResolvedValue(5);
    const result = await deleteClient("client-1");
    expect(result?.error).toContain("5 signaux commerciaux");
    expect(mockPrisma.client.delete).not.toHaveBeenCalled();
  });

  it("blocks deletion with multiple dependencies and lists all in error message", async () => {
    mockPrismaContrat.count.mockResolvedValue(1);
    mockPrismaDeal.count.mockResolvedValue(2);
    mockPrismaSignalCommercial.count.mockResolvedValue(3);
    const result = await deleteClient("client-1");
    expect(result?.error).toContain("1 contrat");
    expect(result?.error).toContain("2 deals");
    expect(result?.error).toContain("3 signaux commerciaux");
    expect(mockPrisma.client.delete).not.toHaveBeenCalled();
  });

  it("logs delete_blocked audit event when deletion is blocked", async () => {
    mockPrismaContrat.count.mockResolvedValue(1);
    await deleteClient("client-1");
    expect(mockLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "Client",
        entityId: "client-1",
        action: "delete_blocked",
        actorUserId: "user-test-001",
      }),
    );
  });

  it("proceeds with deletion when client has zero dependencies", async () => {
    // All counts already 0 from beforeEach
    await deleteClient("client-1");
    expect(mockPrisma.client.delete).toHaveBeenCalledWith({ where: { id: "client-1" } });
  });

  it("logs delete audit event before actual deletion", async () => {
    await deleteClient("client-1");
    expect(mockLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "Client",
        entityId: "client-1",
        action: "delete",
        actorUserId: "user-test-001",
      }),
    );
  });
});

describe("archiveClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets archived=true and archivedAt on the client", async () => {
    await archiveClient("client-1");
    expect(mockPrisma.client.update).toHaveBeenCalledWith({
      where: { id: "client-1" },
      data: expect.objectContaining({
        archived: true,
        archivedAt: expect.any(Date),
        updatedByUserId: "user-test-001",
      }),
    });
  });

  it("logs archive audit event", async () => {
    await archiveClient("client-1");
    expect(mockLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "Client",
        entityId: "client-1",
        action: "archive",
        actorUserId: "user-test-001",
      }),
    );
  });
});

describe("unarchiveClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets archived=false and archivedAt=null on the client", async () => {
    await unarchiveClient("client-1");
    expect(mockPrisma.client.update).toHaveBeenCalledWith({
      where: { id: "client-1" },
      data: expect.objectContaining({
        archived: false,
        archivedAt: null,
        updatedByUserId: "user-test-001",
      }),
    });
  });

  it("logs unarchive audit event", async () => {
    await unarchiveClient("client-1");
    expect(mockLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "Client",
        entityId: "client-1",
        action: "unarchive",
        actorUserId: "user-test-001",
      }),
    );
  });
});
