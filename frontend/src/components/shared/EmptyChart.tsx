interface EmptyChartProps {
  width: number;
  height: number;
  message?: string;
}

export function EmptyChart({
  width,
  height,
  message = "Run some steps to see data",
}: EmptyChartProps) {
  return (
    <div
      className="flex items-center justify-center text-gray-5 text-[12px] font-sans"
      style={{ width, height }}
    >
      {message}
    </div>
  );
}
