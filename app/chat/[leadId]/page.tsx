import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { leads, mensagens } from "@/lib/db/schema";
import ChatClient from "./ChatClient";

interface Props {
  params: { leadId: string };
}

export default async function ChatPage({ params }: Props) {
  const leadId = parseInt(params.leadId, 10);

  if (isNaN(leadId)) notFound();

  const [lead] = await db
    .select()
    .from(leads)
    .where(eq(leads.id, leadId))
    .limit(1);

  if (!lead) notFound();

  const historico = await db
    .select()
    .from(mensagens)
    .where(eq(mensagens.leadId, leadId))
    .orderBy(mensagens.criadoEm);

  return (
    <ChatClient
      lead={lead}
      historicoInicial={historico.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.conteudo,
      }))}
    />
  );
}
