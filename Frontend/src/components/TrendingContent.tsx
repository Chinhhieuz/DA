import { useState, useEffect } from 'react';
import { TrendingUp, ArrowBigUp, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Post } from './PostCard';
import { API_URL } from '@/lib/api';

interface TrendingContentProps {
  onPostClick: (post: Post) => void;
  currentUser?: any;
}

export function TrendingContent({ onPostClick, currentUser }: TrendingContentProps) {
  const [trendingPosts, setTrendingPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrending = async () => {
      setLoading(true);
      try {
        const url = `${API_URL}/posts/trending${currentUser?.id ? `?userId=${currentUser.id}` : ''}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.status === 'success') {
          setTrendingPosts(data.data);
        }
      } catch (err) {
        console.error('Lỗi khi tải nội dung thịnh hành:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTrending();
  }, [currentUser?.id]);

  return (
    <div className="w-80 shrink-0">
      <div className="page-section-card overflow-hidden">
        <div className="border-b border-border/70 bg-[radial-gradient(circle_at_top_left,rgba(201,31,40,0.12),transparent_45%)] bg-accent/40 px-5 py-4 transition-colors">
          <div className="mb-1 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-black uppercase tracking-[0.22em] text-foreground">Trending</h3>
          </div>
          <p className="text-sm text-muted-foreground">Những bài viết đang kéo tương tác mạnh nhất lúc này.</p>
        </div>

        <div className="divide-y divide-border/70">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-primary/40" />
            </div>
          ) : trendingPosts.length > 0 ? (
            trendingPosts.map((post, index) => (
              <button
                key={post.id}
                onClick={() => onPostClick(post)}
                className="group flex w-full gap-3 px-4 py-4 text-left transition-colors hover:bg-muted/45"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 font-black text-primary">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
                    {post.title}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <Avatar className="h-5 w-5 border border-border">
                      <AvatarImage src={post.author.avatar} />
                      <AvatarFallback className="bg-primary/5 text-[9px] text-primary">{post.author.name[0]}</AvatarFallback>
                    </Avatar>
                    <span className="truncate text-[11px] text-muted-foreground">{post.author.username}</span>
                    <span className="text-[10px] text-muted-foreground/50">•</span>
                    <span className="truncate text-[10px] text-muted-foreground/70">{post.timestamp}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-orange-600">
                    <ArrowBigUp className="h-3.5 w-3.5 fill-orange-500" />
                    <span>{post.upvotes || 0} upvote</span>
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Chưa có nội dung trending
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
