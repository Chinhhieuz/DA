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
    <div className="w-72 shrink-0">
      <div className="sticky top-20">
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50/50">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-gray-900 text-sm">Nội dung thịnh hành</h3>
          </div>

          {/* Items */}
          <div className="divide-y divide-slate-50">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-primary/40" />
              </div>
            ) : trendingPosts.length > 0 ? (
              trendingPosts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => onPostClick(post)}
                  className="px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors group"
                >
                  <div className="flex gap-2.5">
                    <span className="text-lg shrink-0 mt-0.5 group-hover:scale-110 transition-transform">🔥</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                        {post.title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Avatar className="h-4 w-4 border border-slate-100">
                          <AvatarImage src={post.author.avatar} />
                          <AvatarFallback className="text-[8px] bg-primary/5 text-primary">{post.author.name[0]}</AvatarFallback>
                        </Avatar>
                        <span className="text-[11px] text-gray-500 truncate max-w-[80px]">{post.author.username}</span>
                        <span className="text-[10px] text-gray-300">·</span>
                        <span className="text-[10px] text-gray-400 truncate">{post.timestamp}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1.5 font-semibold text-orange-600">
                        <ArrowBigUp className="h-3.5 w-3.5 fill-orange-500" />
                        <span className="text-[11px]">{post.upvotes || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
                <div className="px-4 py-6 text-center text-sm text-gray-500">
                  Chưa có nội dung trending
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
