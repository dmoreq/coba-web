"use client";

import { AlgoStrip, ConceptCards, Hero, HowItWorks, ScenarioShowcase } from "@/components/landing";
import { PageShell } from "@/components/layout/PageShell";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();

  return (
    <PageShell>
      <main className="flex-1 overflow-y-auto bg-surface-page">
        <Hero onNavigate={(s) => router.push(`/${s === "landing" ? "" : s}`)} />
        <AlgoStrip />
        <div className="px-[48px] py-[32px]">
          <ConceptCards />
          <ScenarioShowcase />
          <HowItWorks />
          <div className="text-center pb-lg">
            <button
              onClick={() => router.push("/playground")}
              className="text-md font-semibold px-[32px] py-3 rounded-md border-none bg-blue-6 text-white cursor-pointer font-sans hover:bg-blue-7 transition-colors duration-base"
            >
              Start the Playground
            </button>
          </div>
        </div>
      </main>
    </PageShell>
  );
}
