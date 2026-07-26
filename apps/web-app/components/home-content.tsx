"use client";

import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function HomeContent() {
  const { t } = useTranslation();

  return (
    <Card className="max-w-xl rounded-2xl">
      <CardHeader>
        <CardTitle className="font-heading text-2xl">
          {t("home.greeting")}
        </CardTitle>
        <CardDescription>{t("app.tagline")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-text-secondary">{t("home.description")}</p>
        <Button className="w-fit">{t("nav.dashboard")}</Button>
      </CardContent>
    </Card>
  );
}
