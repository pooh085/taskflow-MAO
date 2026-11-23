import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express, { type NextFunction, type Request, type Response } from 'express';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const LINE_API_BASE = 'https://api.line.me/v2/bot';
const LINE_TARGET_ID_RE = /^[UCR][0-9a-fA-F]{32}$/;
const TELEGRAM_API_BASE = 'https://api.telegram.org';
const TELEGRAM_CHAT_ID_RE = /^-?\d{5,20}$/;
const TELEGRAM_SECRET_RE = /^[A-Za-z0-9_-]{1,256}$/;

interface BotInfo {
  displayName: string;
  basicId: string;
  userId: string;
  pictureUrl?: string;
}

interface DiscoveredTarget {
  id: string;
  type: 'user' | 'group' | 'room';
  displayName: string;
  lastSeenAt: string;
}

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

const discoveredTargets = new Map<string, DiscoveredTarget>();
const recentDeliveries: DeliveryLogItem[] = [];
let cachedBotInfo: { data: BotInfo | null; fetchedAt: number } = { data: null, fetchedAt: 0 };

const discoveredTelegramChats = new Map<string, TelegramDiscoveredChat>();
const recentTelegramDeliveries: DeliveryLogItem[] = [];
let cachedTelegramBotInfo: { data: TelegramBotInfo | null; fetchedAt: number } = {
  data: null,
  fetchedAt: 0,
};

function getLineAccessToken(): string {
  return (process.env.LINE_CHANNEL_ACCESS_TOKEN ?? '').trim();
}

function getLineChannelSecret(): string {
  return (process.env.LINE_CHANNEL_SECRET ?? '').trim();
}

function getDefaultTargetId(): string {
  const val = (process.env.LINE_DEFAULT_TARGET_ID ?? '').trim();
  return LINE_TARGET_ID_RE.test(val) ? val : '';
}

function maskTargetId(targetId: string): string {
  if (!targetId || targetId.length < 10) return '—';
  return `${targetId.slice(0, 5)}…${targetId.slice(-4)}`;
}

function sanitizeHttpsUrl(raw?: string): string | undefined {
  if (!raw) return undefined;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol === 'https:') {
      return parsed.toString();
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function clampString(val: unknown, maxLen: number): string {
  if (typeof val !== 'string') return '';
  return val.trim().slice(0, maxLen);
}

function getPublicBaseUrl(req: Request): string {
  const envUrl = (process.env.APP_URL ?? '').trim().replace(/\/+$/, '');
  if (envUrl && envUrl !== 'MY_APP_URL') {
    const safe = sanitizeHttpsUrl(envUrl);
    if (safe) return safe.replace(/\/+$/, '');
  }
  const proto = (req.headers['x-forwarded-proto'] as string)?.split(',')[0]?.trim() || req.protocol;
  const host = (req.headers['x-forwarded-host'] as string)?.split(',')[0]?.trim() || req.get('host') || `localhost:${PORT}`;
  return `${proto}://${host}`;
}

function pushDeliveryLog(entry: Omit<DeliveryLogItem, 'id' | 'timestamp'>): void {
  recentDeliveries.unshift({
    id: `dlv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString().slice(0, 19),
    ...entry,
  });
  if (recentDeliveries.length > 25) {
    recentDeliveries.length = 25;
  }
}

function verifySameOrigin(req: Request, res: Response, next: NextFunction): void {
  const origin = req.headers.origin;
  if (!origin) {
    next();
    return;
  }
  try {
    const originHost = new URL(origin).host;
    const expectedHost =
      (req.headers['x-forwarded-host'] as string)?.split(',')[0]?.trim() || req.get('host');
    if (expectedHost && originHost === expectedHost) {
      next();
      return;
    }
  } catch {
    // fall through to reject
  }
  res.status(403).json({ error: 'Origin not permitted' });
}

function verifyLineSignature(rawBody: Buffer, signatureHeader: string | undefined, secret: string): boolean {
  if (!signatureHeader || !secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
  const expectedBuf = Buffer.from(expected, 'utf8');
  const providedBuf = Buffer.from(signatureHeader.trim(), 'utf8');
  if (expectedBuf.length !== providedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, providedBuf);
}

async function fetchLineBotInfo(forceRefresh = false): Promise<BotInfo | null> {
  const token = getLineAccessToken();
  if (!token) {
    cachedBotInfo = { data: null, fetchedAt: 0 };
    return null;
  }
  const now = Date.now();
  if (!forceRefresh && cachedBotInfo.data && now - cachedBotInfo.fetchedAt < 60_000) {
    return cachedBotInfo.data;
  }
  try {
    const resp = await fetch(`${LINE_API_BASE}/info`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!resp.ok) {
      cachedBotInfo = { data: null, fetchedAt: now };
      return null;
    }
    const json = (await resp.json()) as {
      displayName?: string;
      basicId?: string;
      userId?: string;
      pictureUrl?: string;
    };
    const info: BotInfo = {
      displayName: clampString(json.displayName, 80) || 'LINE Official Account',
      basicId: clampString(json.basicId, 60),
      userId: clampString(json.userId, 60),
      pictureUrl: sanitizeHttpsUrl(json.pictureUrl),
    };
    cachedBotInfo = { data: info, fetchedAt: now };
    return info;
  } catch {
    return null;
  }
}

async function fetchLineDisplayName(
  type: 'user' | 'group' | 'room',
  id: string
): Promise<string> {
  const token = getLineAccessToken();
  if (!token || !LINE_TARGET_ID_RE.test(id)) {
    return type === 'group' ? `LINE Group (${maskTargetId(id)})` : `LINE User (${maskTargetId(id)})`;
  }
  try {
    if (type === 'user') {
      const resp = await fetch(`${LINE_API_BASE}/profile/${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) {
        const json = (await resp.json()) as { displayName?: string };
        const name = clampString(json.displayName, 80);
        if (name) return name;
      }
    } else if (type === 'group') {
      const resp = await fetch(`${LINE_API_BASE}/group/${encodeURIComponent(id)}/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) {
        const json = (await resp.json()) as { groupName?: string };
        const name = clampString(json.groupName, 80);
        if (name) return name;
      }
    }
  } catch {
    // ignore lookup failures
  }
  return type === 'group' ? `LINE Group (${maskTargetId(id)})` : `LINE User (${maskTargetId(id)})`;
}

async function sendLineReply(replyToken: string, text: string): Promise<void> {
  const token = getLineAccessToken();
  if (!token || !replyToken) return;
  try {
    await fetch(`${LINE_API_BASE}/message/reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        replyToken,
        messages: [{ type: 'text', text: text.slice(0, 1000) }],
      }),
    });
  } catch {
    // non-fatal reply error
  }
}

