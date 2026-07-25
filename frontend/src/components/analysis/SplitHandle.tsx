import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

interface Props {
  orientation: "horizontal" | "vertical";
  disabled?: boolean;
  /** Pointer position (clientY for horizontal, clientX for vertical) while dragging. */
  onDrag: (pos: number) => void;
  onReset: () => void;
  label: string;
}

/**
 * Draggable divider. `horizontal` sits between stacked panels and resizes their
 * heights; `vertical` sits between columns and resizes their widths.
 * Double-click resets to the default split. Keyboard-accessible via arrow keys.
 */
export default function SplitHandle({ orientation, disabled = false, onDrag, onReset, label }: Props) {
  const [dragging, setDragging] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const horiz = orientation === "horizontal";

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (disabled) return;
    e.preventDefault();
    ref.current?.setPointerCapture(e.pointerId);
    setDragging(true);
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    onDrag(horiz ? e.clientY : e.clientX);
  }

  function endDrag(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    ref.current?.releasePointerCapture(e.pointerId);
    setDragging(false);
  }

  if (disabled) return null;

  const active = dragging;

  return (
    <div
      ref={ref}
      role="separator"
      aria-label={label}
      aria-orientation={horiz ? "horizontal" : "vertical"}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={onReset}
      className={[
        "group relative flex shrink-0 items-center justify-center",
        horiz ? "h-[10px] w-full cursor-row-resize" : "w-[10px] cursor-col-resize self-stretch",
        "touch-none select-none outline-none",
      ].join(" ")}
      title="Drag to resize · double-click to reset"
    >
      {/* grip: subtle at rest, accent on hover / while dragging */}
      <span
        className={[
          "rounded-full transition-all duration-200",
          horiz ? "h-[3px] w-14" : "h-14 w-[3px]",
          active
            ? "bg-[#ff9d55]"
            : "bg-white/15 group-hover:bg-[#ff9d55]/70 group-focus-visible:bg-[#ff9d55]/70",
        ].join(" ")}
      />
      {/* widened invisible hit area so the 10px bar is easy to grab */}
      <span
        aria-hidden
        className={horiz ? "absolute inset-x-0 -top-1 -bottom-1" : "absolute inset-y-0 -left-1 -right-1"}
      />
    </div>
  );
}
