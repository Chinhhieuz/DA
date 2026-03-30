import { TrendingUp, ArrowBigUp } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Post } from './PostCard';

interface TrendingContentProps {
  posts: Post[];
  onPostClick: (post: Post) => void;
}

export function TrendingContent({ posts, onPostClick }: TrendingContentProps) {
  // Tính toán top 5 bài viết có nhiều lượt thích nhất
  const trendingPosts = [...posts]
    .sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0))
    .slice(0, 5);

  return (
    <div className="w-72 shrink-0">
      <div className="sticky top-20">
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-gray-900 text-sm">Nội dung thịnh hành</h3>
          </div>

          {/* Items */}
          <div className="divide-y divide-slate-50">
            {trendingPosts.length > 0 ? (
              trendingPosts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => onPostClick(post)}
                  className="px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div className="flex gap-2.5">
                    <span className="text-lg shrink-0 mt-0.5">🔥</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 leading-snug line-clamp-2">
                        {post.title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Avatar className="h-4 w-4">
                          <AvatarImage src={post.author.avatar} />
                          <AvatarFallback className="text-[8px]">{post.author.name[0]}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-gray-500 truncate">{post.author.username}</span>
                        <span className="text-xs text-gray-300">·</span>
                        <span className="text-xs text-gray-400 truncate">{post.timestamp}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1 font-semibold">
                        <ArrowBigUp className="h-3.5 w-3.5 text-orange-500 fill-orange-500" />
                        <span className="text-xs text-gray-500">Lượt thích: {post.upvotes || 0}</span>
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
