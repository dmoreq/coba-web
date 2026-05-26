"use client";

import { usePathname, useRouter } from "next/navigation";
import { LogoMark } from "./LogoMark";

const HEADER_ITEMS = [
  { path: "/", label: "Overview" },
  { path: "/playground", label: "Playground" },
  { path: "/compare", label: "Compare" },
  { path: "/settings", label: "Settings" },
  { path: "/results", label: "Results" },
  { path: "/glossary", label: "Glossary" },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <header className="w-full h-[52px] flex-shrink-0 bg-white border-b border-gray-2 flex items-center px-xl gap-1 shadow-sm">
      {/* Logo */}
      <button
        onClick={() => router.push("/")}
        className="flex items-center gap-[10px] mr-xl flex-shrink-0 cursor-pointer bg-transparent border-none"
      >
        <LogoMark size={28} />
        <span className="text-[11px] text-gray-5 tracking-[0.02em] ml-xs">Bandit Simulator</span>
      </button>

      {/* Divider */}
      <div className="w-px h-5 bg-gray-2 mr-sm flex-shrink-0" />

      {/* Nav items */}
      {HEADER_ITEMS.map((item) => {
        const isActive = pathname === item.path;
        return (
          <button
            key={item.path}
            onClick={() => router.push(item.path)}
            className={`
              px-3 py-[5px] rounded-sm border-none cursor-pointer text-[13px]
              transition-all duration-fast flex-shrink-0 font-sans
              ${isActive ? "bg-blue-0 text-blue-7 font-semibold" : "bg-transparent text-gray-7 font-normal"}
            `}
          >
            {item.label}
          </button>
        );
      })}
    </header>
  );
}
