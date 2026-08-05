import React, { useEffect, useRef, useState } from "react";
import { useCanvas } from "../../hooks/useCanvas";
import type { ShapeType } from "../../types";

const COLORS = [
  "#000000","#ffffff","#e94560","#f59e0b","#4ade80",
  "#60a5fa","#a78bfa","#f472b6","#34d399","#fb923c",
  "#6b7280","#92400e","#065f46","#1e3a5f","#7c3aed",
  "#fbbf24","#ec4899","#14b8a6","#8b5cf6","#ef4444",
];

// Sizes now use a slider (1-50px)

interface DrawingCanvasProps {
  isDrawer: boolean;
  word?: string | null;
  hint?: string | null;
  /** Fill the parent's height and shrink the canvas so the toolbar stays
   *  on screen without scrolling (desktop layout). */
  fitHeight?: boolean;
}

export default function DrawingCanvas({ isDrawer, word, hint, fitHeight = false }: DrawingCanvasProps) {
  const {
    canvasRef, previewCanvasRef,
    settings, setSettings,
    clearCanvas, undoStroke, redoStroke,
    canUndo, canRedo, saveDrawing,
  } = useCanvas({ isDrawer });

  // Letterbox the 8:5 canvas into whatever space is left over after the word
  // bar and toolbar have taken theirs — CSS alone can't clamp both axes of a
  // fixed-ratio box, so measure the container instead.
  const canvasAreaRef = useRef<HTMLDivElement>(null);
  const [canvasBox, setCanvasBox] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!fitHeight) return;
    const el = canvasAreaRef.current;
    if (!el) return;
    const fit = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width <= 0 || height <= 0) return;
      const w = Math.min(width, height * (8 / 5));
      setCanvasBox({ width: Math.floor(w), height: Math.floor(w * (5 / 8)) });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fitHeight, isDrawer]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isDrawer) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === "z" && !e.shiftKey) { e.preventDefault(); undoStroke(); }
      if (ctrl && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); redoStroke(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isDrawer, undoStroke, redoStroke]);

  // Cursor for overlay canvas
  const cursor = () => {
    if (!isDrawer) return "cursor-default";
    if (settings.tool === "fill")        return "cursor-cell";
    if (settings.tool === "eraser")      return "cursor-cell";
    if (settings.tool === "eyedropper")  return "cursor-crosshair";
    return "cursor-crosshair";
  };

  return (
    <div className={`flex flex-col gap-1 w-full ${fitHeight ? "h-full min-h-0" : ""}`}>

      {/* Word / hint bar */}
      <div className="bg-game-card border border-game-border rounded-xl px-2 sm:px-3 py-1.5 sm:py-2
                      text-center min-h-[36px] sm:min-h-[44px] flex items-center justify-center shrink-0 overflow-hidden">
        {isDrawer && word
          ? <span className="text-game-accent font-game text-lg sm:text-xl md:text-2xl tracking-wider sm:tracking-widest break-all">{word}</span>
          : hint
          ? <span className="text-white font-game text-lg sm:text-xl md:text-2xl tracking-[0.15em] sm:tracking-[0.3em] break-all">{hint}</span>
          : <span className="text-gray-400 text-sm">Waiting for word…</span>
        }
      </div>

      {/* Canvas stack — in fitHeight mode it is measured against the leftover
          space so the toolbar below always stays in view. */}
      <div
        ref={canvasAreaRef}
        className={fitHeight
          ? "flex-1 min-h-0 flex items-center justify-center w-full"
          : "w-full shrink-0"}
      >
        <div
          className="relative rounded-xl overflow-hidden border-2 border-game-border shadow-lg"
          style={fitHeight
            ? { width: canvasBox.width, height: canvasBox.height }
            : { width: "100%", aspectRatio: "8/5" }}
        >

          {/* Main canvas — drawing target, never receives pointer events (overlay does) */}
          <canvas
            ref={canvasRef}
            width={800}
            height={500}
            className="block w-full h-full bg-white pointer-events-none"
            style={{ touchAction:"none" }}
          />

          {/* Overlay canvas — ALWAYS on top and always captures pointer events for drawer.
              For non-drawers it is pointer-events-none so they can interact with chat etc.
              useCanvas attaches all mouse/touch listeners here directly. */}
          <canvas
            ref={previewCanvasRef}
            width={800}
            height={500}
            className={`absolute inset-0 w-full h-full ${isDrawer ? cursor() : "pointer-events-none"}`}
            style={{ touchAction:"none" }}
          />
        </div>
      </div>

      {/* Toolbar — drawer only */}
      {isDrawer && (
        <div className="bg-game-card border border-game-border rounded-xl p-1.5 sm:p-2 shrink-0
                        flex flex-col sm:flex-row sm:flex-wrap gap-1.5 sm:gap-2 sm:items-center">

          {/* Colors — two scrollable rows on phones, wrapping grid on desktop */}
          <div className="grid grid-rows-2 grid-flow-col auto-cols-max gap-1 overflow-x-auto
                          sm:flex sm:flex-wrap sm:overflow-visible">
            {COLORS.map(c => (
              <button key={c}
                onClick={() => setSettings(s => ({
                  ...s, color:c,
                  tool: s.tool==="eraser" ? "pen" : s.tool,
                }))}
                title={c}
                className={`w-7 h-7 sm:w-6 sm:h-6 shrink-0 rounded-full border-2 transition-transform hover:scale-110 ${
                  settings.color===c && settings.tool!=="eraser"
                    ? "border-white scale-110 shadow-lg" : "border-transparent"
                }`}
                style={{ backgroundColor:c }}
              />
            ))}
          </div>

          <div className="w-px h-6 bg-game-border hidden sm:block shrink-0" />

          {/* Brush sizes */}
          {/* Stroke width slider */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-gray-500 text-xs hidden sm:block">Size</span>
            <input
              type="range"
              min={1}
              max={50}
              value={settings.size}
              onChange={e => setSettings(prev => ({
                ...prev,
                size: Number(e.target.value),
                tool: prev.tool === "fill" || prev.tool === "eraser" || prev.tool === "eyedropper"
                  ? prev.tool : "pen",
              }))}
              className="w-20 sm:w-28 accent-game-accent cursor-pointer"
              title={`Brush size: ${settings.size}px`}
            />
            <span className="text-yellow-400 font-bold text-xs w-6 text-right">
              {settings.size}
            </span>
          </div>

          <div className="w-px h-6 bg-game-border hidden sm:block shrink-0" />

          {/* Tools — one horizontally scrollable row on phones */}
          <div className="flex gap-1 items-center overflow-x-auto sm:flex-wrap sm:overflow-visible">

            <button
              onClick={() => setSettings(s => ({ ...s, tool:"pen" }))}
              className={`shrink-0 px-2.5 py-1.5 sm:px-2 sm:py-1 rounded-lg text-xs font-bold transition-all ${
                settings.tool==="pen" ? "bg-gray-600 text-white" : "bg-game-border text-gray-300 hover:bg-gray-600/50"
              }`}
            >✏️<span className="hidden sm:inline"> Pen</span></button>

            <button
              onClick={() => setSettings(s => ({ ...s, tool:"eraser", size:20 }))}
              className={`shrink-0 px-2.5 py-1.5 sm:px-2 sm:py-1 rounded-lg text-xs font-bold transition-all ${
                settings.tool==="eraser" ? "bg-game-accent text-white" : "bg-game-border text-gray-300 hover:bg-game-accent/50"
              }`}
            >🧹<span className="hidden sm:inline"> Erase</span></button>

            <button
              onClick={() => setSettings(s => ({ ...s, tool:"fill" }))}
              className={`shrink-0 px-2.5 py-1.5 sm:px-2 sm:py-1 rounded-lg text-xs font-bold transition-all ${
                settings.tool==="fill" ? "bg-blue-600 text-white" : "bg-game-border text-gray-300 hover:bg-blue-600/50"
              }`}
            >🪣<span className="hidden sm:inline"> Fill</span></button>

            <button
              onClick={() => setSettings(s => ({ ...s, tool:"eyedropper" }))}
              title="Pick color from canvas"
              className={`shrink-0 px-2.5 py-1.5 sm:px-2 sm:py-1 rounded-lg text-xs font-bold transition-all ${
                settings.tool==="eyedropper" ? "bg-teal-600 text-white" : "bg-game-border text-gray-300 hover:bg-teal-600/50"
              }`}
            >🩸<span className="hidden sm:inline"> Pick</span></button>

            <div className="w-px h-5 bg-game-border shrink-0" />

            {/* Shape tools */}
            {(["line","rect","circle"] as ShapeType[]).map(shape => {
              const icons:Record<ShapeType,string> = { line:"╱", rect:"▭", circle:"○" };
              const labels:Record<ShapeType,string> = { line:" Line", rect:" Rect", circle:" Circle" };
              return (
                <button key={shape}
                  onClick={() => setSettings(s => ({ ...s, tool:shape }))}
                  className={`shrink-0 px-2.5 py-1.5 sm:px-2 sm:py-1 rounded-lg text-xs font-bold transition-all ${
                    settings.tool===shape ? "bg-purple-600 text-white" : "bg-game-border text-gray-300 hover:bg-purple-600/50"
                  }`}
                >{icons[shape]}<span className="hidden sm:inline">{labels[shape]}</span></button>
              );
            })}

            <div className="w-px h-5 bg-game-border shrink-0" />

            <button onClick={undoStroke} disabled={!canUndo} title="Undo (Ctrl+Z)"
              className={`shrink-0 px-2.5 py-1.5 sm:px-2 sm:py-1 rounded-lg text-xs font-bold transition-all ${
                canUndo ? "bg-game-border text-gray-300 hover:bg-yellow-600/50"
                        : "bg-game-border text-gray-600 cursor-not-allowed opacity-40"
              }`}
            >↩<span className="hidden sm:inline"> Undo</span></button>

            <button onClick={redoStroke} disabled={!canRedo} title="Redo (Ctrl+Y)"
              className={`shrink-0 px-2.5 py-1.5 sm:px-2 sm:py-1 rounded-lg text-xs font-bold transition-all ${
                canRedo ? "bg-game-border text-gray-300 hover:bg-green-600/50"
                        : "bg-game-border text-gray-600 cursor-not-allowed opacity-40"
              }`}
            >↪<span className="hidden sm:inline"> Redo</span></button>

            <button onClick={clearCanvas}
              className="shrink-0 px-2.5 py-1.5 sm:px-2 sm:py-1 rounded-lg text-xs font-bold bg-game-border text-gray-300 hover:bg-red-600/50 transition-all"
            >🗑️<span className="hidden sm:inline"> Clear</span></button>

            <button
              onClick={() => saveDrawing(word ?? undefined)}
              title="Save drawing as PNG"
              className="shrink-0 px-2.5 py-1.5 sm:px-2 sm:py-1 rounded-lg text-xs font-bold bg-game-border text-gray-300 hover:bg-green-700/60 transition-all"
            >💾<span className="hidden sm:inline"> Save</span></button>

          </div>

          {/* Brush preview dot + eyedropper hint */}
          <div className="ml-auto hidden sm:flex items-center gap-2 shrink-0">
            {settings.tool === "eyedropper" && (
              <span className="text-gray-400 text-xs italic">Click canvas to pick</span>
            )}
            {/* Preview dot scales with slider but capped at 40px visual */}
            <div style={{
              width:  Math.min(settings.size, 40),
              height: Math.min(settings.size, 40),
              minWidth: 6, minHeight: 6,
              borderRadius: "50%",
              border: "1.5px solid #6b7280",
              backgroundColor: settings.tool === "eraser" ? "#ffffff" : settings.color,
              transition: "all 0.1s",
            }}/>
          </div>

        </div>
      )}
    </div>
  );
}
