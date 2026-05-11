import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  cargo: varchar("cargo", { length: 255 }),
  empresa: varchar("empresa", { length: 255 }),
  whatsapp: varchar("whatsapp", { length: 30 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  tipoProjeto: varchar("tipo_projeto", { length: 50 }),
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
});

export const mensagens = pgTable("mensagens", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).notNull(),
  conteudo: text("conteudo").notNull(),
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
});

export const arquivos = pgTable("arquivos", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  nomeArquivo: varchar("nome_arquivo", { length: 255 }).notNull(),
  caminho: varchar("caminho", { length: 500 }),
  textoExtraido: text("texto_extraido"),
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
});

export const propostas = pgTable("propostas", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  promptGerado: text("prompt_gerado").notNull(),
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
});

export const prompts = pgTable("prompts", {
  id: serial("id").primaryKey(),
  tipo: varchar("tipo", { length: 50 }).notNull().unique(),
  conteudo: text("conteudo").notNull(),
  atualizadoEm: timestamp("atualizado_em").defaultNow().notNull(),
});

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
export type Mensagem = typeof mensagens.$inferSelect;
export type Arquivo = typeof arquivos.$inferSelect;
export type Proposta = typeof propostas.$inferSelect;
export type Prompt = typeof prompts.$inferSelect;
