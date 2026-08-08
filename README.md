# 💈 Barbearia — Sistema de Gestão

App de gestão completo para barbearias: agenda, comissões configuráveis, financeiro,
controle de equipe, fila de espera, caixa, portfólio e muito mais. Mobile-first, PWA
instalável, com tema claro/escuro.

![stack](https://img.shields.io/badge/React-18-149ECA) ![vite](https://img.shields.io/badge/Vite-5-646CFF) ![tailwind](https://img.shields.io/badge/Tailwind-3-38BDF8) ![pwa](https://img.shields.io/badge/PWA-instalável-0EA5E9)

## ✨ Funcionalidades

### 🔐 Login e perfis
- **Dono (Admin):** acesso total — dashboard geral, financeiro, equipe e configurações.
- **Barbeiro:** acesso restrito — apenas sua agenda, ganhos e serviços liberados.
- **PIN de 4 dígitos** para acesso rápido no dia a dia.
- Recuperação de senha por e-mail ou WhatsApp (fluxo simulado).

### 📊 Dashboard do Dono
- Cards de métricas: faturamento total, ganhos pessoais, repasse dos barbeiros e venda de produtos.
- Gráfico de faturamento (dia / semana / mês).
- Ranking de barbeiros do mês.
- Agenda do dia com todos os barbeiros.
- Acompanhamento de metas e lucro estimado.

### 💰 Comissões 100% configuráveis
- O dono cria **categorias** (serviço ou produto) e define o **split** por porcentagem
  via slider (ex.: Corte 50/50, Sobrancelha 60/40, Pomadas 20/80).
- Cada lançamento guarda um *snapshot* da comissão no momento da venda.

### 👨‍🔧 Dashboard do Barbeiro
- Ganhos do dia/semana/mês já com o split calculado.
- Histórico de atendimentos e clientes recorrentes (CRM).
- Apenas os serviços liberados pelo dono aparecem para lançamento.

### 📋 Extras
| Recurso | Descrição |
|---|---|
| 🪞 Fila de espera | Cliente chega → entra na fila → barbeiro chama |
| 📅 Agendamentos | Calendário por barbeiro, com status |
| 💸 Caixa do dia | Abertura/fechamento com saldo esperado |
| 📤 Relatórios | Exportação em **PDF** (impressão) e **Excel/CSV** |
| 🏖️ Folgas | Registro de dias de folga por barbeiro |
| 🔔 Lembretes | Aniversários, retornos e reativação de clientes (com atalho WhatsApp) |
| 📸 Antes/Depois | Galeria/portfólio dos cortes |
| 🌐 PWA | Instalável no celular, funciona offline |
| 🌙 Tema | Alternância claro/escuro |

## 🚀 Como rodar

```bash
npm install
npm run dev      # ambiente de desenvolvimento (http://localhost:5173)
npm run build    # build de produção em /dist
npm run preview  # pré-visualização do build
```

## 👤 Acessos de demonstração

A tela de login lista os usuários de demonstração. Você também pode entrar pelo PIN.

| Usuário | Perfil | E-mail | Senha | PIN |
|---|---|---|---|---|
| Carlos Mendes | Dono | dono@barbearia.com | 123456 | 1234 |
| Rafael Souza | Barbeiro | rafael@barbearia.com | 123456 | 2222 |
| Bruno Lima | Barbeiro | bruno@barbearia.com | 123456 | 3333 |

## 🎨 Tecnologia

- **React + Vite + Tailwind CSS** — leve, rápido e moderno.
- **Recharts** — gráficos responsivos.
- **PWA** (`vite-plugin-pwa`) — instalável e offline-first.
- **Camada de dados local** — os dados são persistidos em `localStorage`, então o app
  funciona 100% sem backend. A modelagem (usuários, categorias, serviços, transações,
  agendamentos, fila, despesas, metas, caixa, folgas, galeria) segue o formato de
  tabelas relacionais, facilitando a migração futura para o **Supabase**.

### Migrando para o Supabase

Toda a leitura/escrita passa pelo `DataContext` (`src/context/DataContext.jsx`). Para
usar um backend real, basta substituir as operações locais (`addTo`, `patch`, `remove`,
`addTransaction`) por chamadas ao cliente Supabase, mantendo a mesma forma dos objetos
descrita em `src/lib/seed.js`. Os seletores de métricas (`ownerMetrics`, `barberMetrics`,
`rankingThisMonth`) permanecem inalterados.

## 📁 Estrutura

```
src/
├── components/     # UI reutilizável (Layout, ui.jsx, Icons)
├── context/        # Auth, Data (store), Theme, Toast
├── lib/            # utils, seed (dados iniciais), reports (PDF/CSV)
├── pages/          # telas (dashboards, agenda, financeiro, ...)
├── App.jsx         # rotas + controle de acesso por perfil
└── main.jsx        # bootstrap + providers
```

---

Feito para ser instalado no celular e usado no balcão da barbearia. 💈
