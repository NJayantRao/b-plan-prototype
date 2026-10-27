"use client";

import { X } from "lucide-react";
import { useId, useState, type KeyboardEvent } from "react";
import { FieldShell } from "./text-field";

/** Chip input: type a value and press Enter (or comma) to add it. */
export function TagInput({
  label,
  value,
  onChange,
  error,
  description,
  placeholder,
  max = 50,
  maxLength = 100,
  optional,
}: {
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
  error?: string | undefined;
  description?: string;
  placeholder?: string;
  max?: number;
  maxLength?: number;
  optional?: boolean;
}) {
  const id = useId();
  const [draft, setDraft] = useState("");

  const add = () => {
    const next = draft.trim().slice(0, maxLength);
    setDraft("");
    if (!next || value.includes(next) || value.length >= max) return;
    onChange([...value, next]);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      add();
    } else if (event.key === "Backspace" && draft === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <FieldShell
      id={id}
      label={label}
      error={error}
      description={description}
      optional={optional}
    >
      <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-input bg-background px-2 py-1.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-md bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground"
          >
            {tag}
            <button
              type="button"
              aria-label={`Remove ${tag}`}
              className="rounded-sm opacity-70 hover:opacity-100 focus-visible:outline-2"
              onClick={() => onChange(value.filter((t) => t !== tag))}
            >
              <X className="size-3" aria-hidden />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={add}
          placeholder={value.length === 0 ? placeholder : undefined}
          className="min-w-32 flex-1 bg-transparent px-1 py-0.5 text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
    </FieldShell>
  );
}
