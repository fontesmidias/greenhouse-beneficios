"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

type Side = "top" | "bottom" | "left" | "right";

type TooltipProps = {
  content: React.ReactNode;
  /** Texto curto para leitores de tela quando o conteúdo é longo. */
  ariaLabel?: string;
  /** Lado preferencial do balão. Default: top. */
  side?: Side;
  /** Tamanho do ícone em pixels. Default: 14. */
  iconSize?: number;
  className?: string;
};

const GAP = 8;

/**
 * Tooltip discreto com ícone "ⓘ".
 * - Renderiza em portal (document.body) para não ser cortado por overflow.
 * - Hover (desktop) e tap (touch) abrem
 * - Foco por teclado (Tab) também abre
 * - Esc fecha
 * - Fecha ao clicar fora
 * - Reposiciona automaticamente em scroll/resize
 * - Em telas pequenas, ajusta para caber na viewport
 */
export default function Tooltip({
  content,
  ariaLabel,
  side = "top",
  iconSize = 14,
  className = "",
}: TooltipProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; placedSide: Side } | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const balloonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const computePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const balloon = balloonRef.current;
    if (!trigger || !balloon) return;

    const triggerRect = trigger.getBoundingClientRect();
    const balloonRect = balloon.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let placedSide: Side = side;
    let top = 0;
    let left = 0;

    const computeFor = (s: Side) => {
      switch (s) {
        case "top":
          return {
            top: triggerRect.top - balloonRect.height - GAP,
            left: triggerRect.left + triggerRect.width / 2 - balloonRect.width / 2,
          };
        case "bottom":
          return {
            top: triggerRect.bottom + GAP,
            left: triggerRect.left + triggerRect.width / 2 - balloonRect.width / 2,
          };
        case "left":
          return {
            top: triggerRect.top + triggerRect.height / 2 - balloonRect.height / 2,
            left: triggerRect.left - balloonRect.width - GAP,
          };
        case "right":
          return {
            top: triggerRect.top + triggerRect.height / 2 - balloonRect.height / 2,
            left: triggerRect.right + GAP,
          };
      }
    };

    let pos = computeFor(placedSide);
    const fitsVertically = pos.top >= 0 && pos.top + balloonRect.height <= vh;
    const fitsHorizontally = pos.left >= 0 && pos.left + balloonRect.width <= vw;

    // Auto-flip quando estoura a viewport
    if (placedSide === "top" && !fitsVertically) {
      placedSide = "bottom";
      pos = computeFor(placedSide);
    } else if (placedSide === "bottom" && !fitsVertically) {
      placedSide = "top";
      pos = computeFor(placedSide);
    } else if (placedSide === "left" && !fitsHorizontally) {
      placedSide = "right";
      pos = computeFor(placedSide);
    } else if (placedSide === "right" && !fitsHorizontally) {
      placedSide = "left";
      pos = computeFor(placedSide);
    }

    // Clamp horizontal: nunca sair da tela
    left = Math.max(8, Math.min(pos.left, vw - balloonRect.width - 8));
    top = Math.max(8, Math.min(pos.top, vh - balloonRect.height - 8));

    setCoords({ top, left, placedSide });
  }, [side]);

  useEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    // Primeiro render do balão pra medir, depois posicionar
    requestAnimationFrame(computePosition);

    const onScroll = () => computePosition();
    const onResize = () => computePosition();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        balloonRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);

    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open, computePosition]);

  return (
    <span className={`relative inline-flex items-center ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel || "Mais informações"}
        aria-expanded={open}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="inline-flex items-center justify-center text-zinc-400 hover:text-emerald-400 focus:text-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400 rounded-full transition-colors"
        style={{ width: iconSize + 4, height: iconSize + 4 }}
      >
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 16 16"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm0 14.5a6.5 6.5 0 110-13 6.5 6.5 0 010 13zm-.75-9.5a.75.75 0 111.5 0 .75.75 0 01-1.5 0zm0 2.5a.75.75 0 011.5 0v4a.75.75 0 01-1.5 0v-4z" />
        </svg>
      </button>

      {mounted && open &&
        createPortal(
          <div
            ref={balloonRef}
            role="tooltip"
            style={{
              position: "fixed",
              top: coords?.top ?? -9999,
              left: coords?.left ?? -9999,
              maxWidth: "min(20rem, calc(100vw - 16px))",
              opacity: coords ? 1 : 0,
              pointerEvents: "none",
              zIndex: 9999,
            }}
            className="bg-[#0A0A0B] text-zinc-200 text-[11px] leading-relaxed font-medium px-3 py-2.5 rounded-xl shadow-2xl ring-1 ring-emerald-500/20 border border-white/5 transition-opacity duration-100"
          >
            {content}
          </div>,
          document.body
        )}
    </span>
  );
}
