import { useMemo, useState, useRef } from 'react'
import { useData } from '../context/DataContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { PageHeader, Modal, Field, EmptyState, Avatar } from '../components/ui.jsx'
import Icon from '../components/Icons.jsx'
import { fmtDate } from '../lib/utils.js'

// Resize + compress an image file to a small data URL for localStorage
function fileToDataURL(file, max = 720) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = img.width * scale
        canvas.height = img.height * scale
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.72))
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

export default function Galeria() {
  const { db, addTo, remove } = useData()
  const { user, isOwner } = useAuth()
  const toast = useToast()
  const [modal, setModal] = useState(false)
  const [preview, setPreview] = useState(null)

  const items = useMemo(() => {
    let list = db.gallery
    if (!isOwner) list = list.filter((g) => g.barberId === user.id)
    return list.sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [db.gallery, isOwner, user.id])

  return (
    <div>
      <PageHeader
        title="Portfólio"
        subtitle="Galeria antes/depois dos seus cortes"
        action={<button className="btn-primary" onClick={() => setModal(true)}><Icon.plus size={18} /> Adicionar</button>}
      />

      {items.length === 0 ? (
        <EmptyState icon={<Icon.camera size={40} />} title="Nenhuma foto ainda"
          subtitle="Registre o antes e depois dos seus atendimentos para montar seu portfólio."
          action={<button className="btn-primary" onClick={() => setModal(true)}><Icon.camera size={16} /> Adicionar foto</button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((g) => {
            const barber = db.users.find((u) => u.id === g.barberId)
            return (
              <div key={g.id} className="card overflow-hidden !p-0">
                <div className="grid grid-cols-2 gap-0.5 bg-slate-200 dark:bg-slate-800">
                  <BeforeAfter src={g.before} label="Antes" onClick={() => g.before && setPreview(g.before)} />
                  <BeforeAfter src={g.after} label="Depois" onClick={() => g.after && setPreview(g.after)} />
                </div>
                <div className="p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{g.clientName || 'Cliente'}</p>
                    <button onClick={() => { remove('gallery', g.id); toast.info('Foto removida.') }} className="text-slate-400 hover:text-red-500"><Icon.trash size={15} /></button>
                  </div>
                  {g.note && <p className="text-xs text-slate-400">{g.note}</p>}
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
                    <Avatar name={barber?.name} color={barber?.color} size={16} />
                    {barber?.name?.split(' ')[0]} · {fmtDate(g.date)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <GalleryModal open={modal} onClose={() => setModal(false)} db={db}
        onSave={(data) => { addTo('gallery', { ...data, barberId: user.id, date: new Date().toISOString() }); toast.success('Foto adicionada!'); setModal(false) }} />

      {/* Image lightbox */}
      {preview && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4" onClick={() => setPreview(null)}>
          <img src={preview} alt="" className="max-h-[90vh] max-w-full rounded-xl object-contain" />
        </div>
      )}
    </div>
  )
}

function BeforeAfter({ src, label, onClick }) {
  return (
    <div className="relative aspect-square bg-slate-100 dark:bg-slate-900" onClick={onClick}>
      {src ? (
        <img src={src} alt={label} className="h-full w-full cursor-pointer object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-slate-300 dark:text-slate-600">
          <Icon.camera size={28} />
        </div>
      )}
      <span className="absolute left-1.5 top-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">{label}</span>
    </div>
  )
}

function GalleryModal({ open, onClose, onSave, db }) {
  const [form, setForm] = useState({ clientName: '', note: '', before: '', after: '' })
  const [loading, setLoading] = useState(false)
  const beforeRef = useRef()
  const afterRef = useRef()
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const pick = async (which, file) => {
    if (!file) return
    setLoading(true)
    const url = await fileToDataURL(file)
    set(which, url)
    setLoading(false)
  }

  const reset = () => setForm({ clientName: '', note: '', before: '', after: '' })

  return (
    <Modal open={open} onClose={() => { reset(); onClose() }} title="Adicionar antes/depois"
      footer={<><button className="btn-ghost" onClick={() => { reset(); onClose() }}>Cancelar</button><button className="btn-primary" disabled={loading} onClick={() => { onSave(form); reset() }}>Salvar</button></>}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {[['before', 'Antes', beforeRef], ['after', 'Depois', afterRef]].map(([key, label, ref]) => (
            <div key={key}>
              <label className="label">{label}</label>
              <button onClick={() => ref.current?.click()} className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700">
                {form[key] ? <img src={form[key]} alt="" className="h-full w-full object-cover" /> : <Icon.camera size={28} className="text-slate-400" />}
              </button>
              <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => pick(key, e.target.files[0])} />
            </div>
          ))}
        </div>
        <Field label="Cliente">
          <input className="input" list="gal-clients" value={form.clientName} onChange={(e) => set('clientName', e.target.value)} placeholder="Nome do cliente" />
          <datalist id="gal-clients">
            {db.clients.map((c) => <option key={c.id} value={c.name} />)}
          </datalist>
        </Field>
        <Field label="Descrição"><input className="input" value={form.note} onChange={(e) => set('note', e.target.value)} placeholder="Ex: Degradê + barba" /></Field>
        {loading && <p className="text-xs text-brand-500">Processando imagem...</p>}
      </div>
    </Modal>
  )
}
