import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { prompts } from "@/lib/db/schema";
import { SYSTEM_PROMPTS } from "@/lib/prompts";

const ALL_TIPOS = Object.keys(SYSTEM_PROMPTS) as (keyof typeof SYSTEM_PROMPTS)[];

export async function GET() {
  try {
    const dbPrompts = await db.select().from(prompts);
    const dbByTipo = Object.fromEntries(dbPrompts.map((p) => [p.tipo, p]));

    const result = ALL_TIPOS.map((tipo) => ({
      tipo,
      conteudo: dbByTipo[tipo]?.conteudo ?? SYSTEM_PROMPTS[tipo],
      customizado: !!dbByTipo[tipo],
      atualizadoEm: dbByTipo[tipo]?.atualizadoEm ?? null,
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET /api/admin/prompts]", err);
    return NextResponse.json({ error: "Erro ao buscar prompts" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { tipo, conteudo } = body as { tipo: string; conteudo: string };

    if (!tipo || !conteudo?.trim()) {
      return NextResponse.json(
        { error: "tipo e conteudo são obrigatórios" },
        { status: 400 }
      );
    }

    if (!ALL_TIPOS.includes(tipo as keyof typeof SYSTEM_PROMPTS)) {
      return NextResponse.json({ error: "tipo inválido" }, { status: 400 });
    }

    await db
      .insert(prompts)
      .values({ tipo, conteudo: conteudo.trim() })
      .onConflictDoUpdate({
        target: prompts.tipo,
        set: { conteudo: conteudo.trim(), atualizadoEm: new Date() },
      });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PUT /api/admin/prompts]", err);
    return NextResponse.json({ error: "Erro ao salvar prompt" }, { status: 500 });
  }
}
