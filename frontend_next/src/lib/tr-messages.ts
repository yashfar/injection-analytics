export const trMessages = {
  common: {
    retry: "Tekrar dene",
    retrying: "Yeniden deneniyor...",
    updating: "Veriler güncelleniyor...",
  },
  trend: {
    title: "Çevrim Süresi Trendi",
    description:
      "Seçilen tarih aralığında makinelerin medyan çevrim sürelerindeki değişimi inceleyin.",
    hourly: "Saatlik görünüm",
    daily: "Günlük görünüm",
    weekly: "Haftalık görünüm",
    date: "Tarih",
    machine: "Makine",
    medianCycleTime: "Medyan Çevrim Süresi",
    averageCycleTime: "Ortalama Çevrim Süresi",
    minimumCycleTime: "Minimum Çevrim Süresi",
    maximumCycleTime: "Maksimum Çevrim Süresi",
    cycleCount: "Çevrim Sayısı",
    yAxisLabel: "Medyan Çevrim Süresi (sn)",
    seconds: "saniye",
    loading: "Çevrim süresi trend grafiği yükleniyor...",
    loadError: "Çevrim süresi trend verileri yüklenemedi.",
    noData:
      "Seçilen filtreler için çevrim süresi trend verisi bulunamadı.",
    focusSeries: "serisini vurgula",
    accessibilityDescription:
      "Seçilen makinelerin zamana göre saniye cinsinden medyan çevrim sürelerini gösteren çizgi grafik.",
  },
  histogram: {
    title: "Çevrim Süresi Dağılımı",
    description:
      "Seçilen makinenin çevrimlerinin hangi süre aralıklarında yoğunlaştığını inceleyin.",
    selectMachine:
      "Çevrim süresi dağılımını görmek için bir makine seçin.",
    interval: "Çevrim Süresi Aralığı",
    cycleCount: "Çevrim Sayısı",
    shareOfTotal: "Toplam İçindeki Payı",
    totalCycles: "Toplam Çevrim",
    minimumCycleTime: "Minimum Çevrim Süresi",
    maximumCycleTime: "Maksimum Çevrim Süresi",
    binSize: "Aralık Genişliği",
    displayMaximum: "Üst Gösterim Sınırı",
    seconds: "saniye",
    shortSeconds: "sn",
    overflow: "ve üzeri",
    overflowExplanation:
      "Üst sınır etiketi, bu süreye eşit veya daha uzun çevrimleri gösterir; istatistiksel aykırı değer anlamına gelmez.",
    loading: "Çevrim süresi dağılımı yükleniyor...",
    loadingMachineData: (machine: string) =>
      `${machine} verileri yükleniyor...`,
    showingPreviousMachineData: (machine: string) =>
      `Yeni veriler yüklenirken ${machine} verileri gösteriliyor.`,
    loadError: "Çevrim süresi dağılımı yüklenemedi.",
    noData:
      "Seçilen filtreler için çevrim süresi dağılımı bulunamadı.",
    unavailable: "Mevcut değil",
    accessibilityDescription:
      "Yatay eksende saniye cinsinden çevrim süresi aralıklarını, dikey eksende her aralıktaki çevrim sayısını gösteren sütun grafik.",
    xAxisLabel: "Çevrim süresi aralıkları",
    yAxisLabel: "Çevrim sayısı",
  },
  boxPlot: {
    title: "Makine Çevrim Süresi Dağılımı",
    description:
      "Makinelerin medyan, çeyrekler ve normal çevrim süresi aralıklarını karşılaştırın.",
    selectionDescription: (productCode: string, castCode: string) =>
      `Gösterilen sonuçlar: ${productCode} ürünü ve ${castCode} kalıbı.`,
    box: "Kutu: Q1–Q3",
    median: "Orta çizgi: Medyan",
    whiskers: "Bıyıklar: Normal değer aralığı",
    average: "Elmas işareti: Ortalama",
    legendLabel: "Kutu grafiği işaretleri",
    outlierExplanation:
      "Aykırı değerlerin konumları gösterilmez; yalnızca sayı ve oranları sunulur.",
    machine: "Makine",
    cycleCount: "Çevrim Sayısı",
    averageCycleTime: "Ortalama Çevrim Süresi",
    actualMinimum: "Gerçek Minimum",
    actualMaximum: "Gerçek Maksimum",
    lowerWhisker: "Alt Bıyık",
    q1: "Birinci Çeyrek (Q1)",
    medianValue: "Medyan",
    q3: "Üçüncü Çeyrek (Q3)",
    upperWhisker: "Üst Bıyık",
    iqr: "Çeyrekler Arası Aralık (IQR)",
    outlierCount: "Aykırı Değer Sayısı",
    outlierRate: "Aykırı Değer Oranı",
    lowestMedian: "En düşük medyan",
    smallestIqr: "En dar dağılım",
    lowestOutlierRate: "En düşük aykırı değer oranı",
    comparedMachines: "Karşılaştırılan makine",
    selectedMachine: "Seçili makine",
    selectedMachineNoData: "seçilen tarih aralığında veri yok",
    seconds: "saniye",
    xAxisLabel: "Çevrim süresi (sn)",
    loading: "Makine kutu grafiği yükleniyor...",
    loadError: "Makine çevrim süresi dağılımı yüklenemedi.",
    noData: "Seçilen filtreler için kutu grafiği verisi bulunamadı.",
    updating:
      "Yeni filtre sonuçları yükleniyor; önceki karşılaştırma gösteriliyor.",
    invalidMachines: (count: number) =>
      `${count} makine geçersiz istatistik sıralaması nedeniyle gösterilemedi.`,
    accessibilityDescription:
      "Her makine için alt ve üst bıyıkları, birinci ve üçüncü çeyrekleri, medyanı ve ortalamayı saniye cinsinden karşılaştıran yatay kutu grafiği.",
    textualAlternative: "Makine istatistiklerinin metinsel karşılığı",
    unavailable: "Mevcut değil",
  },
  stageBreakdown: {
    title: "Çevrim Aşamaları Dağılımı",
    description:
      "Makinelerin ortalama çevrim süresini oluşturan kayıtlı aşamaları karşılaştırın.",
    selectionDescription: (productCode: string, castCode: string) =>
      `Gösterilen sonuçlar: ${productCode} ürünü ve ${castCode} kalıbı.`,
    machine: "Makine",
    cycleCount: "Çevrim Sayısı",
    average: "Ortalama",
    median: "Medyan",
    averageCycleTime: "Ortalama Toplam Çevrim Süresi",
    medianCycleTime: "Medyan Toplam Çevrim Süresi",
    totalCycleMarker: "Ortalama toplam çevrim süresi",
    averageStageSum: "Ortalama Aşama Toplamı",
    stageDifference: "Aşama Toplamı ile Çevrim Süresi Farkı",
    differenceExplanation:
      "Bu fark, ölçüm yöntemleri veya aşama zamanlarının kapsamından kaynaklanabilir.",
    lowestAverageCycle: "En düşük ortalama çevrim",
    highestCoolingAverage: "En yüksek soğutma süresi",
    largestAbsoluteDifference: "En büyük aşama farkı",
    comparedMachines: "Karşılaştırılan makine",
    selectedMachine: "Seçili makine",
    selectedMachineNoData: "seçilen tarih aralığında veri yok",
    seconds: "saniye",
    xAxisLabel: "Ortalama süre (sn)",
    legendLabel: "Çevrim aşamaları ve toplam çevrim işareti",
    loading: "Çevrim aşaması karşılaştırması yükleniyor...",
    loadError: "Çevrim aşaması verileri yüklenemedi.",
    noData:
      "Seçilen filtreler için çevrim aşaması verisi bulunamadı.",
    invalidData:
      "Çevrim aşaması verileri tutarlı olmadığı için gösterilemiyor.",
    invalidMachines: (count: number) =>
      `${count} makine tutarsız aşama verileri nedeniyle gösterilemedi.`,
    updating:
      "Yeni filtre sonuçları yükleniyor; önceki aşama karşılaştırması gösteriliyor.",
    accessibilityDescription:
      "Her makinenin ortalama çevrim aşamalarını yatay yığılmış sütunlarla ve ortalama toplam çevrim süresini ayrı bir işaretle karşılaştıran grafik.",
    textualAlternative: "Makine aşama istatistiklerinin metinsel karşılığı",
    unavailable: "Mevcut değil",
  },
} as const;
