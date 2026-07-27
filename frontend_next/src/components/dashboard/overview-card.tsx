import type { ReactNode } from "react";

import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type OverviewCardProps = {
  title: string;
  value: string | number;
  description: string;
  icon: ReactNode;
};

export function OverviewCard({
  title,
  value,
  description,
  icon,
}: OverviewCardProps) {
  const formattedValue =
    typeof value === "number" ? value.toLocaleString("tr-TR") : value;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>
          <h3 className="text-sm text-muted-foreground">{title}</h3>
        </CardTitle>
        <CardAction className="flex size-9 items-center justify-center rounded-lg bg-muted text-foreground [&_svg]:size-4">
          {icon}
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-1.5">
        <p className="text-3xl font-semibold tracking-tight text-card-foreground tabular-nums">
          {formattedValue}
        </p>
        <p className="text-xs leading-5 text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
