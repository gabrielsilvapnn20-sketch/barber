import { supabase, supabaseEnabled, SHOP_ID, TABLE } from './supabase.js'

// Coleções do "db" que são listas (o resto vira settings/objeto)
export const ARRAY_KEYS = [
  'users',
  'categories',
  'services',
  'clients',
  'transactions',
  'appointments',
  'queue',
  'expenses',
  'goals',
  'cashSessions',
  'daysOff',
  'gallery',
  'packages',
  'cashMovements',
  'commissionPayments',
]

// União de listas por id — itens de "incoming" vencem em caso de mesmo id;
// itens que só existem em "base" são preservados. Isso garante que registros
// novos de aparelhos diferentes (lançamentos, despesas, etc.) nunca se percam.
function mergeArray(base = [], incoming = []) {
  const map = new Map()
  for (const it of base) if (it && it.id) map.set(it.id, it)
  for (const it of incoming) if (it && it.id) map.set(it.id, it)
  return [...map.values()]
}

export function mergeDb(base = {}, incoming = {}) {
  const out = { ...base }
  for (const k of ARRAY_KEYS) out[k] = mergeArray(base[k], incoming[k])
  out.settings = { ...(base.settings || {}), ...(incoming.settings || {}) }
  return out
}

export async function fetchRemote() {
  const { data, error } = await supabase.from(TABLE).select('data').eq('id', SHOP_ID).maybeSingle()
  if (error) throw error
  return data?.data || null
}

export async function pushRemote(dataObj) {
  const { error } = await supabase
    .from(TABLE)
    .upsert({ id: SHOP_ID, data: dataObj, updated_at: new Date().toISOString() })
  if (error) throw error
}

export function subscribeRemote(onChange) {
  const ch = supabase
    .channel(`app_state_${SHOP_ID}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: TABLE, filter: `id=eq.${SHOP_ID}` },
      (payload) => {
        const d = payload.new?.data
        if (d) onChange(d)
      },
    )
    .subscribe()
  return () => {
    try {
      supabase.removeChannel(ch)
    } catch {
      /* ignore */
    }
  }
}

export { supabaseEnabled }
