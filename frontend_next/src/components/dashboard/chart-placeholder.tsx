import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type ChartPlaceholderProps = {
  title: string;
  description: string;
};

export function ChartPlaceholder({
  title,
  description,
}: ChartPlaceholderProps) {
  return (
    <Card className="min-h-80">
      <CardHeader>
        <CardTitle>
          <h2>{title}</h2>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 items-end gap-3 pt-4">
        <Skeleton className="h-2/5 flex-1" />
        <Skeleton className="h-3/5 flex-1" />
        <Skeleton className="h-1/2 flex-1" />
        <Skeleton className="h-4/5 flex-1" />
        <Skeleton className="h-2/3 flex-1" />
        <Skeleton className="h-full flex-1" />
      </CardContent>
    </Card>
  );
}
