import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { leads, mensagens, arquivos } from "@/lib/db/schema";

export async function GET() {
  try {
    const result = await db
      .select({
        id: leads.id,
        nome: leads.nome,
        cargo: leads.cargo,
        empresa: leads.empresa,
        whatsapp: leads.whatsapp,
        email: leads.email,
        tipoProjeto: leads.tipoProjeto,
        criadoEm: leads.criadoEm,
        totalMensagens: sql<number>`count(distinct ${mensagens.id})`.as(
          "total_mensagens"
        ),
        temArquivo: sql<boolean>`max(${arquivos.id}) is not null`.as(
          "tem_arquivo"
        ),
      })
      .from(leads)
      .leftJoin(mensagens, sql`${mensagens.leadId} = ${leads.id}`)
      .leftJoin(arquivos, sql`${arquivos.leadId} = ${leads.id}`)
      .groupBy(leads.id)
      .orderBy(sql`${leads.criadoEm} desc`);

    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET /api/admin/leads]", err);
    return NextResponse.json(
      { error: "Erro ao buscar leads" },
      { status: 500 }
    );
  }
}
