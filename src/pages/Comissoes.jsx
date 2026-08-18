import { useState, useEffect } from 'react'
import { useData } from '../context/DataContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { PageHeader, Modal, Field, Segmented } from '../components/ui.jsx'
import Icon from '../components/Icons.jsx'
import { brl, uid } from '../lib/utils.js'

export default function Comissoes() {
  const { db, addTo, patch, remove, setDb } = useData()
  const toast = useToast()
  const [tab, setTab] = useState('categorias')
  const [catModal, setCatModal] = useState(null)
  const [srvModal, setSrvModal] = useState(null)
  // filtros da aba Serviços
  const [fType, setFType] = useState('all') // all | service | product
  const [fCat, setFCat] = useState('')
  const [fSearch, setFSearch] = useState('')
  const [fStatus, setFStatus] = useState('all') // all | active | inactive

  const catType = (id) => db.categories.find((c) => c.id === id)?.type || 'service'
  const filteredServices = db.services.filter((s) => {
    if (fType !== 'all' && catType(s.categoryId) !== fType) return false
    if (fCat && s.categoryId !== fCat) return false
    if (fStatus === 'active' && !s.active) return false
    if (fStatus === 'inactive' && s.active) return false
    if (fSearch.trim() && !s.name.toLowerCase().includes(fSearch.trim().toLowerCase())) return false
    return true
  })
  const catsForFilter = db.categories.filter((c) => fType === 'all' || c.type === fType)

  const saveCat = (form) => {
    if (catModal === 'new') { addTo('categories', { id: uid('cat'), ...form, barberPct: Number(form.barberPct) }); toast.success('Categoria criada!') }
    else { patch('categories', catModal.id, { ...form, barberPct: Number(form.barberPct) }); toast.success('Categoria atualizada.') }
    setCatModal(null)
  }
  const saveSrv = (form) => {
    const payload = { ...form, price: Number(form.price), active: true, allowedBarberIds: form.allowedBarberIds || [] }
    if (srvModal === 'new') { addTo('services', { id: uid('srv'), ...payload }); toast.success('Serviço criado!') }
    else { patch('services', srvModal.id, payload); toast.success('Serviço atualizado.') }
    setSrvModal(null)
  }

  const setPct = (catId, val) => patch('categories', catId, { barberPct: Number(val) })

  return (
    <div>
      <PageHeader
        title="Comissões & Serviços"
        subtitle="Configure categorias, porcentagens e preços"
        action={
          <Segmented value={tab} onChange={setTab} options={[
            { value: 'categorias', label: 'Categorias' },
            { value: 'servicos', label: 'Serviços' },
          ]} />
        }
      />

      {tab === 'categorias' ? (
        <>
          <div className="mb-4 flex justify-end">
            <button className="btn-primary" onClick={() => setCatModal('new')}><Icon.plus size={18} /> Nova categoria</button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {db.categories.map((c) => (
              <div key={c.id} className="card">
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold">{c.name}</p>
                      <span className={`badge ${c.type === 'product' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300'}`}>
                        {c.type === 'product' ? 'Produto' : 'Serviço'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {db.services.filter((s) => s.categoryId === c.id).length} item(ns)
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setCatModal(c)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><Icon.edit size={16} /></button>
                    <button onClick={() => { if (db.services.some((s) => s.categoryId === c.id)) return toast.error('Remova os serviços desta categoria primeiro.'); remove('categories', c.id); toast.info('Categoria removida.') }} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><Icon.trash size={16} /></button>
                  </div>
                </div>

                {/* Split slider */}
                <div className="mt-3">
                  <div className="mb-1.5 flex justify-between text-xs font-semibold">
                    <span className="text-emerald-500">Barbeiro {c.barberPct}%</span>
                    <span className="text-brand-500">Barbearia {100 - c.barberPct}%</span>
                  </div>
                  <input
                    type="range" min="0" max="100" step="5" value={c.barberPct}
                    onChange={(e) => setPct(c.id, e.target.value)}
                    className="w-full accent-emerald-500"
                  />
                  <div className="mt-1 flex h-2 overflow-hidden rounded-full">
                    <div className="bg-emerald-500" style={{ width: `${c.barberPct}%` }} />
                    <div className="bg-brand-500" style={{ width: `${100 - c.barberPct}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Filtros */}
          <div className="card mb-4 space-y-3">
            <div className="flex items-center gap-2">
              <Icon.search size={16} />
              <input
                className="w-full bg-transparent text-sm outline-none"
                placeholder="Buscar serviço ou produto..."
                value={fSearch}
                onChange={(e) => setFSearch(e.target.value)}
              />
              <button className="btn-primary !py-2" onClick={() => setSrvModal('new')}><Icon.plus size={16} /> Novo</button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Segmented
                value={fType}
                onChange={(v) => { setFType(v); setFCat('') }}
                options={[
                  { value: 'all', label: 'Todos' },
                  { value: 'service', label: 'Serviços' },
                  { value: 'product', label: 'Produtos' },
                ]}
              />
              <select className="input !w-auto !py-2 text-sm" value={fCat} onChange={(e) => setFCat(e.target.value)}>
                <option value="">Todas categorias</option>
                {catsForFilter.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <Segmented
                value={fStatus}
                onChange={setFStatus}
                options={[
                  { value: 'all', label: 'Todos' },
                  { value: 'active', label: 'Ativos' },
                  { value: 'inactive', label: 'Inativos' },
                ]}
              />
              {(fType !== 'all' || fCat || fSearch || fStatus !== 'all') && (
                <button onClick={() => { setFType('all'); setFCat(''); setFSearch(''); setFStatus('all') }} className="text-xs font-semibold text-slate-400 hover:text-brand-500">
                  Limpar filtros
                </button>
              )}
            </div>
          </div>

          <div className="card">
            <p className="mb-2 text-xs text-slate-400">{filteredServices.length} item(ns)</p>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredServices.map((s) => {
                const cat = db.categories.find((c) => c.id === s.categoryId)
                return (
                  <div key={s.id} className="flex items-center gap-3 py-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${cat?.type === 'product' ? 'bg-amber-500/10 text-amber-500' : 'bg-brand-500/10 text-brand-500'}`}>
                      {cat?.type === 'product' ? <Icon.tag size={18} /> : <Icon.scissors size={18} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold">{s.name}</p>
                        {!s.active && <span className="badge bg-slate-200 text-slate-500 dark:bg-slate-700">Inativo</span>}
                      </div>
                      <p className="text-xs text-slate-400">
                        {cat?.name} · barbeiro {cat?.barberPct}%
                        {s.allowedBarberIds.length > 0 && ` · ${s.allowedBarberIds.length} barbeiro(s)`}
                      </p>
                    </div>
                    <p className="font-bold">{brl(s.price)}</p>
                    <button onClick={() => patch('services', s.id, { active: !s.active })} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" title={s.active ? 'Desativar' : 'Ativar'}>
                      {s.active ? <Icon.check size={16} /> : <Icon.close size={16} />}
                    </button>
                    <button onClick={() => setSrvModal(s)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><Icon.edit size={16} /></button>
                    <button onClick={() => { remove('services', s.id); toast.info('Serviço removido.') }} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><Icon.trash size={16} /></button>
                  </div>
                )
              })}
            </div>
            {filteredServices.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-400">Nenhum item encontrado com esses filtros.</p>
            )}
          </div>
        </>
      )}

      <CategoryModal open={!!catModal} category={catModal === 'new' ? null : catModal} onClose={() => setCatModal(null)} onSave={saveCat} />
      <ServiceModal open={!!srvModal} service={srvModal === 'new' ? null : srvModal} categories={db.categories} onClose={() => setSrvModal(null)} onSave={saveSrv} />
    </div>
  )
}

function CategoryModal({ open, category, onClose, onSave }) {
  const [form, setForm] = useState({ name: '', type: 'service', barberPct: 50 })
  useEffect(() => {
    if (!open) return
    if (category) setForm({ name: category.name, type: category.type, barberPct: category.barberPct })
    else setForm({ name: '', type: 'service', barberPct: 50 })
  }, [category, open])
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <Modal open={open} onClose={onClose} title={category ? 'Editar categoria' : 'Nova categoria'}
      footer={<><button className="btn-ghost" onClick={onClose}>Cancelar</button><button className="btn-primary" onClick={() => form.name && onSave(form)}>Salvar</button></>}>
      <div className="space-y-3">
        <Field label="Nome"><input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ex: Corte de cabelo" /></Field>
        <Field label="Tipo">
          <div className="flex gap-2">
            {[{ v: 'service', l: 'Serviço' }, { v: 'product', l: 'Produto' }].map((t) => (
              <button key={t.v} onClick={() => set('type', t.v)}
                className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold ${form.type === t.v ? 'border-brand-500 bg-brand-500/10 text-brand-600 dark:text-brand-300' : 'border-slate-200 dark:border-slate-700'}`}>
                {t.l}
              </button>
            ))}
          </div>
        </Field>
        <Field label={`Comissão do barbeiro: ${form.barberPct}%`}>
          <input type="range" min="0" max="100" step="5" value={form.barberPct} onChange={(e) => set('barberPct', e.target.value)} className="w-full accent-emerald-500" />
          <div className="mt-1 flex justify-between text-xs text-slate-400">
            <span>Barbeiro {form.barberPct}%</span>
            <span>Barbearia {100 - form.barberPct}%</span>
          </div>
        </Field>
      </div>
    </Modal>
  )
}

function ServiceModal({ open, service, categories, onClose, onSave }) {
  const [form, setForm] = useState({ name: '', categoryId: '', price: '' })
  useEffect(() => {
    if (!open) return
    if (service) setForm({ name: service.name, categoryId: service.categoryId, price: service.price, allowedBarberIds: service.allowedBarberIds })
    else setForm({ name: '', categoryId: categories[0]?.id || '', price: '' })
  }, [service, open])
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <Modal open={open} onClose={onClose} title={service ? 'Editar serviço' : 'Novo serviço'}
      footer={<><button className="btn-ghost" onClick={onClose}>Cancelar</button><button className="btn-primary" onClick={() => form.name && form.categoryId && form.price && onSave(form)}>Salvar</button></>}>
      <div className="space-y-3">
        <Field label="Nome"><input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ex: Corte masculino" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoria">
            <select className="input" value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Preço (R$)"><input type="number" step="0.01" className="input" value={form.price} onChange={(e) => set('price', e.target.value)} /></Field>
        </div>
        <p className="text-xs text-slate-400">A liberação por barbeiro é feita na tela de Equipe.</p>
      </div>
    </Modal>
  )
}
