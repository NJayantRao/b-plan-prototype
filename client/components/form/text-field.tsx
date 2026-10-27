import { useId, type ComponentProps, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "cn";

interface FieldShellProps {
  label: string;
  error?: string | undefined;
  description?: ReactNode;
  optional?: boolean;
  className?: string;
}

/** Shared label / description / error layout so every control behaves alike. */
export function FieldShell({
  id,
  label,
  error,
  description,
  optional,
  className,
  children,
}: FieldShellProps & { id: string; children: ReactNode }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id} className="text-[13px] font-medium text-foreground">
        {label}
        {optional ? (
          <span className="ml-1 font-normal text-muted-foreground">(optional)</span>
        ) : null}
      </Label>
      {children}
      {description && !error ? (
        <p id={`${id}-desc`} className="text-xs text-muted-foreground">
          {description}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-err`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextField({
  label,
  error,
  description,
  optional,
  className,
  inputClassName,
  ...props
}: Omit<ComponentProps<"input">, "className"> &
  FieldShellProps & { inputClassName?: string }) {
  const id = useId();
  return (
    <FieldShell
      id={id}
      label={label}
      error={error}
      description={description}
      optional={optional}
      className={className}
    >
      <Input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : description ? `${id}-desc` : undefined}
        className={cn("h-10", inputClassName)}
        {...props}
      />
    </FieldShell>
  );
}

export function SelectField({
  label,
  error,
  description,
  optional,
  className,
  children,
  ...props
}: Omit<ComponentProps<"select">, "className"> & FieldShellProps) {
  const id = useId();
  return (
    <FieldShell
      id={id}
      label={label}
      error={error}
      description={description}
      optional={optional}
      className={className}
    >
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        className="h-10 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive disabled:opacity-50"
        {...props}
      >
        {children}
      </select>
    </FieldShell>
  );
}

export function TextareaField({
  label,
  error,
  description,
  optional,
  className,
  ...props
}: Omit<ComponentProps<"textarea">, "className"> & FieldShellProps) {
  const id = useId();
  return (
    <FieldShell
      id={id}
      label={label}
      error={error}
      description={description}
      optional={optional}
      className={className}
    >
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        className="min-h-24 w-full rounded-lg border border-input bg-background px-2.5 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive disabled:opacity-50"
        {...props}
      />
    </FieldShell>
  );
}
