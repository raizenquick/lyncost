import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { ShoppingListItem } from '../types';
import { TransactionModal } from '../components/TransactionModal';
import {
  ShoppingCart,
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  ArrowRight,
  Sparkles,
  Edit2,
  Check,
  X,
  Search,
  CheckCheck,
  Tag,
  Clock,
} from 'lucide-react';

const QUICK_SUGGESTIONS = [
  '🥛 Milk & Dairy',
  '🍎 Fresh Fruits & Veggies',
  '🍞 Bread & Bakery',
  '☕ Coffee & Tea',
  '💊 Medicines & Health',
  '💻 Tech Accessories',
  '🏠 Home & Cleaning',
  '👕 Clothes & Laundry',
];

export const ShoppingListPage: React.FC = () => {
  const shoppingItems = useAppStore(state => state.shoppingItems);
  const loadShoppingItems = useAppStore(state => state.loadShoppingItems);
  const createShoppingItem = useAppStore(state => state.createShoppingItem);
  const updateShoppingItem = useAppStore(state => state.updateShoppingItem);
  const toggleShoppingItem = useAppStore(state => state.toggleShoppingItem);
  const deleteShoppingItem = useAppStore(state => state.deleteShoppingItem);
  const clearCompletedShoppingItems = useAppStore(state => state.clearCompletedShoppingItems);

  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'unbought' | 'bought'>('all');

  // Inline editing state
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editNote, setEditNote] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Conversion to Transaction
  const [convertingItem, setConvertingItem] = useState<ShoppingListItem | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Load items on mount
  useEffect(() => {
    loadShoppingItems();
  }, [loadShoppingItems]);

  const uncheckedItems = shoppingItems.filter((i) => i.is_checked === 0);
  const checkedItems = shoppingItems.filter((i) => i.is_checked === 1);

  // Filtered lists based on search and active tab
  const filterItem = (item: ShoppingListItem) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(query) ||
      (item.note && item.note.toLowerCase().includes(query))
    );
  };

  const displayedUnchecked = uncheckedItems.filter(filterItem);
  const displayedChecked = checkedItems.filter(filterItem);

  const handleAddItem = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setIsAdding(true);
    try {
      await createShoppingItem({
        name: trimmedName,
        note: note.trim() || null,
      });
      setName('');
      setNote('');
      inputRef.current?.focus();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setIsAdding(false);
    }
  };

  const handleQuickAdd = (suggestion: string) => {
    const cleanName = suggestion.replace(/^[^\w\s]+/, '').trim();
    setName(cleanName);
    inputRef.current?.focus();
  };

  const startEditing = (item: ShoppingListItem) => {
    setEditingItemId(item.id);
    setEditName(item.name);
    setEditNote(item.note || '');
  };

  const cancelEditing = () => {
    setEditingItemId(null);
    setEditName('');
    setEditNote('');
  };

  const handleSaveEdit = async (id: number) => {
    const trimmedName = editName.trim();
    if (!trimmedName) return;

    setIsSavingEdit(true);
    try {
      await updateShoppingItem(id, {
        name: trimmedName,
        note: editNote.trim() || null,
      });
      cancelEditing();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleConvertToTransaction = (item: ShoppingListItem) => {
    setConvertingItem(item);
  };

  const handleTransactionSaved = async () => {
    if (convertingItem && convertingItem.is_checked === 0) {
      try {
        await toggleShoppingItem(convertingItem.id);
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : String(err));
      }
    }
    setConvertingItem(null);
  };

  const handleClearCompleted = async () => {
    if (checkedItems.length === 0) return;
    if (window.confirm(`Remove all ${checkedItems.length} purchased items from the list?`)) {
      try {
        await clearCompletedShoppingItems();
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : String(err));
      }
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/15 border border-purple-500/30 flex items-center justify-center shadow-inner">
              <ShoppingCart className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold text-white tracking-tight">Shopping List</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-950/70 border border-purple-800/80 text-purple-300">
                  {uncheckedItems.length} to buy
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Plan purchases and groceries, then easily convert them into expense transactions.
              </p>
            </div>
          </div>
        </div>

        {checkedItems.length > 0 && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleClearCompleted}
              className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 border border-zinc-800 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Remove purchased items"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Completed ({checkedItems.length})</span>
            </button>
          </div>
        )}
      </div>

      {/* Add New Item Input Form */}
      <div className="bg-zinc-900/90 border border-zinc-800/90 rounded-2xl p-4 shadow-lg shadow-black/20 space-y-3">
        <form
          onSubmit={handleAddItem}
          className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center"
        >
          <div className="flex-1">
            <input
              ref={inputRef}
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Add item (e.g. Milk 2L, Mechanical Keyboard, Whey Protein)..."
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700/90 hover:border-zinc-500 text-white font-medium text-xs placeholder:text-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 transition-all shadow-inner"
            />
          </div>
          <div className="w-full sm:w-72">
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Notes, quantity, or estimated price..."
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700/90 hover:border-zinc-500 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 transition-all shadow-inner"
            />
          </div>
          <button
            type="submit"
            disabled={isAdding || !name.trim()}
            className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-98 text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-purple-950/60 transition-all disabled:opacity-40 disabled:pointer-events-none shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Item</span>
          </button>
        </form>

        {/* Quick Suggestion Chips */}
        <div className="pt-2 border-t border-zinc-800/60 flex items-center gap-2 overflow-x-auto no-scrollbar text-xs">
          <span className="text-zinc-500 text-[11px] font-medium flex items-center gap-1 shrink-0">
            <Tag className="w-3 h-3 text-purple-400" />
            Quick Suggestions:
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {QUICK_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => handleQuickAdd(suggestion)}
                className="px-2.5 py-1 rounded-lg bg-zinc-950/60 hover:bg-purple-950/40 text-zinc-400 hover:text-purple-300 border border-zinc-800 hover:border-purple-800/60 text-[11px] font-medium cursor-pointer transition-all shrink-0"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      {shoppingItems.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900/50 p-2.5 rounded-xl border border-zinc-800/70">
          <div className="flex items-center gap-1 bg-zinc-950/80 p-1 rounded-lg border border-zinc-800">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-purple-600 text-white font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              All ({shoppingItems.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('unbought')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'unbought'
                  ? 'bg-purple-600 text-white font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              To Buy ({uncheckedItems.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('bought')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'bought'
                  ? 'bg-purple-600 text-white font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Purchased ({checkedItems.length})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search shopping items..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-purple-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Lists */}
      <div className="space-y-6">
        {/* Unchecked Items */}
        {(activeTab === 'all' || activeTab === 'unbought') && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                <span>To Buy</span>
                <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-purple-400 font-mono text-[10px]">
                  {displayedUnchecked.length}
                </span>
              </h3>
            </div>

            {displayedUnchecked.length === 0 ? (
              searchQuery ? (
                <div className="p-8 text-center bg-zinc-900/40 rounded-2xl border border-zinc-800/60">
                  <Search className="w-6 h-6 text-zinc-600 mx-auto mb-2" />
                  <p className="text-xs text-zinc-400">No unbought items match "{searchQuery}"</p>
                </div>
              ) : shoppingItems.length === 0 ? (
                <div className="p-10 text-center bg-zinc-900/40 rounded-2xl border border-zinc-800/60 space-y-2">
                  <Sparkles className="w-8 h-8 text-purple-400 mx-auto mb-1 opacity-80" />
                  <h4 className="text-sm font-semibold text-white">Your shopping list is empty</h4>
                  <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                    Add groceries, gadgets, or planned items above, or click any quick suggestion chip to get started!
                  </p>
                </div>
              ) : (
                <div className="p-8 text-center bg-zinc-900/40 rounded-2xl border border-zinc-800/60 space-y-1">
                  <CheckCheck className="w-7 h-7 text-purple-400 mx-auto mb-1" />
                  <p className="text-sm font-semibold text-white">All items bought! 🎉</p>
                  <p className="text-xs text-zinc-400">All planned items are checked off.</p>
                </div>
              )
            ) : (
              <div className="space-y-2">
                {displayedUnchecked.map((item) => (
                  <div
                    key={item.id}
                    className="group bg-zinc-900/85 hover:bg-zinc-900 border border-zinc-800/80 hover:border-purple-500/40 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all shadow-sm"
                  >
                    {editingItemId === item.id ? (
                      /* Inline Edit Mode */
                      <div className="flex-1 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Item name..."
                          className="flex-1 px-3 py-1.5 rounded-lg bg-zinc-950 border border-purple-500 text-white font-medium text-xs focus:outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(item.id);
                            if (e.key === 'Escape') cancelEditing();
                          }}
                        />
                        <input
                          type="text"
                          value={editNote}
                          onChange={(e) => setEditNote(e.target.value)}
                          placeholder="Note..."
                          className="w-full sm:w-56 px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700 text-white text-xs focus:outline-none focus:border-purple-500"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(item.id);
                            if (e.key === 'Escape') cancelEditing();
                          }}
                        />
                        <div className="flex items-center gap-1.5 self-end sm:self-auto">
                          <button
                            type="button"
                            disabled={isSavingEdit || !editName.trim()}
                            onClick={() => handleSaveEdit(item.id)}
                            className="p-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold cursor-pointer transition-colors"
                            title="Save changes"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditing}
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 cursor-pointer transition-colors"
                            title="Cancel edit"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Normal Display Mode */
                      <>
                        <div className="flex items-center gap-3.5 flex-1 min-w-0">
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await toggleShoppingItem(item.id);
                              } catch (err: unknown) {
                                alert(err instanceof Error ? err.message : String(err));
                              }
                            }}
                            className="text-zinc-500 hover:text-purple-400 hover:scale-110 cursor-pointer shrink-0 transition-all"
                            title="Mark as purchased"
                          >
                            <Circle className="w-5 h-5" />
                          </button>
                          <div className="min-w-0">
                            <span className="text-sm font-bold text-white block truncate tracking-tight">
                              {item.name}
                            </span>
                            {item.note && (
                              <span className="text-xs text-zinc-400 block truncate mt-0.5">
                                {item.note}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={() => handleConvertToTransaction(item)}
                            className="px-3 py-1.5 rounded-lg bg-purple-600/15 hover:bg-purple-600/25 text-purple-300 border border-purple-500/30 hover:border-purple-500/50 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                            title="Convert to expense transaction in Lyncost"
                          >
                            <span>Convert to Expense</span>
                            <ArrowRight className="w-3.5 h-3.5 text-purple-400" />
                          </button>
                          <button
                            type="button"
                            onClick={() => startEditing(item)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-purple-300 hover:bg-zinc-800 cursor-pointer transition-colors"
                            title="Edit item"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await deleteShoppingItem(item.id);
                              } catch (err: unknown) {
                                alert(err instanceof Error ? err.message : String(err));
                              }
                            }}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-colors"
                            title="Delete item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Checked / Purchased Items */}
        {(activeTab === 'all' || activeTab === 'bought') && displayedChecked.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-zinc-800/80">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
                <span>Purchased</span>
                <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono text-[10px]">
                  {displayedChecked.length}
                </span>
              </h3>
            </div>

            <div className="space-y-2">
              {displayedChecked.map((item) => (
                <div
                  key={item.id}
                  className="group bg-zinc-900/40 hover:bg-zinc-900/60 border border-zinc-800/40 rounded-xl p-3 flex items-center justify-between gap-3 opacity-75 hover:opacity-100 transition-all"
                >
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await toggleShoppingItem(item.id);
                        } catch (err: unknown) {
                          alert(err instanceof Error ? err.message : String(err));
                        }
                      }}
                      className="text-purple-400 hover:text-zinc-400 cursor-pointer shrink-0 transition-colors"
                      title="Mark as unbought"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                    </button>
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-zinc-400 line-through block truncate">
                        {item.name}
                      </span>
                      {item.note && (
                        <span className="text-xs text-zinc-500 line-through block truncate">
                          {item.note}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {item.created_at ? item.created_at.split(' ')[0] : 'Done'}
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await deleteShoppingItem(item.id);
                        } catch (err: unknown) {
                          alert(err instanceof Error ? err.message : String(err));
                        }
                      }}
                      className="p-1.5 rounded-lg text-zinc-600 hover:text-rose-400 hover:bg-zinc-800 cursor-pointer transition-colors"
                      title="Delete item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Transaction Modal (Pre-filled for Conversion) */}
      {convertingItem && (
        <TransactionModal
          isOpen={Boolean(convertingItem)}
          onClose={() => setConvertingItem(null)}
          prefillNote={convertingItem.name + (convertingItem.note ? ` - ${convertingItem.note}` : '')}
          prefillType="expense"
          onSaved={handleTransactionSaved}
        />
      )}
    </div>
  );
};