async function sendLinePush(
  targetId: string,
  messages: Array<Record<string, unknown>>
): Promise<{ ok: boolean; status: number; detail: string }> {
  const token = getLineAccessToken();
  if (!token) {
    return {
      ok: false,
      status: 503,
      detail: 'LINE_CHANNEL_ACCESS_TOKEN is not configured in server Secrets.',
    };
  }
  if (!LINE_TARGET_ID_RE.test(targetId)) {
    return {
      ok: false,
      status: 400,
      detail: 'Invalid LINE target ID format (expected U..., C..., or R... 33-character ID).',
    };
  }

  try {
    const resp = await fetch(`${LINE_API_BASE}/message/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: targetId,
        messages,
      }),
    });

    if (resp.ok) {
      return { ok: true, status: 200, detail: 'Delivered via LINE Messaging API' };
    }

    let apiMessage = `LINE API returned HTTP ${resp.status}`;
    try {
      const errJson = (await resp.json()) as { message?: string };
      if (errJson.message) {
        apiMessage = clampString(errJson.message, 180);
      }
    } catch {
      // ignore json parse failure
    }
    return { ok: false, status: resp.status, detail: apiMessage };
  } catch {
    return { ok: false, status: 502, detail: 'Unable to reach LINE Messaging API' };
  }
}

function buildTaskFlexMessage(params: {
  eventType: 'test' | 'assigned' | 'comment' | 'status_changed';
  taskCode?: string;
  taskTitle: string;
  projectName?: string;
  actorName: string;
  statusLabel?: string;
  commentPreview?: string;
  dueDate?: string;
  lang: 'th' | 'en';
  taskUrl?: string;
}): Record<string, unknown> {
  const isThai = params.lang === 'th';

  const headerMap = {
    test: {
      badge: isThai ? 'ทดสอบการเชื่อมต่อ' : 'Connection Test',
      accent: '#2563EB',
    },
    assigned: {
      badge: isThai ? 'มอบหมายงานใหม่' : 'New Task Assigned',
      accent: '#2563EB',
    },
    comment: {
      badge: isThai ? 'ความคิดเห็นใหม่' : 'New Comment',
      accent: '#0F172A',
    },
    status_changed: {
      badge: isThai ? 'อัปเดตสถานะงาน' : 'Status Updated',
      accent: '#059669',
    },
  };

  const header = headerMap[params.eventType];
  const altPrefix = params.taskCode ? `[${params.taskCode}] ` : '';
  const altText = `${header.badge}: ${altPrefix}${params.taskTitle}`.slice(0, 380);

  const metaRows: Array<Record<string, unknown>> = [
    {
      type: 'box',
      layout: 'baseline',
      spacing: 'sm',
      contents: [
        {
          type: 'text',
          text: isThai ? 'โดย' : 'By',
          color: '#64748B',
          size: 'xs',
          flex: 2,
        },
        {
          type: 'text',
          text: params.actorName,
          wrap: true,
          color: '#0F172A',
          size: 'xs',
          flex: 5,
        },
      ],
    },
  ];

  if (params.projectName) {
    metaRows.push({
      type: 'box',
      layout: 'baseline',
      spacing: 'sm',
      contents: [
        {
          type: 'text',
          text: isThai ? 'โปรเจกต์' : 'Project',
          color: '#64748B',
          size: 'xs',
          flex: 2,
        },
        {
          type: 'text',
          text: params.projectName,
          wrap: true,
          color: '#0F172A',
          size: 'xs',
          flex: 5,
        },
      ],
    });
  }

  if (params.statusLabel) {
    metaRows.push({
      type: 'box',
      layout: 'baseline',
      spacing: 'sm',
      contents: [
        {
          type: 'text',
          text: isThai ? 'สถานะ' : 'Status',
          color: '#64748B',
          size: 'xs',
          flex: 2,
        },
        {
          type: 'text',
          text: params.statusLabel,
          wrap: true,
          color: '#1D4ED8',
          weight: 'bold',
          size: 'xs',
          flex: 5,
        },
      ],
    });
  }

  if (params.dueDate) {
    metaRows.push({
      type: 'box',
      layout: 'baseline',
      spacing: 'sm',
      contents: [
        {
          type: 'text',
          text: isThai ? 'กำหนดส่ง' : 'Due Date',
          color: '#64748B',
          size: 'xs',
          flex: 2,
        },
        {
          type: 'text',
          text: params.dueDate,
          wrap: true,
          color: '#0F172A',
          size: 'xs',
          flex: 5,
        },
      ],
    });
  }

  const bodyContents: Array<Record<string, unknown>> = [
    {
      type: 'text',
      text: params.taskCode ? `${header.badge} · ${params.taskCode}` : header.badge,
      weight: 'bold',
      color: header.accent,
      size: 'xs',
    },
    {
      type: 'text',
      text: params.taskTitle,
      weight: 'bold',
      size: 'md',
      color: '#0F172A',
      wrap: true,
      margin: 'sm',
    },
  ];

  if (params.commentPreview) {
    bodyContents.push({
      type: 'box',
      layout: 'vertical',
      margin: 'md',
      paddingAll: '10px',
      backgroundColor: '#F8FAFC',
      cornerRadius: '6px',
      contents: [
        {
          type: 'text',
          text: `“${params.commentPreview}”`,
          size: 'xs',
          color: '#334155',
          wrap: true,
        },
      ],
    });
  }

  bodyContents.push({
    type: 'separator',
    margin: 'md',
    color: '#E2E8F0',
  });

  bodyContents.push({
    type: 'box',
    layout: 'vertical',
    margin: 'md',
    spacing: 'xs',
    contents: metaRows,
  });

  const bubble: Record<string, unknown> = {
    type: 'bubble',
    size: 'kilo',
    body: {
      type: 'box',
      layout: 'vertical',
      paddingAll: '16px',
      contents: bodyContents,
    },
  };

  if (params.taskUrl) {
    bubble.footer = {
      type: 'box',
      layout: 'vertical',
      paddingAll: '12px',
      paddingTop: '0px',
      contents: [
        {
          type: 'button',
          style: 'primary',
          color: '#2563EB',
          height: 'sm',
          action: {
            type: 'uri',
            label: isThai ? 'เปิดดูใน TaskFlow' : 'Open in TaskFlow',
            uri: params.taskUrl,
          },
        },
      ],
    };
  }

  return {
    type: 'flex',
    altText,
    contents: bubble,
  };
}

// ---------- Telegram Bot API Helpers ----------

function getTelegramBotToken(): string {
  return (process.env.TELEGRAM_BOT_TOKEN ?? '').trim();
}

function getCustomTelegramWebhookSecret(): string {
  const val = (process.env.TELEGRAM_WEBHOOK_SECRET ?? '').trim();
  return TELEGRAM_SECRET_RE.test(val) ? val : '';
}

function getEffectiveTelegramWebhookSecret(): string {
  const custom = getCustomTelegramWebhookSecret();
  if (custom) return custom;
  const token = getTelegramBotToken();
  if (!token) return '';
  return crypto
    .createHmac('sha256', token)
    .update('taskflow-telegram-webhook-v1')
    .digest('hex')
    .slice(0, 48);
}

function getTelegramDefaultChatId(): string {
  const val = (process.env.TELEGRAM_DEFAULT_CHAT_ID ?? '').trim();
  return TELEGRAM_CHAT_ID_RE.test(val) ? val : '';
}

function maskTelegramChatId(chatId: string): string {
  if (!chatId) return '—';
  if (chatId.length <= 7) return `${chatId.slice(0, 2)}…${chatId.slice(-2)}`;
  return `${chatId.slice(0, 5)}…${chatId.slice(-4)}`;
}

function escapeTelegramHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function verifyTelegramSecretHeader(
  headerVal: string | undefined,
  expectedSecret: string
): boolean {
  if (!headerVal || !expectedSecret) return false;
  const providedBuf = Buffer.from(headerVal.trim(), 'utf8');
  const expectedBuf = Buffer.from(expectedSecret, 'utf8');
  if (providedBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(providedBuf, expectedBuf);
}

function pushTelegramDeliveryLog(entry: Omit<DeliveryLogItem, 'id' | 'timestamp'>): void {
  recentTelegramDeliveries.unshift({
    id: `tg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString().slice(0, 19),
    ...entry,
  });
  if (recentTelegramDeliveries.length > 25) {
    recentTelegramDeliveries.length = 25;
  }
}

