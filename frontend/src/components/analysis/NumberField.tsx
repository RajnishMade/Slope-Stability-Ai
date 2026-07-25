import type { FieldConfig } from "../../data/analysisConfig";

export default function NumberField({
  field,
  value,
  error,
  onChange,
}: {
  field: FieldConfig;
  value: string;
  error: string | null;
  onChange: (v: string) => void;
}) {
  const id = `field-${field.key}`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[12.5px] font-medium text-[#f5f5f7]/72">
        {field.label}
      </label>

      <div
        className={[
          "flex items-center rounded-xl border bg-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-colors duration-200",
          error
            ? "border-[#ff453a]/60 focus-within:border-[#ff453a]"
            : "border-white/[0.14] focus-within:border-[#ff9d55]/70 focus-within:bg-white/[0.09]",
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
          aria-describedby={error ? `${id}-err` : undefined}
          className="w-full bg-transparent px-3 py-2 text-[14px] text-[#f5f5f7] outline-none [appearance:textfield] placeholder:text-white/30 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <span className="shrink-0 select-none px-3 text-[12px] text-[#f5f5f7]/42">{field.unit}</span>
      </div>

      {error ? (
        <p id={`${id}-err`} className="text-[11.5px] text-[#ff6b5e]">
          {error}
        </p>
      ) : (
        <p className="text-[11px] text-[#f5f5f7]/28">
          Range {field.min}–{field.max}
        </p>
      )}
    </div>
  );
}
