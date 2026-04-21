import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { getImageUrl } from '@/lib/imageUtils';
import { Search, Send, MoreVertical, ImagePlus, FileText, X, Loader2, MoreHorizontal, Share2, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { API_URL } from '@/lib/api';
import { useSocket } from '@/contexts/SocketContext';
import { toast } from 'sonner';
import type { AppUser } from '@/types/user';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ParticipantItem {
  _id?: string | number;
  id?: string | number;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  [key: string]: unknown;
}

interface MessageItem {
  _id?: string | number;
  id?: string | number;
  sender?: unknown;
  recipient?: unknown;
  conversation?: unknown;
  content?: string;
  createdAt?: string;
  created_at?: string;
  timestamp?: string;
  is_revoked?: boolean;
  is_read?: boolean;
  attachments?: unknown[];
  sender_id?: string | number;
  recipient_id?: string | number;
  from?: unknown;
  to?: unknown;
  [key: string]: unknown;
}

interface ConversationItem {
  _id?: string | number;
  id?: string | number;
  participants?: ParticipantItem[];
  last_message?: MessageItem;
  unread_count?: number;
  updated_at?: string;
  updatedAt?: string;
  createdAt?: string;
  [key: string]: unknown;
}

interface UserSearchItem {
  _id?: string | number;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  [key: string]: unknown;
}

const normalizeId = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record.$oid === 'string') return record.$oid.trim();

    if (record._id !== undefined && record._id !== value) {
      const nestedId = normalizeId(record._id);
      if (nestedId) return nestedId;
    }

    if (typeof record.id === 'string' || typeof record.id === 'number') {
      const directId = String(record.id).trim();
      if (directId) return directId;
    }

    const toHexString = record.toHexString;
    if (typeof toHexString === 'function') {
      const hex = toHexString();
      if (typeof hex === 'string' && hex.trim()) return hex.trim();
    }

    const toStringFn = record.toString;
    if (typeof toStringFn === 'function') {
      const str = toStringFn.call(record).trim();
      if (str && str !== '[object Object]') return str;
    }
  }

  return '';
};

const sanitizeId = (value: unknown): string => {
  const normalized = normalizeId(value);
  if (!normalized) return '';

  const lowered = normalized.toLowerCase();
  if (lowered === 'undefined' || lowered === 'null' || normalized === '[object Object]') {
    return '';
  }

  return normalized;
};

const getJwtAccountId = (token: string): string => {
  if (!token) return '';
  try {
    const parts = token.split('.');
    if (parts.length < 2) return '';
    const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payloadBase64 + '='.repeat((4 - (payloadBase64.length % 4)) % 4);
    const payloadRaw = atob(padded);
    const payload = JSON.parse(payloadRaw);
    return sanitizeId(payload?.accountId || payload?.id || payload?._id || payload?.sub);
  } catch {
    return '';
  }
};

const normalizeMessageEntityIds = (
  message: MessageItem,
  fallback: { senderId?: string; recipientId?: string } = {}
) => {
  if (!message || typeof message !== 'object') return message;
  const normalizedSenderId = sanitizeId(getEntityId(message?.sender) || fallback.senderId);
  const normalizedRecipientId = sanitizeId(getEntityId(message?.recipient) || fallback.recipientId);
  const normalizedConversationId = sanitizeId(getConversationId(message?.conversation));

  return {
    ...message,
    ...(normalizedConversationId ? { conversation: normalizedConversationId } : {}),
    ...(normalizedSenderId ? { sender: normalizedSenderId } : {}),
    ...(normalizedRecipientId ? { recipient: normalizedRecipientId } : {}),
  };
};

const readPendingChatUserId = (): string => {
  try {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = sanitizeId(params.get('chatWith'));
    if (fromQuery) {
      localStorage.setItem('startChatWith', fromQuery);
      return fromQuery;
    }
  } catch {
    // Ignore browser URL parsing errors and fallback to storage
  }

  return sanitizeId(localStorage.getItem('startChatWith'));
};