async function callTelegramApi<T = unknown>(
  method: 'getMe' | 'getWebhookInfo' | 'setWebhook' | 'sendMessage',
  payload?: Record<string, unknown>
): Promise<{ ok: boolean; status: number; result?: T; description?: string }> {
  const token = getTelegramBotToken();
  if (!token) {
    return {
      ok: false,
      status: 503,
      description: 'TELEGRAM_BOT_TOKEN is not configured in server Secrets.',
    };
  }

  try {
    const resp = await fetch(`${TELEGRAM_API_BASE}/bot${token}/${method}`, {
      method: payload ? 'POST' : 'GET',
      headers: payload ? { 'Content-Type': 'application/json' } : undefined,
      body: payload ? JSON.stringify(payload) : undefined,
    });

    const json = (await resp.json().catch(() => null)) as {
      ok?: boolean;
      result?: T;
      description?: string;
    } | null;

    if (resp.ok && json?.ok) {
      return { ok: true, status: 200, result: json.result };
    }

    const description =
      clampString(json?.description, 180) || `Telegram API returned HTTP ${resp.status}`;
    return { ok: false, status: resp.status || 502, description };
  } catch {
    return { ok: false, status: 502, description: 'Unable to reach Telegram Bot API' };
  }
}

async function fetchTelegramBotInfo(forceRefresh = false): Promise<TelegramBotInfo | null> {
  const token = getTelegramBotToken();
  if (!token) {
    cachedTelegramBotInfo = { data: null, fetchedAt: 0 };
    return null;
  }
  const now = Date.now();
  if (!forceRefresh && cachedTelegramBotInfo.data && now - cachedTelegramBotInfo.fetchedAt < 60_000) {
    return cachedTelegramBotInfo.data;
  }

  const resp = await callTelegramApi<{ id?: number; first_name?: string; username?: string }>(
    'getMe'
  );
  if (!resp.ok || !resp.result) {
    cachedTelegramBotInfo = { data: null, fetchedAt: now };
    return null;
  }

  const info: TelegramBotInfo = {
    id: typeof resp.result.id === 'number' ? resp.result.id : 0,
    firstName: clampString(resp.result.first_name, 80) || 'Telegram Bot',
    username: clampString(resp.result.username, 64),
  };
  cachedTelegramBotInfo = { data: info, fetchedAt: now };
  return info;
}

