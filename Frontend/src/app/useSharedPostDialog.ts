import { useCallback, useEffect, useState } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { toast } from 'sonner';
import { API_URL } from '@/lib/api';
import { apiRequest } from '@/lib/http';
import { isApiSuccess } from '@/types/api';
import { Post } from '@/components/PostCard';
import { sanitizeEntityId } from './app-auth';

interface UseSharedPostDialogParams {
  locationPathname: string;
  locationSearch: string;
  navigate: NavigateFunction;
}

interface UseSharedPostDialogResult {
  selectedPost: Post | null;
  setSelectedPost: React.Dispatch<React.SetStateAction<Post | null>>;
  closeSelectedPost: () => void;
  fetchAndOpenPostById: (postId: string) => Promise<boolean>;
}

export function useSharedPostDialog({
  locationPathname,
  locationSearch,
  navigate
}: UseSharedPostDialogParams): UseSharedPostDialogResult {
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  const clearSharedPostQueryFromUrl = useCallback(() => {
    const params = new URLSearchParams(locationSearch);
    const view = (params.get('view') || '').toLowerCase();
    const sharedPostId = sanitizeEntityId(params.get('id'));
    if (view !== 'post' || !sharedPostId) return;

    params.delete('view');
    params.delete('id');
    const nextQuery = params.toString();
    const nextUrl = `${locationPathname}${nextQuery ? `?${nextQuery}` : ''}`;
    navigate(nextUrl, { replace: true });
  }, [locationPathname, locationSearch, navigate]);

  const closeSelectedPost = useCallback(() => {
    setSelectedPost(null);
    clearSharedPostQueryFromUrl();
  }, [clearSharedPostQueryFromUrl]);

  const fetchAndOpenPostById = useCallback(async (postId: string): Promise<boolean> => {
    const normalizedPostId = sanitizeEntityId(postId);
    if (!normalizedPostId) return false;

    try {
      const payload = await apiRequest<Post>(`${API_URL}/posts/${encodeURIComponent(normalizedPostId)}`, {
        cache: 'no-store'
      });
      if (!isApiSuccess(payload) || !payload.data) return false;

      setSelectedPost(payload.data);
      return true;
    } catch (error) {
      console.error('Failed to fetch post by id:', error);
      return false;
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(locationSearch);
    const view = (params.get('view') || '').toLowerCase();
    const sharedPostId = sanitizeEntityId(params.get('id'));

    if (view !== 'post' || !sharedPostId) return;

    let cancelled = false;

    (async () => {
      const opened = await fetchAndOpenPostById(sharedPostId);
      if (!opened && !cancelled) {
        toast.error('Khong tim thay bai viet duoc chia se');
        return;
      }

      if (!cancelled && opened) {
        clearSharedPostQueryFromUrl();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [locationSearch, fetchAndOpenPostById, clearSharedPostQueryFromUrl]);

  return {
    selectedPost,
    setSelectedPost,
    closeSelectedPost,
    fetchAndOpenPostById
  };
}
