import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, arquivos } from "@/lib/db/schema";
import { extractPdfText } from "@/lib/pdf";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const nome = formData.get("nome") as string | null;
    const whatsapp = formData.get("whatsapp") as string | null;
    const email = formData.get("email") as string | null;
    const cargo = formData.get("cargo") as string | null;
    const empresa = formData.get("empresa") as string | null;
    const pdfFile = formData.get("pdf") as File | null;

    if (!nome?.trim() || !whatsapp?.trim() || !email?.trim()) {
      return NextResponse.json(
        { error: "Nome, WhatsApp e email são obrigatórios" },
        { status: 400 }
      );
    }

    const [lead] = await db
      .insert(leads)
      .values({
        nome: nome.trim(),
        whatsapp: whatsapp.trim(),
        email: email.trim(),
        cargo: cargo?.trim() || null,
        empresa: empresa?.trim() || null,
      })
      .returning();

    if (pdfFile && pdfFile.size > 0) {
      const contentType = pdfFile.type;
      if (contentType !== "application/pdf") {
        return NextResponse.json(
          { error: "Apenas arquivos PDF são aceitos" },
          { status: 400 }
        );
      }

      const arrayBuffer = await pdfFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const textoExtraido = await extractPdfText(buffer);

      await db.insert(arquivos).values({
        leadId: lead.id,
        nomeArquivo: pdfFile.name,
        textoExtraido,
      });
    }

    return NextResponse.json({ leadId: lead.id });
  } catch (err) {
    console.error("[POST /api/leads]", err);
    return NextResponse.json(
      { error: "Erro interno ao criar lead" },
      { status: 500 }
    );
  }
}
