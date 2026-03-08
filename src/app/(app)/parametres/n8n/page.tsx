import { prisma } from "@/lib/prisma";
import { N8nConfig } from "@/components/parametres/N8nConfig";

export const dynamic = "force-dynamic";

export default async function N8nPage() {
  const logs = await prisma.n8nLog.findMany({
    orderBy: { dateCreation: "desc" },
    take: 10,
  });

  const envStatus = {
    N8N_WEBHOOK_URL: !!process.env.N8N_WEBHOOK_URL,
    N8N_WEBHOOK_SECRET: !!process.env.N8N_WEBHOOK_SECRET,
    N8N_API_KEY: !!process.env.N8N_API_KEY,
  };

  return <N8nConfig logs={logs} envStatus={envStatus} />;
}
