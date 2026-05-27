import { BetaCurve } from "@/components/charts/BetaCurve";
import { formatEstimateStat, getEstimateRenderMode } from "@/lib/constants";
import type { Arm, ArmState, Score } from "@/lib/types";

interface ArmRowProps {
  arm: Arm;
  armState: ArmState;
  score: Score | null;
  isChosen: boolean;
  algorithm: string;
  maxScore: number;
  showGroundTruth: boolean;
}

export function ArmRow({
  arm,
  armState,
  score,
  isChosen,
  algorithm,
  maxScore,
  showGroundTruth,
}: ArmRowProps) {
  const { mean = 0, bonus = 0 } = score ?? {};
  const rawScore = score?.score ?? 0;
  const barMax = Math.max(maxScore * 1.1, 1);
  const renderMode = getEstimateRenderMode(algorithm, score);
  const meanPct = Math.min((mean / barMax) * 100, 100);
  const rawPct = Math.min((rawScore / barMax) * 100, 100);
  const bonusPct =
    renderMode === "decomposed" && bonus > 0 ? Math.min((bonus / barMax) * 100, 100 - meanPct) : 0;

  return (
    <div
      className="flex items-center gap-sm px-[8px] py-[6px] rounded-sm mb-1 transition-colors duration-fast"
      style={{
        background: isChosen ? arm.lightColor : "transparent",
        border: isChosen ? `1px solid ${arm.color}44` : "1px solid transparent",
      }}
    >
      {/* Arm label */}
      <div className="w-[52px] flex-shrink-0">
        <div
          className="text-[12px] font-semibold flex items-center gap-1"
          style={{ color: isChosen ? arm.color : "#495057" }}
        >
          {isChosen && (
            <span className="text-[8px]" style={{ color: arm.color }}>
              {">"}
            </span>
          )}
          {arm.label}
        </div>
        <div className="text-[10px] text-gray-6 font-mono mt-[1px]">n={armState.n}</div>
      </div>

      {/* Bar (non-Thompson) */}
      {renderMode !== "beta" && (
        <div
          className="flex-1 h-[10px] bg-gray-1 rounded-full relative overflow-visible"
          data-testid={`estimate-track-${arm.id}`}
        >
          {renderMode === "decomposed" ? (
            <>
              <div
                data-testid={`estimate-mean-${arm.id}`}
                className="absolute left-0 top-0 h-full rounded-full transition-all duration-base"
                style={{
                  width: `${meanPct}%`,
                  background: arm.color,
                  opacity: 0.9,
                  borderRadius: bonusPct > 0 ? "9999px 0 0 9999px" : "9999px",
                }}
              />
              {bonusPct > 0 && (
                <div
                  data-testid={`estimate-bonus-${arm.id}`}
                  className="absolute top-0 h-full transition-all duration-base"
                  style={{
                    left: `${meanPct}%`,
                    width: `${bonusPct}%`,
                    background: arm.color,
                    borderRadius: "0 9999px 9999px 0",
                    opacity: 0.25,
                  }}
                />
              )}
              <div
                data-testid={`estimate-marker-${arm.id}`}
                className="absolute top-[-1px] w-[10px] h-[10px] rounded-full border-2 border-white transition-all duration-base"
                style={{
                  left: `${meanPct}%`,
                  background: arm.color,
                  transform: "translateX(-50%)",
                  boxShadow: `0 0 0 1px ${arm.color}66`,
                }}
              />
            </>
          ) : (
            <div
              data-testid={`estimate-raw-${arm.id}`}
              className="absolute left-0 top-0 h-full rounded-full transition-all duration-base"
              style={{
                width: `${rawPct}%`,
                background: arm.color,
                opacity: 0.55,
                borderRadius: "9999px",
              }}
            />
          )}
        </div>
      )}

      {/* Beta curve (Thompson) */}
      {renderMode === "beta" && (
        <div className="flex-1">
          <BetaCurve
            successes={armState.successes}
            failures={armState.failures}
            color={arm.color}
          />
        </div>
      )}

      {/* Stats */}
      <div className="w-[110px] flex-shrink-0 text-right">
        <div
          className="text-[11px] font-mono tabular-nums"
          style={{
            color: isChosen ? arm.color : "#495057",
            fontWeight: isChosen ? 600 : 400,
          }}
        >
          {formatEstimateStat(algorithm, score, armState)}
        </div>
        {showGroundTruth && (
          <div className="text-[10px] text-gray-6 mt-[1px]">
            true: {(arm.trueProb * 100).toFixed(0)}%
          </div>
        )}
      </div>
    </div>
  );
}
