# SigComércio

## Configurar o Supabase

1. Crie um projeto em [Supabase](https://supabase.com/dashboard).
2. Abra **SQL Editor**, crie uma nova consulta, copie todo o conteúdo de [supabase/schema.sql](./supabase/schema.sql) e clique em **Run**.
3. Em **Project Settings > API**, copie a **Project URL** e a chave **anon public**.
4. Copie `.env.example` para um novo arquivo chamado `.env.local` e preencha os dois valores:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anon_do_supabase
```

5. Reinicie `npm run dev`.

O primeiro acesso criado pelo script é `afonsopaulo755@gmail.com` / `1233219898`. Cadastre ou edite os operadores dentro da tela **Usuários** e altere essa senha logo após o primeiro acesso.

O banco armazena produtos, clientes, vendas, itens das vendas e movimentações de estoque. O fechamento de venda é feito por uma função única no banco, garantindo que venda, baixa de estoque e fiado sejam gravados juntos.

> Esta é uma conexão simples para uso interno. Como ainda não há Supabase Auth, as políticas permitem o acesso com a chave pública do projeto. Para disponibilizar o sistema a pessoas externas, a próxima evolução recomendada é autenticar cada operador com Supabase Auth e restringir as políticas por usuário/loja.

## Desenvolvimento

```bash
npm install
npm run dev
```
