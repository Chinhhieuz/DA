import { useState, useEffect } from 'react';
import { Search, TrendingUp, UserPlus, Check } from 'lucide-react';
import { API_URL } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PostCard, Post } from './PostCard';

interface SearchViewProps {
  onPostClick?: (post: Post) => void;
  onUserClick?: (userId: string) => void;
  currentUser?: any;
}

export function SearchView({ onPostClick, onUserClick, currentUser }: SearchViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [trendingTopics, setTrendingTopics] = useState<any[]>([]);

  useEffect(() => {
    const fetchTrendingTopics = async () => {
      try {
        const res = await fetch(`${API_URL}/communities`);
        const data = await res.json();
        if (data.status === 'success') {
          const sorted = data.data
            .sort((a: any, b: any) => (b.postCount || 0) - (a.postCount || 0))
            .slice(0, 7);
          setTrendingTopics(sorted);
        }
      } catch (err) {
        console.error('Lỗi khi tải chủ đề thịnh hành:', err);
      }
    };
    fetchTrendingTopics();
  }, []);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      setIsSearching(true);

      try {
        // Mot bo headers dung chung cho cac API search de backend tu nhan dien user qua token.
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
        const postsRes = await fetch(`${API_URL}/posts/search?q=${encodeURIComponent(query)}`, {
          headers: authHeaders
        });
        const postsData = await postsRes.json();
        if (postsData.status === 'success') {
          setFilteredPosts(postsData.data);
        }

        const usersRes = await fetch(`${API_URL}/auth/search/users?q=${encodeURIComponent(query)}`, {
          headers: authHeaders
        });
        const usersData = await usersRes.json();
        if (usersData.status === 'success') {
          setFilteredUsers(usersData.data);
        }
      } catch (err) {
        console.error('Lỗi tìm kiếm:', err);
      } finally {
        setIsSearching(false);
      }
    } else {
      setFilteredPosts([]);
      setFilteredUsers([]);
    }
  };

  const toggleFollowUser = async (user: any) => {
    if (!currentUser?.id) {
      toast.error('Vui lòng đăng nhập để theo dõi');
      return;
    }

    const isFollowing = !!user.isFollowing;
    const action = isFollowing ? 'unfollow' : 'follow';

    setFilteredUsers(prev => prev.map(u => u._id === user._id ? { ...u, isFollowing: !isFollowing } : u));

    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const res = await fetch(`${API_URL}/auth/friends/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        // followerId khong gui tu frontend nua; backend lay tu token.
        body: JSON.stringify({ targetId: user._id })
      });

      if (res.ok) {
        toast.success(`${!isFollowing ? 'Đã theo dõi' : 'Đã bỏ theo dõi'} ${user.full_name || user.username}`);
      } else {
        const data = await res.json();
        toast.error(data.message || 'Lỗi khi thực hiện thao tác');
        setFilteredUsers(prev => prev.map(u => u._id === user._id ? { ...u, isFollowing } : u));
      }
    } catch (err) {
      toast.error('Lỗi kết nối máy chủ');
      setFilteredUsers(prev => prev.map(u => u._id === user._id ? { ...u, isFollowing } : u));
    }
  };

  const handlePostDeleted = (postId: string) => {
    setFilteredPosts(prev => prev.filter(p => p.id !== postId));
  };

  return (
    <div className="space-y-6">
      <section className="page-hero px-5 py-6 sm:px-7 sm:py-7">
        <div className="relative z-[1] space-y-5">
          <div className="max-w-2xl">
            <div className="page-soft-surface mb-3 inline-flex items-center rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-primary">
              Search Hub
            </div>
            <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-4xl">Tìm bài viết, người dùng và chủ đề nhanh hơn.</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
              Gộp kết quả theo người dùng và bài viết trong cùng một luồng để bạn khám phá nội dung không bị rối.
            </p>
          </div>
          <div className="page-stat-grid max-w-3xl">
            <div className="page-stat-card">
              <div className="text-xs font-black uppercase tracking-[0.24em] text-muted-foreground">Chủ đề</div>
              <div className="mt-2 text-2xl font-black text-foreground">{trendingTopics.length}</div>
              <div className="mt-1 text-sm text-muted-foreground">Đang gợi ý</div>
            </div>
            <div className="page-stat-card">
              <div className="text-xs font-black uppercase tracking-[0.24em] text-muted-foreground">Bài viết</div>
              <div className="mt-2 text-2xl font-black text-foreground">{filteredPosts.length}</div>
              <div className="mt-1 text-sm text-muted-foreground">{isSearching ? 'Đang cập nhật' : 'Khớp từ khóa hiện tại'}</div>
            </div>
            <div className="page-stat-card">
              <div className="text-xs font-black uppercase tracking-[0.24em] text-muted-foreground">Người dùng</div>
              <div className="mt-2 text-2xl font-black text-foreground">{filteredUsers.length}</div>
              <div className="mt-1 text-sm text-muted-foreground">Có thể kết nối</div>
            </div>
          </div>
        </div>
      </section>

      <Card className="page-section-card p-4 sm:p-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm bài viết, chủ đề..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="page-soft-surface h-12 rounded-2xl pl-11 text-base shadow-sm focus-visible:ring-primary/20"
          />
        </div>
      </Card>

      {searchQuery.trim() === '' ? (
        <>
          <Card className="page-section-card p-6">
            <div className="mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-foreground">Chủ đề đang thịnh hành</h2>
            </div>

            <div className="flex flex-wrap gap-2">
              {trendingTopics.map((topic) => (
                <Badge
                  key={topic._id}
                  variant="secondary"
                  className="page-soft-surface page-soft-hover cursor-pointer rounded-full px-4 py-2 text-foreground shadow-sm transition-all hover:-translate-y-0.5"
                  onClick={() => handleSearch(topic.name)}
                >
                  <span className="mr-1.5">{topic.icon || '#'}</span>
                  {topic.name}
                  <span className="ml-2 font-medium tracking-wide text-muted-foreground">- {topic.postCount || 0} bài</span>
                </Badge>
              ))}
            </div>
          </Card>

          <Card className="page-empty p-12 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Search className="h-6 w-6" />
            </div>
            <p className="text-lg font-bold text-foreground">Nhập từ khóa để bắt đầu tìm kiếm</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Bạn có thể tìm theo tiêu đề bài viết, nội dung hoặc tên chủ đề để đi thẳng tới phần cần xem.
            </p>
          </Card>
        </>
      ) : (
        <div className="space-y-5">
          <p className="text-sm text-muted-foreground">
            Tìm thấy {filteredPosts.length} bài viết và {filteredUsers.length} người dùng cho "{searchQuery}"
          </p>

          {filteredUsers.length > 0 && (
            <Card className="page-section-card p-5">
              <h3 className="mb-4 text-sm font-black uppercase tracking-[0.22em] text-muted-foreground">Người dùng</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {filteredUsers.map(user => (
                  <Card
                    key={user._id}
                    className="page-soft-surface page-soft-hover flex cursor-pointer items-center gap-3 rounded-[22px] p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
                    onClick={() => onUserClick && onUserClick(user._id)}
                  >
                    <Avatar className="h-11 w-11 border-2 border-white shadow-sm">
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback>{user.full_name?.charAt(0) || user.username?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-foreground">{user.full_name || user.username}</div>
                      <div className="truncate text-xs text-muted-foreground">@{user.username}</div>
                    </div>
                    {currentUser?.id !== user._id && (
                      <Button
                        size="sm"
                        variant={user.isFollowing ? 'secondary' : 'outline'}
                        className={`h-9 rounded-full px-3 text-xs font-semibold transition-all ${user.isFollowing ? 'bg-muted text-muted-foreground hover:bg-muted/80' : 'border-primary/20 text-primary hover:bg-primary/5'}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFollowUser(user);
                        }}
                      >
                        {user.isFollowing ? <Check className="h-3 w-3" /> : <UserPlus className="h-3 w-3" />}
                        {user.isFollowing ? 'Đang theo dõi' : 'Theo dõi'}
                      </Button>
                    )}
                  </Card>
                ))}
              </div>
            </Card>
          )}

          <div>
            <h3 className="mb-3 text-sm font-black uppercase tracking-[0.22em] text-muted-foreground">Bài viết</h3>
            {filteredPosts.length > 0 ? (
              <div className="space-y-4">
                {filteredPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onPostClick={onPostClick}
                    onUserClick={onUserClick}
                    currentUser={currentUser}
                    onDeleteSuccess={handlePostDeleted}
                  />
                ))}
              </div>
            ) : (
              <Card className="page-empty p-12 text-center">
                <p className="text-lg font-bold text-foreground">Không tìm thấy bài viết nào</p>
                <p className="mt-2 text-sm text-muted-foreground">Thử từ khóa ngắn hơn hoặc chuyển sang chủ đề gần đúng hơn.</p>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
