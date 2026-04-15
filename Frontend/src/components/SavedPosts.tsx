import { useState, useEffect } from 'react';
import { PostCard, Post } from './PostCard';
import { API_URL } from '@/lib/api';
import { Loader2, Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface SavedPostsProps {
  currentUser: any;
  onPostClick: (post: Post) => void;
  onUserClick: (userId: string) => void;
  onSaveToggle: (postId: string, isSaved: boolean) => void;
  onCommunityClick: (community: string) => void;
  onBackHome: () => void;
}

export function SavedPosts({
  currentUser,
  onPostClick,
  onUserClick,
  onSaveToggle,
  onCommunityClick,
  onBackHome
}: SavedPostsProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSavedPosts = async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/posts/saved/${currentUser.id}`);
      const data = await res.json();
      if (data.status === 'success') {
        setPosts(data.data);
      }
    } catch (err) {
      console.error('Error fetching saved posts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSavedPosts();
  }, [currentUser?.id]);

  const handleInternalSaveToggle = (postId: string, isSaved: boolean) => {
    if (!isSaved) {
      setPosts(prev => prev.filter(p => p.id !== postId));
    }
    onSaveToggle(postId, isSaved);
  };

  const handlePostDeleted = (postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  if (loading) {
    return (
      <Card className="page-empty flex flex-col items-center justify-center py-20 text-center">
        <Loader2 className="mb-4 h-8 w-8 animate-spin text-primary" />
        <p className="text-lg font-bold text-foreground">Đang tải các bài viết đã lưu</p>
        <p className="mt-2 text-sm text-muted-foreground">Hệ thống đang gom lại những nội dung bạn muốn đọc sau.</p>
      </Card>
    );
  }

  return (
    <div className="animate-in slide-in-from-bottom-4 space-y-6 duration-500">
      <section className="page-hero px-5 py-6 sm:px-7 sm:py-7">
        <div className="relative z-[1] flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="page-soft-surface mb-3 inline-flex items-center rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-primary">
              Reading List
            </div>
            <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-4xl">Không gian riêng cho những bài viết bạn muốn quay lại.</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
              Sắp xếp danh sách đã lưu thành một khu vực sạch sẽ, dễ nhìn và dễ tiếp tục đọc khi cần.
            </p>
          </div>
          <div className="page-stat-grid w-full max-w-sm">
            <div className="page-stat-card">
              <div className="text-xs font-black uppercase tracking-[0.24em] text-muted-foreground">Đã lưu</div>
              <div className="mt-2 text-2xl font-black text-foreground">{posts.length}</div>
              <div className="mt-1 text-sm text-muted-foreground">Bài viết</div>
            </div>
          </div>
        </div>
      </section>

      {posts.length > 0 ? (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onPostClick={onPostClick}
              currentUser={currentUser}
              onUserClick={onUserClick}
              onSaveToggle={handleInternalSaveToggle}
              onCommunityClick={onCommunityClick}
              onDeleteSuccess={handlePostDeleted}
            />
          ))}
        </div>
      ) : (
        <Card className="page-empty flex flex-col items-center py-20 text-center">
          <div className="mb-4 rounded-full bg-muted p-4">
            <Bookmark className="h-8 w-8 text-muted-foreground opacity-60" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Chưa có bài viết nào</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Bạn chưa lưu bài viết nào. Hãy khám phá trang chủ và đánh dấu những nội dung thực sự đáng xem lại.
          </p>
          <Button variant="outline" className="mt-6 rounded-full border-primary/20 text-primary hover:bg-primary/5" onClick={onBackHome}>
            Về trang chủ
          </Button>
        </Card>
      )}
    </div>
  );
}
