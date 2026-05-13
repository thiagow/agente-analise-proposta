import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { leadId: string } }
) {
  const leadId = parseInt(params.leadId, 10);
  if (isNaN(leadId)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  try {
    const [deleted] = await db
      .delete(leads)
      .where(eq(leads.id, leadId))
      .returning({ id: leads.id });

    if (!deleted) {
      return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/admin/leads/:leadId]", err);
    return NextResponse.json({ error: "Erro ao excluir lead" }, { status: 500 });
  }
}
