import { test } from "node:test";
import assert from "node:assert/strict";
import { dailyForecast, parseWindMph, forecastTime } from "../src/lib/weather-display";
import type { Forecast } from "../src/lib/weather";

const day = (name: string, isDaytime: boolean, tempF: number): Forecast["days"][number] => ({ name, isDaytime, tempF, shortForecast: "Clear", detailed: "Clear", precipChance: 0 });
test("wind ranges use their upper speed, preserving calm and unknown", () => {
  assert.equal(parseWindMph("5 to 10 mph"), 10);
  assert.equal(parseWindMph("0 mph"), 0);
  assert.equal(parseWindMph("Calm"), 0);
  assert.equal(parseWindMph(undefined), null);
});
test("daily forecast pairs highs and lows without dropping tonight", () => {
  const result = dailyForecast([day("Tonight",false,50),day("Monday",true,75),day("Monday Night",false,48),day("Tuesday",true,70)]);
  assert.deepEqual(result.map(d => [d.name,d.high,d.low]), [["Tonight",null,50],["Monday",75,48],["Tuesday",70,null]]);
  assert.deepEqual(dailyForecast([]), []);
});
test("hour labels distinguish dates across midnight in Mountain Time", () => {
  assert.match(forecastTime("2026-09-28T05:00:00Z"), /Sun.*11:00 PM/);
  assert.match(forecastTime("2026-09-28T06:00:00Z"), /Mon.*12:00 AM/);
});
