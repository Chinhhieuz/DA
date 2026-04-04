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
    <div className="flex flex-col h-full w-full bg-background relative">
      {/* Scrollable Area */}
      <div className="flex-1 overflow-y-auto px-1 pb-4">
        {(post.status === 'hidden' || post.status === 'rejected' || post.status === 'pending') && (
          <Card className={`mb-4 border-2 p-4 flex items-center gap-3 ${
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
        />

        <div className="px-3 md:px-0">
          <div className="mb-3 text-[15px] font-bold text-foreground">
            {comments.length > 0 ? "Tất cả bình luận" : "Chưa có bình luận"}
          </div>

          <div className="flex flex-col gap-4">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-2">
                <Avatar
                  className="h-8 w-8 mt-1 border border-border cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUserClick && comment.author.id && onUserClick(comment.author.id);
                  }}
                >
                  <AvatarImage src={comment.author.avatar} />
                  <AvatarFallback>{comment.author.name[0]}</AvatarFallback>
                </Avatar>
                
                <div className="flex flex-col w-full text-[14px]">
                  <div className="bg-muted px-3 py-2 rounded-2xl w-fit max-w-[90%] md:max-w-[85%] self-start">
                    <span
                      className="font-bold text-foreground hover:underline cursor-pointer block mb-0.5 leading-tight"
                      onClick={(e) => {
                        e.stopPropagation();
                        onUserClick && comment.author.id && onUserClick(comment.author.id);
                      }}
                    >
                      {comment.author.username}
                    </span>
                    <p className="text-foreground/90 whitespace-pre-wrap break-words">{comment.content}</p>
                    {comment.image && (
                      <img src={comment.image} alt="Bình luận chèn" className="mt-2 max-h-[250px] w-auto rounded-lg" />
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-[12px] font-semibold text-muted-foreground ml-3 mt-1 relative z-0">
                    <span className="font-normal">{comment.timestamp}</span>
                    
                    {currentUser.id === comment.author.id && (
                      <span 
                        className="cursor-pointer hover:underline text-red-500"
                        onClick={() => handleDeleteComment(comment.id)}
                      >
                        Xóa
                      </span>
                    )}
                  </div>

                  {/* Vùng Phản Hồi (Thread Reply Input) */}
                  {replyingTo === comment.id && (
                    <div className="mt-2 flex gap-2 w-full animate-in fade-in zoom-in-95 duration-200">
                       <Avatar className="h-6 w-6 mt-1 flex-shrink-0">
                         <AvatarImage src={getImageUrl(currentUser.avatar)} />
                         <AvatarFallback>{currentUser.name[0]}</AvatarFallback>
                       </Avatar>
                       <div className="flex-1 bg-muted rounded-2xl px-3 py-1.5 focus-within:ring-1 focus-within:ring-primary flex items-center">
                          <input
                            type="text"
                            placeholder="Viết phản hồi..."
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleReplySubmit(comment.id); }}
                            className="bg-transparent text-[13px] flex-1 outline-none min-w-0"
                          />
                          <button onClick={() => handleReplySubmit(comment.id)} className="text-primary hover:text-primary/80 shrink-0 ml-1">
                             <Send className="h-4 w-4" />
                          </button>
                       </div>
                    </div>
                  )}

                  {/* Hiển thị Các Phản hồi đã lưu trong CSDL của Comment này */}
                  {comment.threads && comment.threads.length > 0 && (
                    <div className="mt-2 space-y-3">
                      {comment.threads.map(thread => (
                        <div key={thread.id} className="flex gap-2 isolate relative before:absolute before:border-l-2 before:border-b-2 before:border-muted-foreground/30 before:-inset-x-6 before:-inset-y-9 before:w-6 before:h-12 before:rounded-bl-xl before:-z-10">
                          <Avatar
                            className="h-6 w-6 mt-1 border border-border cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              onUserClick && thread.author.id && onUserClick(thread.author.id);
                            }}
                          >
                            <AvatarImage src={thread.author.avatar} />
                            <AvatarFallback>{thread.author.name[0]}</AvatarFallback>
                          </Avatar>
                          
                          <div className="flex flex-col w-full text-[13px]">
                             <div className="bg-muted px-3 py-2 rounded-2xl w-fit max-w-[90%] md:max-w-[85%] self-start">
                               <span
                                 className="font-bold text-foreground hover:underline cursor-pointer flex items-center gap-1 mb-0.5"
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   onUserClick && thread.author.id && onUserClick(thread.author.id);
                                 }}
                               >
                                 {thread.author.username}
                                 {thread.author.username === post.author.username && (
                                    <span className="bg-blue-100 text-blue-700 text-[9px] px-1.5 py-0.5 rounded-sm uppercase tracking-wide">Tác giả</span>
                                 )}
                               </span>
                               <p className="text-foreground/90 whitespace-pre-wrap break-words">{thread.content}</p>
                               {thread.image && (
                                 <img src={thread.image} alt="Thread image" className="mt-2 max-h-[150px] rounded-md" />
                               )}
                             </div>
                             
                             <div className="flex items-center gap-3 text-[11px] font-semibold text-muted-foreground ml-3 mt-1">
                                <span className="font-normal">{thread.timestamp}</span>
                                {currentUser.id === thread.author.id && (
                                  <span 
                                    className="cursor-pointer hover:underline text-red-500"
                                    onClick={() => handleDeleteThread(comment.id, thread.id)}
                                  >
                                    Xóa
                                  </span>
                                )}
                             </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky Comment Footer */}
      <div className="shrink-0 p-3 pt-4 bg-background border-t border-border flex items-end gap-2.5 w-full shadow-[0px_-4px_10px_rgba(0,0,0,0.03)] z-20">
        <Avatar className="h-9 w-9 shrink-0 shadow-sm border border-border mt-0.5">
          <AvatarImage src={getImageUrl(currentUser.avatar)} />
          <AvatarFallback>{currentUser.name[0]}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1 flex flex-col bg-muted/80 rounded-2xl focus-within:ring-2 focus-within:ring-primary focus-within:bg-background transition-colors border border-transparent focus-within:border-primary/20 shadow-inner">
          <div className="flex items-center w-full px-3 py-2 min-h-[44px]">
             <input
               type="text"
               placeholder="Viết bình luận công khai..."
               value={newComment}
               onChange={(e) => setNewComment(e.target.value)}
               onKeyDown={(e) => {
                 if (e.key === 'Enter') handleAddComment();
               }}
               className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted-foreground/80 min-w-0"
             />
             <div className="flex items-center gap-0.5 shrink-0 ml-1">
                <label className="text-muted-foreground hover:text-foreground cursor-pointer p-1.5 rounded-full hover:bg-black/5 transition-colors">
                  <ImageIcon className="h-5 w-5" />
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const formData = new FormData();
                      formData.append('image', file);
                      if (currentUser.id) formData.append('user_id', currentUser.id);
                      try {
                        const uploadUrl = currentUser.id ? `${API_URL}/upload?user_id=${encodeURIComponent(currentUser.id)}` : `${API_URL}/upload`;
                        const res = await fetch(uploadUrl, { method: 'POST', body: formData });
                        const data = await res.json();
                        if (data.status === 'success') {
                          setCommentImage(data.data.url);
                          toast.success('Đã đính kèm ảnh!');
                        } else { toast.error(data.message || 'Lỗi tải ảnh'); }
                      } catch (error) { toast.error('Lỗi kết nối'); }
                    }}
                  />
                </label>
             </div>
          </div>
          {commentImage && (
            <div className="px-3 pb-2 flex items-center">
               <div className="relative inline-block mt-0.5">
                  <img src={commentImage} alt="Attachment" className="h-16 w-16 object-cover rounded-xl border border-border shadow-sm" />
                  <button onClick={() => setCommentImage('')} className="absolute -top-1.5 -right-1.5 bg-foreground text-background rounded-full p-0.5 shadow-md hover:bg-red-500 transition-colors">
                    <Trash2 className="h-3 w-3" />
                  </button>
               </div>
            </div>
          )}
        </div>
        
        <button 
          onClick={handleAddComment} 
          disabled={!newComment.trim() && !commentImage}
          className="h-11 w-11 rounded-full flex shrink-0 items-center justify-center bg-primary text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50 disabled:bg-muted disabled:text-muted-foreground transition-all duration-200"
        >
          <Send className="h-5 w-5 ml-[-2px]" />
        </button>
      </div>
    </div>
  );
}
