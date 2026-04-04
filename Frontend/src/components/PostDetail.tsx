import { useState, useEffect } from 'react';
import { ArrowLeft, Send, Image as ImageIcon, ArrowBigUp, ArrowBigDown, Trash2, ShieldAlert, Lock } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getImageUrl } from '@/lib/imageUtils';
import { API_URL } from '@/lib/api';

import { PostCard, Post, Comment } from './PostCard';
import { toast } from 'sonner';



function CommentReaction({
  commentId,
  initialVote,
  initialUp,
  initialDown,
  currentUserId,
}: {
  commentId: string;
  initialVote: string | null;
  initialUp: number;
  initialDown: number;
  currentUserId?: string;
}) {
  const [userReaction, setUserReaction] = useState<string | null>(initialVote);
  const [upVotes, setUpVotes] = useState(initialUp);
  const [downVotes, setDownVotes] = useState(initialDown);

  useEffect(() => {
    setUserReaction(initialVote);
    setUpVotes(initialUp);
    setDownVotes(initialDown);
  }, [initialVote, initialUp, initialDown]);

  const handleVote = async (type: 'up' | 'down') => {
    if (!currentUserId) { toast.error('Vui lòng đăng nhập!'); return; }

    const previousUp = upVotes;
    const previousDown = downVotes;
    const previousReaction = userReaction;

    const isRemoving = userReaction === type || (type === 'up' && userReaction === '👍');
    const action = type === 'up'
      ? (isRemoving ? 'unlike' : 'up')
      : (isRemoving ? 'undislike' : 'down');

    // Optimistic Update
    if (type === 'up') {
      if (isRemoving) setUpVotes(Math.max(0, upVotes - 1));
      else {
        setUpVotes(upVotes + 1);
        if (userReaction === 'down') setDownVotes(Math.max(0, downVotes - 1));
      }
    } else {
      if (isRemoving) setDownVotes(Math.max(0, downVotes - 1));
      else {
        setDownVotes(downVotes + 1);
        if (userReaction === 'up' || userReaction === '👍') setUpVotes(Math.max(0, upVotes - 1));
      }
    }

    setUserReaction(isRemoving ? null : type);

    try {
      const res = await fetch(`${API_URL}/comments/${commentId}/react`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, user_id: currentUserId, type })
      });
      const data = await res.json();
      if (!res.ok || data.status !== 'success') {
        throw new Error(data.message || 'Lỗi không xác định');
      }
    } catch (e: any) {
      console.error('Lỗi lưu vote comment:', e);
      toast.error('Không thể lưu lượt bình chọn cho bình luận.');
      // Revert state
      setUpVotes(previousUp);
      setDownVotes(previousDown);
      setUserReaction(previousReaction);
    }
  };

  return (
    <div className="flex items-center bg-muted rounded-full p-0.5 border border-border gap-1">
      <div className="flex items-center gap-1 group/up">
        <Button
          variant="ghost"
          size="sm"
          className={`h-7 w-7 p-0 rounded-full transition-colors ${userReaction === 'up' || userReaction === '👍' ? 'text-orange-600 bg-orange-50 hover:bg-orange-100' : 'text-muted-foreground hover:text-orange-600 hover:bg-orange-50'}`}
          onClick={() => handleVote('up')}
        >
          <ArrowBigUp className={`h-4 w-4 ${userReaction === 'up' || userReaction === '👍' ? 'fill-orange-600' : ''}`} />
        </Button>
        <span className={`text-xs font-bold min-w-[10px] ${userReaction === 'up' || userReaction === '👍' ? 'text-orange-600' : 'text-muted-foreground'}`}>
          {upVotes}
        </span>
      </div>

      <div className="w-[1px] h-3 bg-border mx-0.5"></div>

      <div className="flex items-center gap-1 group/down">
        <Button
          variant="ghost"
          size="sm"
          className={`h-7 w-7 p-0 rounded-full transition-colors ${userReaction === 'down' ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' : 'text-muted-foreground hover:text-blue-600 hover:bg-blue-50'}`}
          onClick={() => handleVote('down')}
        >
          <ArrowBigDown className={`h-4 w-4 ${userReaction === 'down' ? 'fill-blue-600' : ''}`} />
        </Button>
        <span className={`text-xs font-bold min-w-[10px] ${userReaction === 'down' ? 'text-blue-600' : 'text-muted-foreground'}`}>
          {downVotes}
        </span>
      </div>
    </div>
  );
}

