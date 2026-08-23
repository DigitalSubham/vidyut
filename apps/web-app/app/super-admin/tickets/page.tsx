"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { platformApi } from "@/lib/platform-client";

export default function PlatformTicketsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [respondingId, setRespondingId] = useState<{ tenantId: string; ticketId: string } | null>(null);
  const [responseText, setResponseText] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["platform", "tickets"],
    queryFn: () => platformApi.listTickets(),
  });
  const groups = data?.data ?? [];

  const respondMutation = useMutation({
    mutationFn: ({ tenantId, ticketId }: { tenantId: string; ticketId: string }) =>
      platformApi.respondToTicket(tenantId, ticketId, { response: responseText, status: "RESOLVED" }),
    onSuccess: () => {
      setRespondingId(null);
      setResponseText("");
      void queryClient.invalidateQueries({ queryKey: ["platform", "tickets"] });
    },
  });

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold text-text-primary">{t("platform.tickets.title")}</h1>
        <Link href="/super-admin/tenants" className="text-sm text-brand hover:underline">
          {t("platform.revenue.backToTenants")}
        </Link>
      </div>
      {isLoading ? (
        <p className="text-text-secondary">{t("platform.common.loading")}</p>
      ) : groups.length === 0 ? (
        <p className="text-text-secondary">{t("platform.tickets.empty")}</p>
      ) : (
        groups.map((group) => (
          <div key={group.tenantId} className="flex flex-col gap-2">
            <h2 className="font-heading text-lg font-semibold text-text-primary">{group.tenantName}</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("platform.tickets.subject")}</TableHead>
                  <TableHead>{t("platform.tickets.priority")}</TableHead>
                  <TableHead>{t("platform.tickets.status")}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.tickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell>{ticket.subject}</TableCell>
                    <TableCell>{ticket.priority}</TableCell>
                    <TableCell>
                      <Badge variant={ticket.status === "OPEN" ? "secondary" : "default"}>{ticket.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {ticket.status !== "RESOLVED" ? (
                        respondingId?.ticketId === ticket.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              className="rounded border border-border px-2 py-1 text-sm"
                              value={responseText}
                              onChange={(e) => setResponseText(e.target.value)}
                              placeholder={t("platform.tickets.responsePlaceholder") as string}
                            />
                            <Button
                              size="sm"
                              disabled={!responseText || respondMutation.isPending}
                              onClick={() =>
                                respondMutation.mutate({ tenantId: group.tenantId, ticketId: ticket.id })
                              }
                            >
                              {t("platform.tickets.submit")}
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setRespondingId({ tenantId: group.tenantId, ticketId: ticket.id })}
                          >
                            {t("platform.tickets.respond")}
                          </Button>
                        )
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ))
      )}
    </div>
  );
}
