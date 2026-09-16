import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import {
  Settings as SettingsIcon,
  ShieldCheck,
  Database,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Coins,
  Plus,
  ArrowRight,
  X,
  Edit2,
  KeyRound,
  Download,
  Upload,
  CheckCircle2,
  FolderOpen,
  Tag,
  Lock,
  Bell,
  Check,
  Globe,
  Calendar,
  Sun,
  Moon,
  Sparkles,
  CreditCard,
  Wallet,
  Smartphone,
  Send,
  Zap,
  FileText,
  Building2,
} from 'lucide-react';
import {
  getNumberFormatSystem,
  setNumberFormatSystem,
  getDateFormatSystem,
  setDateFormatSystem,
  POPULAR_CURRENCIES,
  ZERO_DECIMAL_CURRENCIES,
  NumberFormatSystem,
  DateFormatSystem,
} from '../lib/utils';
import { PaymentMethodItem } from '../types';

export const SettingsPage: React.FC = () => {
  const settings = useAppStore(state => state.settings);
  const theme = useAppStore(state => state.theme);
  const setTheme = useAppStore(state => state.setTheme);
  const exchangeRates = useAppStore(state => state.exchangeRates);
  const backups = useAppStore(state => state.backups);
  const loadExchangeRates = useAppStore(state => state.loadExchangeRates);
  const setExchangeRate = useAppStore(state => state.setExchangeRate);
  const deleteExchangeRate = useAppStore(state => state.deleteExchangeRate);
  const loadBackups = useAppStore(state => state.loadBackups);
  const createBackup = useAppStore(state => state.createBackup);
  const restoreBackup = useAppStore(state => state.restoreBackup);
  const setBaseCurrency = useAppStore(state => state.setBaseCurrency);
  const changePin = useAppStore(state => state.changePin);
  const wipeData = useAppStore(state => state.wipeData);
  const lockApp = useAppStore(state => state.lockApp);
  const setActiveTab = useAppStore(state => state.setActiveTab);
  const updateNotificationSettings = useAppStore(state => state.updateNotificationSettings);
  const sendOsDesktopNotification = useAppStore(state => state.sendOsDesktopNotification);
  const updateInfo = useAppStore(state => state.updateInfo);
  const isCheckingUpdate = useAppStore(state => state.isCheckingUpdate);
  const isInstallingUpdate = useAppStore(state => state.isInstallingUpdate);
  const updateInstallSuccess = useAppStore(state => state.updateInstallSuccess);
  const updateError = useAppStore(state => state.updateError);
  const checkForAppUpdate = useAppStore(state => state.checkForAppUpdate);
  const installAppUpdate = useAppStore(state => state.installAppUpdate);
  const restartApp = useAppStore(state => state.restartApp);

  // Payment Methods Store Hooks
  const paymentMethods = useAppStore(state => state.paymentMethods);
  const createPaymentMethod = useAppStore(state => state.createPaymentMethod);
  const updatePaymentMethod = useAppStore(state => state.updatePaymentMethod);
  const deletePaymentMethod = useAppStore(state => state.deletePaymentMethod);
  const applyRegionalPaymentPresets = useAppStore(state => state.applyRegionalPaymentPresets);

  // Payment Methods UI State
  const [isPaymentMethodModalOpen, setIsPaymentMethodModalOpen] = useState(false);
  const [editingPaymentMethod, setEditingPaymentMethod] = useState<PaymentMethodItem | null>(null);
  const [paymentMethodNotice, setPaymentMethodNotice] = useState<string | null>(null);
  const [paymentMethodError, setPaymentMethodError] = useState<string | null>(null);
  const [paymentMethodForm, setPaymentMethodForm] = useState<{
    name: string;
    type_key: string;
    icon: string;
    color: string;
    is_default: boolean;
  }>({
    name: '',
    type_key: 'custom',
    icon: 'Wallet',
    color: '#8b5cf6',
    is_default: false,
  });

  const [loadPresetsWithCurrency, setLoadPresetsWithCurrency] = useState(true);

  // Wipe modal
  const [isWipeModalOpen, setIsWipeModalOpen] = useState(false);
  const [wipeConfirmText, setWipeConfirmText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Base Currency Edit
  const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState(settings?.base_currency || 'INR');
  const [currencyError, setCurrencyError] = useState<string | null>(null);

  // Change PIN Modal
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSuccess, setPinSuccess] = useState<string | null>(null);

  // Backup & Restore
  const [isCustomBackupOpen, setIsCustomBackupOpen] = useState(false);
  const [customFolder, setCustomFolder] = useState('');
  const [backupNotice, setBackupNotice] = useState<string | null>(null);
  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // Exchange rate modal
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [rateFrom, setRateFrom] = useState('');
  const [rateTo, setRateTo] = useState('');
  const [rateValue, setRateValue] = useState('');
  const [rateError, setRateError] = useState<string | null>(null);

  // Notifications
  const [notifyOs, setNotifyOs] = useState(settings?.notify_os ?? true);
  const [notifyAdvanceDays, setNotifyAdvanceDays] = useState(settings?.notify_advance_days ?? 1);
  const [isSavingNotify, setIsSavingNotify] = useState(false);
  const [isTestingOs, setIsTestingOs] = useState(false);
  const [notifyMessage, setNotifyMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Locale & Formatting
  const [numFormat, setNumFormat] = useState<NumberFormatSystem>(getNumberFormatSystem());
  const [dateFormat, setDateFormat] = useState<DateFormatSystem>(getDateFormatSystem());

  useEffect(() => {
    const handler = () => {
      setNumFormat(getNumberFormatSystem());
      setDateFormat(getDateFormatSystem());
    };
    window.addEventListener('lyncost_format_changed', handler);
    return () => window.removeEventListener('lyncost_format_changed', handler);
  }, []);

  const handleToggleNumberFormat = (fmt: NumberFormatSystem) => {
    setNumberFormatSystem(fmt);
    setNumFormat(fmt);
  };

  const handleChangeDateFormat = (fmt: DateFormatSystem) => {
    setDateFormatSystem(fmt);
    setDateFormat(fmt);
  };

  useEffect(() => {
    loadExchangeRates();
    loadBackups();
  }, [loadExchangeRates, loadBackups]);

  useEffect(() => {
    if (settings) {
      setSelectedCurrency(settings.base_currency);
      setNotifyOs(settings.notify_os);
      setNotifyAdvanceDays(settings.notify_advance_days || 1);
    }
  }, [settings]);

  const handleSaveNotificationSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingNotify(true);
    setNotifyMessage(null);
    try {
      await updateNotificationSettings({
        notify_os: notifyOs,
        notify_advance_days: notifyAdvanceDays,
      });
      setNotifyMessage({ type: 'success', text: 'Notification preferences saved successfully!' });
      setTimeout(() => setNotifyMessage(null), 4000);
    } catch (err: unknown) {
      setNotifyMessage({
        type: 'error',
        text: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsSavingNotify(false);
    }
  };

  const handleTestOs = async () => {
    setIsTestingOs(true);
    setNotifyMessage(null);
    try {
      await sendOsDesktopNotification(
        'DhanKhata Bill Reminder',
        '🔔 1-Day Advance Notice: Electricity bill (₹2,500.00) is due tomorrow!'
      );
      setNotifyMessage({
        type: 'success',
        text: 'Desktop notification sent! Check your notification tray / top bar.',
      });
      setTimeout(() => setNotifyMessage(null), 4000);
    } catch (err: unknown) {
      setNotifyMessage({
        type: 'error',
        text: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsTestingOs(false);
    }
  };

  const handleOpenRateModal = (from = 'USD', to = settings?.base_currency || 'INR', currentRate = '') => {
    setRateFrom(from);
    setRateTo(to);
    setRateValue(currentRate);
    setRateError(null);
    setIsRateModalOpen(true);
  };

  const handleSaveRate = async (e: React.FormEvent) => {
    e.preventDefault();
    setRateError(null);

    const fromCurr = rateFrom.trim().toUpperCase();
    const toCurr = rateTo.trim().toUpperCase();
    const rateNum = parseFloat(rateValue);

    if (!fromCurr || !toCurr) {
      setRateError('Both currency codes are required');
      return;
    }
    if (fromCurr === toCurr) {
      setRateError('Currencies must be different');
      return;
    }
    if (isNaN(rateNum) || rateNum <= 0) {
      setRateError('Rate must be greater than zero');
      return;
    }

    try {
      await setExchangeRate({
        from_currency: fromCurr,
        to_currency: toCurr,
        rate: rateNum,
      });
      setIsRateModalOpen(false);
    } catch (err: unknown) {
      setRateError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleSaveCurrency = async (e: React.FormEvent) => {
    e.preventDefault();
    setCurrencyError(null);
    const cur = selectedCurrency.trim().toUpperCase();
    if (cur.length < 2 || cur.length > 5) {
      setCurrencyError('Currency must be 3-4 letters (e.g. INR, USD, EUR)');
      return;
    }

    try {
      await setBaseCurrency(cur);
      if (loadPresetsWithCurrency) {
        await applyRegionalPaymentPresets(cur);
      }
      setIsCurrencyModalOpen(false);
    } catch (err: unknown) {
      setCurrencyError(err instanceof Error ? err.message : String(err));
    }
  };

  const renderPaymentIcon = (iconName: string, className = "w-4 h-4") => {
    switch (iconName) {
      case 'Coins': return <Coins className={className} />;
      case 'Building2': return <Building2 className={className} />;
      case 'CreditCard': return <CreditCard className={className} />;
      case 'Smartphone': return <Smartphone className={className} />;
      case 'Send': return <Send className={className} />;
      case 'Zap': return <Zap className={className} />;
      case 'Globe': return <Globe className={className} />;
      case 'FileText': return <FileText className={className} />;
      default: return <Wallet className={className} />;
    }
  };

  const openAddPaymentMethodModal = () => {
    setEditingPaymentMethod(null);
    setPaymentMethodForm({
      name: '',
      type_key: 'custom',
      icon: 'Wallet',
      color: '#8b5cf6',
      is_default: false,
    });
    setPaymentMethodError(null);
    setIsPaymentMethodModalOpen(true);
  };

  const openEditPaymentMethodModal = (pm: PaymentMethodItem) => {
    setEditingPaymentMethod(pm);
    setPaymentMethodForm({
      name: pm.name,
      type_key: pm.type_key,
      icon: pm.icon || 'Wallet',
      color: pm.color || '#8b5cf6',
      is_default: pm.is_default === 1,
    });
    setPaymentMethodError(null);
    setIsPaymentMethodModalOpen(true);
  };

  const handleSavePaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentMethodError(null);
    if (!paymentMethodForm.name.trim()) {
      setPaymentMethodError('Payment method name is required');
      return;
    }

    try {
      if (editingPaymentMethod) {
        await updatePaymentMethod(editingPaymentMethod.id, {
          name: paymentMethodForm.name.trim(),
          type_key: paymentMethodForm.type_key,
          icon: paymentMethodForm.icon,
          color: paymentMethodForm.color,
          is_default: paymentMethodForm.is_default ? 1 : 0,
          is_active: editingPaymentMethod.is_active,
        });
        setPaymentMethodNotice(`Updated "${paymentMethodForm.name.trim()}"`);
      } else {
        await createPaymentMethod({
          name: paymentMethodForm.name.trim(),
          type_key: paymentMethodForm.type_key,
          icon: paymentMethodForm.icon,
          color: paymentMethodForm.color,
          is_default: paymentMethodForm.is_default ? 1 : 0,
        });
        setPaymentMethodNotice(`Created "${paymentMethodForm.name.trim()}"`);
      }
      setIsPaymentMethodModalOpen(false);
      setTimeout(() => setPaymentMethodNotice(null), 3000);
    } catch (err: unknown) {
      setPaymentMethodError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleTogglePaymentMethodActive = async (pm: PaymentMethodItem) => {
    try {
      await updatePaymentMethod(pm.id, {
        name: pm.name,
        type_key: pm.type_key,
        currency: pm.currency,
        icon: pm.icon,
        color: pm.color,
        is_default: pm.is_default,
        is_active: pm.is_active === 1 ? 0 : 1,
      });
    } catch (err) {
      alert(`Failed to toggle status: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleSetDefaultPaymentMethod = async (pm: PaymentMethodItem) => {
    try {
      await updatePaymentMethod(pm.id, {
        name: pm.name,
        type_key: pm.type_key,
        currency: pm.currency,
        icon: pm.icon,
        color: pm.color,
        is_default: 1,
        is_active: 1,
      });
      setPaymentMethodNotice(`Set "${pm.name}" as default payment method`);
      setTimeout(() => setPaymentMethodNotice(null), 3000);
    } catch (err) {
      alert(`Failed to set default: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleDeletePaymentMethod = async (pm: PaymentMethodItem) => {
    if (window.confirm(`Delete payment method "${pm.name}"?`)) {
      try {
        await deletePaymentMethod(pm.id);
        setPaymentMethodNotice(`Deleted "${pm.name}"`);
        setTimeout(() => setPaymentMethodNotice(null), 3000);
      } catch (err) {
        alert(`Failed to delete: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  };

  const handleLoadRegionalPresets = async () => {
    const cur = settings?.base_currency || 'INR';
    try {
      await applyRegionalPaymentPresets(cur);
      setPaymentMethodNotice(`Loaded recommended regional payment presets for ${cur}`);
      setTimeout(() => setPaymentMethodNotice(null), 3500);
    } catch (err) {
      alert(`Failed to load presets: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    setPinSuccess(null);

    if (newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
      setPinError('New PIN must be exactly 6 digits');
      return;
    }
    if (newPin !== confirmPin) {
      setPinError('New PIN and confirmation do not match');
      return;
    }

    try {
      await changePin({
        current_pin: currentPin,
        new_pin: newPin,
      });
      setPinSuccess('PIN updated successfully!');
      setTimeout(() => {
        setIsPinModalOpen(false);
        setCurrentPin('');
        setNewPin('');
        setConfirmPin('');
        setPinSuccess(null);
      }, 1200);
    } catch (err: unknown) {
      setPinError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleBackupNow = async () => {
    setBackupNotice(null);
    try {
      const path = await createBackup();
      setBackupNotice(`Backup created successfully: ${path}`);
    } catch (err: unknown) {
      setBackupNotice(`Backup failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleCustomBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customFolder.trim()) return;
    try {
      const path = await createBackup(customFolder.trim());
      setBackupNotice(`Backup saved to: ${path}`);
      setIsCustomBackupOpen(false);
      setCustomFolder('');
    } catch (err: unknown) {
      alert(`Backup failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleConfirmRestore = async () => {
    if (!selectedBackupForRestore) return;
    setIsRestoring(true);
    try {
      await restoreBackup(selectedBackupForRestore);
      alert('Database restored successfully from backup!');
      setSelectedBackupForRestore(null);
    } catch (err: unknown) {
      alert(`Restore failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleWipe = async () => {
    if (wipeConfirmText !== 'RESET ALL DATA') {
      alert('You must type RESET ALL DATA to confirm.');
      return;
    }

    setIsProcessing(true);
    try {
      await wipeData();
      setIsWipeModalOpen(false);
      setWipeConfirmText('');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">Settings</h2>
        <p className="text-xs text-zinc-400 mt-1">
          System preferences, offline backups, multi-currency rates, and security
        </p>
      </div>

      {/* About & Ownership Card */}
      <div className={`p-5 rounded-2xl border shadow-lg space-y-3 transition-all ${
        theme === 'light'
          ? 'bg-gradient-to-r from-emerald-100/90 via-white to-emerald-50 border-emerald-300 shadow-emerald-900/5'
          : 'bg-gradient-to-r from-emerald-950/70 via-zinc-900 to-zinc-900 border-emerald-500/40 shadow-black/50'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <h3 className={`text-sm font-black tracking-tight ${
                theme === 'light' ? 'text-slate-950' : 'text-white'
              }`}>
                Lyncost — 100% Free & Open Source
              </h3>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                theme === 'light'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-emerald-900/60 text-emerald-200 border-emerald-600'
              }`}>
                GPL-3.0 License
              </span>
            </div>
            <p className={`text-xs max-w-xl leading-relaxed font-bold ${
              theme === 'light' ? 'text-slate-800' : 'text-zinc-100'
            }`}>
              Lyncost is free, 100% offline, and private desktop software built for Linux users worldwide. Zero tracking, zero telemetry.
            </p>
          </div>
        </div>
        <div className={`pt-2 border-t flex items-center justify-between text-[11px] font-bold ${
          theme === 'light' ? 'border-emerald-200 text-slate-700' : 'border-zinc-800 text-zinc-300'
        }`}>
          <span>Created by <strong className={theme === 'light' ? 'text-emerald-700 font-extrabold' : 'text-emerald-300 font-extrabold'}>raizenquick</strong></span>
          <span className="font-mono">Lyncost v0.1.5 • Native Linux Desktop</span>
        </div>
      </div>

      {/* Software Version & Updates Card */}
      <div className={`p-5 rounded-2xl border transition-all ${
        theme === 'light'
          ? 'bg-white border-purple-200/80 shadow-sm'
          : 'bg-zinc-900/80 border-zinc-800'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <h3 className={`text-sm font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                Software Version & In-App Updates
              </h3>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1.5 ${
                updateInfo?.has_update
                  ? theme === 'light'
                    ? 'bg-white text-purple-700 border-purple-300 shadow-sm'
                    : 'bg-purple-950/70 text-purple-300 border-purple-800'
                  : theme === 'light'
                    ? 'bg-white text-emerald-700 border-emerald-300 shadow-sm'
                    : 'bg-emerald-950/70 text-emerald-300 border-emerald-800'
              }`}>
                {updateInfo?.has_update ? `Update Available: v${updateInfo.latest_version}` : `Up to Date (v${updateInfo?.current_version || '0.1.5'})`}
              </span>
            </div>
            <p className={`text-xs ${theme === 'light' ? 'text-slate-600' : 'text-zinc-400'}`}>
              {updateInfo?.has_update
                ? (updateInfo.release_notes || 'A new release is available on GitHub.')
                : 'You are running the latest compiled native release of Lyncost.'}
            </p>
            {updateError && (
              <p className="text-xs text-rose-500 font-bold pt-1">{updateError}</p>
            )}
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {updateInstallSuccess ? (
              <button
                type="button"
                onClick={restartApp}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-2 shadow-md shadow-emerald-950/40 cursor-pointer animate-pulse"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Restart to Apply</span>
              </button>
            ) : updateInfo?.has_update ? (
              <button
                type="button"
                disabled={isInstallingUpdate}
                onClick={installAppUpdate}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-black flex items-center gap-2 shadow-md shadow-purple-950/40 cursor-pointer transition-all"
              >
                {isInstallingUpdate ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Installing...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>Install v{updateInfo.latest_version}</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                disabled={isCheckingUpdate}
                onClick={checkForAppUpdate}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border cursor-pointer transition-all ${
                  theme === 'light'
                    ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                    : 'bg-zinc-800 hover:bg-zinc-750 border-zinc-700 text-zinc-200'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? 'animate-spin text-purple-400' : ''}`} />
                <span>{isCheckingUpdate ? 'Checking...' : 'Check for Updates'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* General Settings Card */}
        <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <SettingsIcon className="w-4 h-4 text-purple-400" />
            <h3>General Preferences & Localization</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between">
              <div>
                <span className="text-zinc-400 block font-medium">Base Currency</span>
                <span className="text-[11px] text-zinc-500">
                  Global currency used for consolidated totals
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-lg bg-zinc-800 text-white font-mono font-bold">
                  {settings?.base_currency || 'USD'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsCurrencyModalOpen(true)}
                  className="p-1.5 rounded-lg bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 hover:text-white cursor-pointer"
                  title="Change Base Currency"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Number System */}
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-zinc-900 text-purple-400 border border-zinc-800">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-zinc-400 block font-medium">Number System</span>
                  <span className="text-[11px] text-zinc-500">
                    {numFormat === 'international' ? 'International: 1,000,000.00' : 'Indian: 10,00,000.00'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                <button
                  type="button"
                  onClick={() => handleToggleNumberFormat('international')}
                  className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition-all ${
                    numFormat === 'international'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                  title="Thousands, Millions, Billions"
                >
                  Millions
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleNumberFormat('indian')}
                  className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition-all ${
                    numFormat === 'indian'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                  title="Thousands, Lakhs, Crores"
                >
                  Lakhs
                </button>
              </div>
            </div>

            {/* Date Format */}
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-zinc-900 text-purple-400 border border-zinc-800">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-zinc-400 block font-medium">Date Format</span>
                  <span className="text-[11px] text-zinc-500">
                    Calendar display format
                  </span>
                </div>
              </div>
              <select
                value={dateFormat}
                onChange={(e) => handleChangeDateFormat(e.target.value as DateFormatSystem)}
                className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-white font-mono text-xs cursor-pointer focus:outline-none focus:border-purple-500"
              >
                <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY (UK/EU/IN)</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
              </select>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="text-zinc-400 block font-medium">Application Theme</span>
                <span className="text-[11px] text-zinc-500">
                  Switch between Apple-style Day Theme (Light) and Night Theme (Dark)
                </span>
              </div>
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-900 border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    theme === 'light'
                      ? 'bg-purple-600 text-white shadow-sm shadow-purple-950/40'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>Day Theme (Light)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    theme === 'dark'
                      ? 'bg-purple-600 text-white shadow-sm shadow-purple-950/40'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5 text-purple-300" />
                  <span>Night Theme (Dark)</span>
                </button>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between md:col-span-2">
              <div>
                <span className="text-zinc-400 block font-medium">Category Management</span>
                <span className="text-[11px] text-zinc-500">
                  Organize income and expense categories, subcategories, and colors
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('categories')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium cursor-pointer"
              >
                <Tag className="w-3.5 h-3.5 text-purple-400" />
                Manage Categories
              </button>
            </div>
          </div>
        </div>

        {/* Payment Methods & Regional Customization */}
        <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Wallet className="w-4 h-4 text-emerald-400" />
                <h3>Payment Methods & Regional Customization</h3>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Manage payment options tailored for your region ({settings?.base_currency || 'INR'}), or add custom methods for income, expense, and debt transactions.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleLoadRegionalPresets}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold cursor-pointer border border-zinc-700 transition-colors"
                title={`Reset to recommended regional defaults for ${settings?.base_currency || 'INR'}`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Load {settings?.base_currency || 'INR'} Presets</span>
              </button>
              <button
                type="button"
                onClick={openAddPaymentMethodModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer shadow-sm shadow-emerald-950/50 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Method</span>
              </button>
            </div>
          </div>

          {paymentMethodNotice && (
            <div className="px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{paymentMethodNotice}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {paymentMethods.length === 0 ? (
              <div className="col-span-full py-8 text-center text-zinc-500 text-xs bg-zinc-950/60 rounded-xl border border-dashed border-zinc-800">
                No payment methods found. Click "Load {settings?.base_currency || 'INR'} Presets" or "Add Method" to set up your payment accounts.
              </div>
            ) : (
              paymentMethods.map((pm) => (
                <div
                  key={pm.id}
                  className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                    pm.is_active === 1
                      ? 'bg-zinc-950 border-zinc-800/80 hover:border-zinc-700'
                      : 'bg-zinc-950/40 border-zinc-900 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-white/5"
                        style={{
                          backgroundColor: `${pm.color || '#8b5cf6'}25`,
                          color: pm.color || '#8b5cf6',
                        }}
                      >
                        {renderPaymentIcon(pm.icon || 'Wallet', 'w-4 h-4')}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-white truncate max-w-[130px]">
                            {pm.name}
                          </span>
                          {pm.is_default === 1 && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              DEFAULT
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500">
                            {pm.type_key}
                          </span>
                          <span className="text-zinc-700">•</span>
                          <span
                            className={`text-[10px] font-medium ${
                              pm.is_active === 1 ? 'text-emerald-500' : 'text-zinc-500'
                            }`}
                          >
                            {pm.is_active === 1 ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditPaymentMethodModal(pm)}
                        className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 cursor-pointer transition-colors"
                        title="Edit method"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      {pm.is_default !== 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeletePaymentMethod(pm)}
                          className="p-1.5 rounded-lg bg-zinc-900 hover:bg-rose-950/40 text-zinc-400 hover:text-rose-400 border border-zinc-800 hover:border-rose-900/50 cursor-pointer transition-colors"
                          title="Delete method"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-800/60">
                    <button
                      type="button"
                      onClick={() => handleTogglePaymentMethodActive(pm)}
                      className={`text-[11px] font-medium px-2 py-1 rounded-lg border transition-colors cursor-pointer ${
                        pm.is_active === 1
                          ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
                          : 'bg-emerald-950/30 hover:bg-emerald-900/40 text-emerald-400 border-emerald-800/40'
                      }`}
                    >
                      {pm.is_active === 1 ? 'Disable' : 'Enable'}
                    </button>

                    {pm.is_default !== 1 ? (
                      <button
                        type="button"
                        onClick={() => handleSetDefaultPaymentMethod(pm)}
                        className="text-[11px] font-medium text-purple-400 hover:text-purple-300 px-2 py-1 rounded-lg hover:bg-purple-950/30 cursor-pointer transition-colors"
                      >
                        Make Default
                      </button>
                    ) : (
                      <span className="text-[11px] text-zinc-500 font-medium px-2 py-1">
                        Primary Default
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Backup & Restore (AGENTS.md Section 5.7) */}
        <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Database className="w-4 h-4 text-blue-400" />
              <h3>Database Backup & Restore</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCustomBackupOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold cursor-pointer border border-zinc-700 transition-colors"
              >
                <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                Backup to Folder / USB
              </button>
              <button
                type="button"
                onClick={handleBackupNow}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 shadow-purple-950/50 text-white text-xs font-semibold cursor-pointer transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                Backup Now
              </button>
            </div>
          </div>

          <p className="text-xs text-zinc-400">
            DhanKhata creates automatic daily backups upon first launch of each day (keeping newest 10 backups). You can also generate immediate snapshots or restore from any existing backup below.
          </p>

          {backupNotice && (
            <div className="p-3 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="truncate">{backupNotice}</span>
            </div>
          )}

          {/* Backups List */}
          <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-950">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-900/90 text-zinc-400 font-semibold border-b border-zinc-800 uppercase">
                <tr>
                  <th className="py-2.5 px-4">Backup Snapshot File</th>
                  <th className="py-2.5 px-4">Created Date</th>
                  <th className="py-2.5 px-4 text-right">Size</th>
                  <th className="py-2.5 px-4 text-center">Restore</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {backups.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-zinc-500 text-xs">
                      No backups stored yet. Click "Backup Now" to create your first backup.
                    </td>
                  </tr>
                ) : (
                  backups.map((b) => (
                    <tr key={b.filename} className="hover:bg-zinc-800/20">
                      <td className="py-2.5 px-4 font-mono text-zinc-200 font-medium">
                        {b.filename}
                      </td>
                      <td className="py-2.5 px-4 text-zinc-400 font-mono text-[11px]">
                        {b.created_at}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-zinc-400">
                        {formatBytes(b.size_bytes)}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedBackupForRestore(b.file_path)}
                          className="px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[11px] font-semibold cursor-pointer transition-colors"
                        >
                          Restore
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Exchange Rates Management */}
        <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Coins className="w-4 h-4 text-amber-400" />
              <h3>Exchange Rates (Multi-Currency)</h3>
            </div>
            <button
              type="button"
              onClick={() => handleOpenRateModal()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 shadow-purple-950/50 text-white text-xs font-semibold cursor-pointer transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Add / Set Rate
            </button>
          </div>

          <p className="text-xs text-zinc-400">
            Manual exchange rates for converting foreign-denominated holdings and accounts into your base currency (<strong className="text-white">{settings?.base_currency || 'INR'}</strong>). Fully offline — no external live API calls.
          </p>

          <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-950">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-900/90 text-zinc-400 font-semibold border-b border-zinc-800 uppercase">
                <tr>
                  <th className="py-2.5 px-4">Currency Pair</th>
                  <th className="py-2.5 px-4 text-right">Conversion Rate</th>
                  <th className="py-2.5 px-4">Last Updated</th>
                  <th className="py-2.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {exchangeRates.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-zinc-500 text-xs">
                      No custom exchange rates configured. 1:1 fallback rate is currently active.
                    </td>
                  </tr>
                ) : (
                  exchangeRates.map((rate) => (
                    <tr key={rate.id} className="hover:bg-zinc-800/20">
                      <td className="py-2.5 px-4 font-bold text-white font-mono flex items-center gap-1.5">
                        <span>{rate.from_currency}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{rate.to_currency}</span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-purple-400">
                        1 {rate.from_currency} = {rate.rate.toFixed(4)} {rate.to_currency}
                      </td>
                      <td className="py-2.5 px-4 text-zinc-400 font-mono text-[11px]">
                        {rate.updated_at ? rate.updated_at.replace('T', ' ') : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            title="Edit Rate"
                            onClick={() =>
                              handleOpenRateModal(
                                rate.from_currency,
                                rate.to_currency,
                                String(rate.rate)
                              )
                            }
                            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Delete Rate"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Delete exchange rate for ${rate.from_currency} → ${rate.to_currency}?`
                                )
                              ) {
                                deleteExchangeRate(rate.id);
                              }
                            }}
                            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Linux Desktop Notifications & Bill Reminders */}
        <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Bell className="w-4 h-4 text-purple-400" />
              <h3>Desktop Notifications & Bill Reminders</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isTestingOs}
                onClick={handleTestOs}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold cursor-pointer border border-zinc-700 transition-colors disabled:opacity-50"
              >
                {isTestingOs ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-400" /> : <Bell className="w-3.5 h-3.5 text-purple-400" />}
                Test Desktop Alert
              </button>
            </div>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            Receive native Linux system notifications for unpaid bills due today or coming up soon, with automatic daily checks on application startup.
          </p>

          {notifyMessage && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                notifyMessage.type === 'success'
                  ? 'bg-purple-500/15 border border-purple-500/30 text-purple-300'
                  : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
              }`}
            >
              {notifyMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span className="truncate">{notifyMessage.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Notification Toggle */}
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-3">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-purple-400" />
                Notification Switch
              </span>

              <label className="flex items-start gap-3 cursor-pointer p-2 rounded-lg hover:bg-zinc-900/60 transition-colors">
                <input
                  type="checkbox"
                  checked={notifyOs}
                  onChange={(e) => setNotifyOs(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-zinc-700 text-purple-600 focus:ring-purple-500 bg-zinc-900 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-semibold text-zinc-200 block">
                    Enable Linux Desktop Alerts
                  </span>
                  <span className="text-[11px] text-zinc-500 block">
                    Trigger system tray popups for upcoming and overdue bills via notify-send.
                  </span>
                </div>
              </label>
            </div>

            {/* Advance Days Schedule */}
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-purple-400" />
                  Advance Notice Period
                </span>

                <label className="text-[11px] font-medium text-zinc-400 block">
                  Notify how many days before due date:
                </label>
                <select
                  value={notifyAdvanceDays}
                  onChange={(e) => setNotifyAdvanceDays(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  <option value={0}>On due date only</option>
                  <option value={1}>1 day in advance</option>
                  <option value={2}>2 days in advance</option>
                  <option value={3}>3 days in advance</option>
                  <option value={7}>7 days in advance</option>
                </select>
              </div>

              <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-end">
                <button
                  type="button"
                  disabled={isSavingNotify}
                  onClick={() => handleSaveNotificationSettings()}
                  className="w-full sm:w-auto px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 shadow-purple-950/50 text-white text-xs font-semibold cursor-pointer shadow-lg transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isSavingNotify ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  Save Notification Settings
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Security Settings Card */}
        <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            <h3>Security & Authentication</h3>
          </div>

          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-white block">
                6-Digit PIN Protection
              </span>
              <span className="text-xs text-zinc-400">
                Encrypted via bcrypt hash in local app storage
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setPinError(null);
                  setPinSuccess(null);
                  setCurrentPin('');
                  setNewPin('');
                  setConfirmPin('');
                  setIsPinModalOpen(true);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                Change PIN
              </button>
              <button
                type="button"
                onClick={lockApp}
                className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5 text-purple-400" />
                Lock App Now
              </button>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="p-5 rounded-2xl bg-red-950/20 border border-red-900/40 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-red-400">
            <Trash2 className="w-4 h-4" />
            <h3>Danger Zone</h3>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-zinc-950 border border-red-900/30">
            <div>
              <span className="text-xs font-semibold text-white block">
                Wipe All Database Records
              </span>
              <span className="text-xs text-zinc-400">
                Permanently deletes all accounts, ledger entries, investments, and resets the PIN
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsWipeModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-red-600/80 hover:bg-red-600 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Reset App Data
            </button>
          </div>
        </div>
      </div>

      {/* Change Base Currency Modal */}
      {isCurrencyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Coins className="w-5 h-5 text-purple-400" />
                Change Base Currency
              </h3>
              <button
                type="button"
                onClick={() => setIsCurrencyModalOpen(false)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCurrency} className="p-5 space-y-4">
              {currencyError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{currencyError}</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-300 block">
                  Quick Select World Currency:
                </label>
                <div className="grid grid-cols-4 gap-1.5 max-h-44 overflow-y-auto pr-1">
                  {POPULAR_CURRENCIES.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => setSelectedCurrency(c.code)}
                      className={`px-2 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center justify-between border cursor-pointer transition-all ${
                        selectedCurrency === c.code
                          ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
                          : 'bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
                      }`}
                    >
                      <span className="font-bold">{c.code}</span>
                      <span className="text-[11px] opacity-75">{c.symbol}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Or Custom Currency Code (3-4 uppercase letters)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. USD, EUR, GBP, INR"
                  value={selectedCurrency}
                  onChange={(e) => setSelectedCurrency(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 font-mono uppercase"
                />
                <p className="text-[11px] text-zinc-500 mt-1">
                  Changing base currency will recompute consolidated dashboard totals and net worth using current exchange rates.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-2">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={loadPresetsWithCurrency}
                    onChange={(e) => setLoadPresetsWithCurrency(e.target.checked)}
                    className="mt-0.5 rounded border-zinc-700 text-purple-600 focus:ring-purple-500"
                  />
                  <div>
                    <span className="text-xs font-semibold text-zinc-200 block">
                      Auto-apply regional payment methods for {selectedCurrency}
                    </span>
                    <span className="text-[11px] text-zinc-400 block">
                      Installs regional payment accounts (e.g. UPI for INR, Apple Pay/Google Pay/Zelle for USD, PayPay/Suica for JPY, Pix for BRL).
                    </span>
                  </div>
                </label>
                <div className="text-[11px] text-purple-400 flex items-center gap-1.5 font-medium pl-6">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Number system will adapt automatically to {selectedCurrency === 'INR' ? 'Indian Lakhs (10,00,000)' : 'International Millions (1,000,000)'}
                    {(ZERO_DECIMAL_CURRENCIES as readonly string[]).includes(selectedCurrency) ? ' with 0 decimals' : ''}.
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsCurrencyModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 shadow-purple-950/50 text-white text-xs font-semibold cursor-pointer shadow-lg shadow-purple-950/50 transition-colors"
                >
                  Save Currency
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change PIN Modal */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-400" />
                Change Security PIN
              </h3>
              <button
                type="button"
                onClick={() => setIsPinModalOpen(false)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleChangePin} className="p-5 space-y-4">
              {pinError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{pinError}</span>
                </div>
              )}

              {pinSuccess && (
                <div className="p-3 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{pinSuccess}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Current 6-Digit PIN *
                </label>
                <input
                  type="password"
                  required
                  maxLength={6}
                  placeholder="******"
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 font-mono tracking-widest text-center"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  New 6-Digit PIN *
                </label>
                <input
                  type="password"
                  required
                  maxLength={6}
                  placeholder="******"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 font-mono tracking-widest text-center"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Confirm New PIN *
                </label>
                <input
                  type="password"
                  required
                  maxLength={6}
                  placeholder="******"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 font-mono tracking-widest text-center"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsPinModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 shadow-purple-950/50 text-white text-xs font-semibold cursor-pointer shadow-lg shadow-purple-950/50 transition-colors"
                >
                  Update PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Backup to Custom Folder Modal */}
      {isCustomBackupOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-amber-400" />
                Backup to Folder / USB
              </h3>
              <button
                type="button"
                onClick={() => setIsCustomBackupOpen(false)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCustomBackup} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Destination Directory Path *
                </label>
                <input
                  type="text"
                  required
                  placeholder="/media/usb/backups or /home/user/Documents/backups"
                  value={customFolder}
                  onChange={(e) => setCustomFolder(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                />
                <p className="text-[11px] text-zinc-500 mt-1">
                  A snapshot database file (e.g. dhankhata_YYYYMMDD_HHMMSS.db) will be copied directly into this directory.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsCustomBackupOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 shadow-purple-950/50 text-white text-xs font-semibold cursor-pointer shadow-lg shadow-purple-950/50 transition-colors"
                >
                  Create Backup
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Restore Modal */}
      {selectedBackupForRestore && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-amber-950/70 border border-amber-900/80 text-amber-400 flex items-center justify-center mb-4">
              <Upload className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-white mb-2">
              Confirm Database Restore
            </h3>

            <p className="text-xs text-zinc-300 mb-4 bg-zinc-950 p-3 rounded-xl border border-zinc-800">
              Restoring this backup snapshot will replace all existing transactions, accounts, and holdings with the state from:
              <br />
              <span className="font-mono text-purple-400 block mt-1 break-all">
                {selectedBackupForRestore}
              </span>
            </p>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                disabled={isRestoring}
                onClick={() => setSelectedBackupForRestore(null)}
                className="px-4 py-2 rounded-xl bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isRestoring}
                onClick={handleConfirmRestore}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-900/30"
              >
                {isRestoring && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Confirm Restore
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {isWipeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-red-950/70 border border-red-900/80 text-red-400 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-white mb-2">
              Confirm Full App Reset
            </h3>

            <p className="text-xs text-zinc-300 mb-4 bg-zinc-950 p-3 rounded-xl border border-zinc-800">
              This action will irreversibly destroy all stored financial records and reset your security PIN.
            </p>

            <label className="block text-xs text-zinc-400 mb-1">
              Type <span className="font-mono text-white font-bold">RESET ALL DATA</span> to proceed:
            </label>
            <input
              type="text"
              value={wipeConfirmText}
              onChange={(e) => setWipeConfirmText(e.target.value)}
              placeholder="RESET ALL DATA"
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-red-500 mb-4 font-mono"
            />

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsWipeModalOpen(false);
                  setWipeConfirmText('');
                }}
                className="px-4 py-2 rounded-xl bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={wipeConfirmText !== 'RESET ALL DATA' || isProcessing}
                onClick={handleWipe}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer"
              >
                {isProcessing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Confirm Full Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Set Exchange Rate Modal */}
      {isRateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-400" />
                Set Exchange Rate
              </h3>
              <button
                type="button"
                onClick={() => setIsRateModalOpen(false)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRate} className="p-5 space-y-4">
              {rateError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{rateError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    From Currency *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. USD"
                    value={rateFrom}
                    onChange={(e) => setRateFrom(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    To Currency *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. INR"
                    value={rateTo}
                    onChange={(e) => setRateTo(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Exchange Rate (1 {rateFrom || 'FROM'} = X {rateTo || 'TO'}) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  min={0.000001}
                  placeholder="e.g. 85.00"
                  value={rateValue}
                  onChange={(e) => setRateValue(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                />
                <p className="text-[11px] text-zinc-500 mt-1">
                  Example: If 1 USD = 85.00 INR, enter 85.00.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsRateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 shadow-purple-950/50 text-white text-xs font-semibold cursor-pointer shadow-lg shadow-purple-950/50 transition-colors"
                >
                  Save Rate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Custom Payment Method Modal */}
      {isPaymentMethodModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">
                  {editingPaymentMethod ? 'Edit Payment Method' : 'Add Custom Payment Method'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPaymentMethodModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePaymentMethod} className="p-5 space-y-4">
              {paymentMethodError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{paymentMethodError}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Payment Method Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PhonePe, Apple Pay, PayPay, Chase Checking, Cash"
                  value={paymentMethodForm.name}
                  onChange={(e) =>
                    setPaymentMethodForm({ ...paymentMethodForm, name: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Account Type
                  </label>
                  <select
                    value={paymentMethodForm.type_key}
                    onChange={(e) =>
                      setPaymentMethodForm({ ...paymentMethodForm, type_key: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 font-medium cursor-pointer"
                  >
                    <option value="cash">Cash / Physical</option>
                    <option value="bank">Bank Account / Wire</option>
                    <option value="card">Card (Credit/Debit)</option>
                    <option value="upi">UPI / Instant QR</option>
                    <option value="wallet">Digital Wallet / Pay App</option>
                    <option value="crypto">Crypto / Web3</option>
                    <option value="custom">Custom Regional</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Badge Color
                  </label>
                  <div className="flex items-center gap-1.5 pt-1">
                    {['#8b5cf6', '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#64748b'].map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => setPaymentMethodForm({ ...paymentMethodForm, color: hex })}
                        className={`w-5 h-5 rounded-full border cursor-pointer transition-transform ${
                          paymentMethodForm.color === hex
                            ? 'scale-125 border-white shadow-sm'
                            : 'border-transparent hover:scale-110 opacity-70 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                  Display Icon
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { name: 'Wallet', icon: Wallet },
                    { name: 'Coins', icon: Coins },
                    { name: 'Building2', icon: Building2 },
                    { name: 'CreditCard', icon: CreditCard },
                    { name: 'Smartphone', icon: Smartphone },
                    { name: 'Send', icon: Send },
                    { name: 'Zap', icon: Zap },
                    { name: 'Globe', icon: Globe },
                    { name: 'FileText', icon: FileText },
                  ].map((ic) => {
                    const IconComp = ic.icon;
                    const isSelected = paymentMethodForm.icon === ic.name;
                    return (
                      <button
                        key={ic.name}
                        type="button"
                        onClick={() => setPaymentMethodForm({ ...paymentMethodForm, icon: ic.name })}
                        className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-purple-600/20 border-purple-500 text-purple-300 shadow-sm'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'
                        }`}
                      >
                        <IconComp className="w-4 h-4" />
                        <span className="text-[10px] font-mono leading-none">{ic.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={paymentMethodForm.is_default}
                    onChange={(e) =>
                      setPaymentMethodForm({ ...paymentMethodForm, is_default: e.target.checked })
                    }
                    className="rounded border-zinc-700 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-xs font-semibold text-zinc-200">
                    Set as default primary payment method
                  </span>
                </label>
                <p className="text-[11px] text-zinc-500 pl-5 mt-0.5">
                  Default method is automatically pre-selected when creating new transactions or loan disbursements.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsPaymentMethodModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold cursor-pointer shadow-lg shadow-purple-950/50 transition-colors"
                >
                  {editingPaymentMethod ? 'Save Changes' : 'Create Method'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
