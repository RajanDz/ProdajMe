import React, { useState, useRef, useEffect, useMemo } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/utils";
import { BRANDS } from "../../constants/listing";

interface BrandComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  /** Label and value for the first "clear" option (value = ""). Omit when showEmptyOption={false}. */
  emptyLabel?: string;
  /** Set false to hide the empty/clear option (use for required fields). Default: true. */
  showEmptyOption?: boolean;
  className?: string;
}

export function BrandCombobox({
  value,
  onChange,
  placeholder,
  emptyLabel,
  showEmptyOption = true,
  className,
}: BrandComboboxProps) {
  const { t } = useTranslation();
  const uid = React.useId();
  const listboxId = `brand-listbox-${uid}`;

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlighted, setHighlighted] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filteredBrands = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? BRANDS.filter((b) => b.toLowerCase().includes(q)) : BRANDS;
  }, [search]);

  const items = useMemo(() => {
    const brandItems = filteredBrands.map((b) => ({ label: b, value: b }));
    if (showEmptyOption && emptyLabel) {
      return [{ label: emptyLabel, value: "" }, ...brandItems];
    }
    return brandItems;
  }, [filteredBrands, emptyLabel, showEmptyOption]);

  const closeDropdown = () => {
    setOpen(false);
    setSearch("");
    setHighlighted(0);
  };

  const selectItem = (itemValue: string) => {
    onChange(itemValue);
    closeDropdown();
  };

  const openDropdown = () => {
    setSearch("");
    const fullList = showEmptyOption && emptyLabel
      ? [{ value: "" }, ...BRANDS.map((b) => ({ value: b }))]
      : BRANDS.map((b) => ({ value: b }));
    const idx = fullList.findIndex((item) => item.value === value);
    setHighlighted(idx >= 0 ? idx : 0);
    setOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  // Scroll highlighted item into view on navigation and on open
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.children[highlighted] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [highlighted, open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        closeDropdown();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "Escape":
        e.preventDefault();
        closeDropdown();
        break;
      case "ArrowDown":
        e.preventDefault();
        setHighlighted((h) => Math.min(h + 1, items.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlighted((h) => Math.max(h - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (items[highlighted]) selectItem(items[highlighted].value);
        break;
      default:
        break;
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Trigger */}
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        onClick={() => (open ? closeDropdown() : openDropdown())}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          !value && "text-muted-foreground"
        )}
      >
        <span className="truncate">{value || placeholder}</span>
        <ChevronDown
          className={cn(
            "ml-2 h-4 w-4 shrink-0 opacity-50 transition-transform duration-150",
            open && "rotate-180"
          )}
          aria-hidden="true"
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-white shadow-md">
          {/* Search input */}
          <div className="flex items-center border-b border-border px-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setHighlighted(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder={t("filters.brand_placeholder")}
              className="h-10 w-full bg-transparent py-3 pl-2 text-sm outline-none placeholder:text-muted-foreground"
              aria-autocomplete="list"
              aria-controls={listboxId}
            />
          </div>

          {/* Items */}
          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            className="max-h-56 overflow-y-auto py-1"
          >
            {items.map((item, idx) => (
              <li
                key={item.value === "" ? "__empty__" : item.value}
                role="option"
                aria-selected={item.value === value}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectItem(item.value);
                }}
                onMouseEnter={() => setHighlighted(idx)}
                className={cn(
                  "flex cursor-pointer select-none items-center justify-between px-3 py-1.5 text-sm",
                  highlighted === idx && "bg-accent text-accent-foreground",
                  item.value === "" && "text-muted-foreground"
                )}
              >
                <span>{item.label}</span>
                {item.value !== "" && item.value === value && (
                  <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                )}
              </li>
            ))}
            {filteredBrands.length === 0 && search.trim() !== "" && (
              <li
                className="px-3 py-6 text-center text-sm text-muted-foreground"
                aria-live="polite"
              >
                {t("filters.no_brands_found")}
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
