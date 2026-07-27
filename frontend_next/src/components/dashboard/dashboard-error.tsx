import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type DashboardErrorProps = {
  message: string;
  onRetry: () => void;
  isRetrying?: boolean;
};

export function DashboardError({
  message,
  onRetry,
  isRetrying = false,
}: DashboardErrorProps) {
  return (
    <Card className="mx-auto w-full max-w-xl">
      <CardHeader>
        <CardTitle>
          <h1>Analiz verileri yüklenemedi</h1>
        </CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={onRetry} disabled={isRetrying}>
          {isRetrying ? "Yeniden deneniyor..." : "Tekrar dene"}
        </Button>
      </CardContent>
    </Card>
  );
}
