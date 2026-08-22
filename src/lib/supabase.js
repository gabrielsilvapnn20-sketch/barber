import { createClient } from '@supabase/supabase-js'

// Credenciais PÚBLICAS do projeto Supabase (a "publishable key" é feita para
// ficar no cliente). Podem ser sobrescritas por variáveis de ambiente do Vite.
const URL = import.meta.env.VITE_SUPABASE_URL || 'https://szkcfgzugprqbjwarbib.supabase.co'
const KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_xhDXgmQurw2hAyyUc9Ej7w_yzhVat37'

// Todas as instalações compartilham o mesmo "documento" da barbearia.
export const SHOP_ID = import.meta.env.VITE_SHOP_ID || 'main'
export const TABLE = 'app_state'

export const supabaseEnabled = !!(URL && KEY)

export const supabase = supabaseEnabled
  ? createClient(URL, KEY, {
      auth: { persistSession: false },
      realtime: { params: { eventsPerSecond: 5 } },
    })
  : null
