// lib/forum/schemas.ts — Zod schemas for forum input validation.
import { z } from "zod";
import { FORUM_CATEGORIES } from "./types";

export const newPostSchema = z.object({
  category: z.enum(FORUM_CATEGORIES),
  title: z.string().trim().min(1, "제목을 입력하세요").max(200),
  body_md: z.string().trim().min(1, "본문을 입력하세요").max(20000),
  tags: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
});
export type NewPostInput = z.infer<typeof newPostSchema>;

export const newCommentSchema = z.object({
  post_id: z.string().uuid(),
  body_md: z.string().trim().min(1, "댓글을 입력하세요").max(5000),
});
export type NewCommentInput = z.infer<typeof newCommentSchema>;
