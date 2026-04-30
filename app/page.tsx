import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen p-4 md:p-6 bg-[var(--bg-gradient)]">
      <div className="max-w-4xl mx-auto mt-12 md:mt-24 vf-card p-8 md:p-12 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">VibeForge</h1>
        <p className="text-lg text-[var(--text-secondary)] mb-8">
          바이브코더를 위한 CS 학습·토론 사이트.
          <br />
          AI에게 시키는 단계에서 한 걸음 더 나아가도록.
        </p>
        <Link
          href="/wiki"
          className="inline-block px-6 py-3 rounded-full font-semibold text-white shadow-md hover:opacity-90 transition"
          style={{ background: "var(--accent-cta)" }}
        >
          Wiki 둘러보기 →
        </Link>
      </div>
    </main>
  );
}
