import { uid } from './utils.js'

// Build seed data. Dates are computed relative to "now" so the dashboards
// always show meaningful numbers on first run.
export function buildSeed() {
  const now = new Date()
  const daysAgo = (n, h = 10, m = 0) => {
    const d = new Date(now)
    d.setDate(d.getDate() - n)
    d.setHours(h, m, 0, 0)
    return d.toISOString()
  }
  const inHours = (h) => {
    const d = new Date(now)
    d.setHours(now.getHours() + h, 0, 0, 0)
    return d.toISOString()
  }

  const users = buildTeam()

  // Catálogo real de serviços (categorias + serviços)
  const { categories, services } = buildCatalog()

  const clients = [
    { id: 'cli_1', name: 'João Pedro', phone: '(11) 98888-1111', birthday: '1990-08-12', barberId: 'usr_owner', notes: 'Gosta de degradê baixo' },
    { id: 'cli_2', name: 'Marcos Vinícius', phone: '(11) 98888-2222', birthday: '1985-03-25', barberId: 'usr_edu', notes: '' },
    { id: 'cli_3', name: 'Felipe Andrade', phone: '(11) 98888-3333', birthday: '1998-11-05', barberId: 'usr_edu', notes: 'Alérgico a certos produtos' },
    { id: 'cli_4', name: 'Lucas Ferreira', phone: '(11) 98888-4444', birthday: '1992-08-08', barberId: 'usr_owner', notes: '' },
    { id: 'cli_5', name: 'Gabriel Rocha', phone: '(11) 98888-5555', birthday: '2000-01-30', barberId: 'usr_edu', notes: 'Sempre barba + corte' },
  ]

  // Helper to build a transaction with commission snapshot
  const tx = (barberId, serviceId, clientId, when, paymentMethod = 'pix') => {
    const srv = services.find((s) => s.id === serviceId)
    const cat = categories.find((c) => c.id === srv.categoryId)
    const price = srv.price
    const barberShare = +(price * (cat.barberPct / 100)).toFixed(2)
    return {
      id: uid('tx'),
      barberId,
      serviceId,
      serviceName: srv.name,
      categoryId: cat.id,
      categoryName: cat.name,
      type: cat.type,
      clientId,
      price,
      barberPct: cat.barberPct,
      barberShare,
      shopShare: +(price - barberShare).toFixed(2),
      paymentMethod,
      date: when,
    }
  }

  const transactions = [
    // Today
    tx('usr_owner', 'srv_cabelo', 'cli_1', daysAgo(0, 9, 30)),
    tx('usr_owner', 'srv_barba', 'cli_1', daysAgo(0, 9, 45)),
    tx('usr_owner', 'srv_cabelo_barba', 'cli_4', daysAgo(0, 11, 0)),
    tx('usr_edu', 'srv_cabelo', 'cli_2', daysAgo(0, 10, 15)),
    tx('usr_edu', 'srv_sobr', 'cli_2', daysAgo(0, 10, 30)),
    tx('usr_edu', 'srv_corte_alis', 'cli_3', daysAgo(0, 13, 0)),
    tx('usr_edu', 'srv_sobr', 'cli_3', daysAgo(0, 13, 20)),
    // Yesterday
    tx('usr_owner', 'srv_cabelo', 'cli_4', daysAgo(1, 10)),
    tx('usr_edu', 'srv_barba', 'cli_5', daysAgo(1, 14)),
    tx('usr_edu', 'srv_cabelo_sobr', 'cli_5', daysAgo(1, 14, 30)),
    tx('usr_edu', 'srv_pigment', 'cli_3', daysAgo(1, 16)),
    // Earlier this month
    tx('usr_owner', 'srv_cabelo_barba', 'cli_1', daysAgo(3, 11)),
    tx('usr_owner', 'srv_cabelo', 'cli_4', daysAgo(4, 15)),
    tx('usr_edu', 'srv_alis', 'cli_2', daysAgo(5, 10)),
    tx('usr_edu', 'srv_cabelo', 'cli_2', daysAgo(6, 12)),
    tx('usr_edu', 'srv_cabelo', 'cli_3', daysAgo(7, 9)),
    tx('usr_edu', 'srv_barba', 'cli_3', daysAgo(8, 17)),
    tx('usr_owner', 'srv_corte_alis_barba', 'cli_1', daysAgo(9, 11)),
    tx('usr_edu', 'srv_cabelo_barba', 'cli_5', daysAgo(10, 13)),
    tx('usr_edu', 'srv_cabelo', 'cli_3', daysAgo(12, 16)),
  ]

  const appointments = [
    { id: uid('apt'), clientId: 'cli_1', clientName: 'João Pedro', barberId: 'usr_owner', serviceIds: ['srv_cabelo'], datetime: inHours(2), status: 'agendado', notes: '' },
    { id: uid('apt'), clientId: 'cli_2', clientName: 'Marcos Vinícius', barberId: 'usr_edu', serviceIds: ['srv_barba'], datetime: inHours(3), status: 'agendado', notes: '' },
    { id: uid('apt'), clientId: 'cli_4', clientName: 'Lucas Ferreira', barberId: 'usr_owner', serviceIds: ['srv_cabelo_barba', 'srv_sobr'], datetime: inHours(5), status: 'agendado', notes: 'Confirmar por WhatsApp' },
  ]

  const queue = [
    { id: uid('q'), clientName: 'Cliente sem agendamento', barberId: 'usr_edu', status: 'aguardando', createdAt: daysAgo(0, new Date().getHours(), 5) },
  ]

  const expenses = [
    { id: uid('exp'), description: 'Aluguel', category: 'Fixo', amount: 2500, date: daysAgo(2, 9) },
    { id: uid('exp'), description: 'Conta de luz', category: 'Utilidades', amount: 380, date: daysAgo(3, 9) },
    { id: uid('exp'), description: 'Conta de água', category: 'Utilidades', amount: 120, date: daysAgo(3, 9) },
    { id: uid('exp'), description: 'Reposição de produtos', category: 'Estoque', amount: 640, date: daysAgo(6, 9) },
  ]

  const goals = [
    { id: uid('goal'), monthKey: monthKeyFrom(now), target: 15000, label: 'Meta de faturamento' },
  ]

  const cashSessions = [
    { id: uid('cash'), date: daysAgo(0, 8), opening: 200, closing: null, status: 'aberto', openedBy: 'usr_owner', notes: '' },
  ]

  const daysOff = [
    { id: uid('off'), barberId: 'usr_edu', date: daysAgo(-3, 0), reason: 'Folga programada' },
  ]

  const gallery = [
    { id: uid('gal'), barberId: 'usr_owner', clientId: 'cli_1', clientName: 'João Pedro', note: 'Degradê + barba', before: '', after: '', date: daysAgo(3, 12) },
  ]

  const packages = [
    {
      id: uid('pkg'),
      clientId: 'cli_1',
      name: 'Pacote Mensal',
      items: [
        { serviceId: 'srv_cabelo', serviceName: 'Cabelo', qtyTotal: 4, qtyUsed: 1, unitPrice: 40, categoryId: 'cat_corte' },
        { serviceId: 'srv_barba', serviceName: 'Barba', qtyTotal: 4, qtyUsed: 2, unitPrice: 35, categoryId: 'cat_barba' },
      ],
      total: 250,
      soldBy: 'usr_owner',
      createdAt: daysAgo(6, 10),
      status: 'ativo',
    },
  ]

  return {
    users,
    categories,
    services,
    clients,
    transactions,
    appointments,
    queue,
    expenses,
    goals,
    cashSessions,
    daysOff,
    gallery,
    packages,
    cashMovements: [],
    commissionPayments: [],
    settings: {
      shopName: 'João Victor Barbershop',
      productDefaultPct: 20,
      catalogVersion: CATALOG_VERSION,
      teamVersion: TEAM_VERSION,
    },
  }
}

