import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { mensagens } from "@/lib/db/schema";

export async function GET(
  _req: NextRequest,
  { params }: { params: { leadId: string } }
) {
  const leadId = parseInt(params.leadId, 10);

  if (isNaN(leadId)) {
    return NextResponse.json({ error: "leadId inválido" }, { status: 400 });
  }

  try {
    const result = await db
      .select()
      .from(mensagens)
      .where(eq(mensagens.leadId, leadId))
      .orderBy(mensagens.criadoEm);

    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET /api/admin/leads/[leadId]/mensagens]", err);
    return NextResponse.json(
      { error: "Erro ao buscar mensagens" },
      { status: 500 }
    );
  }
}
