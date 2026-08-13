# 🍢 Lanchonete Rodrigues — App de Pedidos & Gestão (PWA)

Substituto real do "ligar para pedir": um PWA de delivery de **espetinho e jantinha**
que junta duas experiências num só app — o **cliente** pede rápido, com fotos e
acompanhamento em tempo real, e o **gestor** controla o negócio inteiro (pedidos,
estoque, caixa e financeiro) do celular ou tablet.

![stack](https://img.shields.io/badge/React-18-149ECA) ![vite](https://img.shields.io/badge/Vite-5-646CFF) ![tailwind](https://img.shields.io/badge/Tailwind-3-F5A800) ![pwa](https://img.shields.io/badge/PWA-instal%C3%A1vel-D1202F)

Identidade visual da marca: **amarelo** como base (apetite), **vermelho/bordô** nos CTAs
e destaques, **azul** de apoio. Mobile-first, tema claro/escuro.

## ✨ Duas experiências, um app

### 👤 Cliente (loja)
- **Cardápio visual** por categoria, com fotos (ou blocos apetitosos com emoji) e preço.
- **Montagem por categoria** — cada tipo tem sua própria lógica, definida como **dado**
  (não código fixo), pronta para replicar em lanchonete/pizzaria:
  - **Espetos avulsos** e **bebidas** → item simples (só quantidade).
  - **Jantinha completa** → escolhe espeto + tipo de feijão (tropeiro/caldo);
    acompanhamentos fixos (arroz, purê, bolinho de milho, salada, mandioca).
  - **Completo** → escolhe espeto; acompanha feijão tropeiro, mandioca e tomate.
  - **Caldos** → escolhe o sabor, com opção de **misturar dois** (ex.: metade frango +
    metade costela) e adicionais (queijo, cebolinha).
- **Esgotado** aparece desabilitado (“Esgotado por hoje”), não some do cardápio.
- **Carrinho** com edição, **upsell contextual** (sugere bebida / vira jantinha).
- **Checkout** sem barreira: login só com nome + telefone; entrega por bairro (taxa/ETA)
  ou **retirada no local** (sem taxa); pagamento PIX / cartão / **dinheiro com troco**.
- **Acompanhamento em tempo real** com linha do tempo (Recebido → Preparo →
  Saiu para entrega → Entregue) e **aviso automático de atraso**.
- **Fidelidade** (cartão de selos configurável), **conquistas**, **favoritos**,
  **pedir de novo** em 1 toque, **avaliação** pós-entrega e **canal de suporte**.

### 🛠️ Gestor (painel, acesso por senha)
- **Painel**: faturamento, ticket médio, mais vendidos, horário de pico, hoje × ontem,
  fila atual e vendas por forma de pagamento.
- **Pedidos em tempo real**: fila por status; “confirmar saída para entrega” avisa o
  cliente; destaque para atrasados.
- **Estoque**: marca item como esgotado/disponível em 1 toque (reflete na hora no cardápio).
- **Financeiro**: faturamento por dia/semana/mês, por PIX/cartão/dinheiro, **app × local**,
  exportação **PDF/CSV**.
- **Caixa**: **sangria** (retirada com valor/hora/motivo) e **consumo local** (lançamento
  presencial), para o caixa fechar batendo com o dia inteiro (app + balcão).
- **Mensagens**: central de suporte com resposta ao cliente.
- **Configurações**: nome, horário de funcionamento, fidelidade, taxas por bairro,
  mensagem de atraso, promoção do dia e senha do painel.

## 🚀 Como rodar

```bash
npm install
npm run dev      # desenvolvimento (http://localhost:5173)
npm run build    # build de produção em /dist
npm run preview  # pré-visualização do build
```

## 👤 Acessos

- **Cliente:** basta navegar. O login (nome + telefone) só é pedido ao finalizar o pedido.
- **Gestor:** menu **Conta → “Sou o dono”** ou acesse `/gestor`. Senha padrão de
  demonstração: **`123456`** (altere em Configurações).

## 📲 PWA e Notificações

O app é um **PWA instalável** que roda em **modo standalone** (tela cheia). Ao abrir sem
estar instalado, uma tela guia a instalação por plataforma.

- **Manifest** (`display: standalone`, ícones 192/512 `any`+`maskable`, `shortcuts`) é
  gerado pelo `vite-plugin-pwa` a partir do `vite.config.js`.
- **Service Worker** customizado (`src/sw.js`, estratégia `injectManifest`): precache
  offline (Workbox) e tratamento de `push`, `notificationclick` e mensagens da página.

| Modo | Precisa de servidor? | O que faz |
|---|---|---|
| **Locais** (ativo) | Não | O `NotificationEngine` observa os pedidos e dispara notificações do SO: mudança de status pro cliente (com destaque em “saiu para entrega”), aviso de atraso e **novo pedido** pro gestor. |
| **Web Push** (scaffolding) | Sim | Assina o navegador com a chave **VAPID** e o `push` handler no SW exibe a notificação enviada pelo servidor — funciona com o app fechado / em outro aparelho. |

Para Web Push real: gere as chaves com `node scripts/gen-vapid.mjs`, coloque a pública em
`VAPID_PUBLIC_KEY` (`src/lib/notifications.js`), guarde a privada no backend e envie os
avisos (ex.: Supabase Edge Function com `web-push`) usando as `PushSubscription`.

## 🎨 Tecnologia e dados

- **React + Vite + Tailwind CSS**, **Recharts** para gráficos, **PWA** offline-first.
- **Camada de dados local** (`localStorage`) via `DataContext` — funciona 100% sem
  backend. Catálogo, pedidos, clientes, caixa e mensagens seguem um formato relacional,
  facilitando a migração futura para o **Supabase**: basta trocar `addTo/patch/remove/
  placeOrder/...` por chamadas ao cliente Supabase, mantendo a forma dos objetos de
  `src/lib/seed.js`. As métricas (`financeMetrics`, `itemRanking`, `peakHours`) seguem iguais.
- **Auditável:** cada pedido guarda `code`, itens (com preço/escolhas no momento),
  `timeline` de status e forma de pagamento; sangrias e consumo local ficam registrados —
  o número do dashboard reflete o que aconteceu.

## 📁 Estrutura

```
src/
├── components/       # UI (ClientLayout, ManagerLayout, ItemBuilder, FoodUI, ui, Icons)
├── context/          # Data (store), Auth (guest/cliente/gestor), Cart, Theme, Toast, PWA
├── lib/              # utils, orders (regras de status/montagem), seed (catálogo), reports
├── pages/
│   ├── client/       # Menu, Cart, Checkout, OrderTracking, Orders, Account
│   └── manager/      # Dashboard, OrdersBoard, Stock, Finance, CashBox, Messages, Settings
├── App.jsx           # rotas (loja × painel) e gate do gestor
└── main.jsx          # bootstrap + providers
```

---

Feito para instalar no celular do cliente e no tablet do balcão. 🍢🔥
