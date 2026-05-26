"use client";

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  accentColor?: string;
}

export function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
  accentColor,
}: SliderProps) {
  return (
    <div className="mb-[14px]">
      <div className="flex justify-between items-baseline mb-[5px]">
        <label className="text-[13px] font-medium text-gray-8">{label}</label>
        <span
          className="text-[12px] font-mono text-gray-7 bg-gray-0 px-[6px] py-[2px] rounded-xs"
          style={{ color: accentColor }}
        >
          {format ? format(value) : value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
        style={{ accentColor: accentColor || "#228be6" }}
      />
      <div className="flex justify-between mt-[2px]">
        <span className="text-[10px] text-gray-5">{min}</span>
        <span className="text-[10px] text-gray-5">{max}</span>
      </div>
    </div>
  );
}
