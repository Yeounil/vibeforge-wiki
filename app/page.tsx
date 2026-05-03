import type { Route } from "next";
import { Pill, ColorBlock, Eyebrow } from "@/components/ui";

export default function HomePage() {
  return (
    <main className="min-h-screen p-4 md:p-6 bg-[var(--bg-gradient)]">
      <div className="max-w-4xl mx-auto mt-12 md:mt-24 vf-card p-8 md:p-12 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">VibeForge</h1>
        <p className="text-lg text-[var(--ink-muted)] mb-8">
          바이브코더를 위한 CS 학습·토론 사이트.
          <br />
          AI에게 시키는 단계에서 한 걸음 더 나아가도록.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Pill href={"/wiki" as Route}>위키 둘러보기</Pill>
          <Pill href={"/forum" as Route} variant="secondary">포럼 보기</Pill>
        </div>
      </div>

      <div className="max-w-4xl mx-auto mt-8">
        <ColorBlock variant="lilac" as="section" className="text-center">
          <Eyebrow className="mb-3">주요 기능</Eyebrow>
          <h2 className="text-2xl font-bold text-[var(--ink)] mb-4">
            배우고, 토론하고, 성장하세요
          </h2>
          <p className="text-[var(--ink-muted)] max-w-xl mx-auto">
            위키에서 CS 개념을 탐색하고, 포럼에서 질문하며 함께 성장하는 공간입니다.
            그래프 뷰로 개념 간의 연결을 한눈에 파악해 보세요.
          </p>
        </ColorBlock>
      </div>
    </main>
  );
}
