import { uid } from './utils.js'

// Versão do catálogo. Ao incrementar, a migração (ver DataContext) reaplica o
// catálogo aos aparelhos que já têm o app instalado, sem apagar os pedidos.
export const CATALOG_VERSION = 1

/* ------------------------------------------------------------------ *
 * CATÁLOGO — estrutura genérica, orientada a dados (não "hardcoded").
 *
 * Cada item declara COMO é montado, via `build`:
 *   - 'simple'   → só quantidade (espeto avulso, bebida)
 *   - 'assembly' → etapas de escolha (`steps`) + acompanhamentos fixos
 *                  (`includes`). Ex.: Jantinha, Completo.
 *   - 'soup'     → escolha de sabor com opção de misturar dois (`flavors`,
 *                  `allowMix`) + adicionais (`addons`). Ex.: Caldos.
 *
 * Essa mesma estrutura serve para replicar depois em lanchonete/pizzaria:
 * basta trocar categorias, itens e regras — o fluxo do app lê tudo isto.
 * ------------------------------------------------------------------ */

// Lista base de espetos — vira tanto os "espetos avulsos" quanto as opções de
// escolha das etapas da Jantinha e do Completo (mantém tudo em sincronia).
const ESPETOS = [
  { id: 'frango_bacon', label: 'Frango com bacon', price: 10 },
  { id: 'contra_file', label: 'Contra filé', price: 12 },
  { id: 'cupim', label: 'Cupim', price: 12 },
  { id: 'asinha', label: 'Asinha', price: 9 },
  { id: 'coracao', label: 'Coração', price: 9 },
  { id: 'provolone', label: 'Queijo provolone', price: 10 },
]

const espetoOptions = ESPETOS.map((e) => ({ id: e.id, label: e.label }))

export function buildCatalog() {
  const categories = [
    { id: 'cat_espetos', name: 'Espetos avulsos', emoji: '🍢', order: 1, desc: 'No capricho, feito na brasa' },
    { id: 'cat_jantinha', name: 'Jantinha completa', emoji: '🍛', order: 2, desc: 'A refeição completa da casa' },
    { id: 'cat_completo', name: 'Completo', emoji: '🍽️', order: 3, desc: 'Versão reduzida da jantinha' },
    { id: 'cat_caldos', name: 'Caldos', emoji: '🍲', order: 4, desc: 'Quentinho, pode misturar sabores' },
    { id: 'cat_bebidas', name: 'Bebidas', emoji: '🥤', order: 5, desc: 'Geladas pra acompanhar' },
  ]

  // Espetos avulsos (build simple, um item por espeto)
  const espetos = ESPETOS.map((e) => ({
    id: `it_esp_${e.id}`,
    categoryId: 'cat_espetos',
    name: e.label,
    desc: 'Espeto na brasa, no ponto certo.',
    price: e.price,
    emoji: '🍢',
    photo: '',
    available: true,
    build: 'simple',
  }))

  const items = [
    ...espetos,

    // Jantinha completa (assembly): escolhe espeto + feijão; acompanha fixo.
    {
      id: 'it_jantinha',
      categoryId: 'cat_jantinha',
      name: 'Jantinha completa',
      desc: 'Espeto à sua escolha + feijão, arroz, purê, bolinho de milho, salada e mandioca.',
      price: 25,
      emoji: '🍛',
      photo: '',
      available: true,
      build: 'assembly',
      steps: [
        { id: 'espeto', label: 'Escolha o espeto', required: true, multi: false, options: espetoOptions },
        {
          id: 'feijao',
          label: 'Tipo de feijão',
          required: true,
          multi: false,
          options: [
            { id: 'tropeiro', label: 'Feijão tropeiro' },
            { id: 'caldo', label: 'Feijão de caldo' },
          ],
        },
      ],
      includes: ['Arroz', 'Purê', 'Bolinho de milho', 'Salada (alface e tomate)', 'Mandioca'],
    },

    // Completo (assembly): escolhe espeto; acompanha fixo (reduzido).
    {
      id: 'it_completo',
      categoryId: 'cat_completo',
      name: 'Completo',
      desc: 'Espeto à sua escolha + feijão tropeiro, mandioca e tomate.',
      price: 18,
      emoji: '🍽️',
      photo: '',
      available: true,
      build: 'assembly',
      steps: [
        { id: 'espeto', label: 'Escolha o espeto', required: true, multi: false, options: espetoOptions },
      ],
      includes: ['Feijão tropeiro', 'Mandioca', 'Tomate'],
    },

    // Caldos (soup): escolhe sabor, pode misturar dois; adicionais inclusos.
    {
      id: 'it_caldo',
      categoryId: 'cat_caldos',
      name: 'Caldo',
      desc: 'Servido quentinho. Pode pedir dois sabores na mesma tigela.',
      price: 15,
      emoji: '🍲',
      photo: '',
      available: true,
      build: 'soup',
      flavors: [
        { id: 'frango', label: 'Frango' },
        { id: 'feijao', label: 'Feijão' },
        { id: 'costela', label: 'Costela' },
      ],
      allowMix: true,
      addons: [
        { id: 'queijo', label: 'Queijo', price: 0 },
        { id: 'cebolinha', label: 'Cebolinha', price: 0 },
      ],
    },

    // Bebidas (simple)
    bev('it_coca_lata', 'Coca-Cola lata', 6),
    bev('it_guamin_lata', 'Guaraná Mineiro lata', 5),
    bev('it_fanta_lata', 'Fanta lata', 6),
    bev('it_guaant_lata', 'Guaraná Antarctica lata', 6),
    bev('it_coca_2l', 'Coca-Cola 2 litros', 14),
    bev('it_guamin_2l', 'Guaraná Mineiro 2 litros', 12),
    bev('it_suco_laranja', 'Suco de laranja 500ml', 8),
  ]

  return { categories, items }
}

