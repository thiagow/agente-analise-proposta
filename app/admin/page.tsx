import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { leads, mensagens, arquivos } from "@/lib/db/schema";
import { AdminClient } from "./AdminClient";

export const dynamic = "force-dynamic";

async function getLeads() {
  return db
    .select({
      id: leads.id,
      nome: leads.nome,
      cargo: leads.cargo,
      empresa: leads.empresa,
      whatsapp: leads.whatsapp,
      email: leads.email,
      tipoProjeto: leads.tipoProjeto,
      encerrada: leads.encerrada,
      criadoEm: leads.criadoEm,
      totalMensagens: sql<number>`count(distinct ${mensagens.id})`.as("total_mensagens"),
      temArquivo: sql<boolean>`max(${arquivos.id}) is not null`.as("tem_arquivo"),
    })
    .from(leads)
    .leftJoin(mensagens, sql`${mensagens.leadId} = ${leads.id}`)
    .leftJoin(arquivos, sql`${arquivos.leadId} = ${leads.id}`)
    .groupBy(leads.id)
    .orderBy(sql`${leads.criadoEm} desc`);
}

export default async function AdminPage() {
  const rows = await getLeads();
  const leadsData = rows.map((r) => ({
    ...r,
    criadoEm: r.criadoEm.toISOString(),
  }));

  return <AdminClient leads={leadsData} />;
}