interface PostDetailProps {
  post: Post;
  onBack: () => void;
  currentUser: {
    id?: string;
    name: string;
    avatar: string;
    username: string;
    savedPosts?: string[];
  };
  onAddComment: (postId: string, newComment: Comment) => void;
  onUserClick: (userId: string) => void;
  onSaveToggle?: (postId: string, isSaved: boolean) => void;
  onCommunityClick?: (community: string) => void;
}

export function PostDetail({ post, onBack, currentUser, onAddComment, onUserClick, onSaveToggle, onCommunityClick }: PostDetailProps) {
  const [newComment, setNewComment] = useState('');
  const [commentImage, setCommentImage] = useState('');
  const [showCommentImageInput, setShowCommentImageInput] = useState(false);

  const [comments, setComments] = useState<Comment[]>(post.comments || []);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [replyImage, setReplyImage] = useState('');

  useEffect(() => {
    const fetchComments = async () => {
      try {
        const url = `${API_URL}/comments/post/${post.id}${currentUser.id ? `?userId=${currentUser.id}` : ''}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.status === 'success') {
          const formattedComments = data.data.map((c: any) => ({
            id: c._id,
            author: {
              name: c.author?.display_name || c.author?.username || 'Unknown',
              username: c.author?.username || 'unknown',
              avatar: getImageUrl(c.author?.avatar_url),
              id: c.author?._id
            },
            content: c.content,
            image: c.image_url ? getImageUrl(c.image_url, '') : undefined,
            timestamp: new Date(c.created_at).toLocaleString('vi-VN'),
            upvotes: c.upvotes || 0,
            downvotes: c.downvotes || 0,
            userVote: c.userVote || null,
            threads: (c.threads || []).map((t: any) => ({
              id: t._id,
              author: {
                name: t.author?.display_name || t.author?.username || 'Unknown',
                username: t.author?.username || 'unknown',
                avatar: getImageUrl(t.author?.avatar_url),
                id: t.author?._id
              },
              content: t.content,
              image: t.image_url ? getImageUrl(t.image_url, '') : undefined,
              timestamp: new Date(t.created_at).toLocaleString('vi-VN')
            }))
          }));
          setComments(formattedComments);
        }
      } catch (e) {
        console.error("Lỗi fetch comments:", e);
      }
    };
    fetchComments();
  }, [post.id, currentUser.id]);

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      toast.error('Vui lòng nhập nội dung bình luận');
      return;
    }
    if (!currentUser.id) {
      toast.error("Bạn cần đăng nhập để bình luận!"); return;
    }

    try {
      const res = await fetch(`${API_URL}/comments/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_id: post.id,
          author_id: currentUser.id,
          content: newComment,
          image_url: commentImage
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        const addedComment: Comment = {
          id: data.data._id,
          author: { name: currentUser.name, username: currentUser.username, avatar: getImageUrl(currentUser.avatar) },
          content: newComment,
          image: data.data.image_url,
          timestamp: 'Vừa xong',
          upvotes: 0,
          downvotes: 0,
          threads: []
        };
        setComments([addedComment, ...comments]);
        setNewComment('');
        setCommentImage('');
        setShowCommentImageInput(false);
        toast.success('Đã bình luận!');
      } else {
        toast.error(data.message);
      }
    } catch (e) {
      toast.error('Lỗi server khi bình luận');
    }
  };

  const handleReplySubmit = async (commentId: string) => {
    if (!replyContent.trim()) {
      toast.error('Vui lòng nhập nội dung phản hồi');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/threads/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comment_id: commentId,
          author_id: currentUser.id,
          content: replyContent,
          image_url: replyImage
        })
      });
      const data = await res.json();

      if (data.status === 'success') {
        toast.success('Đã trả lời bình luận!');

        const newThread = {
          id: data.data._id,
          author: { name: currentUser.name, username: currentUser.username, avatar: getImageUrl(currentUser.avatar) },
          content: replyContent,
          image: data.data.image_url,
          timestamp: 'Vừa xong'
        };

        // Thêm thread vào comment tương ứng
        setComments(comments.map(c => {
          if (c.id === commentId) {
            return { ...c, threads: [...(c.threads || []), newThread] };
          }
          return c;
        }));

        setReplyingTo(null);
        setReplyContent('');
        setReplyImage('');
      } else {
        toast.error('Lỗi: ' + data.message);
      }
    } catch (e) {
      toast.error('Lỗi server khi gửi reply');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bình luận này không?')) return;
    try {
      const res = await fetch(`${API_URL}/comments/${commentId}?user_id=${currentUser.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUser.id })
      });
      const data = await res.json();
      if (data.status === 'success') {
        toast.success('Đã xóa bình luận');
        setComments(comments.filter(c => c.id !== commentId));
      } else {
        toast.error(data.message || 'Lỗi không xác định từ server');
      }
    } catch (e: any) {
      toast.error('Lỗi server khi xóa bình luận: ' + e.message);
    }
  };

  const handleDeleteThread = async (commentId: string, threadId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa phản hồi này không?')) return;
    try {
      const res = await fetch(`${API_URL}/threads/${threadId}?user_id=${currentUser.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUser.id })
      });
      const data = await res.json();
      if (data.status === 'success') {
        toast.success('Đã xóa phản hồi');
        setComments(comments.map(c => {
          if (c.id === commentId) {
            return { ...c, threads: (c.threads || []).filter(t => t.id !== threadId) };
          }
          return c;
        }));
      } else {
        toast.error(data.message || 'Lỗi không xác định từ server');
      }
    } catch (e: any) {
      toast.error('Lỗi server khi xóa phản hồi: ' + e.message);
    }
  };

  return (
    <div>
      <Button
        variant="ghost"
        className="mb-4 gap-2 hover:bg-muted"
        onClick={onBack}
      >
        <ArrowLeft className="h-4 w-4" />
        Quay lại
      </Button>
      
      {(post.status === 'hidden' || post.status === 'rejected' || post.status === 'pending') && (
        <Card className={`mb-4 border-2 p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${
          post.status === 'pending' ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'
        }`}>
          <div className={`p-2 rounded-full ${post.status === 'pending' ? 'bg-amber-100' : 'bg-red-100'}`}>
            {post.status === 'pending' ? <ShieldAlert className="h-5 w-5 text-amber-600" /> : <Lock className="h-5 w-5 text-red-600" />}
          </div>
          <div>
             <h4 className={`font-bold text-sm ${post.status === 'pending' ? 'text-amber-800' : 'text-red-800'}`}>
               {post.status === 'pending' ? 'BÀI VIẾT ĐANG CHỜ DUYỆT' : 'BÀI VIẾT ĐÃ BỊ KHÓA'}
             </h4>
             <p className={`text-xs ${post.status === 'pending' ? 'text-amber-700' : 'text-red-700'}`}>
               {post.status === 'pending' 
                 ? 'Bài viết của bạn đang được quản trị viên kiểm duyệt. Nó sẽ sớm xuất hiện trên trang chủ.' 
                 : 'Nội dung này đã bị quản trị viên ẩn khỏi trang chủ do vi phạm quy tắc cộng đồng.'}
             </p>
          </div>
          <ShieldAlert className={`ml-auto h-6 w-6 opacity-50 ${post.status === 'pending' ? 'text-amber-300' : 'text-red-300'}`} />
        </Card>
      )}

      <PostCard
        post={post}
        currentUser={currentUser}
        onUserClick={onUserClick}
        onSaveToggle={onSaveToggle}
        onCommunityClick={onCommunityClick}
        showAllImages={true}
      /> <Card
 className="mb-4 border-slate-200 bg-white p-4">
        <div className="mb-4 flex items-center gap-3">
          <Avatar className="h-10 w-10 border-2 border-border">
            <AvatarImage src={getImageUrl(currentUser.avatar)} />
            <AvatarFallback>{currentUser.name[0]}</AvatarFallback>
          </Avatar>
          <span className="text-sm text-muted-foreground">Bình luận với tư cách {currentUser.username}</span>
        </div>

        <Textarea
          placeholder="Bạn nghĩ gì về bài viết này?"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="mb-3 min-h-24 border-border focus:ring-primary"
        />

        {showCommentImageInput && (
          <div className="mb-3">
            <Input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const formData = new FormData();
                formData.append('image', file);
                // Truyền user_id qua query string để backend xác thực trước khi upload lên Cloudinary
                if (currentUser.id) formData.append('user_id', currentUser.id);
                try {
                  const uploadUrl = currentUser.id 
                    ? `${API_URL}/upload?user_id=${encodeURIComponent(currentUser.id)}` 
                    : `${API_URL}/upload`;
                  const res = await fetch(uploadUrl, { method: 'POST', body: formData });
                  const data = await res.json();
                  if (data.status === 'success') {
                    setCommentImage(data.data.url);
                    toast.success('Đã đính kèm ảnh!');
                  } else {
                    toast.error(data.message || 'Lỗi tải ảnh');
                  }
                } catch (error) { toast.error('Lỗi kết nối'); }
              }}
              className="border-slate-300 focus:ring-primary h-9 cursor-pointer text-sm"
            />
            {commentImage && <p className="text-xs text-green-600 font-medium ml-1 mt-1">✓ Ảnh đã sẵn sàng</p>}
          </div>
        )}

        <div className="flex justify-between">
          <Button variant="ghost" size="sm" onClick={() => setShowCommentImageInput(!showCommentImageInput)}>
            <ImageIcon className="h-4 w-4 mr-2" /> Đính kèm ảnh
          </Button>
          <Button
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={handleAddComment}
          >
            <Send className="h-4 w-4" />
            Bình luận
          </Button>
        </div>
      </Card>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-foreground">
          {comments.length} Bình luận
        </h3>
        {comments.map((comment) => (
          <Card key={comment.id} className="border-border bg-card p-4">
            <div className="mb-2 flex items-center gap-2">
              <Avatar
                className="h-8 w-8 border-2 border-border cursor-pointer hover:opacity-80 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('Comment user clicked:', comment.author.id);
                  onUserClick && comment.author.id && onUserClick(comment.author.id);
                }}
              >
                <AvatarImage src={comment.author.avatar} />
                <AvatarFallback>{comment.author.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-2">
                <span
                  className="font-bold text-foreground text-[14px] hover:underline cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('Comment name clicked:', comment.author.id);
                    onUserClick && comment.author.id && onUserClick(comment.author.id);
                  }}
                >
                  {comment.author.username}
                </span>
                <span className="text-muted-foreground">•</span>
                <span className="text-sm text-muted-foreground">{comment.timestamp}</span>
              </div>
            </div>
            <p className="mb-2 text-foreground/90">{comment.content}</p>
            {comment.image && (
              <img src={comment.image} alt="Bình luận chèn" className="mb-3 max-w-[200px] rounded-lg" />
            )}

            <div className="flex items-center gap-2 text-sm text-muted-foreground border-t border-border mt-2 pt-2">
              {/* Emoji Reaction Picker hover for comment */}
              <CommentReaction
                commentId={comment.id}
                initialVote={comment.userVote ?? null}
                initialUp={comment.upvotes}
                initialDown={comment.downvotes}
                currentUserId={currentUser.id}
              />
              {/* Reply button: only post author */}
              {currentUser.username === post.author.username && (
                <Button variant="ghost" size="sm" className="h-7 hover:bg-muted text-primary text-xs" onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}>
                  Trả lời (Tác giả)
                </Button>
              )}
              {/* Delete button: only comment author */}
              {currentUser.id === comment.author.id && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 hover:bg-red-50 text-red-500 text-xs gap-1"
                  onClick={() => handleDeleteComment(comment.id)}
                >
                  <Trash2 className="h-3 w-3" />
                  Xóa
                </Button>
              )}
            </div>

            {/* Vùng Phản Hồi (Thread Reply Input) */}
            {replyingTo === comment.id && (
              <div className="mt-4 ml-8 pl-4 border-l-2 border-blue-200">
                <Textarea
                  placeholder="Viết phản hồi của bạn dưới tư cách tác giả..."
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  className="mb-2 min-h-16 text-sm"
                />
                <div className="mb-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const formData = new FormData();
                      formData.append('image', file);
                      // Truyền user_id qua query string để backend xác thực trước khi upload lên Cloudinary
                      if (currentUser.id) formData.append('user_id', currentUser.id);
                      try {
                        const uploadUrl = currentUser.id 
                          ? `${API_URL}/upload?user_id=${encodeURIComponent(currentUser.id)}` 
                          : `${API_URL}/upload`;
                        const res = await fetch(uploadUrl, { method: 'POST', body: formData });
                        const data = await res.json();
                        if (data.status === 'success') {
                          setReplyImage(data.data.url);
                          toast.success('Đã đính kèm ảnh!');
                        } else {
                          toast.error(data.message || 'Lỗi tải ảnh');
                        }
                      } catch (error) { toast.error('Lỗi kết nối'); }
                    }}
                    className="h-9 text-sm cursor-pointer"
                  />
                  {replyImage && <p className="text-xs text-green-600 font-medium ml-1 mt-1">✓ Ảnh đã sẵn sàng</p>}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleReplySubmit(comment.id)}>Gửi Phản hồi</Button>
                  <Button size="sm" variant="outline" onClick={() => setReplyingTo(null)}>Hủy</Button>
                </div>
              </div>
            )}

            {/* Hiển thị Các Phản hồi đã lưu trong CSDL của Comment này */}
            {comment.threads && comment.threads.length > 0 && (
              <div className="mt-4 ml-8 pl-4 border-l-2 border-border space-y-3">
                {comment.threads.map(thread => (
                  <div key={thread.id} className="bg-muted p-3 rounded-md">
                    <div className="flex items-center gap-2 mb-1">
                      <Avatar
                        className="h-6 w-6 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('Thread user clicked:', thread.author.id);
                          onUserClick && thread.author.id && onUserClick(thread.author.id);
                        }}
                      >
                        <AvatarImage src={thread.author.avatar} />
                        <AvatarFallback>{thread.author.name[0]}</AvatarFallback>
                      </Avatar>
                      <span
                        className="font-bold text-foreground text-xs cursor-pointer hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('Thread name clicked:', thread.author.id);
                          onUserClick && thread.author.id && onUserClick(thread.author.id);
                        }}
                      >
                        {thread.author.username} (Chủ thớt)
                      </span>
                      <span className="text-xs text-muted-foreground">{thread.timestamp}</span>
                      {currentUser.id === thread.author.id && (
                        <button
                          className="ml-auto text-red-400 hover:text-red-600 transition-colors"
                          onClick={() => handleDeleteThread(comment.id, thread.id)}
                          title="Xóa phản hồi"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-foreground/80">{thread.content}</p>
                    {thread.image && (
                      <img src={thread.image} alt="Thread image" className="mt-2 max-w-[150px] rounded-md" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
