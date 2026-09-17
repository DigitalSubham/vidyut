"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";

/**
 * A generic search-as-you-type picker — same interaction pattern as
 * components/global-search.tsx (Unit 37's header search), generalized so
 * any "pick one record by name instead of pasting its raw ID" screen can
 * reuse it rather than hand-rolling its own each time. First consumer:
 * the Guardians page's student/guardian link form, which used to ask for
 * two raw database IDs typed by hand.
 */
export function SearchableSelect<T>({
  queryKey,
  fetchOptions,
  getId,
  getLabel,
  value,
  onChange,
  placeholder,
  emptyText,
  disabled,
}: {
  queryKey: unknown[];
  fetchOptions: (query: string) => Promise<T[]>;
  getId: (item: T) => string;
  getLabel: (item: T) => string;
  value: T | null;
  onChange: (item: T | null) => void;
  placeholder: string;
  emptyText: string;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data, isFetching } = useQuery({
    queryKey: [...queryKey, query],
    queryFn: () => fetchOptions(query),
    enabled: open && !disabled,
  });
  const options = data ?? [];

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function select(item: T) {
    onChange(item);
    setQuery("");
    setOpen(false);
  }

  function clear() {
    onChange(null);
    setQuery("");
  }

  return (
    <div ref={containerRef} className="relative w-64">
      {value ? (
        <div className="flex h-9 items-center justify-between gap-2 rounded-lg border border-input bg-bg-surface px-2.5 text-sm">
          <span className="truncate">{getLabel(value)}</span>
          <button
            type="button"
            onClick={clear}
            className="shrink-0 text-text-secondary hover:text-text-primary"
            aria-label="Clear"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <Input
          disabled={disabled}
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
      )}
      {open && !value ? (
        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-border bg-bg-surface p-1 shadow-lg">
          {isFetching ? (
            <p className="px-2 py-1.5 text-sm text-text-secondary">…</p>
          ) : options.length === 0 ? (
            <p className="px-2 py-1.5 text-sm text-text-secondary">{emptyText}</p>
          ) : (
            options.map((item) => (
              <button
                key={getId(item)}
                type="button"
                className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-bg-elevated"
                onClick={() => select(item)}
              >
                {getLabel(item)}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
