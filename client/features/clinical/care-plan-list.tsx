"use client";

import { useState } from "react";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/common/states";
import { PageHeader } from "@/components/common/page-header";
import { Pagination } from "@/components/common/pagination";
import { useCarePlans, useUpdateCareTask } from "./hooks";
import { formatDate } from "@/lib/format";
import { getErrorMessage } from "@/lib/api/errors";
import { toast } from "@/components/ui/toast";

export function CarePlanList({ doctor = false }: { doctor?: boolean }) {
  const updateTask = useUpdateCareTask();
  const [savingTask, setSavingTask] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const { data, isPending, isError, error, refetch } = useCarePlans({ page, limit: 20 });

  const update = async (planId: string, taskId: string, status: "pending" | "in_progress" | "completed" | "skipped") => {
    setSavingTask(taskId);
    try {
      await updateTask.mutateAsync({ planId, taskId, status });
      toast.add({ type: "success", title: "Task progress updated" });
    } catch (taskError) {
      toast.add({ type: "error", title: "Couldn't update task", description: getErrorMessage(taskError) });
    } finally {
      setSavingTask(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title={doctor ? "Care plans" : "My care plans"} description={doctor ? "Plans you created for patients you reviewed." : "Track your tasks and follow-up recommendations."} />
      {isPending ? <CardSkeleton lines={5} /> : isError ? <ErrorState error={error} onRetry={() => void refetch()} title="Couldn't load care plans" /> : !data.items.length ? (
        <section className="rounded-xl border bg-card"><EmptyState title="No care plans yet" description="A doctor can create a plan after reviewing an assessment." /></section>
      ) : (
        <div className="space-y-5">
          {data.items.map((plan) => (
            <section key={plan.id} className="rounded-xl border bg-card">
              <header className="flex flex-col gap-2 border-b px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="font-semibold">{plan.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{plan.summary ?? `Created ${formatDate(plan.createdAt)}`}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{doctor ? `Patient: ${plan.patient?.name ?? "—"} · ` : ""}Doctor: {plan.doctor?.name ?? "—"} · Follow-up: {formatDate(plan.followUpDate)}</p>
                </div>
                <div className="text-sm text-muted-foreground">{plan.progress.done}/{plan.progress.total} tasks · {plan.progress.percent}% complete{plan.progress.overdue ? ` · ${plan.progress.overdue} overdue` : ""}</div>
              </header>
              <div className="divide-y px-5">
                {plan.tasks.map((task) => (
                  <div key={task.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-medium">{task.title}{task.isOverdue ? <span className="ml-2 text-xs font-semibold text-red-700">Overdue</span> : null}</p>
                      {task.description ? <p className="mt-1 text-sm text-muted-foreground">{task.description}</p> : null}
                      <p className="mt-1 text-xs capitalize text-muted-foreground">{task.type.replaceAll("_", " ")} · due {formatDate(task.dueDate)}</p>
                      {task.notes ? <p className="mt-1 text-sm">Note: {task.notes}</p> : null}
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <select
                        aria-label={`Progress for ${task.title}`}
                        className="h-8 rounded-lg border border-input bg-background px-2"
                        value={task.status}
                        disabled={savingTask === task.id}
                        onChange={(event) => void update(plan.id, task.id, event.target.value as typeof task.status)}
                      >
                        <option value="pending">Not started</option>
                        <option value="in_progress">In progress</option>
                        <option value="completed">Completed</option>
                        <option value="skipped">Skipped</option>
                      </select>
                    </label>
                  </div>
                ))}
              </div>
              {plan.referrals.length ? (
                <div className="border-t px-5 py-4">
                  <h3 className="text-sm font-semibold">Referrals</h3>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">{plan.referrals.map((referral, index) => <li key={`${referral.specialty}-${index}`}>{referral.specialty} · {referral.urgency}: {referral.reason}</li>)}</ul>
                </div>
              ) : null}
            </section>
          ))}
        </div>
      )}
      {data ? <Pagination pagination={data.pagination} onPageChange={setPage} disabled={isPending} /> : null}
    </div>
  );
}
