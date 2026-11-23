import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  KeyRound,
  Link2,
  RefreshCw,
  Send,
  ShieldCheck,
  Users,
  XCircle,
} from 'lucide-react';
import { Avatar } from '../components/common/Avatar';
import { useLanguage } from '../context/LanguageContext';
import { useTaskFlow } from '../context/TaskFlowContext';
import { formatThaiDateTime } from '../utils/dateUtils';

interface TelegramBotInfo {
  id: number;
  firstName: string;
  username: string;
}

interface TelegramDiscoveredChat {
  chatId: string;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  displayName: string;
  username?: string;
  lastSeenAt: string;
}

interface DeliveryLogItem {
  id: string;
  timestamp: string;
  eventType: 'test' | 'assigned' | 'comment' | 'status_changed';
  taskCode?: string;
  targetMasked: string;
  status: 'sent' | 'failed';
  detail: string;
}

interface TelegramStatusResponse {
  configured: boolean;
  hasBotToken: boolean;
  hasCustomWebhookSecret: boolean;
  hasDefaultChatId: boolean;
  defaultChatMasked: string | null;
  webhookUrl: string;
  webhookRegistered: boolean;
  webhookCurrentHost: string | null;
  botInfo: TelegramBotInfo | null;
  discoveredChats: TelegramDiscoveredChat[];
  recentDeliveries: DeliveryLogItem[];
}

const TELEGRAM_CHAT_ID_RE = /^-?\d{5,20}$/;

