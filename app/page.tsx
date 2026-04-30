import Link from "next/link";

export default function HomePage() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">VibeForge</h1>
      <p className="mt-2">바이브코더를 위한 CS 학습·토론 사이트 (Plan 1: bootstrap)</p>
      <ul className="mt-4 list-disc pl-6">
        <li><Link href="/wiki" className="underline">Wiki</Link></li>
      </ul>
    </main>
  );
}
