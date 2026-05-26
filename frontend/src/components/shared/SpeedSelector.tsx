"use client";

interface SpeedSelectorProps {
  speeds: number[];
  value: number;
  onChange: (v: number) => void;
}

export function SpeedSelector({ speeds, value, onChange }: SpeedSelectorProps) {
  return (
    <div className="flex gap-[3px] items-center">
      <span className="text-[10px] text-gray-5 font-semibold uppercase tracking-[0.06em] mr-[3px]">
        Speed
      </span>
      {speeds.map((v) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className="px-[7px] py-[4px] rounded-xs border border-gray-3 cursor-pointer text-[11px] font-sans transition-all duration-fast"
          style={{
            fontWeight: value === v ? 700 : 400,
            background: value === v ? "#212529" : "white",
            color: value === v ? "white" : "#868e96",
          }}
        >
          {v}&times;
        </button>
      ))}
    </div>
  );
}
