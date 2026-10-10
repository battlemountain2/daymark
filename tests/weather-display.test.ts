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

import { weatherSnapshot, windBearing } from "../src/lib/weather-display";
import { skyConditions } from "../src/lib/sky-conditions";
import { rainWindow } from "../src/components/HourStrip";

const now = Date.parse("2026-10-10T18:30:00Z");
const observation: Forecast["current"] = { tempF: 72, sky: "Clear", humidity: 25, windMph: 8, windDir: "SW", observedAt: "2026-10-10T18:00:00Z" };
const hour = (time: string, precipChance: number | null = 0): Forecast["hours"][number] => ({ time, precipChance, tempF: 68, humidity: 40, windMph: 10, windDir: "N", shortForecast: "Mostly Cloudy", isDaytime: true });

test("recent station data wins while expired forecast hours are removed", () => {
  const value = weatherSnapshot({ current: observation, hours: [hour("2026-10-10T16:00:00Z", 90), hour("2026-10-10T18:00:00Z"), hour("2026-10-10T19:00:00Z")] }, now);
  assert.equal(value.source, "observation");
  assert.equal(value.temperature, 72);
  assert.equal(value.sky, "Clear");
  assert.equal(value.hours.length, 2);
  assert.equal(rainWindow(value.hours), null);
});

test("stale and undated observations give way to a labeled hourly forecast", () => {
  for (const observedAt of ["2026-10-10T14:00:00Z", null, "invalid"]) {
    const value = weatherSnapshot({ current: { ...observation, observedAt }, hours: [hour("2026-10-10T18:00:00Z", null)] }, now);
    assert.equal(value.source, "forecast");
    assert.equal(value.temperature, 68);
    assert.equal(value.humidity, 40);
    assert.equal(value.observationStale, true);
    assert.equal(value.currentHour?.precipChance, null);
  }
});

test("missing observations can use a daily forecast without inventing wind or humidity", () => {
  const value = weatherSnapshot({ days: [day("Tonight", false, 50)] }, now);
  assert.equal(value.source, "forecast");
  assert.equal(value.temperature, 50);
  assert.equal(value.wind, null);
  assert.equal(value.humidity, null);
  assert.equal(weatherSnapshot({}, now).source, "unavailable");
  assert.equal(weatherSnapshot({}, now).temperature, null);
});

test("a clear observation prevents forecast rain from falling on the current sky", () => {
  assert.equal(skyConditions("Clear", "Thunderstorms", 80).kind, "none");
  assert.equal(skyConditions("Light Rain", "Clear", 0).kind, "rain");
  assert.equal(skyConditions(null, "Thunderstorms", 80).kind, "storm");
  assert.equal(skyConditions(null, "Slight Chance Rain", 20).kind, "none");
});

test("wind bearings preserve all sixteen compass directions and leave unknown directions unset", () => {
  assert.equal(windBearing("N"), 0);
  assert.equal(windBearing("SW"), 225);
  assert.equal(windBearing("nnw"), 337.5);
  assert.equal(windBearing("Variable"), null);
  assert.equal(windBearing(null), null);
});

test("precipitation timing describes snow and thunderstorms without calling them rain", () => {
  assert.match(rainWindow([{ ...hour("2026-10-10T18:00:00Z", 70), shortForecast: "Snow Showers" }]) ?? "", /^Snow likely/);
  assert.match(rainWindow([{ ...hour("2026-10-10T18:00:00Z", 40), shortForecast: "Thunderstorms" }]) ?? "", /^Thunderstorms possible/);
  assert.equal(rainWindow([hour("2026-10-10T18:00:00Z", null)]), null);
});
