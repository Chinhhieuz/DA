import { Users, Search, Plus, MapPin, Globe, Loader2, ChevronRight, UserPlus, Check, TrendingUp } from 'lucide-react';
import { API_URL } from '@/lib/api';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useState, useEffect } from 'react';

export function Groups() {
  const [communities, setCommunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/communities`)
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') setCommunities(data.data);
        setLoading(false);
      })
      .catch(e => {
        console.error('Lỗi tải nhóm:', e);
        setLoading(false);
      });
  }, []);

  const handleJoinGroup = (groupName: string) => {
    toast.success(`Đã tham gia nhóm ${groupName}!`);
  };

  const handleLeaveGroup = (groupName: string) => {
    toast.info(`Đã rời khỏi nhóm ${groupName}`);
  };

  if (loading) {
    return <div className="p-8 text-center">Đang tải danh sách nhóm...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-1 text-2xl font-bold text-foreground">Khám phá nhóm</h1>
          <p className="text-muted-foreground">Tham gia các cộng đồng có cùng sở thích</p>
        </div>
        <Button className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
          <Plus className="h-4 w-4" />
          Tạo nhóm
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {communities.length === 0 ? (
           <div className="col-span-2 p-8 text-center text-muted-foreground">Chưa có nhóm nào được tạo.</div>
        ) : communities.map((community) => (
          <Card key={community._id} className="border-border bg-card p-4 transition-shadow hover:shadow-lg">
            <div className="flex gap-4">
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary text-3xl">
                {community.icon || '👥'}
              </div>

              <div className="flex-1">
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <h3 className="mb-1 font-semibold text-foreground">r/{community.name}</h3>
                    <p className="text-sm text-muted-foreground">{community.description}</p>
                  </div>
                </div>

                <div className="mb-3 flex items-center gap-3 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {community.memberCount || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                    {Math.floor(Math.random() * 10) + 1} online
                  </span>
                </div>

                <Button
                  size="sm"
                  variant={community.joined ? 'outline' : 'default'}
                  className={
                    community.joined
                      ? 'border-input hover:bg-muted'
                      : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                  }
                  onClick={() =>
                    community.joined
                      ? handleLeaveGroup(community.name)
                      : handleJoinGroup(community.name)
                  }
                >
                  {community.joined ? 'Đã tham gia' : 'Tham gia'}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="border-border bg-muted p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <h3 className="mb-1 font-semibold text-foreground">Nhóm đang phát triển</h3>
            <p className="text-sm text-muted-foreground">
              Khám phá các cộng đồng mới và đang được nhiều người quan tâm
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