async function fetchTelegramWebhookStatus(
  expectedWebhookUrl: string
): Promise<{ registered: boolean; currentHost: string | null }> {
  const resp = await callTelegramApi<{ url?: string }>('getWebhookInfo');
  if (!resp.ok || !resp.result) {
    return { registered: false, currentHost: null };
  }
  const rawUrl = clampString(resp.result.url, 512);
  if (!rawUrl) {
    return { registered: false, currentHost: null };
  }
  const safeUrl = sanitizeHttpsUrl(rawUrl);
  return {
    registered: Boolean(safeUrl && safeUrl === expectedWebhookUrl),
    currentHost: safeUrl ? new URL(safeUrl).host : null,
  };
}

function buildTelegramTaskMessage(params: {
  eventType: 'test' | 'assigned' | 'comment' | 'status_changed';
  taskCode?: string;
  taskTitle: string;
  projectName?: string;
  actorName: string;
  statusLabel?: string;
  commentPreview?: string;
  dueDate?: string;
  lang: 'th' | 'en';
  taskUrl?: string;
}): { text: string; reply_markup?: Record<string, unknown> } {
  const isThai = params.lang === 'th';

  const badgeMap = {
    test: isThai ? 'ทดสอบการเชื่อมต่อ Telegram' : 'Telegram Connection Test',
    assigned: isThai ? 'มอบหมายงานใหม่' : 'New Task Assigned',
    comment: isThai ? 'ความคิดเห็นใหม่' : 'New Comment',
    status_changed: isThai ? 'อัปเดตสถานะงาน' : 'Task Status Updated',
  };

  const badge = badgeMap[params.eventType];
  const headerLine = params.taskCode
    ? `<b>${escapeTelegramHtml(badge)}</b> · <code>${escapeTelegramHtml(params.taskCode)}</code>`
    : `<b>${escapeTelegramHtml(badge)}</b>`;

  const lines: string[] = [headerLine, '', `<b>${escapeTelegramHtml(params.taskTitle)}</b>`];

  if (params.commentPreview) {
    lines.push('', `<i>“${escapeTelegramHtml(params.commentPreview)}”</i>`);
  }

  lines.push('');
  lines.push(`${isThai ? 'โดย' : 'By'}: ${escapeTelegramHtml(params.actorName)}`);
  if (params.projectName) {
    lines.push(`${isThai ? 'โปรเจกต์' : 'Project'}: ${escapeTelegramHtml(params.projectName)}`);
  }
  if (params.statusLabel) {
    lines.push(`${isThai ? 'สถานะ' : 'Status'}: <b>${escapeTelegramHtml(params.statusLabel)}</b>`);
  }
  if (params.dueDate) {
    lines.push(`${isThai ? 'กำหนดส่ง' : 'Due Date'}: ${escapeTelegramHtml(params.dueDate)}`);
  }

  const message: { text: string; reply_markup?: Record<string, unknown> } = {
    text: lines.join('\n'),
  };

  if (params.taskUrl) {
    message.reply_markup = {
      inline_keyboard: [
        [
          {
            text: isThai ? 'เปิดดูใน TaskFlow' : 'Open in TaskFlow',
            url: params.taskUrl,
          },
        ],
      ],
    };
  }

  return message;
}

async function sendTelegramMessage(
  chatId: string,
  text: string,
  options?: { parseMode?: 'HTML'; replyMarkup?: Record<string, unknown> }
): Promise<{ ok: boolean; status: number; detail: string }> {
  if (!getTelegramBotToken()) {
    return {
      ok: false,
      status: 503,
      detail: 'TELEGRAM_BOT_TOKEN is not configured in server Secrets.',
    };
  }
  if (!TELEGRAM_CHAT_ID_RE.test(chatId)) {
    return {
      ok: false,
      status: 400,
      detail: 'Invalid Telegram Chat ID format (expected numeric ID such as 123456789 or -100...).',
    };
  }

  const payload: Record<string, unknown> = {
    chat_id: chatId,
    text: text.slice(0, 4000),
    disable_web_page_preview: true,
  };
  if (options?.parseMode) {
    payload.parse_mode = options.parseMode;
  }
  if (options?.replyMarkup) {
    payload.reply_markup = options.replyMarkup;
  }

  const resp = await callTelegramApi('sendMessage', payload);
  if (resp.ok) {
    return { ok: true, status: 200, detail: 'Delivered via Telegram Bot API' };
  }
  return {
    ok: false,
    status: resp.status,
    detail: resp.description || 'Telegram API request failed',
  };
}