function bev(id, name, price) {
  return {
    id,
    categoryId: 'cat_bebidas',
    name,
    desc: 'Gelada.',
    price,
    emoji: '🥤',
    photo: '',
    available: true,
    build: 'simple',
  }
}

export function defaultSettings() {
  return {
    shopName: 'Lanchonete Rodrigues',
    tagline: 'Espetinho & Jantinha',
    managerPassword: '123456',
    catalogVersion: CATALOG_VERSION,
    // Fidelidade
    loyalty: { everyN: 5, rewardLabel: '1 espeto grátis' },
    // Horário de funcionamento (days: 0=Dom ... 6=Sáb)
    hours: { open: '18:00', close: '23:30', days: [0, 2, 3, 4, 5, 6] },
    // Entrega
    delivery: {
      pickup: true,
      etaDefaultMin: 40,
      zones: [
        { id: 'z1', name: 'Centro', fee: 5, etaMin: 30 },
        { id: 'z2', name: 'Bairro Alto', fee: 7, etaMin: 40 },
        { id: 'z3', name: 'Zona Rural / Sítios', fee: 12, etaMin: 55 },
      ],
    },
    // Mensagem automática de atraso
    delayNotice: {
      minutesOver: 15,
      text: 'Seu pedido está a caminho, agradecemos a paciência! 🙏',
    },
    // Promoção do dia (configurável)
    promoOfDay: { active: true, text: 'Terça é dia de caldo com desconto especial! 🍲' },
    payments: ['pix', 'cartao', 'dinheiro'],
  }
}

