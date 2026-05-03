import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/lib/forum/actions", () => ({
  updateCommentAction: vi.fn(async () => ({ ok: true })),
  deleteCommentAction: vi.fn(async () => ({ ok: true })),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

import { CommentItem } from "./CommentItem";

const baseComment = {
  id: "c1",
  postId: "p1",
  authorName: "Alice",
  bodyMd: "hello world",
  createdAt: "2026-05-04T00:00:00Z",
};

describe("CommentItem", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders body and author when not editable", () => {
    render(<CommentItem {...baseComment} canEdit={false} canDelete={false} />);
    expect(screen.getByText("hello world")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "수정" })).toBeNull();
    expect(screen.queryByRole("button", { name: "삭제" })).toBeNull();
  });

  it("shows edit and delete buttons when editable", () => {
    render(<CommentItem {...baseComment} canEdit canDelete />);
    expect(screen.getByRole("button", { name: "수정" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "삭제" })).toBeInTheDocument();
  });

  it("toggles to edit mode and back", () => {
    render(<CommentItem {...baseComment} canEdit canDelete={false} />);
    fireEvent.click(screen.getByRole("button", { name: "수정" }));
    expect(screen.getByRole("textbox")).toHaveValue("hello world");
    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    expect(screen.getByText("hello world")).toBeInTheDocument();
  });
});