// Versão do catálogo. Ao incrementar, a migração aplica o catálogo novo aos
// aparelhos que já têm o app instalado (ver DataContext.migrate).
export const CATALOG_VERSION = 2

// Equipe: incrementar aplica o time abaixo a instalações já existentes.
export const TEAM_VERSION = 1

// Dono (João Victor) + um barbeiro (Eduardo). O dono também atende.
export function buildTeam() {
  return [
    {
      id: 'usr_owner',
      name: 'João Victor',
      email: 'joao@joaovictorbarber.com',
      password: '123456',
      pin: '1010',
      role: 'owner',
      phone: '(11) 99999-0001',
      active: true,
      color: '#0ea5e9',
    },
    {
      id: 'usr_edu',
      name: 'Eduardo',
      email: 'eduardo@joaovictorbarber.com',
      password: '123456',
      pin: '2020',
      role: 'barber',
      phone: '(11) 99999-0002',
      active: true,
      color: '#8b5cf6',
    },
  ]
}

// Catálogo real da barbearia (somente serviços — sem produtos por enquanto).
// Comissão do barbeiro por categoria (a barbearia fica com o restante).
export function buildCatalog() {
  const categories = [
    { id: 'cat_corte', name: 'Cortes', type: 'service', barberPct: 50 },
    { id: 'cat_barba', name: 'Barba', type: 'service', barberPct: 50 },
    { id: 'cat_sobr', name: 'Sobrancelha', type: 'service', barberPct: 50 },
    { id: 'cat_alis', name: 'Alisamento', type: 'service', barberPct: 50 },
    { id: 'cat_outros', name: 'Outros', type: 'service', barberPct: 50 },
  ]
  const svc = (id, name, categoryId, price) => ({
    id,
    name,
    categoryId,
    price,
    active: true,
    allowedBarberIds: [],
  })
  const services = [
    svc('srv_cabelo', 'Cabelo', 'cat_corte', 40),
    svc('srv_barba', 'Barba', 'cat_barba', 35),
    svc('srv_cabelo_sobr', 'Cabelo sobrancelha', 'cat_corte', 50),
    svc('srv_cabelo_barba', 'Cabelo e barba', 'cat_corte', 70),
    svc('srv_corte_alis', 'Corte com alisamento', 'cat_alis', 110),
    svc('srv_corte_alis_barba', 'Corte alisamento barba', 'cat_alis', 140),
    svc('srv_alis', 'Alisamento', 'cat_alis', 80),
    svc('srv_sobr', 'Sobrancelha', 'cat_sobr', 10),
    svc('srv_pigment', 'Pigmentação', 'cat_outros', 25),
  ]
  return { categories, services }
}

function monthKeyFrom(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
