"use client";

interface TruthToggleProps {
  revealed: boolean;
  onToggle: () => void;
}

export function TruthToggle({ revealed, onToggle }: TruthToggleProps) {
  return (
    <button
      onClick={onToggle}
      className="text-[11px] px-sm py-[3px] rounded-xs border border-gray-3 cursor-pointer font-sans hover:bg-gray-0 transition-colors duration-fast"
      style={{ background: revealed ? "#f8f9fa" : "white", color: "#495057" }}
    >
      {revealed ? "\u{1F512} Hide truth" : "\u{1F441} Reveal truth"}
    </button>
  );
}
