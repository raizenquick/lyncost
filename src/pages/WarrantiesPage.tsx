import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { CreateWarrantyPayload, WarrantyItem } from '../types';
import {
  ShieldCheck,
  Plus,
  AlertTriangle,
  Calendar,
  Trash2,
  Edit2,
  X,
  FileText,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { formatIndianDate } from '../lib/utils';

export const WarrantiesPage: React.FC = () => {
  const warranties = useAppStore(state => state.warranties);
  const createWarranty = useAppStore(state => state.createWarranty);
  const updateWarranty = useAppStore(state => state.updateWarranty);
  const deleteWarranty = useAppStore(state => state.deleteWarranty);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWarranty, setEditingWarranty] = useState<WarrantyItem | null>(null);

  // Form State
  const [itemName, setItemName] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiresOn, setExpiresOn] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Deleting ID
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const openCreateModal = () => {
    setEditingWarranty(null);
    setItemName('');
    const today = new Date().toISOString().split('T')[0];
    setPurchaseDate(today);
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    setExpiresOn(nextYear.toISOString().split('T')[0]);
    setNotes('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (w: WarrantyItem) => {
    setEditingWarranty(w);
    setItemName(w.item_name);
    setPurchaseDate(w.purchase_date || '');
    setExpiresOn(w.expires_on || '');
    setNotes(w.notes || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!itemName.trim()) {
      setFormError('Item name is required');
      return;
    }
    if (!expiresOn) {
      setFormError('Expiration date is required');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingWarranty) {
        await updateWarranty(editingWarranty.id, {
          item_name: itemName.trim(),
          purchase_date: purchaseDate || null,
          expires_on: expiresOn,
          notes: notes.trim() || null,
        });
      } else {
        const payload: CreateWarrantyPayload = {
          item_name: itemName.trim(),
          purchase_date: purchaseDate || null,
          expires_on: expiresOn,
          notes: notes.trim() || null,
        };
        await createWarranty(payload);
      }
      setIsModalOpen(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteWarranty(id);
      setDeletingId(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  const expiringSoonCount = warranties.filter((w) => w.is_expiring_soon).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            Warranties
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Track purchase warranties, expiration countdowns & repair coverage
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-950/50 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Warranty
        </button>
      </div>

      {/* Alert banner if items expiring soon */}
      {expiringSoonCount > 0 && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 text-amber-400 text-xs">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>
            <strong>{expiringSoonCount} item(s)</strong> have warranties expiring within the next 30 days. Review them before coverage ends.
          </span>
        </div>
      )}

      {/* Warranties List */}
      {warranties.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-12 text-center">
          <ShieldCheck className="w-12 h-12 text-zinc-600 mx-auto mb-3 stroke-1" />
          <h3 className="text-sm font-semibold text-zinc-300">No Tracked Warranties</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1 mb-4">
            Track electronic goods, appliances, and vehicle warranties with automatic expiration reminders.
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium cursor-pointer"
          >
            Add First Warranty
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {warranties.map((w) => {
            const isExpiringSoon = w.is_expiring_soon;
            const isExpired = w.is_expired;

            const badgeColor = isExpired
              ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
              : isExpiringSoon
              ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
              : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';

            return (
              <div
                key={w.id}
                className={`bg-zinc-900/80 rounded-2xl p-5 border transition-all flex flex-col justify-between shadow-sm ${
                  isExpired
                    ? 'border-zinc-800 opacity-80'
                    : isExpiringSoon
                    ? 'border-amber-500/40 bg-amber-950/5'
                    : 'border-zinc-800/80 hover:border-zinc-700/80'
                }`}
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        {w.item_name}
                      </h4>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {w.purchase_date ? `Purchased: ${w.purchase_date}` : 'Purchase date not set'}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(w)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                        title="Edit warranty"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingId(w.id)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition-colors cursor-pointer"
                        title="Delete warranty"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Expiry Badge & Countdown */}
                  <div className="my-3 flex items-center gap-2 flex-wrap">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5 ${badgeColor}`}>
                      {isExpired ? (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Expired</span>
                        </>
                      ) : isExpiringSoon ? (
                        <>
                          <Clock className="w-3.5 h-3.5" />
                          <span>Expiring Soon ({w.days_remaining}d left)</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Active ({w.days_remaining}d left)</span>
                        </>
                      )}
                    </span>

                    <span className="text-xs text-zinc-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                      Valid until: <strong className="text-white">{w.expires_on ? formatIndianDate(w.expires_on) : 'Indefinite'}</strong>
                    </span>
                  </div>

                  {/* Notes & Linked Transaction */}
                  {w.notes && (
                    <p className="text-xs text-zinc-400 leading-relaxed bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-850 mt-2">
                      {w.notes}
                    </p>
                  )}
                </div>

                {w.transaction_id && (
                  <div className="pt-3 mt-3 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-500">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3 text-emerald-400" />
                      Linked to Transaction #{w.transaction_id}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full shadow-2xl max-h-[88vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800 shrink-0">
              <h3 className="text-base font-bold text-white">
                {editingWarranty ? 'Edit Warranty' : 'Track New Warranty'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              id="warranty-form"
              onSubmit={handleSubmit}
              className="p-5 space-y-4 flex-1 min-h-0 overflow-y-auto custom-scrollbar"
            >
              {/* Invisible submit button for Enter key form submission */}
              <button type="submit" className="hidden" aria-hidden="true" />

              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                  {formError}
                </div>
              )}

              {/* Item Name */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g. MacBook Pro, Sony Headphones, Samsung TV"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/80 border border-zinc-700/80 hover:border-zinc-600 text-white text-xs focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all shadow-inner"
                />
              </div>

              {/* Purchase Date & Expires On */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                    Purchase Date
                  </label>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => {
                      setPurchaseDate(e.target.value);
                      (e.target as HTMLInputElement).blur();
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/80 border border-zinc-700/80 hover:border-zinc-600 text-white text-xs focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 cursor-pointer font-mono transition-all shadow-inner"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                    Expires On *
                  </label>
                  <input
                    type="date"
                    required
                    value={expiresOn}
                    onChange={(e) => {
                      setExpiresOn(e.target.value);
                      (e.target as HTMLInputElement).blur();
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/80 border border-zinc-700/80 hover:border-zinc-600 text-white text-xs focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 cursor-pointer font-mono transition-all shadow-inner"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  Notes & Details
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Invoice number, serial key, extended warranty terms..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:outline-none focus:border-purple-500 resize-none"
                />
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
                form="warranty-form"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold cursor-pointer shadow-lg shadow-purple-950/50 transition-all disabled:opacity-50"
              >
                {editingWarranty ? 'Save Changes' : 'Track Warranty'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">Delete Warranty?</h3>
            <p className="text-xs text-zinc-400 mb-6">
              Are you sure you want to delete this warranty record?
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 rounded-xl bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deletingId)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer shadow-md shadow-rose-950/40"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
