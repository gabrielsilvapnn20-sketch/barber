// Gera um par de chaves VAPID (P-256) para Web Push, sem dependências externas.
// Uso: node scripts/gen-vapid.mjs
// A chave PÚBLICA vai no cliente (applicationServerKey). A PRIVADA fica no
// servidor (ex.: Supabase Edge Function) como variável de ambiente — nunca no repo.
import crypto from 'crypto'

const b64url = (buf) => Buffer.from(buf).toString('base64url')
const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
const pub = publicKey.export({ format: 'jwk' })
const prv = privateKey.export({ format: 'jwk' })

// applicationServerKey = 0x04 || X || Y  (ponto não comprimido, 65 bytes)
const uncompressed = Buffer.concat([
  Buffer.from([0x04]),
  Buffer.from(pub.x, 'base64url'),
  Buffer.from(pub.y, 'base64url'),
])

console.log('VAPID_PUBLIC_KEY =', b64url(uncompressed))
console.log('VAPID_PRIVATE_KEY=', prv.d)
