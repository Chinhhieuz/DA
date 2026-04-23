import { Filter, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PostCard, type Post } from '@/components/PostCard';
import type { AppUser as User } from '@/types/user';

interface HomeFeedProps {
  feedFilter: 'all' | 'following';
  isAuthenticated: boolean;
  onFeedFilterChange: (value: 'all' | 'following') => void;
  activeCommunity: string | null;
  onClearCommunity: () => void;
  posts: Post[];
  currentUser: User;
  onPostClick: (post: Post) => void;
  onUserClick: (userId: string) => void;
  onSaveToggle: (postId: string, isSaved: boolean) => void;
  onCommunityClick: (community: string) => void;
  onDeleteSuccess: (postId: string) => void;
  loadMoreTriggerRef: React.RefObject<HTMLDivElement | null>;
  isFetchingPosts: boolean;
  hasMorePosts: boolean;
}

export function HomeFeed({
  feedFilter,
  isAuthenticated,
  onFeedFilterChange,
  activeCommunity,
  onClearCommunity,
  posts,
  currentUser,
  onPostClick,
  onUserClick,
  onSaveToggle,
  onCommunityClick,
  onDeleteSuccess,
  loadMoreTriggerRef,
  isFetchingPosts,
  hasMorePosts
}: HomeFeedProps) {
  return (
    <div className="space-y-6">
      <section className="glass-panel soft-ring overflow-hidden rounded-[28px]">
        <div className="relative px-5 py-5 sm:px-7 sm:py-7">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(201,31,40,0.12),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(18,59,116,0.12),transparent_34%)]" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="page-soft-surface mb-3 inline-flex items-center rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.24em] text-primary">
                Bang tin Linky
              </div>
              <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-4xl">
                Không gian thảo luận gọn gàng, dễ đọc và nổi bật nội dung quan trọng.
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                Theo dõi các bài viết mới, chuyển nhanh giữa chế độ khám phá và nội dung từ những người bạn quan tâm.
              </p>
            </div>
            <div className="page-soft-surface flex items-center gap-2 rounded-2xl p-1.5 shadow-sm">
              <Button
                variant={feedFilter === 'all' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onFeedFilterChange('all')}
                className={`rounded-xl px-6 h-10 font-bold transition-all ${feedFilter === 'all' ? 'shadow-md shadow-primary/20' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Khám phá
              </Button>
              <Button
                variant={feedFilter === 'following' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => isAuthenticated ? onFeedFilterChange('following') : toast.error('Vui lòng đăng nhập')}
                className={`rounded-xl px-6 h-10 font-bold transition-all ${feedFilter === 'following' ? 'shadow-md shadow-primary/20' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Đang theo dõi
              </Button>
            </div>
          </div>
        </div>
      </section>
      {activeCommunity && (
        <div className="glass-panel mb-6 flex items-center justify-between rounded-[24px] p-5">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary"><Filter className="h-5 w-5" /></div>
            <div>
              <h2 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Chủ đề</h2>
              <span className="text-xl font-bold">{activeCommunity}</span>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onClearCommunity} className="rounded-xl"><X className="h-3.5 w-3.5 mr-2" /> Xóa</Button>
        </div>
      )}
      <div className="space-y-5">
        {posts.map(post => (
          <PostCard
            key={post.id}
            post={post}
            onPostClick={onPostClick}
            currentUser={currentUser}
            onUserClick={onUserClick}
            onSaveToggle={onSaveToggle}
            onCommunityClick={onCommunityClick}
            onDeleteSuccess={onDeleteSuccess}
          />
        ))}
        <div ref={loadMoreTriggerRef} className="h-1 w-full" />
        {isFetchingPosts && (
          <p className="py-2 text-center text-sm text-muted-foreground">Dang tai them bai viet...</p>
        )}
        {!hasMorePosts && posts.length > 0 && (
          <p className="py-2 text-center text-xs uppercase tracking-wide text-muted-foreground">Ban da xem het bai viet</p>
        )}
      </div>
    </div>
  );
}
