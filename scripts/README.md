# Scripts Utilitários

Scripts para manutenção e limpeza do banco de dados.

## `clear-leads.ts`

Remove **todos** os leads do banco de dados, incluindo mensagens, arquivos e propostas associadas.

### ⚠️ Aviso Importante

Esta ação é **IRREVERSÍVEL**. Sempre faça backup do banco antes de executar.

### Como usar

```bash
npm run db:clear-leads
```

O script pedirá confirmação antes de executar a deleção:

```
⚠️  AVISO: Esta ação é IRREVERSÍVEL

Você está prestes a deletar TODOS os leads do banco de dados.
Isso também removerá todas as mensagens, arquivos e propostas associadas.

Digite "s" ou "yes" para confirmar:
```

Responda com `s` ou `yes` para confirmar, ou qualquer outra coisa para cancelar.

### O que é deletado

Graças ao `cascade delete` configurado no schema:
- Todos os registros em `leads`
- Todas as `mensagens` associadas
- Todos os `arquivos` associados
- Todas as `propostas` associadas
- Todas as `analiseDocumento` (JSONB armazenado em leads)
