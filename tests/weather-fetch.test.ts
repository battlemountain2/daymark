import { test } from "node:test";
import assert from "node:assert/strict";
import { getForecast } from "../src/lib/weather";

test("NWS missing precipitation values stay unknown while a real zero stays zero", async () => {
  const originalFetch = globalThis.fetch;
  const period = { name: "Today", startTime: "2026-10-10T18:00:00Z", temperature: 72, windSpeed: "5 to 10 mph", windDirection: "SW", shortForecast: "Clear", detailedForecast: "Clear", isDaytime: true };
  globalThis.fetch = async input => {
    const url = String(input);
    const json = url.includes("/points/") ? { properties: { forecast: "https://fixture/daily", forecastHourly: "https://fixture/hourly", observationStations: "https://fixture/stations" } }
      : url.endsWith("/stations") ? { features: [] }
      : { properties: { updated: "2026-10-10T18:00:00Z", periods: [{ ...period, probabilityOfPrecipitation: { value: null } }, { ...period, probabilityOfPrecipitation: { value: 0 } }] } };
    return new Response(JSON.stringify(json), { headers: { "Content-Type": "application/json" } });
  };
  try {
    const forecast = await getForecast("35", "-106");
    assert.equal(forecast.hours[0].precipChance, null);
    assert.equal(forecast.hours[1].precipChance, 0);
    assert.equal(forecast.days[0].precipChance, null);
    assert.equal(forecast.hours[0].windMph, 10);
    assert.equal(forecast.current.tempF, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
