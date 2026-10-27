"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/common/page-header";
import { Pagination } from "@/components/common/pagination";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/common/states";
import { OutcomeBadge } from "@/components/common/status-badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuditLogs } from "@/features/admin/hooks";
import { useDebounce } from "@/hooks/use-debounce";
import { formatDateTime } from "@/lib/format";
import type { AuditOutcome } from "@/types/api";
import { cn } from "cn";

const PAGE_SIZE = 15;
const OUTCOMES: AuditOutcome[] = ["success", "failure", "denied"];

const shortId = (id: string | null) => (id ? `…${id.slice(-6)}` : "—");

/** Compact "key: value" rendering of the small metadata object the API stores. */
const summarise = (metadata: Record<string, unknown> | null): string =>
  metadata
    ? Object.entries(metadata)
        .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : String(value)}`)
        .join(" · ")
    : "";

export default function AuditLogsPage() {
  const [actionInput, setActionInput] = useState("");
  const [outcome, setOutcome] = useState<AuditOutcome | "">("");
  const [page, setPage] = useState(1);
  const action = useDebounce(actionInput.trim(), 400);

  const { data, isPending, isError, error, refetch, isFetching, isPlaceholderData } = useAuditLogs({
    action: action || undefined,
    outcome: outcome || undefined,
    page,
    limit: PAGE_SIZE,
  });

  return (
    <>
      <PageHeader
        title="Audit logs"
        description="An append-only record of security and administrative events. Details never include medical content, emails or passwords."
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            aria-label="Filter by exact action"
            placeholder="Exact action, e.g. auth.login"
            className="h-10 pl-9"
            value={actionInput}
            onChange={(e) => { setActionInput(e.target.value); setPage(1); }}
          />
        </div>
        <select
          aria-label="Filter by outcome"
          value={outcome}
          onChange={(e) => { setOutcome(e.target.value as AuditOutcome | ""); setPage(1); }}
          className="h-10 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="">All outcomes</option>
          {OUTCOMES.map((o) => (
            <option key={o} value={o}>{o[0]?.toUpperCase()}{o.slice(1)}</option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        {isPending ? (
          <TableSkeleton rows={8} cols={6} />
        ) : isError ? (
          <div className="p-6"><ErrorState error={error} onRetry={() => void refetch()} title="Couldn't load audit logs" /></div>
        ) : data.items.length === 0 ? (
          <EmptyState title="No matching events" description="Try a different action or outcome filter." />
        ) : (
          <div className={cn("transition-opacity", isPlaceholderData && isFetching && "opacity-60")}>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    {["Time", "Action", "Actor", "Resource", "Outcome", "Details"].map((h) => (
                      <TableHead key={h} className="h-10 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(log.createdAt)}</TableCell>
                      <TableCell className="font-mono text-xs">{log.action}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span className="capitalize">{log.actorRole ?? "anonymous"}</span>{" "}
                        <span className="font-mono text-xs text-muted-foreground" title={log.actorId ?? undefined}>{shortId(log.actorId)}</span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {log.resourceType}{" "}
                        <span className="font-mono text-xs text-muted-foreground" title={log.resourceId ?? undefined}>
                          {log.resourceId && log.resourceId.length > 24 ? shortId(log.resourceId) : (log.resourceId ?? "")}
                        </span>
                      </TableCell>
                      <TableCell><OutcomeBadge outcome={log.outcome} /></TableCell>
                      <TableCell className="max-w-56 truncate text-xs text-muted-foreground" title={summarise(log.metadata)}>
                        {summarise(log.metadata) || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Pagination pagination={data.pagination} onPageChange={setPage} disabled={isFetching} />
          </div>
        )}
      </div>
    </>
  );
}
