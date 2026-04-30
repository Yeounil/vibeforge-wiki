import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PostCard } from "./PostCard";
import type { PostWithAuthor } from "@/lib/forum/types";

const POST: PostWithAuthor = {
  id: "abc",
  category: "qa",
  title: "How does git rebase work?",
  body_md: "...",
  author_id: "u1",
  tags: ["git", "basics"],
  created_at: "2026-05-01T00:00:00Z",
  updated_at: "2026-05-01T00:00:00Z",
  author: { github_login: "yeounil", display_name: "Yeounil", avatar_url: null },
};

describe("PostCard", () => {
  it("renders title, author display_name, category badge, and tags", () => {
    render(<PostCard post={POST} />);
    expect(screen.getByText("How does git rebase work?")).toBeInTheDocument();
    expect(screen.getByText("Yeounil")).toBeInTheDocument();
    expect(screen.getByText("Q&A")).toBeInTheDocument();
    expect(screen.getByText("#git")).toBeInTheDocument();
  });

  it("falls back to github_login when display_name is null", () => {
    render(<PostCard post={{ ...POST, author: { github_login: "y", display_name: null, avatar_url: null } }} />);
    expect(screen.getByText("y")).toBeInTheDocument();
  });

  it("falls back to '익명' when author is null", () => {
    render(<PostCard post={{ ...POST, author: null }} />);
    expect(screen.getByText("익명")).toBeInTheDocument();
  });
});
