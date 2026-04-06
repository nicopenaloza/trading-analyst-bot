// Static mock snapshots — one per ticker, realistic BYMA/CEDEAR price ranges

import { Market } from "../core/types.js";
import type { MarketData } from "../core/types.js";

type MockRow = Omit<MarketData, "symbol" | "timestamp">;

export const MOCK_MARKET_DATA: Record<string, MockRow> = {
  GGAL: {
    open:   1_020.00,
    high:   1_058.50,
    low:      998.00,
    close:  1_045.00,
    volume: 3_200_000,
  },
  YPF: {
    open:   26_500.00,
    high:   27_100.00,
    low:    26_200.00,
    close:  26_800.00,
    volume: 1_450_000,
  },
  AAPL: {
    open:   185.30,
    high:   187.10,
    low:    184.50,
    close:  186.40,
    volume:   520_000,
    cclRate: 1_280.00,
  },
  MSFT: {
    open:   415.20,
    high:   420.00,
    low:    413.80,
    close:  418.75,
    volume:   310_000,
    cclRate: 1_280.00,
  },
};

export const DEFAULT_MOCK_ROW: MockRow = {
  open:   100.00,
  high:   105.00,
  low:     98.00,
  close:  102.00,
  volume: 100_000,
};
