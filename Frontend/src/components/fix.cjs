const fs = require('fs');
const lines = fs.readFileSync('AdminDashboard.tsx', 'utf-8').split('\n');
const cleanLines = lines.slice(0, 1127);
const appendCode = `                          <p className="text-[10px] text-muted-foreground">MSSV: {user.mssv || 'N/A'}</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="outline" className={user.role?.toLowerCase() === 'admin' ? 'border-primary text-primary bg-primary/5' : ''}>
                            {user.role}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                            onClick={() => openEditDialog(user)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Dialog chi tiết bài đăng — Khung Vừa Phải & Chuyên nghiệp (Balanced Modal) */}
      <Dialog open={!!viewingPost} onOpenChange={(open) => !open && setViewingPost(null)}>
        <DialogContent className="max-w-5xl w-[94vw] h-[90vh] p-0 border-none shadow-2xl bg-background rounded-3xl overflow-hidden flex flex-col z-[100] [&>button]:hidden">
          <DialogTitle className="sr-only">Chi tiết bài viết</DialogTitle>
          <DialogDescription className="sr-only">Mô tả và nội dung của bài viết đang được xem.</DialogDescription>
          {/* Header */}
          <div className="flex-shrink-0 h-16 bg-muted/40 border-b border-border/80 px-8 flex items-center justify-between sticky top-0 z-50 backdrop-blur-md">
             <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-[10px] font-black tracking-widest uppercase py-1 px-3 rounded-full border-primary/30 text-primary bg-primary/5">
                   Moderation Context
                </Badge>
                {viewingPost?.community && (
                   <span className="text-xs font-black text-muted-foreground uppercase tracking-widest opacity-40">in {viewingPost.community}</span>
                )}
             </div>
             <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-red-500/10 hover:text-red-500" onClick={() => setViewingPost(null)}>
                <X className="h-5 w-5" />
             </Button>
          </div>

          <div className="flex-1 overflow-y-auto bg-background/50 custom-scrollbar">
             <div className="max-w-3xl mx-auto px-6 py-12 space-y-12">
                <header className="space-y-6 text-center">
                   <h2 className="text-4xl font-black tracking-tighter text-foreground leading-[1.1]">
                      {viewingPost?.title}
                   </h2>
                   <div className="flex items-center justify-center gap-4 text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-50">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{viewingPost && new Date(viewingPost.created_at).toLocaleString('vi-VN')}</span>
                   </div>
                   <div className="h-1 w-20 bg-primary/20 mx-auto rounded-full"></div>
                </header>

                <div className="space-y-10">
                   <p className="text-xl text-foreground font-medium leading-[1.7] whitespace-pre-wrap select-text">
                      {viewingPost?.content}
                   </p>

                   {/* Media Section */}
                   {(viewingPost?.image_urls?.length > 0 || viewingPost?.image_url) && (
                      <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                         {viewingPost?.image_urls?.map((url, i) => (
                            <div key={i} className="group relative rounded-2xl overflow-hidden border border-border shadow-sm aspect-square bg-muted/20">
                               <img 
                                  src={getImageUrl(url)} 
                                  className="w-full h-full object-cover cursor-zoom-in transition-transform duration-700 group-hover:scale-105" 
                                  alt={\`Attached Asset \${i+1}\`}
                                  onClick={() => setZoomedImage(getImageUrl(url))}
                               />
                               <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                  <Maximize2 className="h-8 w-8 text-white drop-shadow-lg" />
                               </div>
                            </div>
                         ))}
                         {!viewingPost?.image_urls && viewingPost?.image_url && (
                            <div className="rounded-3xl overflow-hidden border border-border shadow-sm col-span-full group relative bg-muted/20">
                               <img 
                                  src={getImageUrl(viewingPost.image_url)} 
                                  className="w-full h-auto object-cover max-h-[800px] cursor-zoom-in group-hover:opacity-95 transition-opacity" 
                                  alt="Main Post Media"
                                  onClick={() => setZoomedImage(getImageUrl(viewingPost.image_url))}
                               />
                            </div>
                         )}
                      </div>
                   )}
                </div>
             </div>
          </div>

          {/* Action Center - Fixed Footer */}
          <div className="flex-shrink-0 h-24 bg-background border-t border-border px-10 flex items-center justify-between z-50">
             <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12 border-2 border-border shadow-md">
                   <AvatarImage src={getImageUrl(viewingPost?.author?.avatar_url)} className="object-cover" />
                   <AvatarFallback className="font-bold">{viewingPost?.author?.username?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                   <span className="text-sm font-black italic">@{viewingPost?.author?.username}</span>
                   <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Poster Identity</span>
                </div>
             </div>

             <div className="flex items-center gap-4">
                {activeTab === 'posts' && (
                  <>
                    <Button 
                      className="bg-green-600 hover:bg-green-700 text-white font-black h-12 px-8 rounded-2xl shadow-xl shadow-green-500/20 gap-2 transition-all active:scale-95" 
                      onClick={() => { handlePostAction(viewingPost._id, 'approve'); setViewingPost(null); }}
                    >
                       <CheckCircle2 className="h-5 w-5" /> DUYỆT BÀI
                    </Button>
                    <Button 
                      variant="outline" 
                      className="border-red-200 text-red-500 hover:bg-red-50 font-black h-12 px-8 rounded-2xl transition-all" 
                      onClick={() => { handlePostAction(viewingPost._id, 'reject'); setViewingPost(null); }}
                    >
                       <XCircle className="h-5 w-5 mr-2" /> TỪ CHỐI
                    </Button>
                  </>
                )}
                {(activeTab === 'reports' || activeTab === 'hidden') && (
                  <Button 
                    className="bg-primary hover:bg-primary/90 text-white font-black h-12 px-8 rounded-2xl" 
                    onClick={() => setViewingPost(null)}
                  >
                    ĐÓNG XEM TRƯỚC
                  </Button>
                )}
             </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Zoom Modal */}
      <Dialog open={!!zoomedImage} onOpenChange={(open) => !open && setZoomedImage(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 border-none bg-black/95 flex items-center justify-center z-[200] rounded-none overflow-hidden [&>button]:hidden">
          <DialogTitle className="sr-only">Phóng to ảnh</DialogTitle>
          <DialogDescription className="sr-only">Tùy biến hiển thị kích thước lớn của ảnh được chọn.</DialogDescription>
          <div className="relative w-full h-full flex items-center justify-center p-4">
             {zoomedImage && (
               <img src={getImageUrl(zoomedImage)} alt="Zoomed view" className="max-w-full max-h-full object-contain shadow-2xl animate-in zoom-in-95 duration-200" onClick={() => setZoomedImage(null)} />
             )}
             <Button 
               variant="ghost" 
               size="icon" 
               className="absolute top-4 right-4 text-white/50 hover:bg-white/10 hover:text-white transition-all"
               onClick={() => setZoomedImage(null)}
             >
               <X className="h-6 w-6" />
             </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
`;

fs.writeFileSync('AdminDashboard.tsx', cleanLines.join('\n') + '\n' + appendCode);
