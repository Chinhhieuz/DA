import { useState, useEffect } from 'react';
import { PostCard, Post } from './PostCard';
import { API_URL } from '@/lib/api';
import { getImageUrl } from '@/lib/imageUtils';
import { Loader2, Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SavedPostsProps {
  currentUser: any;
  onPostClick: (post: Post) => void;
  onUserClick: (userId: string) => void;
  onSaveToggle: (postId: string, isSaved: boolean) => void;
  onCommunityClick: (community: string) => void;
}

export function SavedPosts({ 
  currentUser, 
  onPostClick, 
  onUserClick, 
  onSaveToggle, 
  onCommunityClick 
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
        const formattedPosts = data.data.map((p: any) => ({
          id: p._id,
          author: {
            id: p.author?._id || '',
            name: p.author?.display_name || p.author?.username || 'Unknown',
            avatar: getImageUrl(p.author?.avatar_url),
            username: p.author?.username || 'unknown',
            isFollowing: !!p.author?.isFollowing,
          },
          community: p.community || 'lập trình',
          timestamp: new Date(p.created_at).toLocaleString('vi-VN'),
          title: p.title || 'Untitled',
          content: p.content || '',
          image: p.image_url ? getImageUrl(p.image_url) : undefined,
          image_urls: p.image_urls ? p.image_urls.map((url: string) => getImageUrl(url)) : [],
          upvotes: p.upvotes || 0,
          downvotes: p.downvotes || 0,
          comments: [],
          commentCount: p.commentCount || 0,
          recentComment: p.recentComment ? {
              authorName: p.recentComment.author?.display_name || p.recentComment.author?.username || 'Unknown',
              content: p.recentComment.content
          } : undefined,
          userVote: p.userVote || null,
        }));
        setPosts(formattedPosts);
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
      // Nếu bỏ lưu, xóa khỏi danh sách hiển thị ngay lập tức để có cảm giác mượt mà
      setPosts(prev => prev.filter(p => p.id !== postId));
    }
    onSaveToggle(postId, isSaved);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Đang tải các bài viết đã lưu...</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6 flex items-center gap-3">
        <div className="bg-primary/10 p-3 rounded-2xl text-primary shadow-sm">
          <Bookmark className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground">Bài viết đã lưu</h2>
          <p className="text-muted-foreground text-sm">Xem lại những nội dung bạn đã lưu lại để đọc sau</p>
        </div>
      </div>

      {posts.length > 0 ? (
        <div className="space-y-2">
          {posts.map((post) => (
            <PostCard 
              key={post.id} 
              post={post} 
              onPostClick={onPostClick} 
              currentUser={currentUser} 
              onUserClick={onUserClick}
              onSaveToggle={handleInternalSaveToggle}
              onCommunityClick={onCommunityClick}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-card rounded-2xl border border-dashed border-border flex flex-col items-center">
          <div className="bg-muted p-4 rounded-full mb-4">
            <Bookmark className="h-8 w-8 text-muted-foreground opacity-50" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Chưa có bài viết nào</h3>
          <p className="text-muted-foreground max-w-xs mx-auto mt-2">
            Bạn chưa lưu bài viết nào. Hãy khám phá trang chủ và lưu lại những nội dung thú vị nhé!
          </p>
          <Button 
            variant="outline" 
            className="mt-6 rounded-xl border-primary/20 text-primary hover:bg-primary/5"
            onClick={() => window.location.reload()} // Hoặc trigger về home
          >
            Về Trang Chủ
          </Button>
        </div>
      )}
    </div>
  );
}
