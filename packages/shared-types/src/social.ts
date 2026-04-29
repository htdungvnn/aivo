// ============================================
// SOCIAL & SHARING
// ============================================

export interface ShareableContent {
  id: string;
  userId: string;
  type: "workout_summary" | "achievement" | "progress" | "social_proof";
  title: string;
  description: string;
  imageUrl: string; // R2 stored image
  platform: "instagram" | "twitter" | "facebook" | "tiktok" | "generic";
  isPublic: boolean;
  likes: number;
  shares: number;
  createdAt: Date;
}

// Social features from database schema
export interface Friend {
  id: string;
  userId: string;
  friendId: string;
  status: "pending" | "accepted" | "blocked";
  createdAt: Date;
}

export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: Date;
}

export interface Post {
  id: string;
  userId: string;
  content: string;
  workoutId?: string;
  mediaUrls: string[];
  likes: number;
  comments: number;
  shares: number;
  isPublic: boolean;
  createdAt: Date;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  parentId?: string; // For nested comments
  createdAt: Date;
}

export interface Reaction {
  id: string;
  postId: string;
  userId: string;
  type: ReactionType;
  createdAt: Date;
}

export type ReactionType = "like" | "love" | "haha" | "wow" | "sad" | "angry";

export interface Group {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  isPublic: boolean;
  memberCount: number;
  createdAt: Date;
}

export interface Membership {
  id: string;
  groupId: string;
  userId: string;
  role: MembershipRole;
  joinedAt: Date;
}

export type MembershipRole = "admin" | "moderator" | "member";

export interface Mention {
  id: string;
  postId?: string;
  commentId?: string;
  mentionedUserId: string;
  byUserId: string;
  isRead: boolean;
  createdAt: Date;
}
