import React from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "lg";

interface SketchButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Slight resting tilt, so a stack of buttons doesn't look machine-set. */
  tilt?: number;
  children: React.ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-[#e94560] text-white border-[#ff6b81] hover:bg-[#ff5570] shadow-[3px_4px_0_rgba(0,0,0,0.35)]",
  secondary:
    "bg-[#26315a] text-white border-[rgba(244,241,232,0.18)] hover:bg-[#2f3d6e] hover:border-[#60a5fa] shadow-[3px_4px_0_rgba(0,0,0,0.32)]",
  success:
    "bg-[#2f9e5f] text-white border-[#4ade80] hover:bg-[#37b56d] shadow-[3px_4px_0_rgba(0,0,0,0.32)]",
  danger:
    "bg-transparent text-[#ff8fa0] border-[rgba(233,69,96,0.5)] hover:bg-[rgba(233,69,96,0.15)] hover:text-white",
  ghost:
    "bg-transparent text-[#a8b0c8] border-[rgba(244,241,232,0.14)] hover:text-white hover:bg-[rgba(255,255,255,0.06)]",
};

// Mobile-first: the base value is the phone size, sm: steps up from there.
const SIZES: Record<Size, string> = {
  sm: "px-2.5 py-1 text-[11px] sm:px-3 sm:py-1.5 sm:text-xs",
  md: "px-3 py-2 text-sm sm:px-4 sm:py-2.5 sm:text-base",
  lg: "px-4 py-2.5 text-base sm:px-5 sm:py-3 sm:text-lg",
};

/**
 * Marker-drawn button. Presses down into the board on tap (the offset shadow
 * collapses), which reads better on touch than a colour change alone.
 */
export default function SketchButton({
  variant = "primary",
  size = "md",
  tilt = 0,
  className = "",
  style,
  children,
  ...rest
}: SketchButtonProps) {
  return (
    <button
      className={`edge-md border-2 font-game tracking-wide transition-transform duration-150 hover:scale-[1.035] active:scale-[0.97] active:shadow-[1px_1px_0_rgba(0,0,0,0.35)] active:translate-y-[2px] disabled:opacity-40 disabled:pointer-events-none
                  ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      style={{ rotate: `${tilt}deg`, ...style }}
      {...rest}
    >
      {children}
    </button>
  );
}
