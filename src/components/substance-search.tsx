"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDebounce } from "use-debounce";
import { Loader2, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Formula } from "@/components/formula";

type Result = {
  id: number;
  name: string;
  formula: string | null;
  casNumber: string | null;
};

type Props = {
  autoFocus?: boolean;
  className?: string;
  placeholder?: string;
  variant?: "default" | "light";
};

export function SubstanceSearch({
  autoFocus,
  className,
  placeholder = "Busca por nombre, fórmula o número CAS…",
  variant = "default",
}: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [debounced] = useDebounce(query, 300);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!debounced.trim()) {
      setResults([]);
      setActiveIndex(-1);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/substances/search?q=${encodeURIComponent(debounced)}`)
      .then((r) => r.json())
      .then((data: Result[]) => {
        if (cancelled) return;
        setResults(Array.isArray(data) ? data : []);
        setActiveIndex(data.length > 0 ? 0 : -1);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);

  const showDropdown = open && query.trim().length > 0;
  const hasResults = results.length > 0;
  const showNoResults = useMemo(
    () => showDropdown && !loading && !hasResults && debounced.trim().length > 0,
    [showDropdown, loading, hasResults, debounced]
  );

  function selectResult(r: Result) {
    setOpen(false);
    setQuery("");
    router.push(`/substances/${r.id}`);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const chosen = results[activeIndex] ?? results[0];
      if (chosen) selectResult(chosen);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const isLight = variant === "light";

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <div className="relative">
        <Search
          className={cn(
            "pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2",
            isLight ? "text-brand-foreground/80" : "text-muted-foreground"
          )}
          aria-hidden
        />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          autoFocus={autoFocus}
          placeholder={placeholder}
          className={cn(
            "h-14 rounded-sm border-2 pl-12 pr-12 text-base shadow-none",
            isLight
              ? "border-brand-foreground/40 bg-brand-foreground/10 text-brand-foreground placeholder:text-brand-foreground/60 focus-visible:border-brand-foreground focus-visible:ring-0"
              : "focus-visible:border-brand focus-visible:ring-brand/20"
          )}
          aria-label="Buscar sustancias"
          aria-autocomplete="list"
          aria-controls="substance-suggestions"
        />
        {loading && (
          <Loader2
            className={cn(
              "absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin",
              isLight ? "text-brand-foreground/80" : "text-muted-foreground"
            )}
          />
        )}
      </div>

      {showDropdown && (hasResults || showNoResults) && (
        <div
          id="substance-suggestions"
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-sm border border-border bg-popover text-foreground shadow-xl"
        >
          {hasResults && (
            <ul className="max-h-96 overflow-auto py-1">
              {results.map((r, i) => (
                <li key={r.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={i === activeIndex}
                    onMouseEnter={() => setActiveIndex(i)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectResult(r);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition-colors",
                      i === activeIndex
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/60"
                    )}
                  >
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-brand">
                        {r.name}
                      </div>
                      {r.formula && (
                        <div className="truncate font-mono text-xs text-muted-foreground">
                          <Formula value={r.formula} />
                        </div>
                      )}
                    </div>
                    {r.casNumber && (
                      <span className="shrink-0 rounded-sm bg-secondary px-2 py-0.5 font-mono text-xs text-muted-foreground">
                        {r.casNumber}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {showNoResults && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No se han encontrado sustancias para{" "}
              <span className="font-medium text-brand">{debounced}</span>.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
