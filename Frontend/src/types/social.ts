export interface CommunityTopic {
  _id: string;
  name: string;
  icon?: string;
  postCount?: number;
}

export interface SearchUser {
  _id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  isFollowing?: boolean;
}

export interface NotificationSender {
  _id?: string;
  id?: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
}

export interface NotificationPostRef {
  _id?: string;
  id?: string;
  title?: string;
}

export type NotificationType =
  | 'like'
  | 'upvote'
  | 'comment'
  | 'friend_request'
  | 'follow'
  | 'trending'
  | 'system'
  | 'mention'
  | string;

export interface NotificationItem {
  _id: string;
  type: NotificationType;
  content?: string;
  sender?: NotificationSender;
  post?: NotificationPostRef | string | null;
  isRead?: boolean;
  created_at?: string;
}
