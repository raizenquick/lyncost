import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Category, CreateCategoryPayload, UpdateCategoryPayload } from '../types';
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  X,
  RefreshCw,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';

const PRESET_COLORS = [
  '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6',
  '#ec4899', '#f97316', '#eab308', '#ef4444',
  '#14b8a6', '#6366f1', '#84cc16', '#64748b',
];

export const CategoriesPage: React.FC = () => {
  const categories = useAppStore(state => state.categories);
  const createCategory = useAppStore(state => state.createCategory);
  const updateCategory = useAppStore(state => state.updateCategory);
  const deleteCategory = useAppStore(state => state.deleteCategory);

  const [activeKind, setActiveKind] = useState<'expense' | 'income'>('expense');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<number | null>(null);
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [icon, setIcon] = useState('tag');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setName('');
    setParentId(null);
    setColor(PRESET_COLORS[0]);
    setIcon('tag');
    setEditingCategory(null);
    setFormError(null);
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setParentId(cat.parent_id || null);
    setColor(cat.color || PRESET_COLORS[0]);
    setIcon(cat.icon || 'tag');
    setActiveKind(cat.kind);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError('Category name cannot be empty');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingCategory) {
        const payload: UpdateCategoryPayload = {
          name: trimmedName,
          kind: activeKind,
          parent_id: parentId,
          icon,
          color,
        };
        await updateCategory(editingCategory.id, payload);
      } else {
        const payload: CreateCategoryPayload = {
          name: trimmedName,
          kind: activeKind,
          parent_id: parentId,
          icon,
          color,
        };
        await createCategory(payload);
      }
      setIsModalOpen(false);
      resetForm();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (cat: Category) => {
    if (!window.confirm(`Are you sure you want to delete category "${cat.name}"?`)) {
      return;
    }
    try {
      await deleteCategory(cat.id);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  const filteredCategories = categories.filter((c) => c.kind === activeKind);
  const rootCategories = filteredCategories.filter((c) => !c.parent_id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Categories</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Organize income and expense buckets with hierarchical subcategories
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Income / Expense Tabs */}
          <div className="flex rounded-xl bg-zinc-900 border border-zinc-800 p-1">
            <button
              type="button"
              onClick={() => setActiveKind('expense')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeKind === 'expense'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              Expense ({categories.filter((c) => c.kind === 'expense').length})
            </button>
            <button
              type="button"
              onClick={() => setActiveKind('income')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeKind === 'income'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              Income ({categories.filter((c) => c.kind === 'income').length})
            </button>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-950/50 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Category
          </button>
        </div>
      </div>

      {/* Category Tree / List */}
      <div className="space-y-3">
        {rootCategories.length === 0 ? (
          <div className="p-12 border border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-center bg-zinc-900/40">
            <Tag className="w-12 h-12 text-zinc-600 mb-3" />
            <h3 className="text-sm font-semibold text-zinc-300">No {activeKind} categories</h3>
            <p className="text-xs text-zinc-500 mt-1 mb-4">
              Add your first {activeKind} category to organize transactions.
            </p>
            <button
              type="button"
              onClick={openCreateModal}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold cursor-pointer"
            >
              Add {activeKind === 'income' ? 'Income' : 'Expense'} Category
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {rootCategories.map((root) => {
              const subcategories = filteredCategories.filter((c) => c.parent_id === root.id);
              return (
                <div
                  key={root.id}
                  className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 hover:border-zinc-750 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center border text-xs font-bold"
                          style={{
                            backgroundColor: root.color ? `${root.color}25` : '#27272a',
                            borderColor: root.color ? `${root.color}50` : '#3f3f46',
                            color: root.color || '#fff',
                          }}
                        >
                          {root.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-white">{root.name}</h4>
                          <span className="text-[10px] text-zinc-400 capitalize">
                            {root.kind} category
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(root)}
                          className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(root)}
                          className="p-1 rounded hover:bg-red-950/50 text-zinc-400 hover:text-red-400 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Subcategories */}
                    {subcategories.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-zinc-850 space-y-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 block mb-1">
                          Subcategories ({subcategories.length})
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {subcategories.map((sub) => (
                            <div
                              key={sub.id}
                              className="group flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-950 border border-zinc-800 text-xs text-zinc-300"
                            >
                              <span>{sub.name}</span>
                              <button
                                type="button"
                                onClick={() => openEditModal(sub)}
                                className="opacity-0 group-hover:opacity-100 hover:text-white cursor-pointer"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(sub)}
                                className="opacity-0 group-hover:opacity-100 hover:text-red-400 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Category Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full shadow-2xl max-h-[88vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800 shrink-0">
              <h3 className="text-base font-bold text-white">
                {editingCategory ? 'Edit Category' : 'Create Category'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              id="category-form"
              onSubmit={handleSubmit}
              className="p-5 space-y-4 flex-1 min-h-0 overflow-y-auto custom-scrollbar"
            >
              {/* Invisible submit button for Enter key form submission */}
              <button type="submit" className="hidden" aria-hidden="true" />
              {formError && (
                <div className="p-2.5 rounded-lg bg-red-950/50 border border-red-900/60 text-red-400 text-xs">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Groceries, Freelance, Fuel"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Category Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveKind('expense')}
                    className={`py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                      activeKind === 'expense'
                        ? 'bg-red-500/20 text-red-400 border-red-500/40'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveKind('income')}
                    className={`py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                      activeKind === 'income'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    Income
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Parent Category (Optional - for Subcategories)
                </label>
                <select
                  value={parentId || ''}
                  onChange={(e) => setParentId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2 rounded-xl text-sm font-bold focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value="">None (Top-Level Category)</option>
                  {rootCategories
                    .filter((c) => !editingCategory || c.id !== editingCategory.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Color Tag
                </label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-full transition-all cursor-pointer border ${
                        color === c ? 'border-white scale-110 shadow-md' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </form>

            <div className="p-4 border-t border-zinc-800 flex items-center justify-end gap-3 shrink-0 bg-zinc-900/90">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="category-form"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-950/50 transition-all disabled:opacity-50"
              >
                {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                {editingCategory ? 'Update Category' : 'Create Category'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
