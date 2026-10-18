import type { FieldConfig } from "../../data/analysisConfig";

export default function NumberField({
  field,
  value,
  error,
  trainRange,
  onChange,
}: {
  field: FieldConfig;
  value: string;
  error: string | null;
  /** [min, max] the model was actually trained on; used to flag extrapolation. */
  trainRange?: readonly [number, number] | null;
  onChange: (v: string) => void;
}) {
  const id = `field-${field.key}`;
  const n = Number(value);
  const outOfTraining =
    !error &&
    trainRange != null &&
    value.trim() !== "" &&
    Number.isFinite(n) &&
    (n < trainRange[0] || n > trainRange[1]);

  const hintId = `${id}-hint`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-secondary">
        {field.label}
      </label>

      <div
        className={[
          "flex items-center rounded-xl border bg-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-colors duration-200",
          error
            ? "border-critical/60 focus-within:border-critical"
            : outOfTraining
              ? "border-warning/55 focus-within:border-warning"
              : "border-white/[0.14] focus-within:border-accent/70 focus-within:bg-white/[0.09]",
        ].join(" ")}
      >
        <input
          id={id}
          type="number"
          inputMode="decimal"
          step={field.step ?? 1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={hintId}
          className="w-full bg-transparent px-3 py-2 text-sm tabular-nums text-primary outline-none [appearance:textfield] placeholder:text-tertiary [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <span className="shrink-0 select-none px-3 text-xs text-tertiary">{field.unit}</span>
      </div>

      {error ? (
        <p id={hintId} className="text-xs text-critical-fg" role="alert">
          {error}
        </p>
      ) : outOfTraining ? (
        <p id={hintId} className="text-xs text-warning-fg">
          ⚠ Outside training range — trained {trainRange![0]}–{trainRange![1]}; prediction is extrapolated
        </p>
      ) : (
        <p id={hintId} className="text-xs text-tertiary">
          Range {field.min}–{field.max}
        </p>
      )}
    </div>
  );
}
