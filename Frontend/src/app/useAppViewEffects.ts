import { useEffect } from 'react';

interface UseAppViewEffectsParams {
  currentView: string;
  viewedUserId: string | null;
  loadMoreTriggerRef: React.RefObject<HTMLDivElement | null>;
  hasMorePosts: boolean;
  isFetchingPosts: boolean;
  fetchMorePosts: () => Promise<void>;
  postsLength: number;
}

export function useAppViewEffects({
  currentView,
  viewedUserId,
  loadMoreTriggerRef,
  hasMorePosts,
  isFetchingPosts,
  fetchMorePosts,
  postsLength
}: UseAppViewEffectsParams) {
  useEffect(() => {
    if (currentView !== 'home') return;

    const trigger = loadMoreTriggerRef.current;
    if (!trigger) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        if (!hasMorePosts || isFetchingPosts) return;
        void fetchMorePosts();
      },
      { root: null, rootMargin: '500px 0px', threshold: 0 }
    );

    observer.observe(trigger);
    return () => observer.disconnect();
  }, [currentView, hasMorePosts, isFetchingPosts, fetchMorePosts, postsLength, loadMoreTriggerRef]);

  useEffect(() => {
    if (currentView !== 'profile') return;

    const scrollToTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    const timer = window.setTimeout(scrollToTop, 0);
    return () => window.clearTimeout(timer);
  }, [currentView, viewedUserId]);
}
