import { useState, useEffect, useCallback, useRef } from 'react';
import type { AppUser as User } from '@/types/user';
import type { Post } from '@/components/PostCard';
import { API_URL } from '@/lib/api';
import { getImageUrl } from '@/lib/imageUtils';
import {
  isAbortError,
  sanitizeEntityId,
  normalizeUserPreferences,
  defaultUser,
  readAuthStorageItem,
  removeAuthStorageItem,
  isTokenUsable,
  readAuthToken,
  buildUserFromToken
} from './app-auth';
import { toast } from 'sonner';

const INITIAL_POSTS: Post[] = [];
const HOME_FEED_LIMIT = 2;

export function useAppShellState() {
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const token = readAuthToken();
    if (!isTokenUsable(token)) return defaultUser;

    const saved = readAuthStorageItem('currentUser');
    if (!saved) return buildUserFromToken(token) || defaultUser;
    try {
      const parsed = JSON.parse(saved);
      const normalizedUser: User = {
        ...defaultUser,
        ...parsed,
        id: parsed?.id || parsed?._id || defaultUser.id,
        _id: parsed?._id || parsed?.id || defaultUser._id,
        name: parsed?.name || parsed?.full_name || parsed?.display_name || parsed?.username || defaultUser.name,
        username: parsed?.username || defaultUser.username,
        avatar: parsed?.avatar || (parsed?.avatar_url ? getImageUrl(parsed.avatar_url) : defaultUser.avatar),
        role: ((parsed?.role || defaultUser.role) as string).toLowerCase() as User['role'],
        preferences: normalizeUserPreferences(parsed?.preferences || defaultUser.preferences)
      };
      return normalizedUser;
    } catch {
      return buildUserFromToken(token) || defaultUser;
    }
  });
  const [isAuthenticated, setIsAuthenticated] = useState(() => isTokenUsable(readAuthToken()));
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [activeCommunity, setActiveCommunity] = useState<string | null>(null);
  const [feedFilter, setFeedFilter] = useState<'all' | 'following'>('all');
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [feedPage, setFeedPage] = useState(1);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [isFetchingPosts, setIsFetchingPosts] = useState(false);
  const [supportsPagedMeta, setSupportsPagedMeta] = useState<boolean | null>(null);
  const postsAbortRef = useRef<AbortController | null>(null);
  const postsRequestSeqRef = useRef(0);
  const postsSnapshotRef = useRef<Post[]>(INITIAL_POSTS);
  const unreadNotificationsAbortRef = useRef<AbortController | null>(null);
  const unreadMessagesAbortRef = useRef<AbortController | null>(null);
  const lastUnreadNotificationsFetchAtRef = useRef(0);
  const lastUnreadMessagesFetchAtRef = useRef(0);

  const clearAuthSession = useCallback((notify = false) => {
    setIsAuthenticated(false);
    setCurrentUser(defaultUser);
    setUnreadNotifications(0);
    setUnreadMessagesCount(0);
    removeAuthStorageItem('currentUser');
    removeAuthStorageItem('token');
    if (notify) toast.success('Da dang xuat');
  }, []);

  useEffect(() => {
    const syncAuthFromToken = () => {
      const token = readAuthToken();
      const tokenIsValid = isTokenUsable(token);

      if (!tokenIsValid) {
        const hasUserState = Boolean(sanitizeEntityId(currentUser?.id || currentUser?._id));
        if (isAuthenticated || hasUserState) {
          clearAuthSession(false);
        }
        return;
      }

      if (!isAuthenticated) {
        setIsAuthenticated(true);
      }
    };

    syncAuthFromToken();

    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key === 'token' || event.key === 'currentUser') {
        syncAuthFromToken();
      }
    };

    const handleFocus = () => {
      syncAuthFromToken();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleFocus);
    };
  }, [clearAuthSession, currentUser?.id, currentUser?._id, isAuthenticated]);

  const fetchUnreadCount = useCallback(async (userId: string) => {
    const normalizedUserId = String(userId || '').trim();
    if (!normalizedUserId) return;

    const now = Date.now();
    if (now - lastUnreadNotificationsFetchAtRef.current < 1500) return;
    lastUnreadNotificationsFetchAtRef.current = now;

    unreadNotificationsAbortRef.current?.abort();
    const controller = new AbortController();
    unreadNotificationsAbortRef.current = controller;

    try {
      const token = readAuthStorageItem('token');
      const res = await fetch(`${API_URL}/notifications/unread-count`, {
        signal: controller.signal,
        cache: 'no-store',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (data.status === 'success') {
        setUnreadNotifications(Number(data.data || 0));
      }
    } catch (err) {
      if (isAbortError(err)) return;
      console.error('Failed to fetch unread notifications count:', err);
    }
  }, []);

  const fetchUnreadMessagesCount = useCallback(async (userId: string) => {
    const normalizedUserId = String(userId || '').trim();
    if (!normalizedUserId) return;

    const now = Date.now();
    if (now - lastUnreadMessagesFetchAtRef.current < 1500) return;
    lastUnreadMessagesFetchAtRef.current = now;

    unreadMessagesAbortRef.current?.abort();
    const controller = new AbortController();
    unreadMessagesAbortRef.current = controller;

    try {
      const token = readAuthStorageItem('token');
      const res = await fetch(`${API_URL}/messages/unread-count`, {
        signal: controller.signal,
        cache: 'no-store',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (data.status === 'success') setUnreadMessagesCount(Number(data.data || 0));
    } catch (err) {
      if (isAbortError(err)) return;
      console.error('Failed to fetch unread messages count:', err);
    }
  }, []);

  useEffect(() => {
    postsSnapshotRef.current = posts;
  }, [posts]);

  const fetchPostsPage = useCallback(async ({
    userId: _userId = currentUser?.id || currentUser?._id || '',
    community = activeCommunity,
    filter = feedFilter,
    page = 1,
    append = false
  }: {
    userId?: string;
    community?: string | null;
    filter?: string;
    page?: number;
    append?: boolean;
  }) => {
    const requestedPage = Math.max(1, Number.parseInt(String(page), 10) || 1);
    const requestSeq = postsRequestSeqRef.current + 1;
    postsRequestSeqRef.current = requestSeq;
    const legacyAccumulationMode = append && supportsPagedMeta === false;
    const requestLimit = legacyAccumulationMode ? requestedPage * HOME_FEED_LIMIT : HOME_FEED_LIMIT;

    const params = new URLSearchParams();
    if (community) params.set('community', community);
    if (filter === 'following') params.set('followingOnly', 'true');
    params.set('limit', String(requestLimit));
    params.set('page', String(requestedPage));

    postsAbortRef.current?.abort();
    const controller = new AbortController();
    postsAbortRef.current = controller;
    setIsFetchingPosts(true);

    try {
      const queryString = params.toString();
      const url = queryString ? `${API_URL}/posts?${queryString}` : `${API_URL}/posts`;
      const token = readAuthStorageItem('token');
      const res = await fetch(url, {
        signal: controller.signal,
        cache: 'no-store',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (data.status !== 'success') return;
      if (requestSeq !== postsRequestSeqRef.current) return;

      const incomingPosts: Post[] = Array.isArray(data?.data) ? data.data : [];
      const metaPage = Number.parseInt(String(data?.meta?.page), 10);
      const hasMetaPage = Number.isFinite(metaPage) && metaPage > 0;
      const hasMetaHasMore = typeof data?.meta?.hasMore === 'boolean';
      const hasPagingMeta = hasMetaPage && hasMetaHasMore;

      if (hasPagingMeta) {
        setSupportsPagedMeta(true);
      } else if (requestedPage === 1 && supportsPagedMeta !== false) {
        setSupportsPagedMeta(false);
      }

      const currentPosts = postsSnapshotRef.current;
      let mergedPosts: Post[] = incomingPosts;
      let freshPostsCount = incomingPosts.length;

      if (append) {
        const existingIds = new Set(currentPosts.map(post => post.id));
        const freshPosts = incomingPosts.filter(post => !existingIds.has(post.id));
        freshPostsCount = freshPosts.length;
        mergedPosts = [...currentPosts, ...freshPosts];
      }

      postsSnapshotRef.current = mergedPosts;
      setPosts(mergedPosts);

      const currentPage = hasPagingMeta ? metaPage : requestedPage;
      setFeedPage(currentPage);

      let morePosts = hasPagingMeta
        ? Boolean(data.meta.hasMore)
        : incomingPosts.length >= requestLimit;

      if (append && freshPostsCount === 0) {
        morePosts = false;
      }

      setHasMorePosts(morePosts);
    } catch (err) {
      if (isAbortError(err)) return;
      console.error('Failed to fetch posts:', err);
    } finally {
      if (requestSeq === postsRequestSeqRef.current) {
        setIsFetchingPosts(false);
      }
    }
  }, [activeCommunity, feedFilter, currentUser.id, currentUser._id, supportsPagedMeta]);

  const fetchPosts = useCallback(async (userId: string = currentUser?.id || currentUser?._id || '', community: string | null = activeCommunity, filter: string = feedFilter) => {
    await fetchPostsPage({
      userId,
      community,
      filter,
      page: 1,
      append: false
    });
  }, [activeCommunity, currentUser?.id, currentUser?._id, feedFilter, fetchPostsPage]);

  const fetchMorePosts = useCallback(async () => {
    if (isFetchingPosts || !hasMorePosts) return;

    await fetchPostsPage({
      userId: currentUser?.id || currentUser?._id || '',
      community: activeCommunity,
      filter: feedFilter,
      page: feedPage + 1,
      append: true
    });
  }, [activeCommunity, currentUser?.id, currentUser?._id, feedFilter, feedPage, fetchPostsPage, hasMorePosts, isFetchingPosts]);

  useEffect(() => {
    if (isAuthenticated && (currentUser.id || currentUser._id)) {
      fetchUnreadCount(currentUser.id || String(currentUser._id));
      fetchUnreadMessagesCount(currentUser.id || String(currentUser._id));
    }
  }, [isAuthenticated, currentUser.id, currentUser._id, fetchUnreadCount, fetchUnreadMessagesCount]);

  useEffect(() => {
    fetchPosts(currentUser?.id || currentUser?._id || '');
  }, [activeCommunity, feedFilter, fetchPosts, currentUser?.id, currentUser?._id]);

  useEffect(() => {
    return () => {
      postsAbortRef.current?.abort();
      unreadNotificationsAbortRef.current?.abort();
      unreadMessagesAbortRef.current?.abort();
    };
  }, []);

  const handleLogout = () => {
    clearAuthSession(true);
  };

  return {
    currentUser,
    setCurrentUser,
    isAuthenticated,
    setIsAuthenticated,
    unreadNotifications,
    setUnreadNotifications,
    unreadMessagesCount,
    setUnreadMessagesCount,
    activeCommunity,
    setActiveCommunity,
    feedFilter,
    setFeedFilter,
    posts,
    setPosts,
    hasMorePosts,
    isFetchingPosts,
    fetchPosts,
    fetchMorePosts,
    fetchUnreadMessagesCount,
    fetchUnreadCount,
    handleLogout
  };
}
