import { ANALYSIS_CONFIG, fieldError, fieldsFor } from "../../data/analysisConfig";
import type { ModeId } from "../../data/modes";
import type { ModelMetrics } from "../../lib/api";
import { useInputs } from "../../state/InputsProvider";
import NumberField from "./NumberField";

/**
 * Config-driven parameter panel. Sections and fields come entirely from
 * ANALYSIS_CONFIG, so schema changes never touch this component.
 *
 * `metrics` (when loaded) carries each model's training range per field, so
 * the panel can flag extrapolated inputs live as they are typed.
 */
export default function InputPanel({
  mode,
  metrics,
  onRun,
}: {
  mode: ModeId;
  metrics: ModelMetrics | null;
  onRun: () => void;
}) {
  const { values, setValue, resetMode } = useInputs();
  const vals = values(mode);
  const ranges = metrics?.dataset.ranges ?? {};

  const errors: Record<string, string | null> = {};
  for (const f of fieldsFor(mode)) errors[f.key] = fieldError(f, vals[f.key] ?? "");
  const invalidCount = Object.values(errors).filter(Boolean).length;

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-6 pt-6 pb-4">
        <h2 className="text-base font-semibold text-primary">Parameters</h2>
        <p className="mt-1 mb-6 text-sm text-tertiary">
          Pre-filled with typical values inside the model's training range.
        </p>

        <div className="flex flex-col gap-7">
          {ANALYSIS_CONFIG[mode].map((section) => (
            <section key={section.title}>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-accent">
                {section.title}
              </h3>
              <div className="flex flex-col gap-4">
                {section.fields.map((f) => (
                  <NumberField
                    key={f.key}
                    field={f}
                    value={vals[f.key] ?? ""}
                    error={errors[f.key]}
                    trainRange={ranges[f.key] ?? null}
                    onChange={(v) => setValue(mode, f.key, v)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      {/* actions pinned to the bottom of the panel */}
      <div className="shrink-0 border-t border-glass-border bg-white/[0.03] px-6 py-4 backdrop-blur-md">
        {invalidCount > 0 && (
          <p className="mb-3 text-sm text-critical-fg" role="alert">
            {invalidCount} field{invalidCount > 1 ? "s" : ""} out of range
          </p>
        )}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onRun}
            disabled={invalidCount > 0}
            className="flex-1 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink shadow-[0_6px_20px_var(--color-accent-glow)] transition-colors duration-200 hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-tertiary disabled:shadow-none"
          >
            Run prediction
          </button>
          <button
            type="button"
            onClick={() => resetMode(mode)}
            className="rounded-xl border border-glass-border bg-glass px-4 py-2.5 text-sm text-secondary transition-colors duration-200 hover:border-glass-border-hover hover:bg-glass-hover hover:text-primary"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
