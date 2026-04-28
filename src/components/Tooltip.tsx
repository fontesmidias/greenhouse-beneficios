"use client";

import { useState, useRef, useEffect } from "react";

type TooltipProps = {
  content: React.ReactNode;
  /** Texto curto para leitores de tela quando o conteúdo é longo. */
  ariaLabel?: string;
  /** Lado preferencial do balão. Default: top. */
  side?: "top" | "bottom" | "left" | "right";
  /** Tamanho do ícone em pixels. Default: 14. */
  iconSize?: number;
  className?: string;
};

/**
 * Tooltip discreto com ícone "ⓘ".
 * - Hover (desktop) e tap (touch) abrem
 * - Foco por teclado (Tab) também abre
 * - Esc fecha
 * - Fecha ao clicar fora
 */
export default function Tooltip({
  content,
  ariaLabel,
  side = "top",
  iconSize = 14,
  className = "",
}: TooltipProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const positionClasses: Record<NonNullable<TooltipProps["side"]>, string> = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <span ref={wrapperRef} className={`relative inline-flex items-center ${className}`}>
      <button
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

      {open && (
        <span
          role="tooltip"
          className={`absolute z-50 ${positionClasses[side]} w-64 max-w-[80vw] bg-[#0A0A0B] text-zinc-200 text-[11px] leading-relaxed font-medium px-3 py-2.5 rounded-xl shadow-2xl ring-1 ring-emerald-500/20 border border-white/5 pointer-events-none`}
        >
          {content}
        </span>
      )}
    </span>
  );
}
