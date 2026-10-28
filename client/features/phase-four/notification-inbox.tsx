"use client";

import { Bell } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { useMarkNotificationRead, useNotifications } from "./hooks";

export function NotificationInbox() {
  const [open, setOpen] = useState(false);
  const query = useNotifications();
  const markRead = useMarkNotificationRead();
  const items = query.data?.items ?? [];

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Notifications${query.data?.unreadCount ? `, ${query.data.unreadCount} unread` : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Bell aria-hidden />
        {query.data?.unreadCount ? (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
            {query.data.unreadCount > 9 ? "9+" : query.data.unreadCount}
          </span>
        ) : null}
      </Button>
      {open ? (
        <section
          aria-label="Notifications"
          className="absolute right-0 top-11 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border bg-card shadow-lg"
        >
          <header className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-sm font-semibold">Notifications</h2>
            <span className="text-xs text-muted-foreground">
              {query.data?.unreadCount ?? 0} unread
            </span>
          </header>
          {query.isError ? (
            <p role="alert" className="p-4 text-sm text-destructive">Couldn&apos;t load notifications.</p>
          ) : query.isPending ? (
            <p className="p-4 text-sm text-muted-foreground">Loading notifications…</p>
          ) : items.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No notifications yet.</p>
          ) : (
            <ul className="max-h-96 divide-y overflow-y-auto">
              {items.map((item) => (
                <li key={item.id} className={`px-4 py-3 ${item.readAt ? "" : "bg-primary/5"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium">{item.title}</p>
                    {!item.readAt ? (
                      <button
                        type="button"
                        disabled={markRead.isPending}
                        className="shrink-0 text-xs font-medium text-primary hover:underline disabled:opacity-50"
                        onClick={() => markRead.mutate(item.id)}
                      >
                        Mark read
                      </button>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{item.message}</p>
                  <time className="mt-2 block text-xs text-muted-foreground" dateTime={item.createdAt}>
                    {formatDateTime(item.createdAt)}
                  </time>
                </li>
              ))}
            </ul>
          )}
          {markRead.isError ? (
            <p role="alert" className="border-t px-4 py-2 text-sm text-destructive">
              Couldn&apos;t update notification: {markRead.error instanceof Error ? markRead.error.message : "Please try again."}
            </p>
          ) : null}
          <p className="border-t px-4 py-2 text-[11px] text-muted-foreground">
            In-app prototype notices only; no external messages are sent.
          </p>
        </section>
      ) : null}
    </div>
  );
}