async function createServer() {
  const app = express();
  app.set('trust proxy', 1);

  // 1. LINE Webhook Endpoint (raw body required for HMAC-SHA256 signature verification)
  app.post(
    '/api/line/webhook',
    express.raw({ type: 'application/json', limit: '1mb' }),
    async (req: Request, res: Response) => {
      const secret = getLineChannelSecret();
      if (!secret) {
        res.status(503).json({ error: 'LINE_CHANNEL_SECRET is not configured' });
        return;
      }

      const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');
      const signature = req.header('x-line-signature');

      if (!verifyLineSignature(rawBody, signature, secret)) {
        res.status(401).json({ error: 'Invalid LINE webhook signature' });
        return;
      }

      let payload: {
        events?: Array<{
          type?: string;
          replyToken?: string;
          source?: { type?: 'user' | 'group' | 'room'; userId?: string; groupId?: string; roomId?: string };
          message?: { type?: string; text?: string };
        }>;
      } = {};

      try {
        payload = JSON.parse(rawBody.toString('utf8'));
      } catch {
        res.status(400).json({ error: 'Malformed JSON body' });
        return;
      }

      const events = Array.isArray(payload.events) ? payload.events : [];
      const nowIso = new Date().toISOString().slice(0, 19);

      for (const ev of events) {
        const src = ev.source;
        if (!src) continue;

        const targetType = src.type === 'group' ? 'group' : src.type === 'room' ? 'room' : 'user';
        const targetId =
          targetType === 'group'
            ? src.groupId
            : targetType === 'room'
              ? src.roomId
              : src.userId;

        if (targetId && LINE_TARGET_ID_RE.test(targetId)) {
          if (ev.type === 'unfollow' || ev.type === 'leave') {
            discoveredTargets.delete(targetId);
          } else {
            const existing = discoveredTargets.get(targetId);
            const displayName =
              existing?.displayName ?? (await fetchLineDisplayName(targetType, targetId));
            discoveredTargets.set(targetId, {
              id: targetId,
              type: targetType,
              displayName,
              lastSeenAt: nowIso,
            });
          }
        }

        // Helpful reply on follow, join, or "/id" command
        if (ev.replyToken) {
          if ((ev.type === 'follow' || ev.type === 'join') && targetId) {
            await sendLineReply(
              ev.replyToken,
              `เชื่อมต่อกับ TaskFlow เรียบร้อยแล้ว!\nLINE ${targetType === 'group' ? 'Group' : 'User'} ID ของคุณคือ:\n${targetId}\n\nนำรหัสนี้ไปเลือกผูกในหน้า LINE OA ของ TaskFlow เพื่อรับแจ้งเตือนงานอัตโนมัติครับ`
            );
          } else if (ev.type === 'message' && ev.message?.type === 'text') {
            const text = (ev.message.text ?? '').trim().toLowerCase();
            if (text === 'id' || text === '/id' || text === 'รหัส') {
              await sendLineReply(
                ev.replyToken,
                targetId
                  ? `LINE ${targetType === 'group' ? 'Group' : 'User'} ID:\n${targetId}`
                  : 'ไม่พบ LINE ID จากข้อความนี้'
              );
            } else if (text === 'help' || text === '/help' || text === 'ช่วยเหลือ') {
              await sendLineReply(
                ev.replyToken,
                'คำสั่ง TaskFlow LINE OA:\n• พิมพ์ "id" เพื่อดู LINE User/Group ID สำหรับผูกการแจ้งเตือน\n• รับแจ้งเตือนอัตโนมัติเมื่อมีงานมอบหมาย ความคิดเห็น หรือการเปลี่ยนสถานะ'
              );
            }
          }
        }
      }

      res.status(200).json({ ok: true });
    }
  );

  // JSON parser for all other API routes
  app.use('/api', express.json({ limit: '256kb' }));

  // 2. LINE OA Connection Status
  app.get('/api/line/status', async (req: Request, res: Response) => {
    const hasAccessToken = Boolean(getLineAccessToken());
    const hasChannelSecret = Boolean(getLineChannelSecret());
    const defaultTarget = getDefaultTargetId();
    const forceRefresh = req.query.refresh === '1';
    const botInfo = hasAccessToken ? await fetchLineBotInfo(forceRefresh) : null;
    const baseUrl = getPublicBaseUrl(req);

    res.json({
      configured: hasAccessToken && hasChannelSecret,
      hasAccessToken,
      hasChannelSecret,
      hasDefaultTarget: Boolean(defaultTarget),
      defaultTargetMasked: defaultTarget ? maskTargetId(defaultTarget) : null,
      webhookUrl: `${baseUrl}/api/line/webhook`,
      botInfo,
      discoveredTargets: Array.from(discoveredTargets.values()).sort((a, b) =>
        b.lastSeenAt.localeCompare(a.lastSeenAt)
      ),
      recentDeliveries,
    });
  });

  // 3. Send Test Push Message to LINE OA
  app.post('/api/line/test', verifySameOrigin, async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as { targetId?: unknown; lang?: unknown; actorName?: unknown };
    const requestedTarget = clampString(body.targetId, 64);
    const targetId = requestedTarget || getDefaultTargetId();
    const lang: 'th' | 'en' = body.lang === 'en' ? 'en' : 'th';
    const actorName = clampString(body.actorName, 80) || 'TaskFlow';

    if (!targetId) {
      res.status(400).json({
        ok: false,
        error:
          lang === 'en'
            ? 'Please enter or select a LINE User/Group ID (or set LINE_DEFAULT_TARGET_ID in Secrets).'
            : 'กรุณาเลือกหรือกรอก LINE User ID / Group ID (หรือตั้งค่า LINE_DEFAULT_TARGET_ID ใน Secrets)',
      });
      return;
    }

    const baseUrl = getPublicBaseUrl(req);
    const safeAppUrl = sanitizeHttpsUrl(baseUrl);

    const flex = buildTaskFlexMessage({
      eventType: 'test',
      taskCode: 'LINE-OK',
      taskTitle:
        lang === 'en'
          ? 'TaskFlow is now connected to your LINE Official Account!'
          : 'เชื่อมต่อ TaskFlow กับ LINE Official Account ของคุณสำเร็จแล้ว!',
      projectName: 'TaskFlow Workspace',
      actorName,
      statusLabel: lang === 'en' ? 'Connected' : 'เชื่อมต่อพร้อมใช้งาน',
      lang,
      taskUrl: safeAppUrl,
    });

    const result = await sendLinePush(targetId, [flex]);
    pushDeliveryLog({
      eventType: 'test',
      taskCode: 'LINE-OK',
      targetMasked: maskTargetId(targetId),
      status: result.ok ? 'sent' : 'failed',
      detail: result.detail,
    });

    res.status(result.ok ? 200 : result.status).json({
      ok: result.ok,
      detail: result.detail,
      recentDeliveries,
    });
  });

  // 4. Push Live Task Notification to LINE OA
  app.post('/api/line/notify', verifySameOrigin, async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as {
      eventType?: unknown;
      targetId?: unknown;
      taskId?: unknown;
      taskCode?: unknown;
      taskTitle?: unknown;
      projectName?: unknown;
      actorName?: unknown;
      statusLabel?: unknown;
      commentPreview?: unknown;
      dueDate?: unknown;
      lang?: unknown;
    };

    const rawEvent = body.eventType;
    const eventType: 'assigned' | 'comment' | 'status_changed' =
      rawEvent === 'comment' || rawEvent === 'status_changed' ? rawEvent : 'assigned';

    const requestedTarget = clampString(body.targetId, 64);
    const targetId = requestedTarget || getDefaultTargetId();

    if (!getLineAccessToken() || !targetId) {
      res.status(200).json({ ok: false, skipped: true, detail: 'LINE OA not configured or no target ID' });
      return;
    }

    const taskCode = clampString(body.taskCode, 30);
    const taskTitle = clampString(body.taskTitle, 200);
    const actorName = clampString(body.actorName, 80) || 'TaskFlow';
    if (!taskTitle) {
      res.status(400).json({ ok: false, error: 'taskTitle is required' });
      return;
    }

    const lang: 'th' | 'en' = body.lang === 'en' ? 'en' : 'th';
    const taskId = clampString(body.taskId, 60);
    const baseUrl = getPublicBaseUrl(req);
    const taskUrl =
      taskId && /^[a-zA-Z0-9_-]+$/.test(taskId)
        ? sanitizeHttpsUrl(`${baseUrl}/tasks/${taskId}`)
        : sanitizeHttpsUrl(baseUrl);

    const flex = buildTaskFlexMessage({
      eventType,
      taskCode,
      taskTitle,
      projectName: clampString(body.projectName, 100) || undefined,
      actorName,
      statusLabel: clampString(body.statusLabel, 60) || undefined,
      commentPreview: clampString(body.commentPreview, 240) || undefined,
      dueDate: clampString(body.dueDate, 40) || undefined,
      lang,
      taskUrl,
    });

    const result = await sendLinePush(targetId, [flex]);
    pushDeliveryLog({
      eventType,
      taskCode: taskCode || undefined,
      targetMasked: maskTargetId(targetId),
      status: result.ok ? 'sent' : 'failed',
      detail: result.detail,
    });

    res.status(result.ok ? 200 : result.status).json({
      ok: result.ok,
      detail: result.detail,
    });
  });

  // ---------- Telegram Bot API Routes ----------

  // 5. Telegram Webhook Endpoint (verified via X-Telegram-Bot-Api-Secret-Token header)
  app.post('/api/telegram/webhook', async (req: Request, res: Response) => {
    const expectedSecret = getEffectiveTelegramWebhookSecret();
    if (!expectedSecret) {
      res.status(503).json({ error: 'TELEGRAM_BOT_TOKEN is not configured' });
      return;
    }

    const secretHeader = req.header('x-telegram-bot-api-secret-token');
    if (!verifyTelegramSecretHeader(secretHeader, expectedSecret)) {
      res.status(401).json({ error: 'Invalid Telegram webhook secret token' });
      return;
    }

    interface TelegramChatObj {
      id?: number;
      type?: 'private' | 'group' | 'supergroup' | 'channel';
      title?: string;
      first_name?: string;
      last_name?: string;
      username?: string;
    }

    const update = (req.body ?? {}) as {
      message?: { chat?: TelegramChatObj; text?: string };
      edited_message?: { chat?: TelegramChatObj; text?: string };
      channel_post?: { chat?: TelegramChatObj; text?: string };
      my_chat_member?: {
        chat?: TelegramChatObj;
        new_chat_member?: { status?: string };
      };
    };

    const nowIso = new Date().toISOString().slice(0, 19);

    const recordChat = (chat: TelegramChatObj | undefined, removed = false): string | null => {
      if (!chat || typeof chat.id !== 'number') return null;
      const chatId = String(chat.id);
      if (!TELEGRAM_CHAT_ID_RE.test(chatId)) return null;

      if (removed) {
        discoveredTelegramChats.delete(chatId);
        return chatId;
      }

      const chatType =
        chat.type === 'group' || chat.type === 'supergroup' || chat.type === 'channel'
          ? chat.type
          : 'private';

      const fullName = [chat.first_name, chat.last_name].filter(Boolean).join(' ').trim();
      const displayName =
        clampString(chat.title || fullName || chat.username, 80) ||
        `Telegram ${chatType === 'private' ? 'User' : 'Group'} (${maskTelegramChatId(chatId)})`;

      discoveredTelegramChats.set(chatId, {
        chatId,
        type: chatType,
        displayName,
        username: chat.username ? clampString(chat.username, 64) : undefined,
        lastSeenAt: nowIso,
      });

      return chatId;
    };

    if (update.my_chat_member?.chat) {
      const memberStatus = update.my_chat_member.new_chat_member?.status;
      const isRemoved = memberStatus === 'left' || memberStatus === 'kicked';
      const chatId = recordChat(update.my_chat_member.chat, isRemoved);
      if (!isRemoved && chatId && update.my_chat_member.chat.type !== 'channel') {
        await sendTelegramMessage(
          chatId,
          `เชื่อมต่อกับ TaskFlow เรียบร้อยแล้ว!\nTelegram Chat ID ของแชทนี้คือ:\n<code>${escapeTelegramHtml(chatId)}</code>\n\nนำรหัสนี้ไปเลือกผูกในหน้า Telegram ของ TaskFlow เพื่อรับแจ้งเตือนงานอัตโนมัติครับ`,
          { parseMode: 'HTML' }
        );
      }
    }

    const incomingMsg = update.message || update.channel_post || update.edited_message;
    if (incomingMsg?.chat) {
      const chatId = recordChat(incomingMsg.chat, false);
      const rawText = typeof incomingMsg.text === 'string' ? incomingMsg.text.trim() : '';
      // Strip optional @botname suffix from Telegram slash commands (e.g. /id@TaskFlowBot -> /id)
      const normalizedCmd = rawText.toLowerCase().replace(/^(\/[a-z]+)@[a-z0-9_]+/, '$1');

      if (chatId && incomingMsg.chat.type !== 'channel') {
        if (normalizedCmd === '/start') {
          await sendTelegramMessage(
            chatId,
            `ยินดีต้อนรับสู่ <b>TaskFlow Bot</b>!\nTelegram Chat ID ของคุณคือ:\n<code>${escapeTelegramHtml(chatId)}</code>\n\nเปิดหน้า <b>Telegram</b> ใน TaskFlow เพื่อเลือกแชทนี้เป็นปลายทางรับแจ้งเตือนอัตโนมัติครับ`,
            { parseMode: 'HTML' }
          );
        } else if (normalizedCmd === '/id' || normalizedCmd === 'id' || normalizedCmd === 'รหัส') {
          await sendTelegramMessage(
            chatId,
            `Telegram Chat ID:\n<code>${escapeTelegramHtml(chatId)}</code>`,
            { parseMode: 'HTML' }
          );
        } else if (
          normalizedCmd === '/help' ||
          normalizedCmd === 'help' ||
          normalizedCmd === 'ช่วยเหลือ'
        ) {
          await sendTelegramMessage(
            chatId,
            '<b>คำสั่ง TaskFlow Telegram Bot</b>\n• พิมพ์ <code>/id</code> เพื่อดู Chat ID สำหรับผูกการแจ้งเตือน\n• รับแจ้งเตือนอัตโนมัติเมื่อมีงานมอบหมาย ความคิดเห็นใหม่ หรือการเปลี่ยนสถานะงาน',
            { parseMode: 'HTML' }
          );
        }
      }
    }

    res.status(200).json({ ok: true });
  });

  // 6. Telegram Connection Status
  app.get('/api/telegram/status', async (req: Request, res: Response) => {
    const hasBotToken = Boolean(getTelegramBotToken());
    const hasCustomWebhookSecret = Boolean(getCustomTelegramWebhookSecret());
    const defaultChatId = getTelegramDefaultChatId();
    const forceRefresh = req.query.refresh === '1';
    const baseUrl = getPublicBaseUrl(req);
    const webhookUrl = `${baseUrl}/api/telegram/webhook`;

    const [botInfo, webhookInfo] = hasBotToken
      ? await Promise.all([
          fetchTelegramBotInfo(forceRefresh),
          fetchTelegramWebhookStatus(webhookUrl),
        ])
      : [null, { registered: false, currentHost: null }];

    res.json({
      configured: hasBotToken,
      hasBotToken,
      hasCustomWebhookSecret,
      hasDefaultChatId: Boolean(defaultChatId),
      defaultChatMasked: defaultChatId ? maskTelegramChatId(defaultChatId) : null,
      webhookUrl,
      webhookRegistered: webhookInfo.registered,
      webhookCurrentHost: webhookInfo.currentHost,
      botInfo,
      discoveredChats: Array.from(discoveredTelegramChats.values()).sort((a, b) =>
        b.lastSeenAt.localeCompare(a.lastSeenAt)
      ),
      recentDeliveries: recentTelegramDeliveries,
    });
  });

  // 7. Register Telegram Webhook automatically (1-click setup with secret_token)
  app.post(
    '/api/telegram/webhook/register',
    verifySameOrigin,
    async (req: Request, res: Response) => {
      const secretToken = getEffectiveTelegramWebhookSecret();
      if (!secretToken) {
        res.status(503).json({
          ok: false,
          error: 'TELEGRAM_BOT_TOKEN is not configured in server Secrets.',
        });
        return;
      }

      const baseUrl = getPublicBaseUrl(req);
      const webhookUrl = sanitizeHttpsUrl(`${baseUrl}/api/telegram/webhook`);
      if (!webhookUrl) {
        res.status(400).json({
          ok: false,
          error: 'Telegram requires a public HTTPS Webhook URL.',
        });
        return;
      }

      const resp = await callTelegramApi('setWebhook', {
        url: webhookUrl,
        secret_token: secretToken,
        allowed_updates: ['message', 'my_chat_member', 'channel_post'],
      });

      res.status(resp.ok ? 200 : resp.status).json({
        ok: resp.ok,
        webhookRegistered: resp.ok,
        detail: resp.ok
          ? 'Telegram webhook registered with secret verification'
          : resp.description || 'Failed to register Telegram webhook',
      });
    }
  );

  // 8. Send Test Message to Telegram
  app.post('/api/telegram/test', verifySameOrigin, async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as { chatId?: unknown; lang?: unknown; actorName?: unknown };
    const requestedChat = clampString(body.chatId, 32);
    const chatId = requestedChat || getTelegramDefaultChatId();
    const lang: 'th' | 'en' = body.lang === 'en' ? 'en' : 'th';
    const actorName = clampString(body.actorName, 80) || 'TaskFlow';

    if (!chatId) {
      res.status(400).json({
        ok: false,
        error:
          lang === 'en'
            ? 'Please enter or select a Telegram Chat ID (or set TELEGRAM_DEFAULT_CHAT_ID in Secrets).'
            : 'กรุณาเลือกหรือกรอก Telegram Chat ID (หรือตั้งค่า TELEGRAM_DEFAULT_CHAT_ID ใน Secrets)',
      });
      return;
    }

    const baseUrl = getPublicBaseUrl(req);
    const safeAppUrl = sanitizeHttpsUrl(baseUrl);

    const formatted = buildTelegramTaskMessage({
      eventType: 'test',
      taskCode: 'TG-OK',
      taskTitle:
        lang === 'en'
          ? 'TaskFlow is now connected to your Telegram Bot!'
          : 'เชื่อมต่อ TaskFlow กับ Telegram Bot ของคุณสำเร็จแล้ว!',
      projectName: 'TaskFlow Workspace',
      actorName,
      statusLabel: lang === 'en' ? 'Connected' : 'เชื่อมต่อพร้อมใช้งาน',
      lang,
      taskUrl: safeAppUrl,
    });

    const result = await sendTelegramMessage(chatId, formatted.text, {
      parseMode: 'HTML',
      replyMarkup: formatted.reply_markup,
    });

    pushTelegramDeliveryLog({
      eventType: 'test',
      taskCode: 'TG-OK',
      targetMasked: maskTelegramChatId(chatId),
      status: result.ok ? 'sent' : 'failed',
      detail: result.detail,
    });

    res.status(result.ok ? 200 : result.status).json({
      ok: result.ok,
      detail: result.detail,
      recentDeliveries: recentTelegramDeliveries,
    });
  });

  // 9. Push Live Task Notification to Telegram
  app.post('/api/telegram/notify', verifySameOrigin, async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as {
      eventType?: unknown;
      chatId?: unknown;
      taskId?: unknown;
      taskCode?: unknown;
      taskTitle?: unknown;
      projectName?: unknown;
      actorName?: unknown;
      statusLabel?: unknown;
      commentPreview?: unknown;
      dueDate?: unknown;
      lang?: unknown;
    };

    const rawEvent = body.eventType;
    const eventType: 'assigned' | 'comment' | 'status_changed' =
      rawEvent === 'comment' || rawEvent === 'status_changed' ? rawEvent : 'assigned';

    const requestedChat = clampString(body.chatId, 32);
    const chatId = requestedChat || getTelegramDefaultChatId();

    if (!getTelegramBotToken() || !chatId) {
      res.status(200).json({
        ok: false,
        skipped: true,
        detail: 'Telegram Bot not configured or no Chat ID',
      });
      return;
    }

    const taskCode = clampString(body.taskCode, 30);
    const taskTitle = clampString(body.taskTitle, 200);
    const actorName = clampString(body.actorName, 80) || 'TaskFlow';
    if (!taskTitle) {
      res.status(400).json({ ok: false, error: 'taskTitle is required' });
      return;
    }

    const lang: 'th' | 'en' = body.lang === 'en' ? 'en' : 'th';
    const taskId = clampString(body.taskId, 60);
    const baseUrl = getPublicBaseUrl(req);
    const taskUrl =
      taskId && /^[a-zA-Z0-9_-]+$/.test(taskId)
        ? sanitizeHttpsUrl(`${baseUrl}/tasks/${taskId}`)
        : sanitizeHttpsUrl(baseUrl);

    const formatted = buildTelegramTaskMessage({
      eventType,
      taskCode,
      taskTitle,
      projectName: clampString(body.projectName, 100) || undefined,
      actorName,
      statusLabel: clampString(body.statusLabel, 60) || undefined,
      commentPreview: clampString(body.commentPreview, 240) || undefined,
      dueDate: clampString(body.dueDate, 40) || undefined,
      lang,
      taskUrl,
    });

    const result = await sendTelegramMessage(chatId, formatted.text, {
      parseMode: 'HTML',
      replyMarkup: formatted.reply_markup,
    });

    pushTelegramDeliveryLog({
      eventType,
      taskCode: taskCode || undefined,
      targetMasked: maskTelegramChatId(chatId),
      status: result.ok ? 'sent' : 'failed',
      detail: result.detail,
    });

    res.status(result.ok ? 200 : result.status).json({
      ok: result.ok,
      detail: result.detail,
    });
  });

  // 5. Vite Dev Middleware vs Production Static Assets
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build output not found');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TaskFlow server listening on http://0.0.0.0:${PORT}`);
  });
}

createServer().catch((err) => {
  console.error('Failed to start TaskFlow server:', err);
  process.exit(1);
});
