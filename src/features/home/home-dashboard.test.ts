import assert from "node:assert/strict";
import test from "node:test";
import { aggregateXpHistory } from "./home-dashboard-utils.ts";

test("aggregateXpHistory conserve sept jours et additionne les transactions d'une journée", () => {
  const result = aggregateXpHistory(
    [
      { amount: 10, created_at: "2026-07-27T08:00:00+02:00" },
      { amount: 15, created_at: "2026-07-27T18:00:00+02:00" },
      { amount: 7, created_at: "2026-07-28T09:00:00+02:00" },
    ],
    7,
    new Date("2026-07-28T12:00:00+02:00"),
  );

  assert.equal(result.length, 7);
  assert.deepEqual(result.at(-2), { date: "2026-07-27", xp: 25 });
  assert.deepEqual(result.at(-1), { date: "2026-07-28", xp: 7 });
});

test("aggregateXpHistory ignore les transactions hors de la fenêtre", () => {
  const result = aggregateXpHistory(
    [{ amount: 100, created_at: "2026-06-01T12:00:00+02:00" }],
    3,
    new Date("2026-07-28T12:00:00+02:00"),
  );

  assert.deepEqual(
    result.map((day) => day.xp),
    [0, 0, 0],
  );
});
