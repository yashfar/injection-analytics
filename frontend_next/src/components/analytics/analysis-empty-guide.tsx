type AnalysisEmptyGuideProps = {
  title: string;
  description?: string;
};

// Phase 1 initial-state guide, shown before the user has pressed
// "Filtreleri Uygula" — replaces a blank/skeleton box with an explanation
// of what this chart shows and how to get data into it.
export function AnalysisEmptyGuide({
  title,
  description,
}: AnalysisEmptyGuideProps) {
  return (
    <div className="flex flex-1 flex-col items-start justify-center gap-2">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description ? (
        <p className="text-sm text-muted-foreground">{description}</p>
      ) : null}
      <p className="text-sm text-muted-foreground">
        Bir tarih aralığı seçili gelir; istersen ürün, kalıp veya makineyi de
        daraltabilirsin. Üçü de opsiyoneldir — boş bırakırsan o filtre hiçbir
        kısıt uygulamaz ve tüm veri kullanılır.
      </p>
      <p className="text-sm text-muted-foreground">
        Hazır olduğunda yukarıdaki &quot;Filtreleri Uygula&quot; butonuna
        basman yeterli.
      </p>
    </div>
  );
}
