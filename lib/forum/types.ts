// lib/forum/types.ts — TypeScript types matching public.* tables.

export const FORUM_CATEGORIES = ["qa", "general", "notice"] as const;
export type ForumCategory = (typeof FORUM_CATEGORIES)[number];

export interface Profile {
  id: string;
  github_login: string | null;
  display_name: string | null;
  avatar_url: string | null;
  role: "user" | "admin";
  created_at: string;
}

export interface Post {
  id: string;
  category: ForumCategory;
  title: string;
  body_md: string;
  author_id: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface PostWithAuthor extends Post {
  author: Pick<Profile, "github_login" | "display_name" | "avatar_url"> | null;
}

export interface Comment {
  id: string;
  post_id: string;
  body_md: string;
  author_id: string;
  created_at: string;
  updated_at: string;
}

export interface CommentWithAuthor extends Comment {
  author: Pick<Profile, "github_login" | "display_name" | "avatar_url"> | null;
}

export const CATEGORY_LABELS: Record<ForumCategory, string> = {
  qa: "Q&A",
  general: "일반",
  notice: "공지",
};
