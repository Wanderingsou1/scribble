import React from "react";

interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Show masking-tape strips pinning the panel to the board. */
  taped?: boolean;
  /** Corner weight — match to the panel's size. */
  edge?: "lg" | "md" | "sm";
  /** Entrance animation. */
  animate?: boolean;
  children: React.ReactNode;
}

/**
 * The one surface every page builds on: a sheet of paper pinned to the board.
 * Pages should never hand-roll a border/shadow/radius — use this.
 */
export default function Panel({
  taped = false,
  edge = "lg",
  animate = true,
  className = "",
  children,
  ...rest
}: PanelProps) {
  return (
    <div
      className={`relative paper edge-${edge} ${taped ? "taped" : ""} ${
        animate ? "anim-pop" : ""
      } ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
