import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import * as readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askConfirmation(question: string): Promise<boolean> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.toLowerCase() === "s" || answer.toLowerCase() === "yes");
    });
  });
}

async function clearAllLeads() {
  console.log("\n⚠️  AVISO: Esta ação é IRREVERSÍVEL\n");
  console.log("Você está prestes a deletar TODOS os leads do banco de dados.");
  console.log(
    "Isso também removerá todas as mensagens, arquivos e propostas associadas.\n"
  );

  const confirmed = await askConfirmation(
    'Digite "s" ou "yes" para confirmar: '
  );

  if (!confirmed) {
    console.log("\n❌ Operação cancelada.");
    rl.close();
    process.exit(0);
  }

  console.log("\n🗑️  Deletando todos os leads...\n");

  try {
    const result = await db.delete(leads);
    console.log("✅ Todos os leads foram deletados com sucesso.");
    console.log(
      "ℹ️  Mensagens, arquivos e propostas associadas foram removidas automaticamente.\n"
    );
  } catch (error) {
    console.error("❌ Erro ao deletar leads:", error);
    rl.close();
    process.exit(1);
  }

  rl.close();
}

clearAllLeads();
