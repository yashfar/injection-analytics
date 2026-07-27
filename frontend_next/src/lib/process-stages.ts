import type { ProcessStageKey } from "@/types/analytics";

type ProcessStageConfiguration = {
  key: ProcessStageKey;
  label: string;
  color: string;
};

export const PROCESS_STAGES = [
  {
    key: "MENGAC",
    label: "Mengene Açma",
    color: "var(--chart-1)",
  },
  {
    key: "ENJTIME",
    label: "Enjeksiyon",
    color: "var(--chart-2)",
  },
  {
    key: "MALTIME",
    label: "Mal Alma",
    color: "var(--chart-3)",
  },
  {
    key: "SOGZAMAN",
    label: "Soğutma",
    color: "var(--chart-4)",
  },
  {
    key: "MENGKAP",
    label: "Mengene Kapama",
    color: "var(--chart-5)",
  },
] as const satisfies readonly ProcessStageConfiguration[];
