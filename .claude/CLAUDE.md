# Project: Autonomous Trading Bot (BYMA + CEDEARs)

## Overview
This project implements an automated trading system using Claude Agent SDK.

The system analyzes:
- Technical indicators (RSI, EMA, MACD)
- News sentiment
- Market data

The goal is to generate trading suggestions (BUY, SELL, HOLD),
which are later validated by deterministic logic.

---

## Architecture

- Claude Agent = analysis + reasoning
- Tools = data providers (technical, news, market)
- Code = final decision making, risk management, execution

Claude MUST NOT:
- Execute trades
- Assume data without tools
- Override deterministic rules

---

## Market Scope

- BYMA (Argentina)
- CEDEARs (US stocks traded locally)

Important factors:
- Exchange rate (CCL)
- Low liquidity
- High volatility

---

## Development Rules

- Use TypeScript
- Follow clean architecture
- Prefer interfaces over loose typing
- Avoid hardcoding values
- Keep logic deterministic when possible

---

## Output Expectations

All outputs must be:
- Structured (JSON)
- Deterministic
- Based on tool outputs

---

## Notes

- This is NOT a fully autonomous trading system
- Human or rule-based validation is required before execution