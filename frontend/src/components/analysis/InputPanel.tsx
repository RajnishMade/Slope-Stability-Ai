import { ANALYSIS_CONFIG, fieldError, fieldsFor } from "../../data/analysisConfig";
import type { ModeId } from "../../data/modes";
import { useInputs } from "../../state/InputsProvider";
import NumberField from "./NumberField";

/**
 * Config-driven parameter panel. Sections and fields come entirely from
 * ANALYSIS_CONFIG, so schema changes never touch this component.
 */
export default function InputPanel({ mode, onRun }: { mode: ModeId; onRun: () => void }) {
  const { values, setValue, resetMode } = useInputs();
  const vals = values(mode);

  const errors: Record<string, string | null> = {};
  for (const f of fieldsFor(mode)) errors[f.key] = fieldError(f, vals[f.key] ?? "");
  const invalidCount = Object.values(errors).filter(Boolean).length;

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-6 pt-6 pb-4">
        <h2 className="mb-1 text-[15px] font-semibold text-[#f5f5f7]">Parameters</h2>
        <p className="mb-6 text-[12.5px] text-[#f5f5f7]/45">
          Values are pre-filled with typical defaults. Adjust as needed.
        </p>

        <div className="flex flex-col gap-7">
          {ANALYSIS_CONFIG[mode].map((section) => (
            <section key={section.title}>
              <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#ff9d55]/85">
                {section.title}
              </h3>
              <div className="flex flex-col gap-4">
                {section.fields.map((f) => (
                  <NumberField
                    key={f.key}
                    field={f}
                    value={vals[f.key] ?? ""}
                    error={errors[f.key]}
                    onChange={(v) => setValue(mode, f.key, v)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      {/* actions pinned to the bottom of the panel */}
      <div className="shrink-0 border-t border-white/[0.07] bg-white/[0.03] px-6 py-4 backdrop-blur-md">
        {invalidCount > 0 && (
          <p className="mb-3 text-[12px] text-[#ff6b5e]">
            {invalidCount} field{invalidCount > 1 ? "s" : ""} out of range
          </p>
        )}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onRun}
            disabled={invalidCount > 0}
            className="flex-1 rounded-xl bg-[#ff9d55] px-4 py-2.5 text-[14px] font-semibold text-[#231202] transition-all duration-200 hover:bg-[#ffb072] disabled:cursor-not-allowed disabled:bg-white/12 disabled:text-white/35"
          >
            Run Prediction
          </button>
          <button
            type="button"
            onClick={() => resetMode(mode)}
            className="rounded-xl border border-white/[0.12] bg-white/[0.05] px-4 py-2.5 text-[13px] text-[#f5f5f7]/80 backdrop-blur-md transition-colors duration-200 hover:border-white/25 hover:bg-white/[0.09] hover:text-[#f5f5f7]"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
