// PortfolioManager — validates trades against concentration and exposure rules.
// Deterministic, no LLM, no I/O.

import { Signal, ValidationStatus } from "../core/types.js";
import type { IPortfolioManager } from "../core/interfaces.js";
import type { Position, RiskProfile, TradeValidation } from "../core/types.js";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum capital fraction per asset (25%). */
const MAX_ASSET_ALLOCATION = 0.25;

/** Maximum total portfolio exposure across all positions (80%). */
const MAX_TOTAL_EXPOSURE   = 0.80;

// ─── Validation rules ─────────────────────────────────────────────────────────
// Each rule receives the profile and current state, returns a rejection string
// or null if the rule passes.

type Rule = (
  profile: RiskProfile,
  currentAllocation: number,
  totalExposure: number,
) => string | null;

const RULES: Rule[] = [
  // 1. Skip zero-size positions (HOLD / below confidence threshold)
  (profile) =>
    profile.positionSize === 0
      ? `Signal is ${profile.signal} — no position opened`
      : null,

  // 2. Already at or above the per-asset cap
  (_profile, currentAllocation) =>
    currentAllocation >= MAX_ASSET_ALLOCATION
      ? `Asset already at max allocation (${pct(currentAllocation)} / ${pct(MAX_ASSET_ALLOCATION)})`
      : null,

  // 3. Portfolio fully deployed
  (_profile, _current, totalExposure) =>
    totalExposure >= MAX_TOTAL_EXPOSURE
      ? `Portfolio at max exposure (${pct(totalExposure)} / ${pct(MAX_TOTAL_EXPOSURE)})`
      : null,
];

// ─── PortfolioManager ─────────────────────────────────────────────────────────

export class PortfolioManager implements IPortfolioManager {
  /** ticker → Position */
  private readonly positions = new Map<string, Position>();

  // ── Public interface ────────────────────────────────────────────────────────

  validate(riskProfile: RiskProfile): TradeValidation {
    const ticker           = riskProfile.symbol.ticker;
    const currentAlloc     = this.getExposure(ticker);
    const totalExposure    = this.getTotalExposure();

    // Run hard rejection rules first
    for (const rule of RULES) {
      const rejection = rule(riskProfile, currentAlloc, totalExposure);
      if (rejection !== null) {
        return rejected(riskProfile, rejection);
      }
    }

    // Check if the requested size fits within the per-asset cap
    const available        = MAX_ASSET_ALLOCATION - currentAlloc;
    const requestedSize    = riskProfile.positionSize;

    if (requestedSize <= available) {
      return approved(riskProfile, requestedSize);
    }

    // Position exceeds cap — reduce it to the remaining room
    return reduced(
      riskProfile,
      available,
      `Position reduced from ${pct(requestedSize)} to ${pct(available)} to stay within ${pct(MAX_ASSET_ALLOCATION)} cap`,
    );
  }

  /** Register an approved position so future validations reflect it. */
  open(profile: RiskProfile, finalSize: number): void {
    const ticker = profile.symbol.ticker;
    const existing = this.positions.get(ticker);

    this.positions.set(ticker, {
      symbol:     profile.symbol,
      allocation: (existing?.allocation ?? 0) + finalSize,
      entryPrice: profile.entryPrice,
      openedAt:   new Date(),
    });
  }

  /** Remove a position (stop-loss or take-profit triggered). */
  close(ticker: string): void {
    this.positions.delete(ticker);
  }

  getPositions(): Position[] {
    return [...this.positions.values()];
  }

  getExposure(ticker: string): number {
    return this.positions.get(ticker)?.allocation ?? 0;
  }

  getTotalExposure(): number {
    let total = 0;
    for (const position of this.positions.values()) {
      total += position.allocation;
    }
    return total;
  }
}

// ─── Result builders ──────────────────────────────────────────────────────────

function approved(profile: RiskProfile, size: number): TradeValidation {
  return {
    status:               ValidationStatus.APPROVED,
    riskProfile:          profile,
    adjustedPositionSize: size,
    reason:               `Approved — position size ${pct(size)}`,
  };
}

function reduced(profile: RiskProfile, size: number, reason: string): TradeValidation {
  return {
    status:               ValidationStatus.REDUCED,
    riskProfile:          profile,
    adjustedPositionSize: size,
    reason,
  };
}

function rejected(profile: RiskProfile, reason: string): TradeValidation {
  return {
    status:               ValidationStatus.REJECTED,
    riskProfile:          profile,
    adjustedPositionSize: 0,
    reason,
  };
}

function pct(value: number): string {
  return (value * 100).toFixed(1) + "%";
}