const clearPendingChatTarget = () => {
  localStorage.removeItem('startChatWith');
  try {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('chatWith')) return;
    params.delete('chatWith');
    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}`;
    window.history.replaceState(window.history.state, '', nextUrl);
  } catch {
    // Ignore URL cleanup failures
  }
};

const getEntityId = (value: unknown) => normalizeId(value);
const getConversationId = (value: unknown) => {
  if (typeof value === 'string' || typeof value === 'number') {
    return normalizeId(value);
  }
  const record = (value && typeof value === 'object') ? (value as Record<string, unknown>) : null;
  const nestedConversation = (record?.conversation && typeof record.conversation === 'object')
    ? (record.conversation as Record<string, unknown>)
    : null;
  return normalizeId(record?._id || record?.id || nestedConversation?._id || record?.conversation || '');
};

const getMessageId = (value: unknown) => {
  if (typeof value === 'string' || typeof value === 'number') {
    return normalizeId(value);
  }
  const record = (value && typeof value === 'object') ? (value as Record<string, unknown>) : null;
  return normalizeId(record?._id || record?.id || '');
};
const REVOKED_MESSAGE_LABEL = 'Tin nhắn đã được thu hồi';
const URL_PATTERN = /(https?:\/\/[^\s]+)/gi;

const getSharedPostLinkLabel = (rawUrl: string): string => {
  try {
    const parsedUrl = new URL(rawUrl);
    const sharedView = (parsedUrl.searchParams.get('view') || '').toLowerCase();
    const sharedPostId = sanitizeId(parsedUrl.searchParams.get('id'));
    if (sharedView === 'post' && sharedPostId) {
      return 'Xem bài viết được chia sẻ';
    }
  } catch {
    // Ignore invalid URLs and fallback to showing raw link text.
  }

  return '';
};

// Helper to get the other person in a 1-on-1 conversation
const getOtherParticipant = (participants: ParticipantItem[] = [], currentUserId: string = ''): ParticipantItem => {
  const fallback = { _id: '', id: '', username: 'Unknown', full_name: 'Người dùng', avatar_url: '' };
  if (!Array.isArray(participants) || participants.length === 0) return fallback;

  const normalizedCurrentUserId = normalizeId(currentUserId);
  const other = participants.find((p) => {
    const participantId = getEntityId(p);
    if (!participantId) return false;
    if (!normalizedCurrentUserId) return true;
    return participantId !== normalizedCurrentUserId;
  });
  const selected = other || participants.find((p) => !!getEntityId(p)) || participants[0];

  if (selected && typeof selected === 'object' && getEntityId(selected)) return selected;

  const participantId = getEntityId(selected);
  return participantId
    ? { _id: participantId, id: participantId, username: 'Unknown', full_name: 'Người dùng', avatar_url: '' }
    : fallback;
};

const getConversationPartnerId = (conversation: ConversationItem | null | undefined, currentUserId: string = '') => {
  if (!conversation) return '';
  const normalizedCurrentUserId = normalizeId(currentUserId);
  if (!normalizedCurrentUserId) return '';
  const participants = Array.isArray(conversation.participants) ? conversation.participants : [];
  const other = participants.find((p) => {
    const participantId = getEntityId(p);
    return participantId && participantId !== normalizedCurrentUserId;
  });
  return getEntityId(other || '');
};

const getConversationSortTime = (conversation: ConversationItem | null | undefined) => {
  return new Date(
    conversation?.last_message?.createdAt ||
    conversation?.last_message?.created_at ||
    conversation?.updated_at ||
    conversation?.updatedAt ||
    conversation?.createdAt ||
    0
  ).getTime();
};

const dedupeConversationsByPartner = (conversations: ConversationItem[], currentUserId: string = '') => {
  const map = new Map<string, ConversationItem>();

  for (const conversation of conversations || []) {
    const partnerId = getConversationPartnerId(conversation, currentUserId);
    const key = partnerId || getConversationId(conversation);
    const existing = map.get(key);

    if (!existing) {
      map.set(key, conversation);
      continue;
    }

    const existingTime = getConversationSortTime(existing);
    const currentTime = getConversationSortTime(conversation);
    if (currentTime > existingTime) {
      map.set(key, conversation);
    } else if (currentTime === existingTime && (conversation.unread_count || 0) > (existing.unread_count || 0)) {
      map.set(key, conversation);
    }
  }

  return Array.from(map.values()).sort((a, b) => getConversationSortTime(b) - getConversationSortTime(a));
};

const dedupeMessagesById = (messages: MessageItem[]) => {
  const seen = new Set<string>();
  const result: MessageItem[] = [];

  for (const msg of messages || []) {
    const msgId = getMessageId(msg);
    if (msgId) {
      if (seen.has(msgId)) continue;
      seen.add(msgId);
    }
    result.push(msg);
  }

  return result;
};

type AttachmentKind = 'image' | 'video' | 'file';

interface MessageAttachment {
  url: string;
  kind: AttachmentKind;
  name?: string;
  mime_type?: string;
  size?: number;
}

const isPdfAttachment = (attachment: MessageAttachment | null | undefined): boolean => {
  if (!attachment) return false;
  const mimeType = String(attachment.mime_type || '').toLowerCase();
  if (mimeType.includes('pdf')) return true;

  const cleanUrl = String(attachment.url || '').split('?')[0].split('#')[0].toLowerCase();
  return cleanUrl.endsWith('.pdf');
};

const getAttachmentDisplayName = (attachment: MessageAttachment): string => {
  const rawName = String(attachment.name || '').trim();
  if (rawName) return rawName;
  if (isPdfAttachment(attachment)) return 'Tai_lieu.pdf';
  return 'Tep_dinh_kem';
};

const inferAttachmentKind = (url: string = '', mimeType: string = '', declaredKind: string = ''): AttachmentKind => {
  const normalizedKind = String(declaredKind || '').toLowerCase();
  if (normalizedKind === 'image' || normalizedKind === 'video' || normalizedKind === 'file') {
    return normalizedKind as AttachmentKind;
  }

  const normalizedMime = String(mimeType || '').toLowerCase();
  if (normalizedMime.startsWith('image/')) return 'image';
  if (normalizedMime.startsWith('video/')) return 'video';

  const cleanUrl = String(url || '').split('?')[0].split('#')[0];
  const ext = cleanUrl.includes('.') ? cleanUrl.split('.').pop()?.toLowerCase() || '' : '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'avif', 'heic', 'heif'].includes(ext)) return 'image';
  if (['mp4', 'mov', 'webm', 'mkv', 'avi', 'm4v', '3gp'].includes(ext)) return 'video';
  return 'file';
};

const normalizeAttachment = (attachment: unknown): MessageAttachment | null => {
  if (!attachment) return null;
  if (typeof attachment === 'string') {
    const url = attachment.trim();
    if (!url) return null;
    return {
      url,
      kind: inferAttachmentKind(url)
    };
  }
  if (typeof attachment !== 'object') return null;
  const record = attachment as Record<string, unknown>;

  const url = String(record.url || record.path || '').trim();
  if (!url) return null;
  const mimeType = String(record.mime_type || record.mimeType || '').trim();
  const kind = inferAttachmentKind(url, mimeType, String(record.kind || record.type || ''));

  const normalized: MessageAttachment = { url, kind };
  if (record.name && String(record.name).trim()) normalized.name = String(record.name).trim();
  if (mimeType) normalized.mime_type = mimeType;
  if (Number.isFinite(record.size) && Number(record.size) > 0) normalized.size = Number(record.size);
  return normalized;
};

const getNormalizedAttachments = (message: MessageItem): MessageAttachment[] => {
  if (!Array.isArray(message?.attachments)) return [];
  return message.attachments
    .map((attachment) => normalizeAttachment(attachment))
    .filter(Boolean) as MessageAttachment[];
};

const getMessageAttachmentSummary = (message: MessageItem): string => {
  const attachments = getNormalizedAttachments(message);
  if (!attachments.length) return '';
  const hasVideo = attachments.some((attachment) => attachment.kind === 'video');
  const hasFile = attachments.some((attachment) => attachment.kind === 'file');
  if (hasVideo) return '[Video]';
  if (hasFile) return '[Tệp đính kèm]';
  return '[Hình ảnh]';
};

const decodeFileName = (input: string): string => {
  const raw = String(input || '').trim();
  if (!raw) return '';
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
};

const getFilenameFromContentDisposition = (headerValue: string | null): string => {
  if (!headerValue) return '';

  const utf8Match = headerValue.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeFileName(utf8Match[1]).replace(/^["']|["']$/g, '').trim();
  }

  const plainMatch = headerValue.match(/filename\s*=\s*("?)([^";]+)\1/i);
  if (plainMatch?.[2]) {
    return decodeFileName(plainMatch[2]).replace(/^["']|["']$/g, '').trim();
  }

  return '';
};

const getFileExtension = (filenameOrUrl: string): string => {
  const value = String(filenameOrUrl || '').split('?')[0].split('#')[0].trim();
  if (!value.includes('.')) return '';
  return value.split('.').pop()?.toLowerCase() || '';
};

const extensionByMime: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'text/plain': 'txt',
  'text/csv': 'csv',
  'application/json': 'json',
  'application/zip': 'zip',
  'application/vnd.rar': 'rar',
  'application/x-7z-compressed': '7z',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp'
};

const ensureDownloadFileName = (filename: string, mimeType: string, url: string, isPdf: boolean): string => {
  const safeName = String(filename || '').trim() || (isPdf ? 'Tai_lieu.pdf' : 'Tep_dinh_kem');
  if (getFileExtension(safeName)) return safeName;

  const normalizedMime = String(mimeType || '').split(';')[0].trim().toLowerCase();
  const extFromMime = extensionByMime[normalizedMime] || '';
  const extFromUrl = getFileExtension(url);
  const ext = extFromMime || extFromUrl || (isPdf ? 'pdf' : '');

  return ext ? `${safeName}.${ext}` : safeName;
};

const isOutgoingMessage = (message: MessageItem, currentUserId: string = '') => {
  const normalizedCurrentUserId = normalizeId(currentUserId);
  if (!normalizedCurrentUserId) return false;

  const senderId = getEntityId(message?.sender);
  if (senderId) {
    return senderId === normalizedCurrentUserId;
  }

  const recipientId = getEntityId(message?.recipient);
  if (recipientId) {
    return recipientId !== normalizedCurrentUserId;
  }

  // Fallback for legacy payload keys (if any old records/events still exist)
  const legacySenderId = normalizeId(message?.sender_id || message?.from);
  if (legacySenderId) {
    return legacySenderId === normalizedCurrentUserId;
  }

  const legacyRecipientId = normalizeId(message?.recipient_id || message?.to);
  if (legacyRecipientId) {
    return legacyRecipientId !== normalizedCurrentUserId;
  }

  return false;
};

interface MessagesProps {
  currentUser: AppUser;
  onUserClick?: (userId: string) => void;
  onMessagesRead?: () => void;
}

export function Messages({ currentUser, onUserClick, onMessagesRead }: MessagesProps) {
  const { socket, isConnected, onlineUserIds } = useSocket();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationItem | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewKind, setPreviewKind] = useState<AttachmentKind | null>(null);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<UserSearchItem[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [isZoomedInOverlay, setIsZoomedInOverlay] = useState(false);
  const [sharingMessage, setSharingMessage] = useState<MessageItem | null>(null);
  const [shareSearchTerm, setShareSearchTerm] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [typingUserId, setTypingUserId] = useState<string | null>(null);
  const [deletingConversationId, setDeletingConversationId] = useState<string>('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevScrollHeightRef = useRef<number>(0);
  const typingTimeoutRef = useRef<number | null>(null);
  const activeConversationIdRef = useRef<string>('');
  const messagesRef = useRef<MessageItem[]>([]);
  const markReadInFlightRef = useRef<Set<string>>(new Set());
  const startingConversationUserRef = useRef<string>('');
  const fallbackPollInFlightRef = useRef<boolean>(false);
  const currentUserId = (() => {
    const idFromProps = sanitizeId(getEntityId(currentUser?.id || currentUser?._id));
    if (idFromProps) return idFromProps;
    try {
      const savedUserStr = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
      if (!savedUserStr) return '';
      const savedUser = JSON.parse(savedUserStr);
      const idFromSaved = sanitizeId(getEntityId(savedUser?.id || savedUser?._id));
      if (idFromSaved) return idFromSaved;
    } catch {
      // ignore localStorage parsing errors and fallback to token id
    }

    return sanitizeId(getJwtAccountId(sessionStorage.getItem('token') || localStorage.getItem('token') || ''));
  })();
  const selectedConversationId = getConversationId(selectedConversation);

  const renderMessageContent = (content: string, isMe: boolean) => {
    const messageText = String(content || '');
    const segments = messageText.split(URL_PATTERN).filter((segment) => segment.length > 0);

    return (
      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
        {segments.map((segment, index) => {
          const isUrl = /^https?:\/\/[^\s]+$/i.test(segment);
          if (!isUrl) {
            return <React.Fragment key={`text-${index}`}>{segment}</React.Fragment>;
          }

          const sharedPostLabel = getSharedPostLinkLabel(segment);
          return (
            <a
              key={`link-${index}-${segment}`}
              href={segment}
              rel="noopener noreferrer"
              className={`underline underline-offset-2 break-all ${
                isMe ? 'text-primary-foreground/90 hover:text-primary-foreground' : 'text-primary hover:text-primary/80'
              }`}
            >
              {sharedPostLabel || segment}
            </a>
          );
        })}
      </p>
    );
  };

  const applyRevokedState = (targetMessageId: string, targetConversationId?: string) => {
    setMessages(prev => prev.map(message =>
      getMessageId(message) === String(targetMessageId)
        ? { ...message, is_revoked: true, content: '', attachments: [] }
        : message
    ));

    setConversations(prev => prev.map(conversation => {
      if (targetConversationId && getConversationId(conversation) !== String(targetConversationId)) {
        return conversation;
      }

      if (getMessageId(conversation.last_message) !== String(targetMessageId)) {
        return conversation;
      }

      return {
        ...conversation,
        last_message: {
          ...conversation.last_message,
          is_revoked: true,
          content: '',
          attachments: []
        }
      };
    }));
  };

  const removeConversationFromState = useCallback((conversationId: string, partnerId: string = '') => {
    const normalizedConversationId = String(conversationId || '').trim();
    const normalizedPartnerId = String(partnerId || '').trim();
    if (!normalizedConversationId && !normalizedPartnerId) return;

    setConversations(prev => prev.filter((conv) => {
      const convId = getConversationId(conv);
      const convPartnerId = getConversationPartnerId(conv, currentUserId);
      if (normalizedConversationId && convId === normalizedConversationId) return false;
      if (normalizedPartnerId && convPartnerId === normalizedPartnerId) return false;
      return true;
    }));

    const activeConvId = String(activeConversationIdRef.current || '').trim();
    const selectedPartnerId = getConversationPartnerId(selectedConversation, currentUserId);
    const shouldClearActive =
      (!!normalizedConversationId && activeConvId === normalizedConversationId) ||
      (!!normalizedPartnerId && selectedPartnerId === normalizedPartnerId);

    if (shouldClearActive) {
      activeConversationIdRef.current = '';
      setSelectedConversation(null);
      setMessages([]);
      setHasMore(true);
      setIsInitialLoad(true);
      setTypingUserId(null);
    }

    if (onMessagesRead) onMessagesRead();
  }, [currentUserId, onMessagesRead, selectedConversation]);

  // Helper to get auth headers with fresh token
  const getAuthHeaders = useCallback((options: { includeJsonContentType?: boolean; includeAuthorization?: boolean } = {}) => {
    const { includeJsonContentType = true, includeAuthorization = true } = options;
    const freshToken = sessionStorage.getItem('token') || localStorage.getItem('token');
    const headers: Record<string, string> = {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    };
    if (includeJsonContentType) {
      headers['Content-Type'] = 'application/json';
    }
    const normalizedToken = typeof freshToken === 'string' ? freshToken.trim() : '';
    const isTokenUsable = !!normalizedToken && normalizedToken !== 'null' && normalizedToken !== 'undefined';

    if (includeAuthorization && isTokenUsable) {
      headers['Authorization'] = `Bearer ${normalizedToken}`;
    }
    return headers;
  }, []);

  const withAuthParam = useCallback((url: string) => {
    const params = new URLSearchParams();
    params.set('_t', String(Date.now()));
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}${params.toString()}`;
  }, []);

  const buildAttachmentDownloadUrl = (attachment: MessageAttachment) => {
    const params = new URLSearchParams();
    params.set('url', attachment.url);
    if (attachment.name) {
      params.set('name', attachment.name);
    }
    return withAuthParam(`${API_URL}/messages/download?${params.toString()}`);
  };

  const triggerBlobDownload = (blob: Blob, filename: string) => {
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
  };

  const handleAttachmentDownload = async (attachment: MessageAttachment) => {
    const fallbackUrl = getImageUrl(attachment.url);
    const endpoint = buildAttachmentDownloadUrl(attachment);

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        cache: 'no-store',
        headers: getAuthHeaders({ includeJsonContentType: false })
      });

      if (!response.ok) {
        let message = 'Khong the tai tep';
        try {
          const errorPayload = await response.json();
          if (errorPayload?.message) message = String(errorPayload.message);
        } catch {
          // Ignore parse failures for non-JSON payloads.
        }
        throw new Error(message);
      }

      const blob = await response.blob();
      if (!blob || blob.size <= 0) {
        throw new Error('File trong');
      }

      const contentDisposition = response.headers.get('content-disposition');
      const contentType = String(response.headers.get('content-type') || '').toLowerCase();
      const headerFileName = getFilenameFromContentDisposition(contentDisposition);
      const requestedName = attachment.name || getAttachmentDisplayName(attachment);
      const resolvedFileName = ensureDownloadFileName(
        headerFileName || requestedName,
        contentType,
        attachment.url,
        isPdfAttachment(attachment)
      );

      if (contentType.startsWith('text/html')) {
        throw new Error('Nguon tep tra ve HTML thay vi file');
      }

      triggerBlobDownload(blob, resolvedFileName);
    } catch (error) {
      window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
      console.warn('[Messages] Download fallback to source URL:', error);
      toast.error('Khong tai duoc qua he thong, da mo lien ket goc');
    }
  };

  // Load conversations
  const fetchConversations = useCallback(async () => {
    try {
      if (!currentUserId) {
        setConversations([]);
        setSelectedConversation(null);
        return [];
      }

      const res = await fetch(withAuthParam(`${API_URL}/messages/conversations`), {
        cache: 'no-store',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.status === 'success') {
        const sorted = dedupeConversationsByPartner(data.data || [], currentUserId);
        setConversations(sorted);

        // Keep selected conversation in sync with server data to avoid stale UI after deletes.
        if (selectedConversation) {
          const selectedId = getConversationId(selectedConversation);
          const selectedPartnerId = getConversationPartnerId(selectedConversation, currentUserId);
          const matchedConversation = sorted.find((conversation) => {
            const conversationId = getConversationId(conversation);
            const conversationPartnerId = getConversationPartnerId(conversation, currentUserId);
            if (selectedId && conversationId === selectedId) return true;
            if (selectedPartnerId && conversationPartnerId === selectedPartnerId) return true;
            return false;
          });

          if (matchedConversation) {
            if (getConversationId(matchedConversation) !== selectedId) {
              setSelectedConversation(matchedConversation);
            }
          } else {
            activeConversationIdRef.current = '';
            setSelectedConversation(null);
            setMessages([]);
            setHasMore(true);
            setIsInitialLoad(true);
            setTypingUserId(null);
          }
        }

        const pendingChatUserId = readPendingChatUserId();
        if (pendingChatUserId) {
          if (pendingChatUserId === currentUserId) {
            clearPendingChatTarget();
            return sorted;
          }

          const existingConversation = sorted.find((conversation) =>
            getConversationPartnerId(conversation, currentUserId) === pendingChatUserId
          );

          if (existingConversation) {
            setSelectedConversation(existingConversation);
            clearPendingChatTarget();
          } else {
            if (startingConversationUserRef.current === pendingChatUserId) {
              return sorted;
            }
            startingConversationUserRef.current = pendingChatUserId;

            const startRes = await fetch(withAuthParam(`${API_URL}/messages/start/${pendingChatUserId}`), {
              method: 'POST',
              headers: getAuthHeaders()
            });
            const startContentType = (startRes.headers.get('content-type') || '').toLowerCase();
            const startData = startContentType.includes('application/json') ? await startRes.json() : null;

            if (startRes.ok && startData?.status === 'success') {
              const merged = dedupeConversationsByPartner([startData.data, ...sorted], currentUserId);
              const targetConversation = merged.find((conversation) =>
                getConversationPartnerId(conversation, currentUserId) === pendingChatUserId
              ) || startData.data;
              setSelectedConversation(targetConversation);
              setConversations(merged);
              clearPendingChatTarget();
              startingConversationUserRef.current = '';
              return merged;
            } else if (startData?.message) {
              toast.error(startData.message);
              clearPendingChatTarget();
            } else {
              toast.error('Khong the bat dau cuoc tro chuyen');
              clearPendingChatTarget();
            }
            startingConversationUserRef.current = '';
          }
        }

        return sorted;
      }
    } catch (err) {
      console.error('Lỗi tải danh sách chat:', err);
      startingConversationUserRef.current = '';
    } finally {
      setLoading(false);
    }
  }, [currentUserId, getAuthHeaders, selectedConversation, withAuthParam]);

  const startConversationWithUser = async (targetUserId: string) => {
    const normalizedTargetUserId = sanitizeId(targetUserId);
    if (!normalizedTargetUserId || normalizedTargetUserId === currentUserId) return;
    if (startingConversationUserRef.current === normalizedTargetUserId) return;

    const existingConversation = conversations.find((conversation) =>
      getConversationPartnerId(conversation, currentUserId) === normalizedTargetUserId
    );

    if (existingConversation) {
      setSelectedConversation(existingConversation);
      setSearchTerm('');
      setUserSearchResults([]);
      return;
    }

    try {
      startingConversationUserRef.current = normalizedTargetUserId;
      const response = await fetch(withAuthParam(`${API_URL}/messages/start/${normalizedTargetUserId}`), {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await response.json();

      if (data.status === 'success') {
        const newConversation = data.data;
        const merged = dedupeConversationsByPartner([newConversation, ...conversations], currentUserId);
        const targetConversation = merged.find((conversation) =>
          getConversationPartnerId(conversation, currentUserId) === normalizedTargetUserId
        ) || newConversation;
        setConversations(merged);
        setSelectedConversation(targetConversation);
        setSearchTerm('');
        setUserSearchResults([]);
      } else if (data?.message) {
        toast.error(data.message);
      } else {
        toast.error('Khong the bat dau cuoc tro chuyen');
      }
    } catch (error) {
      console.error('Lỗi bắt đầu cuộc trò chuyện:', error);
      toast.error('Không thể bắt đầu cuộc trò chuyện');
    } finally {
      startingConversationUserRef.current = '';
    }
  };

  const fetchMessages = useCallback(async (isLoadMore = false, targetConversationId: string = selectedConversationId) => {
    const normalizedConversationId = String(targetConversationId || '').trim();
    if (!normalizedConversationId) return;
    if (isLoadMore && !hasMore) return;

    try {
      if (isLoadMore) setLoadingMore(true);

      const currentMessages = messagesRef.current;
      const before = isLoadMore && currentMessages.length > 0
        ? (currentMessages[0].createdAt || currentMessages[0].created_at)
        : null;
      let url = `${API_URL}/messages/${normalizedConversationId}?limit=20`;
      if (before) url += `&before=${encodeURIComponent(before)}`;

      const res = await fetch(withAuthParam(url), {
        cache: 'no-store',
        headers: getAuthHeaders()
      });
      const data = await res.json();

      if (data.status !== 'success') return;
      if (String(activeConversationIdRef.current) !== normalizedConversationId) return;

      const newMessages = dedupeMessagesById(
        (Array.isArray(data.data) ? data.data : []).map((message: MessageItem) =>
          normalizeMessageEntityIds(message)
        )
      );
      setHasMore(newMessages.length === 20);

      if (isLoadMore) {
        if (chatContainerRef.current) {
          prevScrollHeightRef.current = chatContainerRef.current.scrollHeight;
        }
        setMessages(prev => dedupeMessagesById([...newMessages, ...prev]));
      } else {
        setMessages(newMessages);
        setIsInitialLoad(true);
      }
    } catch (err) {
      console.error('Lỗi tải tin nhắn:', err);
    } finally {
      if (isLoadMore) setLoadingMore(false);
    }
  }, [getAuthHeaders, hasMore, selectedConversationId, withAuthParam]);

  const markAsRead = useCallback(async (conversationId: string) => {
    const normalizedConversationId = String(conversationId || '').trim();
    if (!normalizedConversationId) return;
    if (markReadInFlightRef.current.has(normalizedConversationId)) return;
    markReadInFlightRef.current.add(normalizedConversationId);

    try {
      const res = await fetch(withAuthParam(`${API_URL}/messages/${normalizedConversationId}/read`), {
        method: 'PUT',
        headers: getAuthHeaders()
      });

      if (res.ok) {
        setConversations(prev => prev.map(conv => {
          if (getConversationId(conv) === normalizedConversationId && conv.last_message) {
            return { ...conv, last_message: { ...conv.last_message, is_read: true }, unread_count: 0 };
          }
          return conv;
        }));
        if (onMessagesRead) onMessagesRead();
      }
    } catch (err) {
      console.error('Lỗi đánh dấu đã đọc:', err);
    } finally {
      markReadInFlightRef.current.delete(normalizedConversationId);
    }
  }, [getAuthHeaders, onMessagesRead, withAuthParam]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (chatContainerRef.current) {
      const container = chatContainerRef.current;
      if (behavior === 'instant') {
        container.scrollTop = container.scrollHeight;
      } else {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  }, []);

  const emitTypingState = useCallback((isTyping: boolean) => {
    if (!socket || !selectedConversation || !selectedConversationId) return;
    const recipientId = getConversationPartnerId(selectedConversation, currentUserId);
    if (!recipientId || recipientId === currentUserId) return;

    socket.emit(isTyping ? 'typing_start' : 'typing_stop', {
      recipientId: String(recipientId),
      conversationId: selectedConversationId,
      senderId: currentUserId
    });
  }, [currentUserId, selectedConversation, selectedConversationId, socket]);

  useEffect(() => {
    if (!currentUserId) {
      setConversations([]);
      setSelectedConversation(null);
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchConversations();
  }, [currentUserId, fetchConversations]);

  useEffect(() => {
    if (!searchTerm.trim() || searchTerm.trim().length < 2) {
      setUserSearchResults([]);
      setSearchingUsers(false);
      return;
    }

    const controller = new AbortController();
    const keyword = searchTerm.trim();
    const timer = window.setTimeout(async () => {
      try {
        setSearchingUsers(true);
        const response = await fetch(`${API_URL}/auth/search/users?q=${encodeURIComponent(keyword)}`, {
          signal: controller.signal,
          cache: 'no-store',
          headers: getAuthHeaders({ includeJsonContentType: false })
        });
        const data = await response.json();
        if (data.status === 'success') {
          // Filter out users who already have a conversation to avoid duplicates in view
          const nonParticipantUsers = (data.data || []).filter((user: UserSearchItem) => {
            const userId = getEntityId(user);
            if (userId === currentUserId) return false;
            return !conversations.some(c =>
              c.participants?.some((p) => getEntityId(p) === userId)
            );
          });
          setUserSearchResults(nonParticipantUsers);
        }
      } catch (error: unknown) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          console.error('Lỗi tìm người dùng để nhắn tin:', error);
        }
      } finally {
        setSearchingUsers(false);
      }
    }, 400);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [searchTerm, currentUserId, conversations, getAuthHeaders]);

  useEffect(() => {
    activeConversationIdRef.current = selectedConversationId;

    if (selectedConversationId) {
      fetchMessages(false, selectedConversationId);
      markAsRead(selectedConversationId);
      setTypingUserId(null);
    } else {
      setMessages([]);
      setHasMore(true);
      setIsInitialLoad(true);
    }

    return () => {
      emitTypingState(false);
    };
  }, [selectedConversationId, emitTypingState, fetchMessages, markAsRead]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    messagesRef.current = messages;
    if (messages.length > 0) {
      if (isInitialLoad) {
        scrollToBottom('instant');
        setIsInitialLoad(false);
      } else if (prevScrollHeightRef.current > 0) {
        const container = chatContainerRef.current;
        if (container) {
          container.scrollTop = container.scrollHeight - prevScrollHeightRef.current;
        }
        prevScrollHeightRef.current = 0;
      } else {
        // Debounce scroll bottom for new messages to allow layout to settle
        const timer = setTimeout(() => scrollToBottom(), 50);
        return () => clearTimeout(timer);
      }
    }
  }, [messages, isInitialLoad, scrollToBottom]);

  useEffect(() => {
    if (socket && isConnected) {
      const handleReceiveMessage = (message: MessageItem) => {
        const normalizedMessage = normalizeMessageEntityIds(message);
        const msgId = getMessageId(normalizedMessage);
        const msgConvId = getConversationId(normalizedMessage.conversation);
        const currentConvId = String(activeConversationIdRef.current || '');
        const senderId = getEntityId(normalizedMessage.sender);
        const recipientId = getEntityId(normalizedMessage.recipient);
        const isOutgoingForCurrentUser = isOutgoingMessage(normalizedMessage, currentUserId);
        const isFromCurrentUser = senderId ? senderId === currentUserId : isOutgoingForCurrentUser;
        const isToCurrentUser = recipientId ? recipientId === currentUserId : !isOutgoingForCurrentUser;
        const isRelatedToCurrentUser = isFromCurrentUser || isToCurrentUser;
        if (!isRelatedToCurrentUser || !msgConvId) return;

        const isActiveConversation = !!currentConvId && msgConvId === currentConvId;

        console.log('[Messages] Incoming:', {
          msgId: message._id,
          msgConvId,
          currentConvId,
          isActive: isActiveConversation,
          senderId,
          recipientId
        });

        if (isActiveConversation) {
          console.log('[Messages] Appending message to current view');
          setMessages(prev => {
            if (msgId && prev.some(m => getMessageId(m) === msgId)) return prev;
            return dedupeMessagesById([...prev, normalizedMessage]);
          });
          if (isToCurrentUser) {
            markAsRead(currentConvId);
          }
        } else if (isToCurrentUser && !isFromCurrentUser) {
          console.log('[Messages] Notifying of incoming message for other conversation');
          toast('Tin nhắn mới', {
            description: message.content || getMessageAttachmentSummary(message),
            duration: 4000
          });
        }

        setConversations(prev => {
          const index = prev.findIndex(c => getConversationId(c) === msgConvId);
          if (index !== -1) {
            const updated = [...prev];
            const conv = { ...updated[index] };
            conv.last_message = normalizedMessage;
            if (!isActiveConversation && isToCurrentUser && !isFromCurrentUser) {
              conv.unread_count = (conv.unread_count || 0) + 1;
            } else if (isActiveConversation) {
              conv.unread_count = 0;
            }
            updated.splice(index, 1);
            return [conv, ...updated];
          } else {
            setTimeout(() => fetchConversations(), 10);
            return prev;
          }
        });
      };

      const handleMessageRevoked = ({ messageId, conversationId }: { messageId?: string; conversationId?: string }) => {
        const msgConvId = String(conversationId);
        applyRevokedState(String(messageId), msgConvId);
      };


      const handleTypingStart = ({ conversationId, senderId }: { conversationId?: string; senderId?: string }) => {
        if (String(conversationId) === String(activeConversationIdRef.current) && String(senderId) !== currentUserId) {
          setTypingUserId(String(senderId));
        }
      };

      const handleTypingStop = ({ conversationId, senderId }: { conversationId?: string; senderId?: string }) => {
        if (String(conversationId) === String(activeConversationIdRef.current) && String(senderId) !== currentUserId) {
          setTypingUserId(null);
        }
      };

      const handleMessagesSeen = ({ conversationId, seenBy }: { conversationId?: string; seenBy?: string }) => {
        if (String(seenBy) === currentUserId) return;

        if (String(conversationId) === String(activeConversationIdRef.current)) {
          setMessages(prev => prev.map(message =>
            isOutgoingMessage(message, currentUserId) ? { ...message, is_read: true } : message
          ));
        }

        setConversations(prev => prev.map(conversation => {
          if (getConversationId(conversation) !== String(conversationId)) return conversation;
          return conversation.last_message && isOutgoingMessage(conversation.last_message, currentUserId)
            ? { ...conversation, last_message: { ...conversation.last_message, is_read: true } }
            : conversation;
        }));
      };

      const handleConversationDeleted = ({ conversationId }: { conversationId?: string }) => {
        const normalizedConversationId = String(conversationId || '').trim();
        if (!normalizedConversationId) return;
        removeConversationFromState(normalizedConversationId);
      };

      socket.on('receive_message', handleReceiveMessage);
      socket.on('message_revoked', handleMessageRevoked);
      socket.on('typing_start', handleTypingStart);
      socket.on('typing_stop', handleTypingStop);
      socket.on('messages_seen', handleMessagesSeen);
      socket.on('conversation_deleted', handleConversationDeleted);

      return () => {
        socket.off('receive_message', handleReceiveMessage);
        socket.off('message_revoked', handleMessageRevoked);
        socket.off('typing_start', handleTypingStart);
        socket.off('typing_stop', handleTypingStop);
        socket.off('messages_seen', handleMessagesSeen);
        socket.off('conversation_deleted', handleConversationDeleted);
      };
    }
  }, [socket, isConnected, currentUserId, fetchConversations, markAsRead, removeConversationFromState]);

  // Fallback for hosts where Socket.IO is not available (e.g. serverless runtime):
  // poll conversations/messages so users still see new messages without refreshing.
  useEffect(() => {
    if (!currentUserId || isConnected) return;

    let isStopped = false;
    const poll = async () => {
      if (isStopped || fallbackPollInFlightRef.current) return;

      fallbackPollInFlightRef.current = true;
      try {
        await fetchConversations();

        const activeConversationId = String(activeConversationIdRef.current || '').trim();
        if (activeConversationId) {
          await fetchMessages(false, activeConversationId);
          await markAsRead(activeConversationId);
        }
      } catch (error) {
        console.error('[Messages] Fallback polling error:', error);
      } finally {
        fallbackPollInFlightRef.current = false;
      }
    };

    poll();
    const intervalId = window.setInterval(poll, 3000);

    return () => {
      isStopped = true;
      window.clearInterval(intervalId);
      fallbackPollInFlightRef.current = false;
    };
  }, [currentUserId, isConnected, fetchConversations, fetchMessages, markAsRead]);

  const handleChatScroll = () => {
    const container = chatContainerRef.current;
    if (!container) return;
    if (container.scrollTop === 0 && hasMore && !loadingMore) {
      fetchMessages(true, activeConversationIdRef.current);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        toast.error('Tệp quá lớn (tối đa 50MB)');
        e.target.value = '';
        return;
      }
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setSelectedFile(file);
      const detectedKind = inferAttachmentKind('', file.type || '', '');
      if (detectedKind === 'image' || detectedKind === 'video') {
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setPreviewUrl(null);
      }
      setPreviewKind(detectedKind);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setPreviewKind(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleMessageInputChange = (value: string) => {
    setMessageInput(value);

    if (!selectedConversation) return;

    if (!value.trim()) {
      emitTypingState(false);
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
      return;
    }

    emitTypingState(true);
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = window.setTimeout(() => {
      emitTypingState(false);
    }, 1200);
  };

  const handleSendMessage = async () => {
    if ((!messageInput.trim() && !selectedFile) || !selectedConversation) return;
    const normalizedContent = messageInput.trim();
    const targetConversationId = selectedConversationId;
    if (!targetConversationId) return;

    const recipientId = getConversationPartnerId(selectedConversation, currentUserId);

    if (!recipientId || recipientId === currentUserId) {
      toast.error('Không tìm thấy người nhận');
      return;
    }

    try {
      setUploading(true);
      emitTypingState(false);
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
      const attachments: MessageAttachment[] = [];

      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile, selectedFile.name);

        const uploadRes = await fetch(withAuthParam(`${API_URL}/messages/upload`), {
          method: 'POST',
          headers: getAuthHeaders({ includeJsonContentType: false }),
          body: formData,
        });

        const uploadData = await uploadRes.json();
        if (uploadRes.ok && uploadData.status === 'success') {
          const uploadedRawAttachment = uploadData?.data?.attachment || uploadData?.data || {};
          const uploadedAttachment = normalizeAttachment({
            ...uploadedRawAttachment,
            name: uploadedRawAttachment?.name || selectedFile.name,
            mime_type: uploadedRawAttachment?.mime_type || selectedFile.type || '',
            size: uploadedRawAttachment?.size || selectedFile.size || 0
          });
          if (!uploadedAttachment) {
            toast.error('Upload khong hop le');
            setUploading(false);
            return;
          }
          attachments.push(uploadedAttachment);
        } else {
          toast.error(uploadData?.message || 'Khong the tai tep len');
          setUploading(false);
          return;
        }
      }

      const response = await fetch(withAuthParam(`${API_URL}/messages`), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          recipientId,
          conversationId: targetConversationId,
          content: normalizedContent,
          attachments: attachments
        })
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || 'Không thể gửi tin nhắn');
      }
      const savedMessage = normalizeMessageEntityIds(payload?.data, {
        senderId: currentUserId,
        recipientId
      });

      // Fallback UI update: show message immediately even if socket event is delayed/missed.
      if (savedMessage) {
        const savedMessageId = getMessageId(savedMessage);
        const savedConversationId = getConversationId(savedMessage.conversation) || targetConversationId;

        if (String(activeConversationIdRef.current) === targetConversationId) {
          setMessages(prev => {
            if (savedMessageId && prev.some(m => getMessageId(m) === savedMessageId)) {
              return prev;
            }
            return dedupeMessagesById([...prev, savedMessage]);
          });
        }

        setConversations(prev => {
          const index = prev.findIndex(c => getConversationId(c) === savedConversationId);
          if (index === -1) return prev;

          const updated = [...prev];
          const target = { ...updated[index], last_message: savedMessage, unread_count: 0 };
          updated.splice(index, 1);
          return [target, ...updated];
        });
      }

      setMessageInput('');
      setSelectedFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setPreviewKind(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Lỗi gửi tin nhắn:', error);
      toast.error('Lỗi gửi tin nhắn');
    } finally {
      setUploading(false);
    }
  };

  const handleRevokeMessage = async (messageId: string) => {
    const normalizedMessageId = String(messageId || '').trim();
    if (!normalizedMessageId) {
      toast.error('Không xác định được tin nhắn để thu hồi');
      return;
    }

    try {
      const res = await fetch(withAuthParam(`${API_URL}/messages/${normalizedMessageId}/revoke`), {
        method: 'PUT',
        headers: getAuthHeaders()
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Không thể thu hồi tin nhắn');
      }

      applyRevokedState(
        normalizedMessageId,
        getConversationId(data.data?.conversation) || selectedConversationId
      );
      toast.success('Đã thu hồi tin nhắn');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi thu hồi tin nhắn');
    }
  };

  const handleShareMessage = async (recipientId: string) => {
    if (!sharingMessage || !recipientId) return;

    try {
      const res = await fetch(withAuthParam(`${API_URL}/messages/share`), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          messageId: sharingMessage._id || sharingMessage.id,
          recipientId
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || 'Không thể chia sẻ tin nhắn');
      }

      toast.success('Đã chia sẻ tin nhắn');
      setSharingMessage(null);
      // State will be updated by socket event broadcasted from server
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Lỗi khi chia sẻ tin nhắn');
    }
  };

  const handleDeleteConversation = async () => {
    const targetConversationId = String(selectedConversationId || '').trim();
    const partnerId = getConversationPartnerId(selectedConversation, currentUserId);
    if (!targetConversationId) {
      toast.error('Khong xac dinh duoc cuoc tro chuyen');
      return;
    }

    const confirmed = window.confirm('Ban co chac muon xoa cuoc tro chuyen nay khong?');
    if (!confirmed) return;

    const previousState = {
      conversations,
      selectedConversation,
      messages,
      hasMore,
      isInitialLoad,
      typingUserId,
      activeConversationId: String(activeConversationIdRef.current || '')
    };

    try {
      setDeletingConversationId(targetConversationId);
      localStorage.removeItem('startChatWith');
      // Optimistic UX like Messenger: remove chat from list/view immediately.
      removeConversationFromState(targetConversationId, partnerId);
      const params = new URLSearchParams();
      if (partnerId) params.set('partnerId', partnerId);
      const query = params.toString();
      const endpoint = `${API_URL}/messages/conversations/${encodeURIComponent(targetConversationId)}${query ? `?${query}` : ''}`;

      const res = await fetch(endpoint, {
        method: 'DELETE',
        headers: getAuthHeaders({ includeJsonContentType: false })
      });
      const contentType = (res.headers.get('content-type') || '').toLowerCase();
      const data = contentType.includes('application/json') ? await res.json() : null;

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error(data?.message || 'Phien dang nhap da het han, vui long dang nhap lai');
        }
        throw new Error(data?.message || 'Khong the xoa cuoc tro chuyen');
      }

      // Refresh in background to keep local state synced without blocking UI.
      void fetchConversations();
      toast.success('Da xoa cuoc tro chuyen');
    } catch (error) {
      // Roll back optimistic state if delete request failed.
      setConversations(previousState.conversations);
      setSelectedConversation(previousState.selectedConversation);
      setMessages(previousState.messages);
      setHasMore(previousState.hasMore);
      setIsInitialLoad(previousState.isInitialLoad);
      setTypingUserId(previousState.typingUserId);
      activeConversationIdRef.current = previousState.activeConversationId;
      toast.error(error instanceof Error ? error.message : 'Loi xoa cuoc tro chuyen');
    } finally {
      setDeletingConversationId('');
    }
  };
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const filteredConversations = conversations.filter((conv) => {
    if (!normalizedSearchTerm) return true;
    const other = getOtherParticipant(conv.participants || [], currentUserId);
    return (other.full_name || '').toLowerCase().includes(normalizedSearchTerm) ||
      (other.username || '').toLowerCase().includes(normalizedSearchTerm);
  });
  const showUserSearchArea = searchTerm.trim().length >= 2;
  const activeChatPartner = selectedConversation
    ? getOtherParticipant(selectedConversation.participants || [], currentUserId)
    : null;
  const totalUnread = conversations.reduce((total: number, conversation) => {
    return total + (conversation.unread_count || 0);
  }, 0);
  const onlineIdSet = new Set(onlineUserIds);
  const activePartnerId = getEntityId(activeChatPartner?._id || activeChatPartner?.id);
  const isActivePartnerOnline = activePartnerId ? onlineIdSet.has(activePartnerId) : false;

  return (
    <div className="relative pt-1">
      <div className="pointer-events-none absolute -left-10 top-6 h-44 w-44 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-14 top-16 h-52 w-52 rounded-full bg-blue-500/10 blur-3xl" />
      <div className={`relative z-[1] flex min-h-[calc(100vh-6rem)] flex-col gap-4 md:flex-row ${selectedConversation ? '' : 'md:justify-center'}`}>
        {/* Sidebar - Conversations List */}
        <Card className={`page-section-card flex w-full min-h-[560px] max-h-[calc(100vh-6rem)] flex-col overflow-hidden transition-all duration-300 ${selectedConversation ? 'md:w-[22rem] xl:w-[24rem] md:shrink-0' : 'max-w-3xl'}`}>
          <div className="border-b border-border/70 bg-[linear-gradient(130deg,rgba(201,31,40,0.12),transparent_70%)] p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-foreground">Tin nhắn</h2>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-sky-500' : 'bg-red-500 animate-pulse'}`} />
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
                  {isConnected ? 'Đã kết nối' : 'Mất kết nối'}
                </span>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm người hoặc hội thoại"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-11 rounded-2xl border-input bg-background/75 pl-9 text-foreground focus:ring-primary"
              />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-border/70 bg-background/70 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Hội thoại</p>
                <p className="text-sm font-bold text-foreground">{conversations.length}</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/70 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Chưa đọc</p>
                <p className="text-sm font-bold text-foreground">{totalUnread}</p>
              </div>
            </div>
          </div>

          <ScrollArea className="flex-1">
            {loading ? (
              <div className="p-4 text-center text-muted-foreground">Đang tải...</div>
            ) : (
              <div className="flex flex-col space-y-1.5 p-2">
                {/* Existing Conversations */}
                {(conversations.length > 0 || searchTerm) && filteredConversations.map((conversation) => {
                  const isSelected = getConversationId(selectedConversation) === getConversationId(conversation);
                  const other = getOtherParticipant(conversation.participants || [], currentUserId);
                  const partnerId = getConversationPartnerId(conversation, currentUserId);
                  const isPartnerOnline = partnerId ? onlineIdSet.has(partnerId) : false;
                  const unreadCount = conversation.unread_count || 0;
                  const isUnread = unreadCount > 0;
                  const lastMsg = conversation.last_message;

                  return (
                    <button
                      key={String(conversation._id || conversation.id || partnerId)}
                      onClick={() => setSelectedConversation(conversation)}
                      className={`group relative w-full overflow-hidden rounded-2xl border px-3 py-3 flex items-center gap-3 text-left transition-all duration-200 ${isSelected
                          ? 'border-primary/30 bg-primary/[0.12] shadow-md shadow-primary/15 ring-1 ring-primary/30'
                          : isUnread
                            ? 'border-transparent bg-primary/[0.06] hover:border-primary/25 hover:bg-primary/[0.11]'
                            : 'border-transparent hover:border-border/70 hover:bg-muted/55'
                        }`}
                    >
                      {isSelected && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-primary" />}
                      <div className="relative">
                        <Avatar className={`h-12 w-12 border shadow-sm ${isPartnerOnline ? 'border-emerald-400/80 ring-2 ring-emerald-300/40' : 'border-border'}`}>
                          <AvatarImage src={getImageUrl(other.avatar_url)} />
                          <AvatarFallback className="bg-muted text-muted-foreground">{other.full_name?.[0] || '?'}</AvatarFallback>
                        </Avatar>
                        {isUnread && (
                          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-background animate-pulse" />
                        )}
                      </div>
                      <div className="flex-1 overflow-hidden text-left">
                        <div className="flex items-center justify-between mb-0.5">
                          <h4 className={`font-medium truncate ${isUnread ? 'text-primary font-bold' : 'text-foreground'}`}>
                            {other.full_name || other.username}
                          </h4>
                          <span className={`text-[10px] ${isUnread ? 'text-primary' : 'text-muted-foreground'}`}>
                            {lastMsg ? new Date(lastMsg.createdAt || lastMsg.created_at || 0).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className={`text-sm truncate ${isUnread ? 'text-foreground font-semibold' : 'text-muted-foreground'} max-w-[155px]`}>
                            {lastMsg?.is_revoked
                              ? REVOKED_MESSAGE_LABEL
                              : (lastMsg?.content || getMessageAttachmentSummary(lastMsg || ({} as MessageItem)) || 'Chưa có tin nhắn')}
                          </p>
                          {isUnread && (
                            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                              {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}

                {/* New User Search Results Area */}
                {showUserSearchArea && (
                  <div className="mt-1 rounded-2xl border border-border/60 bg-muted/15">
                    {searchingUsers && (
                      <div className="flex items-center justify-center p-4 text-xs text-muted-foreground">
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        Đang tìm người dùng mới...
                      </div>
                    )}
                    {userSearchResults.length > 0 && (
                      <div className="p-2">
                        <p className="px-2 pb-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Người dùng mới</p>
                        {userSearchResults.map((user) => (
                          <button
                            key={String(user._id)}
                            onClick={() => startConversationWithUser(String(user._id))}
                            className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-muted/80"
                          >
                            <Avatar className="h-9 w-9 border border-border">
                              <AvatarImage src={getImageUrl(user.avatar_url)} />
                              <AvatarFallback>{user.full_name?.[0] || user.username?.[0] || '?'}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-foreground">{user.full_name || user.username}</p>
                              <p className="truncate text-xs text-muted-foreground">@{user.username}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {!searchingUsers && userSearchResults.length === 0 && showUserSearchArea && filteredConversations.length === 0 && (
                      <div className="p-8 text-center text-sm text-muted-foreground">
                        Không tìm thấy kết quả phù hợp
                      </div>
                    )}
                  </div>
                )}

                {conversations.length === 0 && !searchTerm && (
                  <div className="p-8 text-center text-muted-foreground">Chưa có cuộc trò chuyện nào</div>
                )}
              </div>
            )}
          </ScrollArea>
          {!selectedConversation && conversations.length > 0 && (
            <div className="border-t border-border/70 bg-background/70 px-4 py-2 text-center text-xs text-muted-foreground">
              Chọn một hội thoại để mở khung chat.
            </div>
          )}
        </Card>

        {/* Main Chat Area */}
        {selectedConversation && (
          <Card className="page-section-card flex min-h-[560px] max-h-[calc(100vh-6rem)] flex-1 md:flex-[1.45] md:min-w-0 flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/70 bg-[linear-gradient(120deg,rgba(201,31,40,0.12),transparent_64%)] p-4">
              <div
                className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => {
                  const partnerId = getEntityId(activeChatPartner);
                  if (partnerId && onUserClick) onUserClick(partnerId);
                }}
              >
                <Avatar className="h-10 w-10 border-2 border-border/50 shadow-sm">
                  <AvatarImage src={getImageUrl(activeChatPartner?.avatar_url)} />
                  <AvatarFallback>{activeChatPartner?.full_name?.[0] || '?'}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium text-foreground">{activeChatPartner?.full_name || activeChatPartner?.username}</h3>
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <span className={`h-1.5 w-1.5 rounded-full ${typingUserId
                        ? 'bg-primary animate-pulse'
                        : isActivePartnerOnline
                          ? 'bg-emerald-500'
                          : 'bg-slate-400'
                      }`} />
                    {typingUserId
                      ? 'Đang nhập...'
                      : isActivePartnerOnline
                        ? 'Đang hoạt động'
                        : `@${activeChatPartner?.username || ''}`}
                  </p>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-xl hover:bg-muted/70">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={handleDeleteConversation}
                    disabled={!!deletingConversationId}
                    className="text-destructive focus:text-destructive cursor-pointer gap-2 font-medium"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {deletingConversationId ? 'Dang xoa...' : 'Xoa cuoc tro chuyen'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Messages Container */}
            <div
              ref={chatContainerRef}
              onScroll={handleChatScroll}
              className="flex flex-1 flex-col gap-3 overflow-y-auto bg-[radial-gradient(circle_at_10%_0%,rgba(201,31,40,0.11),transparent_38%),radial-gradient(circle_at_90%_0%,rgba(37,99,235,0.10),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.58),rgba(255,255,255,0.10))] dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.8),rgba(15,23,42,0.4))] p-4 scroll-smooth"
            >
              {loadingMore && (
                <div className="flex justify-center py-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              )}

              {!hasMore && messages.length >= 20 && (
                <div className="text-center py-2 text-xs text-muted-foreground italic">
                  Đây là điểm bắt đầu cuộc trò chuyện
                </div>
              )}

              {messages.map((message, index) => {
                const isMe = isOutgoingMessage(message, currentUserId);
                const isLastMessage = index === messages.length - 1;
                const messageAttachments = getNormalizedAttachments(message);
                return (
                  <div
                    key={String(message._id || message.id)}
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className="group flex max-w-[78%] items-end gap-2">
                      {isMe && !message.is_revoked && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setSharingMessage(message)} className="cursor-pointer">
                                <Share2 className="h-4 w-4 mr-2" /> Chia sẻ
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleRevokeMessage(String(message._id || message.id || ''))} className="text-destructive cursor-pointer">
                                <RotateCcw className="h-4 w-4 mr-2" /> Thu hồi
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}

                      {!isMe && !message.is_revoked && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity order-last shrink-0">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuItem onClick={() => setSharingMessage(message)} className="cursor-pointer">
                                <Share2 className="h-4 w-4 mr-2" /> Chia sẻ
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}

                      <div
                        className={`rounded-2xl px-4 py-2.5 shadow-sm ${isMe
                            ? 'bg-primary text-primary-foreground shadow-[0_10px_24px_rgba(201,31,40,0.28)]'
                            : 'border border-border/70 bg-background/85 text-foreground'
                          } ${message.is_revoked ? 'opacity-50 border border-dashed border-border' : ''}`}
                      >
                        {message.is_revoked ? (
                          <p className="text-sm italic opacity-70">{REVOKED_MESSAGE_LABEL}</p>
                        ) : (
                          <>
                            {messageAttachments.length > 0 && (
                              <div className="mb-1.5 flex flex-wrap gap-1.5">
                                {messageAttachments.map((attachment, idx: number) => (
                                  <React.Fragment key={`${attachment.url}-${idx}`}>
                                    {attachment.kind === 'image' && (
                                      <img
                                        src={getImageUrl(attachment.url)}
                                        alt={attachment.name || 'attachment'}
                                        className="max-h-60 max-w-full rounded-xl object-cover cursor-pointer hover:opacity-95 transition-opacity"
                                        onClick={() => setZoomedImage(getImageUrl(attachment.url))}
                                      />
                                    )}
                                    {attachment.kind === 'video' && (
                                      <video
                                        src={getImageUrl(attachment.url)}
                                        controls
                                        className="max-h-72 max-w-full rounded-xl border border-border bg-black"
                                      />
                                    )}
                                    {attachment.kind === 'file' && (
                                      <button
                                        type="button"
                                        onClick={() => { void handleAttachmentDownload(attachment); }}
                                        className={`flex max-w-[240px] items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors ${
                                          isMe ? 'border-white/30 bg-white/10 text-primary-foreground hover:bg-white/20' : 'border-border bg-background hover:bg-muted'
                                        }`}
                                      >
                                        <FileText className="h-4 w-4 shrink-0" />
                                        <span className="truncate">
                                          {getAttachmentDisplayName(attachment)}
                                          {isPdfAttachment(attachment) ? ' (PDF)' : ''}
                                        </span>
                                      </button>
                                    )}
                                  </React.Fragment>
                                ))}
                              </div>
                            )}
                            {message.content && renderMessageContent(message.content, isMe)}
                          </>
                        )}
                        <span className={`text-[10px] block mt-1 opacity-60 ${isMe ? 'text-right' : 'text-left'}`}>
                          {new Date(message.createdAt || message.created_at || message.timestamp || 0).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isMe && isLastMessage && (
                          <span className="mt-1 block text-[10px] text-right opacity-70">
                            {message.is_read ? 'Đã xem' : 'Đã gửi'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} className="h-px" />
            </div>

            {/* Input Area */}
            <div className="border-t border-border/70 bg-gradient-to-b from-background/75 to-background/95 p-4 backdrop-blur-md">
              {selectedFile && (
                <div className="mb-3 relative inline-block animate-in fade-in slide-in-from-bottom-2">
                  {previewKind === 'image' && previewUrl && (
                    <img src={previewUrl} alt="preview" className="h-20 w-20 rounded-xl border border-border object-cover shadow-sm" />
                  )}
                  {previewKind === 'video' && previewUrl && (
                    <video src={previewUrl} controls className="h-24 w-36 rounded-xl border border-border bg-black object-cover shadow-sm" />
                  )}
                  {previewKind === 'file' && (
                    <div className="flex min-w-[220px] items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 shadow-sm">
                      <FileText className="h-5 w-5 text-primary" />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-foreground">{selectedFile.name}</p>
                        <p className="text-[11px] text-muted-foreground">{Math.max(1, Math.round(selectedFile.size / 1024))} KB</p>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={removeSelectedFile}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 shadow-md hover:scale-110 transition-transform"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2 rounded-2xl border border-border/70 bg-background/90 p-1.5 shadow-sm shadow-slate-900/5">
                <input
                  type="file"
                  id="msg-file-upload"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*,video/*,application/pdf,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.7z,.csv,.json"
                  onChange={handleFileSelect}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 rounded-xl text-muted-foreground hover:bg-muted hover:text-primary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <ImagePlus className="h-4 w-4" />
                </Button>
                <Input
                  placeholder="Nhập tin nhắn..."
                  value={messageInput}
                  onChange={(e) => handleMessageInputChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="h-10 border-0 bg-transparent px-2 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  disabled={uploading}
                />
                <Button
                  className="h-9 w-9 shrink-0 rounded-xl p-0 shadow-sm shadow-primary/20"
                  onClick={handleSendMessage}
                  disabled={uploading || (!messageInput.trim() && !selectedFile)}
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </Card>
        )}

      </div>

      {/* Overlays */}
      {zoomedImage && createPortal(
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-4 backdrop-blur-md animate-in fade-in select-none"
          onClick={() => { setZoomedImage(null); setIsZoomedInOverlay(false); }}
        >
          <Button
            className="absolute top-6 right-6 text-white hover:bg-white/20 rounded-full z-20 h-11 w-11 backdrop-blur-lg"
            variant="ghost"
            size="icon"
            onClick={(e) => { e.stopPropagation(); setZoomedImage(null); setIsZoomedInOverlay(false); }}
          >
            <X className="h-6 w-6" />
          </Button>
          
          <div 
            className={`relative flex items-center justify-center w-full h-full transition-all duration-300 ${isZoomedInOverlay ? 'overflow-auto cursor-zoom-out' : 'cursor-zoom-in'}`}
            onClick={(e) => {
              // Exit when clicking elsewhere or on image when not zoomed
              if (!isZoomedInOverlay) {
                return;
              }
              e.stopPropagation(); 
              setIsZoomedInOverlay(false); 
            }}
          >
            <img 
              src={zoomedImage} 
              alt="Zoomed" 
              className={`transition-all duration-500 rounded-lg shadow-2xl ${
                isZoomedInOverlay 
                  ? 'max-w-none max-h-none w-auto h-auto' 
                  : 'max-w-full max-h-[96vh] object-contain'
              } animate-in zoom-in-95`} 
              onClick={(e) => {
                if (isZoomedInOverlay) {
                  e.stopPropagation();
                  setIsZoomedInOverlay(false);
                }
              }}
            />
          </div>
        </div>,
        document.body
      )}

      <Dialog open={!!sharingMessage} onOpenChange={(open) => !open && setSharingMessage(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Chia sẻ tin nhắn</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Tìm người nhận..."
                value={shareSearchTerm}
                onChange={(e) => setShareSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {conversations
                  .filter(conv => {
                    const other = getOtherParticipant(conv.participants || [], currentUserId);
                    const term = shareSearchTerm.toLowerCase();
                    return (other.full_name || '').toLowerCase().includes(term) || (other.username || '').toLowerCase().includes(term);
                  })
                  .map(conv => {
                    const other = getOtherParticipant(conv.participants || [], currentUserId);
                    return (
                      <button
                        key={String(conv._id)}
                        onClick={() => handleShareMessage(getConversationPartnerId(conv, currentUserId))}
                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors text-left"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={getImageUrl(other.avatar_url)} />
                          <AvatarFallback>{other.full_name?.[0] || '?'}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{other.full_name || other.username}</p>
                          <p className="text-xs text-muted-foreground">@{other.username}</p>
                        </div>
                        <Button size="sm" variant="ghost" className="ml-auto text-primary">Gửi</Button>
                      </button>
                    );
                  })}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}