// Dados de demonstração para os dashboards não nascerem vazios.
export function buildSeed() {
  const { categories, items } = buildCatalog()
  const now = new Date()
  const at = (dayOffset, h, m = 0) => {
    const d = new Date(now)
    d.setDate(d.getDate() - dayOffset)
    d.setHours(h, m, 0, 0)
    return d.toISOString()
  }

  const customers = [
    { id: 'cus_ana', name: 'Ana Paula', phone: '(34) 99999-1001', birthday: '1994-08-13', addresses: [{ id: 'ad1', label: 'Casa', zoneId: 'z1', street: 'Rua das Flores, 120', ref: 'Portão azul' }], favorites: ['it_jantinha'], loyaltyCount: 3, points: 3 },
    { id: 'cus_joao', name: 'João Marcos', phone: '(34) 99999-1002', birthday: '1988-02-20', addresses: [{ id: 'ad2', label: 'Casa', zoneId: 'z2', street: 'Av. Central, 45', ref: '' }], favorites: [], loyaltyCount: 1, points: 6 },
  ]

  const mkOrder = (o) => {
    const subtotal = o.items.reduce((s, i) => s + i.lineTotal, 0)
    const deliveryFee = o.type === 'pickup' ? 0 : (o.deliveryFee ?? 0)
    return {
      id: uid('ord'),
      code: o.code,
      customerId: o.customerId || null,
      customerName: o.customerName,
      phone: o.phone || '',
      source: o.source || 'app', // 'app' | 'local'
      type: o.type || 'delivery', // 'delivery' | 'pickup'
      address: o.address || null,
      zoneId: o.zoneId || null,
      items: o.items,
      subtotal,
      deliveryFee,
      discount: o.discount || 0,
      total: +(subtotal + deliveryFee - (o.discount || 0)).toFixed(2),
      payment: o.payment || { method: 'pix', changeFor: null },
      status: o.status || 'novo',
      etaMin: o.etaMin ?? 40,
      timeline: o.timeline,
      rating: o.rating || null,
      createdAt: o.createdAt,
      notes: o.notes || '',
    }
  }

  const line = (item, qty, opts = {}) => ({
    uid: uid('li'),
    itemId: item,
    name: opts.name,
    unitPrice: opts.unitPrice,
    qty,
    lineTotal: +(opts.unitPrice * qty).toFixed(2),
    selections: opts.selections || null,
    summary: opts.summary || '',
  })

  const tl = (created, stages) => stages.map((s, i) => ({ status: s, at: created }))

  const orders = [
    mkOrder({
      code: 'R-1042', customerId: 'cus_ana', customerName: 'Ana Paula', phone: '(34) 99999-1001',
      type: 'delivery', zoneId: 'z1', deliveryFee: 5,
      address: { street: 'Rua das Flores, 120', ref: 'Portão azul', zoneId: 'z1' },
      items: [
        line('it_jantinha', 1, { name: 'Jantinha completa', unitPrice: 25, summary: 'Cupim · Feijão tropeiro' }),
        line('it_coca_lata', 2, { name: 'Coca-Cola lata', unitPrice: 6 }),
      ],
      payment: { method: 'pix', changeFor: null }, status: 'entregue', etaMin: 35,
      createdAt: at(0, 19, 10),
      timeline: [
        { status: 'novo', at: at(0, 19, 10) },
        { status: 'preparo', at: at(0, 19, 16) },
        { status: 'entrega', at: at(0, 19, 34) },
        { status: 'entregue', at: at(0, 19, 52) },
      ],
      rating: { stars: 5, comment: 'Chegou quentinho!' },
    }),
    mkOrder({
      code: 'R-1043', customerId: 'cus_joao', customerName: 'João Marcos', phone: '(34) 99999-1002',
      type: 'delivery', zoneId: 'z2', deliveryFee: 7,
      address: { street: 'Av. Central, 45', ref: '', zoneId: 'z2' },
      items: [
        line('it_completo', 2, { name: 'Completo', unitPrice: 18, summary: 'Asinha' }),
        line('it_caldo', 1, { name: 'Caldo', unitPrice: 15, summary: 'Frango + Costela · Queijo' }),
      ],
      payment: { method: 'dinheiro', changeFor: 100 }, status: 'preparo', etaMin: 45,
      createdAt: at(0, 20, 5),
      timeline: [
        { status: 'novo', at: at(0, 20, 5) },
        { status: 'preparo', at: at(0, 20, 9) },
      ],
    }),
    // Alguns pedidos de dias anteriores para o financeiro/ranking
    mkOrder({
      code: 'R-1030', customerName: 'Balcão', source: 'local', type: 'pickup',
      items: [line('it_esp_contra_file', 4, { name: 'Contra filé', unitPrice: 12 })],
      payment: { method: 'dinheiro', changeFor: null }, status: 'entregue', etaMin: 0,
      createdAt: at(1, 20, 30), timeline: [{ status: 'novo', at: at(1, 20, 30) }, { status: 'entregue', at: at(1, 20, 40) }],
    }),
    mkOrder({
      code: 'R-1031', customerName: 'Carlos', type: 'delivery', zoneId: 'z1', deliveryFee: 5,
      address: { street: 'Rua 7, 88', ref: '', zoneId: 'z1' },
      items: [line('it_jantinha', 2, { name: 'Jantinha completa', unitPrice: 25, summary: 'Frango com bacon · Feijão de caldo' })],
      payment: { method: 'cartao', changeFor: null }, status: 'entregue', etaMin: 40,
      createdAt: at(2, 19, 50), timeline: [{ status: 'novo', at: at(2, 19, 50) }, { status: 'entregue', at: at(2, 20, 40) }],
      rating: { stars: 4, comment: '' },
    }),
    mkOrder({
      code: 'R-1032', customerName: 'Balcão', source: 'local', type: 'pickup',
      items: [line('it_caldo', 3, { name: 'Caldo', unitPrice: 15, summary: 'Costela' })],
      payment: { method: 'pix', changeFor: null }, status: 'entregue', etaMin: 0,
      createdAt: at(3, 21, 10), timeline: [{ status: 'novo', at: at(3, 21, 10) }, { status: 'entregue', at: at(3, 21, 20) }],
    }),
  ]

  const cashMovements = [
    { id: uid('sng'), type: 'sangria', amount: 50, reason: 'Troco', at: at(0, 21, 0) },
  ]

  const messages = [
    { id: uid('msg'), customerId: 'cus_ana', name: 'Ana Paula', text: 'Vocês têm espeto de linguiça hoje?', from: 'customer', at: at(0, 18, 55), read: false },
  ]

  return {
    categories,
    items,
    customers,
    orders,
    cashMovements,
    messages,
    settings: defaultSettings(),
    seq: 1044, // próximo número de pedido (código R-####)
  }
}
