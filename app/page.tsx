import Link from "next/link";
import type { Route } from "next";
import { ColorBlock } from "@/components/ui";
import { Wordmark } from "@/components/brand/Wordmark";

export default function HomePage() {
  return (
    <main className="min-h-screen p-4 md:p-6 bg-[var(--bg-gradient)]">
      <section className="max-w-4xl mx-auto mt-12 md:mt-24 bg-[var(--canvas)] border border-[var(--hairline)] rounded-[var(--r-lg)] p-8 md:p-16 text-center">
        <p
          className="font-mono uppercase text-[var(--ink-muted)] mb-6"
          style={{ fontSize: 13, letterSpacing: "0.28em" }}
        >
          CS · 위키 · 포럼
        </p>

        <h1 className="mb-8 inline-block">
          <Wordmark size="hero" />
        </h1>

        <p
          className="text-[var(--ink)] max-w-2xl mx-auto mb-10"
          style={{ fontSize: "var(--t-body-lg)", fontWeight: 330, lineHeight: 1.5 }}
        >
          바이브코더를 위한 CS 학습·토론 사이트.
          <br />
          AI에게 시키는 단계에서 한 걸음 더 나아가도록.
        </p>

        <div className="flex flex-wrap gap-3 justify-center">
          <Link href={"/wiki" as Route} className="btn-hero btn-hero-primary">
            위키 둘러보기
            <span aria-hidden="true" className="btn-arrow">→</span>
          </Link>
          <Link href={"/forum" as Route} className="btn-hero btn-hero-secondary">
            포럼 보기
          </Link>
        </div>
      </section>

      <section className="max-w-4xl mx-auto mt-8">
        <ColorBlock variant="lilac" as="section" className="text-center">
          <p
            className="font-mono uppercase text-[var(--ink-muted)] mb-5"
            style={{ fontSize: 12, letterSpacing: "0.28em" }}
          >
            WHY VIBEFORGE
          </p>
          <h2
            className="text-[var(--ink)] mb-6"
            style={{
              fontSize: "clamp(28px, 4.5vw, 44px)",
              fontWeight: 540,
              letterSpacing: "-0.025em",
              lineHeight: 1.15,
            }}
          >
            배우고, 토론하고, 성장하세요
          </h2>
          <p
            className="text-[var(--ink)] max-w-xl mx-auto"
            style={{
              fontSize: "var(--t-body-lg)",
              fontWeight: 330,
              lineHeight: 1.55,
              opacity: 0.78,
            }}
          >
            위키에서 Vibe Coding에 필요한 기본 CS 지식을 탐색하고,
            <br />
            포럼에서 질문하며 함께 성장해보세요!
          </p>
        </ColorBlock>
      </section>
    </main>
  );
}
