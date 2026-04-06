// Static mock news — realistic headlines per ticker for BYMA / CEDEARs

import type { NewsItem } from "../core/types.js";

type MockNews = Omit<NewsItem, "publishedAt">;

const daysAgo = (n: number): Date => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

const BASE: Record<string, MockNews[]> = {
  GGAL: [
    {
      headline: "Grupo Galicia reportó utilidades récord en el último trimestre",
      summary:
        "El banco registró una suba del 34% en su resultado neto, impulsado por mayor volumen de créditos y comisiones.",
      source: "El Cronista",
    },
    {
      headline: "GGAL supera expectativas del mercado en resultados trimestrales",
      summary:
        "Analistas destacaron la solidez del margen financiero y la baja en la morosidad.",
      source: "Ámbito Financiero",
    },
    {
      headline: "Sector bancario argentino enfrenta presión regulatoria",
      summary:
        "El BCRA anunció nuevas restricciones que podrían afectar la rentabilidad de los bancos en el corto plazo.",
      source: "Infobae",
    },
  ],
  YPF: [
    {
      headline: "YPF acelera inversiones en Vaca Muerta con nuevo socio extranjero",
      summary:
        "La compañía firmó un acuerdo por USD 800M para el desarrollo de bloques de shale oil en Neuquén.",
      source: "El Cronista",
    },
    {
      headline: "Producción de petróleo de YPF cae por conflictos gremiales",
      summary:
        "Paros en yacimientos patagónicos redujeron la producción diaria en un 12% durante la última semana.",
      source: "La Nación",
    },
    {
      headline: "YPF evalúa emisión de deuda en mercados internacionales",
      summary:
        "La petrolera busca financiamiento para su plan de expansión, con una posible colocación de ON a 5 años.",
      source: "Ámbito Financiero",
    },
  ],
  AAPL: [
    {
      headline: "Apple reports record iPhone sales ahead of analyst estimates",
      summary:
        "Q2 revenue came in at $97.3B, driven by strong demand in emerging markets and services growth.",
      source: "Bloomberg",
    },
    {
      headline: "Apple faces EU antitrust scrutiny over App Store fees",
      summary:
        "Regulators opened a formal investigation into App Store commission practices under the Digital Markets Act.",
      source: "Reuters",
    },
  ],
  MSFT: [
    {
      headline: "Microsoft Azure revenue surges 28% on AI workload demand",
      summary:
        "Cloud division beat expectations as enterprise customers accelerated AI adoption across productivity tools.",
      source: "Bloomberg",
    },
    {
      headline: "Microsoft expands Copilot to 30 new markets",
      summary:
        "The company announced general availability of its AI assistant in Latin America, including Argentina.",
      source: "TechCrunch",
    },
  ],
};

const FALLBACK: MockNews[] = [
  {
    headline: "Mercados argentinos operan con cautela ante incertidumbre macro",
    summary:
      "Los principales índices cerraron mixtos, con inversores atentos a las negociaciones con el FMI.",
    source: "Ámbito Financiero",
  },
];

export function getMockNews(ticker: string): NewsItem[] {
  const rows = BASE[ticker] ?? FALLBACK;
  return rows.map((item, i) => ({ ...item, publishedAt: daysAgo(i) }));
}
