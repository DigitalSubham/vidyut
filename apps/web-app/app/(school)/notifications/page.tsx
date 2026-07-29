"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { adminApi } from "@/lib/admin-client";

export default function NotificationsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["my-notifications"],
    queryFn: () => adminApi.getMyNotifications(),
  });
  const notifications = data?.data ?? [];

  async function markRead(id: string) {
    await adminApi.markNotificationRead(id);
    await queryClient.invalidateQueries({ queryKey: ["my-notifications"] });
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-heading text-2xl font-semibold text-text-primary">{t("school.notifications.title")}</h1>

      {isLoading ? (
        <p className="text-text-secondary">{t("school.common.loading")}</p>
      ) : notifications.length === 0 ? (
        <p className="text-text-secondary">{t("school.notifications.empty")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className="flex items-center justify-between rounded-lg border border-border bg-bg-surface p-3"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{n.channel}</Badge>
                  <span className="text-sm font-medium text-text-primary">{n.templateKey}</span>
                  {!n.readAt && <Badge>{t("school.notifications.unread")}</Badge>}
                </div>
                <span className="text-xs text-text-secondary">{new Date(n.createdAt).toLocaleString()}</span>
              </div>
              {!n.readAt && (
                <Button variant="outline" size="sm" onClick={() => markRead(n.id)}>
                  {t("school.notifications.markRead")}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
