import { useState } from 'react';
import { Search, TrendingUp, Users, Clock, ArrowRight, MessageSquare, Heart, Share2, Trash2, UserPlus } from 'lucide-react';
import { API_URL } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PostCard, Post } from './PostCard';

const trendingTopics = [
  { tag: 'lập trình', posts: '5.2K' },
  { tag: 'cơ sở dữ liệu', posts: '3.1K' },
  { tag: 'trí tuệ nhân tạo', posts: '4.8K' },
  { tag: 'mạng máy tính', posts: '2.4K' },
  { tag: 'cấu trúc dữ liệu', posts: '1.9K' },
];

interface SearchViewProps {
  allPosts: Post[];
  onPostClick?: (post: Post) => void;
  onUserClick?: (userId: string) => void;
  currentUser?: any;
}

export function SearchView({ allPosts, onPostClick, onUserClick, currentUser }: SearchViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      setIsSearching(true);
      // Lọc bài viết cục bộ (hoặc từ props)
      const filteredP = allPosts.filter(
        (post) =>
          post.title.toLowerCase().includes(query.toLowerCase()) ||
          post.content.toLowerCase().includes(query.toLowerCase()) ||
          post.community.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredPosts(filteredP);

      // Tìm người dùng từ API
      try {
      const res = await fetch(`${API_URL}/posts/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.status === 'success') {
          setFilteredUsers(data.data);
        }
      } catch (err) {
        console.error('Lỗi tìm kiếm người dùng:', err);
      } finally {
        setIsSearching(false);
      }
    } else {
      setFilteredPosts([]);
      setFilteredUsers([]);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="mb-1 text-2xl font-bold text-gray-900">Tìm kiếm</h1>
        <p className="text-gray-600">Khám phá bài viết và chủ đề</p>
      </div>

      <Card className="border-slate-200 bg-white p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Tìm kiếm bài viết, chủ đề..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="border-slate-300 pl-10 focus:ring-primary"
          />
        </div>
      </Card>

      {searchQuery.trim() === '' ? (
        <>
          <Card className="border-slate-200 bg-slate-50 p-6">
            <div className="mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-gray-900">Chủ đề đang thịnh hành</h2>
            </div>

            <div className="flex flex-wrap gap-2">
              {trendingTopics.map((topic) => (
                <Badge
                  key={topic.tag}
                  variant="secondary"
                  className="cursor-pointer bg-white text-gray-900 px-4 py-2 hover:bg-slate-100"
                  onClick={() => handleSearch(topic.tag)}
                >
                  #{topic.tag}
                  <span className="ml-2 text-gray-500">• {topic.posts} bài</span>
                </Badge>
              ))}
            </div>
          </Card>

          <Card className="border-slate-200 bg-white p-12 text-center">
            <p className="text-gray-500">Nhập từ khóa để tìm kiếm bài viết</p>
          </Card>
        </>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Tìm thấy {filteredPosts.length} bài viết và {filteredUsers.length} người dùng cho "{searchQuery}"
          </p>

          {filteredUsers.length > 0 && (
             <div className="mb-6">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Người dùng</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                   {filteredUsers.map(user => (
                      <Card 
                        key={user._id} 
                        className="p-3 flex items-center gap-3 hover:shadow-md transition-all cursor-pointer border-slate-200"
                        onClick={() => onUserClick && onUserClick(user._id)}
                      >
                         <Avatar className="h-10 w-10 border-2 border-slate-100">
                            <AvatarImage src={user.avatar_url} />
                            <AvatarFallback>{user.full_name?.charAt(0) || user.username?.charAt(0)}</AvatarFallback>
                         </Avatar>
                         <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-gray-900 truncate">{user.full_name || user.username}</div>
                            <div className="text-xs text-gray-500 truncate">@{user.username}</div>
                         </div>
                         {currentUser?.id !== user._id && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-8 text-xs font-semibold text-red-600 border-red-200 hover:bg-red-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                fetch(`${API_URL}/auth/friends/follow`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ followerId: currentUser.id, targetId: user._id })
                                }).then(res => {
                                  if (res.ok) toast.success(`Đã theo dõi ${user.full_name || user.username}`);
                                  else toast.error('Lỗi khi theo dõi');
                                });
                              }}
                            >
                              Theo dõi
                            </Button>
                         )}
                      </Card>
                   ))}
                </div>
             </div>
          )}

          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Bài viết</h3>
          {filteredPosts.length > 0 ? (
            filteredPosts.map((post) => (
              <PostCard 
                key={post.id} 
                post={post} 
                onPostClick={onPostClick} 
                onUserClick={onUserClick}
                currentUser={currentUser}
              />
            ))
          ) : (
            <Card className="border-slate-200 bg-white p-12 text-center">
              <p className="text-gray-500">Không tìm thấy bài viết nào</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
