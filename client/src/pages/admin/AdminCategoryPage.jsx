import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import {
  fetchAdminCategories,
  createAdminCategory,
  updateAdminCategory,
  deleteAdminCategory,
} from '../../services/admin.service.js'

function PlusIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
    </svg>
  )
}

function ChevronIcon({ open }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
      style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

function CategoryForm({ initialName = '', initialParentId = '', categories = [], onSave, onCancel, isSubcat = false }) {
  const [name, setName]       = useState(initialName)
  const [parentId, setParentId] = useState(initialParentId)
  const [saving, setSaving]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      await onSave(name.trim(), isSubcat ? parentId || null : null)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="catForm" onSubmit={handleSubmit}>
      <input
        className="formInput"
        type="text"
        placeholder={isSubcat ? 'Subcategory name' : 'Category name'}
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
        required
      />
      {isSubcat && (
        <select
          className="formInput"
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
          required
        >
          <option value="">— Select parent category —</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      )}
      <div className="catForm__actions">
        <button type="submit" className="btn btn--primary" disabled={saving || !name.trim()}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}

export function AdminCategoryPage() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading]       = useState(true)
  const [expanded, setExpanded]     = useState({})

  const [addingRoot, setAddingRoot]       = useState(false)
  const [addingSubFor, setAddingSubFor]   = useState(null)
  const [editingId, setEditingId]         = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchAdminCategories()
      setCategories(data.categories || [])
    } catch (err) {
      toast.error(err.message || 'Failed to load categories')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function toggleExpand(id) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  async function handleAddRoot(name) {
    try {
      await createAdminCategory({ name, parentId: null })
      toast.success('Category added')
      setAddingRoot(false)
      load()
    } catch (err) {
      toast.error(err.message || 'Failed to add category')
    }
  }

  async function handleAddSub(name, parentId) {
    try {
      await createAdminCategory({ name, parentId })
      toast.success('Subcategory added')
      setAddingSubFor(null)
      load()
    } catch (err) {
      toast.error(err.message || 'Failed to add subcategory')
    }
  }

  async function handleEdit(id, name, parentId) {
    try {
      await updateAdminCategory(id, { name, parentId })
      toast.success('Updated')
      setEditingId(null)
      load()
    } catch (err) {
      toast.error(err.message || 'Failed to update')
    }
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`Delete "${name}"? This will also remove its subcategories.`)) return
    try {
      await deleteAdminCategory(id)
      toast.success('Deleted')
      load()
    } catch (err) {
      toast.error(err.message || 'Failed to delete')
    }
  }

  const flatCategories = categories

  return (
    <section className="panel">
      <div className="panelHeader">
        <div>
          <h2 className="panelTitle">Category Management</h2>
          <p className="panelSub">Add, edit or remove catalog categories and subcategories.</p>
        </div>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => { setAddingRoot(true); setAddingSubFor(null) }}
          disabled={addingRoot}
        >
          <PlusIcon /> Add Category
        </button>
      </div>

      {addingRoot && (
        <div className="catFormWrap">
          <p className="catFormTitle">New top-level category</p>
          <CategoryForm
            onSave={handleAddRoot}
            onCancel={() => setAddingRoot(false)}
            isSubcat={false}
          />
        </div>
      )}

      {loading ? (
        <p className="panelSub" style={{ padding: '1rem 0' }}>Loading…</p>
      ) : categories.length === 0 ? (
        <p className="panelSub" style={{ padding: '1rem 0' }}>No categories yet. Add one above.</p>
      ) : (
        <ul className="catList">
          {categories.map((cat) => (
            <li key={cat.id} className="catItem">
              <div className="catRow catRow--root">
                <button
                  type="button"
                  className="catExpand"
                  onClick={() => toggleExpand(cat.id)}
                  aria-label={expanded[cat.id] ? 'Collapse' : 'Expand'}
                  disabled={!cat.subcategories?.length && addingSubFor !== cat.id}
                >
                  <ChevronIcon open={expanded[cat.id] || addingSubFor === cat.id} />
                </button>

                {editingId === cat.id ? (
                  <CategoryForm
                    initialName={cat.name}
                    onSave={(name) => handleEdit(cat.id, name, null)}
                    onCancel={() => setEditingId(null)}
                    isSubcat={false}
                  />
                ) : (
                  <>
                    <span className="catName">{cat.name}</span>
                    <span className="catSlug">{cat.slug}</span>
                    <span className="catCount">{cat.subcategories?.length || 0} sub</span>
                    <div className="catActions">
                      <button
                        type="button"
                        className="iconBtn"
                        title="Add subcategory"
                        onClick={() => { setAddingSubFor(cat.id); setExpanded((p) => ({ ...p, [cat.id]: true })) }}
                      >
                        <PlusIcon />
                      </button>
                      <button
                        type="button"
                        className="iconBtn"
                        title="Edit"
                        onClick={() => setEditingId(cat.id)}
                      >
                        <EditIcon />
                      </button>
                      <button
                        type="button"
                        className="iconBtn iconBtn--danger"
                        title="Delete"
                        onClick={() => handleDelete(cat.id, cat.name)}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </>
                )}
              </div>

              {(expanded[cat.id] || addingSubFor === cat.id) && (
                <ul className="catSubList">
                  {addingSubFor === cat.id && (
                    <li className="catItem catItem--sub">
                      <div className="catFormWrap catFormWrap--inline">
                        <CategoryForm
                          initialParentId={String(cat.id)}
                          categories={flatCategories}
                          isSubcat
                          onSave={(name, pid) => handleAddSub(name, pid || String(cat.id))}
                          onCancel={() => setAddingSubFor(null)}
                        />
                      </div>
                    </li>
                  )}
                  {cat.subcategories?.map((sub) => (
                    <li key={sub.id} className="catItem catItem--sub">
                      <div className="catRow catRow--sub">
                        <span className="catIndent" aria-hidden>└</span>
                        {editingId === sub.id ? (
                          <CategoryForm
                            initialName={sub.name}
                            initialParentId={String(cat.id)}
                            categories={flatCategories}
                            isSubcat
                            onSave={(name) => handleEdit(sub.id, name, cat.id)}
                            onCancel={() => setEditingId(null)}
                          />
                        ) : (
                          <>
                            <span className="catName">{sub.name}</span>
                            <span className="catSlug">{sub.slug}</span>
                            <div className="catActions">
                              <button
                                type="button"
                                className="iconBtn"
                                title="Edit"
                                onClick={() => setEditingId(sub.id)}
                              >
                                <EditIcon />
                              </button>
                              <button
                                type="button"
                                className="iconBtn iconBtn--danger"
                                title="Delete"
                                onClick={() => handleDelete(sub.id, sub.name)}
                              >
                                <TrashIcon />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}

      <style>{`
        .catList { list-style: none; margin: 1rem 0 0; padding: 0; display: flex; flex-direction: column; gap: .375rem; }
        .catItem { border: 1px solid var(--border, #e5e7eb); border-radius: .5rem; overflow: hidden; background: var(--surface, #fff); }
        .catRow { display: flex; align-items: center; gap: .5rem; padding: .625rem .875rem; }
        .catRow--root { background: var(--surface, #fff); }
        .catRow--sub  { background: var(--surface-alt, #f9fafb); padding-left: 1.5rem; }
        .catExpand { background: none; border: none; cursor: pointer; color: var(--text-muted, #6b7280); padding: .25rem; border-radius: .25rem; flex-shrink: 0; display: flex; align-items: center; }
        .catExpand:disabled { opacity: .3; cursor: default; }
        .catIndent { color: var(--text-muted, #6b7280); font-size: .85rem; flex-shrink: 0; margin-right: .25rem; }
        .catName { font-weight: 600; font-size: .9rem; flex: 1; }
        .catSlug { font-size: .78rem; color: var(--text-muted, #6b7280); font-family: monospace; }
        .catCount { font-size: .78rem; color: var(--text-muted, #6b7280); white-space: nowrap; }
        .catActions { display: flex; gap: .25rem; margin-left: auto; }
        .catSubList { list-style: none; padding: 0; margin: 0; border-top: 1px solid var(--border, #e5e7eb); }
        .catItem--sub { border: none; border-top: 1px solid var(--border, #e5e7eb); border-radius: 0; }
        .catFormWrap { padding: .75rem 1rem; background: var(--surface-alt, #f9fafb); border-top: 1px solid var(--border, #e5e7eb); }
        .catFormWrap--inline { border-top: none; }
        .catFormTitle { font-weight: 600; font-size: .85rem; margin: 0 0 .5rem; color: var(--text-muted, #6b7280); }
        .catForm { display: flex; flex-wrap: wrap; gap: .5rem; align-items: flex-end; }
        .catForm__actions { display: flex; gap: .5rem; }
        .iconBtn--danger:hover { color: #ef4444; }
      `}</style>
    </section>
  )
}
