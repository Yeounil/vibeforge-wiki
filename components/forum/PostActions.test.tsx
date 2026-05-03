import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/lib/forum/actions", () => ({
  deletePostAction: vi.fn(async () => ({ ok: true })),
}));

import { PostActions } from "./PostActions";

describe("PostActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when neither canEdit nor canDelete", () => {
    const { container } = render(
      <PostActions postId="p1" canEdit={false} canDelete={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows edit link when canEdit", () => {
    render(<PostActions postId="p1" canEdit canDelete={false} />);
    expect(screen.getByRole("link", { name: "수정" })).toHaveAttribute(
      "href",
      "/forum/post/p1/edit"
    );
    expect(screen.queryByRole("button", { name: "삭제" })).toBeNull();
  });

  it("shows delete button when canDelete", () => {
    render(<PostActions postId="p1" canEdit={false} canDelete />);
    expect(screen.getByRole("button", { name: "삭제" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "수정" })).toBeNull();
  });

  it("shows both when canEdit and canDelete", () => {
    render(<PostActions postId="p1" canEdit canDelete />);
    expect(screen.getByRole("link", { name: "수정" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "삭제" })).toBeInTheDocument();
  });
});