export function TelegramPage() {
  const {
    users,
    currentUser,
    telegramConfig,
    updateTelegramConfig,
    setMemberTelegramChatId,
    addToast,
  } = useTaskFlow();
  const { lang, t } = useLanguage();

  const [status, setStatus] = useState<TelegramStatusResponse | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const [registeringWebhook, setRegisteringWebhook] = useState(false);
  const [webhookFeedback, setWebhookFeedback] = useState<{ ok: boolean; message: string } | null>(
    null
  );

  const [chatInput, setChatInput] = useState(telegramConfig.defaultChatId);
  const [chatError, setChatError] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [testFeedback, setTestFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    setChatInput(telegramConfig.defaultChatId);
  }, [telegramConfig.defaultChatId]);

  const fetchStatus = useCallback(
    async (forceRefresh = false) => {
      setLoadingStatus(true);
      setStatusError(null);
      try {
        const resp = await fetch(`/api/telegram/status${forceRefresh ? '?refresh=1' : ''}`);
        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}`);
        }
        const data = (await resp.json()) as TelegramStatusResponse;
        setStatus(data);
      } catch {
        setStatusError(
          lang === 'en'
            ? 'Unable to reach the Telegram backend route. Please restart the dev server.'
            : 'ไม่สามารถเชื่อมต่อ API ของเซิร์ฟเวอร์ได้ กรุณารีสตาร์ทเซิร์ฟเวอร์แล้วลองใหม่'
        );
      } finally {
        setLoadingStatus(false);
      }
    },
    [lang]
  );

  useEffect(() => {
    void fetchStatus(false);
  }, [fetchStatus]);

  const handleCopyWebhook = async () => {
    if (!status?.webhookUrl) return;
    try {
      await navigator.clipboard.writeText(status.webhookUrl);
      setCopiedWebhook(true);
      addToast(t.toasts.webhookCopied, 'info');
      window.setTimeout(() => setCopiedWebhook(false), 2000);
    } catch {
      // Clipboard fallback ignored cleanly
    }
  };

  const handleRegisterWebhook = async () => {
    setRegisteringWebhook(true);
    setWebhookFeedback(null);
    try {
      const resp = await fetch('/api/telegram/webhook/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = (await resp.json()) as {
        ok?: boolean;
        detail?: string;
        error?: string;
        webhookRegistered?: boolean;
      };
      if (resp.ok && json.ok) {
        setWebhookFeedback({ ok: true, message: t.toasts.telegramWebhookRegistered });
        addToast(t.toasts.telegramWebhookRegistered);
        setStatus((prev) => (prev ? { ...prev, webhookRegistered: true } : prev));
      } else {
        const errMsg = json.error || json.detail || 'Failed to register Telegram webhook';
        setWebhookFeedback({ ok: false, message: errMsg });
        addToast(errMsg, 'error');
      }
    } catch {
      const errMsg =
        lang === 'en'
          ? 'Network error while registering webhook'
          : 'เกิดข้อผิดพลาดระหว่างลงทะเบียน Webhook';
      setWebhookFeedback({ ok: false, message: errMsg });
      addToast(errMsg, 'error');
    } finally {
      setRegisteringWebhook(false);
    }
  };

  const handleChatBlurOrSave = (rawVal: string) => {
    const trimmed = rawVal.trim();
    if (trimmed && !TELEGRAM_CHAT_ID_RE.test(trimmed)) {
      setChatError(t.telegram.invalidChatError);
      return;
    }
    setChatError('');
    if (trimmed !== telegramConfig.defaultChatId) {
      updateTelegramConfig({ defaultChatId: trimmed });
      addToast(t.toasts.telegramPrefsSaved);
    }
  };

  const handleSendTest = async () => {
    const trimmed = chatInput.trim();
    if (trimmed && !TELEGRAM_CHAT_ID_RE.test(trimmed)) {
      setChatError(t.telegram.invalidChatError);
      return;
    }
    setChatError('');
    setTestFeedback(null);
    setSendingTest(true);

    try {
      const resp = await fetch('/api/telegram/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: trimmed || undefined,
          lang,
          actorName: currentUser.name,
        }),
      });
      const json = (await resp.json()) as {
        ok?: boolean;
        detail?: string;
        error?: string;
        recentDeliveries?: DeliveryLogItem[];
      };

      if (json.recentDeliveries) {
        setStatus((prev) =>
          prev ? { ...prev, recentDeliveries: json.recentDeliveries! } : prev
        );
      }

      if (resp.ok && json.ok) {
        setTestFeedback({ ok: true, message: t.toasts.telegramTestSent });
        addToast(t.toasts.telegramTestSent);
      } else {
        const errMsg = json.error || json.detail || 'Telegram API request failed';
        setTestFeedback({ ok: false, message: errMsg });
        addToast(errMsg, 'error');
      }
    } catch {
      const errMsg =
        lang === 'en'
          ? 'Network error while sending test message'
          : 'เกิดข้อผิดพลาดระหว่างเชื่อมต่อเซิร์ฟเวอร์';
      setTestFeedback({ ok: false, message: errMsg });
      addToast(errMsg, 'error');
    } finally {
      setSendingTest(false);
    }
  };

  const discoveredPrivateChats = (status?.discoveredChats ?? []).filter(
    (c) => c.type === 'private'
  );

  const getChatTypeLabel = (type: TelegramDiscoveredChat['type']) => {
    if (type === 'group') return t.telegram.typeGroup;
    if (type === 'supergroup') return t.telegram.typeSupergroup;
    if (type === 'channel') return t.telegram.typeChannel;
    return t.telegram.typePrivate;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {t.telegram.heading}
          </h1>
          <p className="text-sm text-slate-500 mt-1">{t.telegram.subtitle}</p>
        </div>

        <button
          type="button"
          onClick={() => void fetchStatus(true)}
          disabled={loadingStatus}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          <RefreshCw
            className={`w-4 h-4 shrink-0 ${loadingStatus ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          <span>{t.telegram.refreshBtn}</span>
        </button>
      </div>

      {statusError && (
        <div
          role="alert"
          className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2.5 text-sm text-red-700"
        >
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{statusError}</span>
        </div>
      )}

      {/* Connection Status & Webhook Card */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0">
              <Send className="w-6 h-6" aria-hidden="true" />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold text-slate-900 truncate">
                  {status?.botInfo?.firstName || 'Telegram Bot'}
                </h2>
                {status?.botInfo?.username && (
                  <span className="text-xs font-mono text-slate-500">
                    @{status.botInfo.username}
                  </span>
                )}
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                <span
                  className={`inline-flex items-center gap-1 font-semibold ${
                    status?.configured ? 'text-emerald-700' : 'text-amber-700'
                  }`}
                >
                  {status?.configured ? (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  )}
                  <span>
                    {status?.configured ? t.telegram.statusConnected : t.telegram.statusPending}
                  </span>
                </span>

                <span aria-hidden="true" className="text-slate-300">
                  ·
                </span>

                <span className={status?.hasBotToken ? 'text-slate-600' : 'text-slate-400'}>
                  {status?.hasBotToken ? t.telegram.tokenReady : t.telegram.tokenMissing}
                </span>

                <span aria-hidden="true" className="text-slate-300">
                  ·
                </span>

                <span
                  className={
                    status?.webhookRegistered
                      ? 'text-emerald-700 font-medium'
                      : 'text-slate-500'
                  }
                >
                  {status?.webhookRegistered
                    ? t.telegram.webhookReady
                    : t.telegram.webhookNotRegistered}
                </span>

                {status?.configured && (
                  <>
                    <span aria-hidden="true" className="text-slate-300">
                      ·
                    </span>
                    <span className="text-slate-500">
                      {status.hasCustomWebhookSecret
                        ? t.telegram.secretCustom
                        : t.telegram.secretAuto}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Secrets guidance when not yet configured */}
        {status && !status.configured && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-start gap-3">
            <KeyRound className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-1 text-xs">
              <p className="font-semibold text-slate-900">{t.telegram.secretsNoticeTitle}</p>
              <p className="text-slate-600 leading-relaxed">{t.telegram.secretsNoticeDesc}</p>
            </div>
          </div>
        )}

        {/* Copyable Webhook URL + 1-Click Auto-Register */}
        <div className="space-y-2">
          <label
            htmlFor="telegram-webhook-url"
            className="block text-xs font-semibold text-slate-700"
          >
            {t.telegram.webhookLabel}
          </label>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              id="telegram-webhook-url"
              type="text"
              readOnly
              value={status?.webhookUrl ?? ''}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 h-10 px-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-600"
            />
            <button
              type="button"
              onClick={() => void handleCopyWebhook()}
              disabled={!status?.webhookUrl}
              className="inline-flex items-center justify-center gap-1.5 h-10 px-3.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              {copiedWebhook ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                  <span>{t.telegram.copiedBtn}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{t.telegram.copyBtn}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => void handleRegisterWebhook()}
              disabled={registeringWebhook || !status?.configured}
              className="inline-flex items-center justify-center gap-1.5 h-10 px-4 text-xs font-medium text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2"
            >
              <Link2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>
                {registeringWebhook
                  ? t.telegram.registeringWebhookBtn
                  : t.telegram.registerWebhookBtn}
              </span>
            </button>
          </div>

          {webhookFeedback && (
            <p
              className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                webhookFeedback.ok ? 'text-emerald-700' : 'text-red-600'
              }`}
            >
              {webhookFeedback.ok ? (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              ) : (
                <XCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              )}
              <span>{webhookFeedback.message}</span>
            </p>
          )}

          <p className="text-xs text-slate-500 leading-relaxed">{t.telegram.webhookHint}</p>
        </div>
      </section>

      {/* Main 2-Column Configuration & Setup Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Routing Rules, Chat Binding & Test Push */}
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {t.telegram.routingSectionTitle}
            </h2>
            <p className="text-xs text-slate-500 mt-1">{t.telegram.routingSectionSub}</p>
          </div>

          {/* Master Toggle & Trigger Checkboxes */}
          <div className="space-y-3 pt-1">
            <label className="flex items-center justify-between gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer">
              <span className="text-sm font-semibold text-slate-900">
                {t.telegram.enableAutoLabel}
              </span>
              <input
                type="checkbox"
                checked={telegramConfig.enabled}
                onChange={(e) => updateTelegramConfig({ enabled: e.target.checked })}
                className="w-4 h-4 accent-blue-600 rounded"
              />
            </label>

            <div className="space-y-2 pl-1">
              <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!telegramConfig.enabled}
                  checked={telegramConfig.notifyOnAssign}
                  onChange={(e) => updateTelegramConfig({ notifyOnAssign: e.target.checked })}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
                <span>{t.telegram.triggerAssign}</span>
              </label>

              <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!telegramConfig.enabled}
                  checked={telegramConfig.notifyOnComment}
                  onChange={(e) => updateTelegramConfig({ notifyOnComment: e.target.checked })}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
                <span>{t.telegram.triggerComment}</span>
              </label>

              <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!telegramConfig.enabled}
                  checked={telegramConfig.notifyOnStatusChange}
                  onChange={(e) =>
                    updateTelegramConfig({ notifyOnStatusChange: e.target.checked })
                  }
                  className="w-4 h-4 accent-blue-600 rounded"
                />
                <span>{t.telegram.triggerStatus}</span>
              </label>
            </div>
          </div>

          {/* Default Telegram Chat ID */}
          <div className="pt-4 border-t border-slate-100 space-y-2.5">
            <label
              htmlFor="telegram-default-chat"
              className="block text-xs font-semibold text-slate-700"
            >
              {t.telegram.defaultChatLabel}
            </label>
            <input
              id="telegram-default-chat"
              type="text"
              inputMode="numeric"
              value={chatInput}
              onChange={(e) => {
                setChatInput(e.target.value);
                if (chatError) setChatError('');
              }}
              onBlur={() => handleChatBlurOrSave(chatInput)}
              placeholder={t.telegram.defaultChatPlaceholder}
              className={`w-full h-10 px-3 text-xs font-mono bg-white border rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                chatError
                  ? 'border-red-500 focus:border-red-600 focus:ring-red-500/15'
                  : 'border-slate-300 focus:border-blue-600 focus:ring-blue-600/15'
              }`}
            />
            {chatError && (
              <p role="alert" className="flex items-center gap-1.5 text-xs text-red-600">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>{chatError}</span>
              </p>
            )}
            {status?.defaultChatMasked && (
              <p className="text-xs text-slate-500 tabular-nums">
                {t.telegram.defaultChatServerFallback(status.defaultChatMasked)}
              </p>
            )}

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void handleSendTest()}
                disabled={sendingTest}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
              >
                <Send className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>{sendingTest ? t.telegram.testPushSending : t.telegram.testPushBtn}</span>
              </button>

              {testFeedback && (
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                    testFeedback.ok ? 'text-emerald-700' : 'text-red-600'
                  }`}
                >
                  {testFeedback.ok ? (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  )}
                  <span>{testFeedback.message}</span>
                </span>
              )}
            </div>
          </div>

          {/* Discovered Webhook Chats */}
          <div className="pt-4 border-t border-slate-100 space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                <span>{t.telegram.discoveredChatsLabel}</span>
              </h3>
              <span className="text-xs text-slate-400 tabular-nums">
                {status?.discoveredChats.length ?? 0}
              </span>
            </div>

            {!status || status.discoveredChats.length === 0 ? (
              <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 border border-slate-200/80 rounded-lg p-3">
                {t.telegram.discoveredChatsEmpty}
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                {status.discoveredChats.map((item) => (
                  <li
                    key={item.chatId}
                    className="px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 bg-white hover:bg-slate-50/70"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-semibold text-slate-900 truncate">
                          {item.displayName}
                        </span>
                        {item.username && (
                          <span className="text-slate-400 font-mono truncate">
                            @{item.username}
                          </span>
                        )}
                        <span aria-hidden="true" className="text-slate-300">
                          ·
                        </span>
                        <span className="text-slate-500">{getChatTypeLabel(item.type)}</span>
                      </div>
                      <p className="text-[11px] font-mono text-slate-500 truncate mt-0.5 tabular-nums">
                        {item.chatId}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setChatInput(item.chatId);
                        handleChatBlurOrSave(item.chatId);
                      }}
                      className="px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-md transition-colors whitespace-nowrap shrink-0"
                    >
                      {t.telegram.useAsWorkspaceBtn}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Right: 4-Step Setup Guide */}
        <aside className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" aria-hidden="true" />
            <h2 className="text-base font-semibold text-slate-900">{t.telegram.setupTitle}</h2>
          </div>

          <ol className="space-y-3.5">
            {t.telegram.setupSteps.map((step, idx) => (
              <li key={idx} className="flex items-start gap-3 text-xs sm:text-sm text-slate-600">
                <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-700 font-semibold text-xs inline-flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
                  {idx + 1}
                </span>
                <span className="leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </aside>
      </div>

      {/* Per-Member Telegram Chat ID Mapping Table */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">
            {t.telegram.memberMappingTitle}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">{t.telegram.memberMappingSub}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
                <th className="py-2.5 px-5">{t.telegram.colMember}</th>
                <th className="py-2.5 px-4">{t.telegram.colTelegramChatId}</th>
                {discoveredPrivateChats.length > 0 && (
                  <th className="py-2.5 px-4">{t.telegram.colQuickSelect}</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {users.map((member) => {
                const currentChatId = telegramConfig.memberChatIds[member.id] ?? '';
                const isInvalid = Boolean(
                  currentChatId && !TELEGRAM_CHAT_ID_RE.test(currentChatId)
                );
                return (
                  <tr key={member.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-2.5">
                        <Avatar user={member} size="sm" showTooltip={false} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {member.name}
                          </p>
                          <p className="text-xs text-slate-500 truncate">{member.role}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 max-w-md">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={currentChatId}
                          onChange={(e) => setMemberTelegramChatId(member.id, e.target.value)}
                          placeholder="123456789"
                          aria-label={`${t.telegram.colTelegramChatId} ${member.name}`}
                          className={`flex-1 h-9 px-2.5 text-xs font-mono bg-white border rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                            isInvalid
                              ? 'border-red-500 focus:border-red-600 focus:ring-red-500/15'
                              : 'border-slate-200 focus:border-blue-600 focus:ring-blue-600/15'
                          }`}
                        />
                        {currentChatId && (
                          <button
                            type="button"
                            onClick={() => setMemberTelegramChatId(member.id, '')}
                            className="px-2 py-1 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors whitespace-nowrap"
                          >
                            {t.telegram.clearIdBtn}
                          </button>
                        )}
                      </div>
                    </td>

                    {discoveredPrivateChats.length > 0 && (
                      <td className="py-3 px-4">
                        <select
                          value={
                            discoveredPrivateChats.some((c) => c.chatId === currentChatId)
                              ? currentChatId
                              : ''
                          }
                          onChange={(e) => {
                            if (e.target.value) setMemberTelegramChatId(member.id, e.target.value);
                          }}
                          className="h-9 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-blue-600"
                        >
                          <option value="">{t.telegram.selectDiscoveredPlaceholder}</option>
                          {discoveredPrivateChats.map((dc) => (
                            <option key={dc.chatId} value={dc.chatId}>
                              {dc.displayName} ({dc.chatId})
                            </option>
                          ))}
                        </select>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recent Delivery Log */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-slate-900">{t.telegram.deliveryTitle}</h2>
          <span className="text-xs text-slate-400 tabular-nums">
            {status?.recentDeliveries.length ?? 0}
          </span>
        </div>

        {!status || status.recentDeliveries.length === 0 ? (
          <p className="px-5 py-8 text-center text-xs text-slate-500">
            {t.telegram.deliveryEmpty}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold">
                  <th className="py-2.5 px-5">{t.telegram.colTime}</th>
                  <th className="py-2.5 px-4">{t.telegram.colEvent}</th>
                  <th className="py-2.5 px-4">{t.telegram.colTarget}</th>
                  <th className="py-2.5 px-5">{t.telegram.colResult}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {status.recentDeliveries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-5 text-slate-500 tabular-nums whitespace-nowrap">
                      {formatThaiDateTime(entry.timestamp, lang)}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-slate-800 whitespace-nowrap">
                      {t.telegram.eventLabels[entry.eventType]}
                      {entry.taskCode ? (
                        <span className="ml-1.5 font-mono text-slate-500">{entry.taskCode}</span>
                      ) : null}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-500 whitespace-nowrap tabular-nums">
                      {entry.targetMasked}
                    </td>
                    <td className="py-2.5 px-5">
                      <span
                        className={`font-semibold ${
                          entry.status === 'sent' ? 'text-emerald-700' : 'text-red-600'
                        }`}
                      >
                        {entry.status === 'sent'
                          ? t.telegram.statusSent
                          : t.telegram.statusFailed}
                      </span>
                      <span className="text-slate-400 ml-2">{entry.detail}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
