type Kind = "rain" | "snow" | "storm" | "none";

function readWeather(text: string): { kind: Kind; cloud: number } {
  const t = text.toLowerCase();
  const kind: Kind = /thunder|t-storm|tstm/.test(t) ? "storm"
    : /snow|flurr|sleet|wintry/.test(t) ? "snow"
    : /rain|shower|drizzle/.test(t) ? "rain" : "none";
  const cloud = /overcast/.test(t) ? 1 : /mostly cloudy/.test(t) ? .8
    : /partly (cloudy|sunny)|scattered/.test(t) ? .45
    : /few clouds|mostly (clear|sunny)/.test(t) ? .2
    : /clear|sunny|fair/.test(t) ? .05 : .35;
  return { kind, cloud };
}

export function skyConditions(condition?: string | null, forecast?: string | null, chance?: number | null) {
  const live = readWeather(condition ?? ""), ahead = readWeather(forecast ?? "");
  const kind = condition ? live.kind : (chance ?? 0) >= 40 ? ahead.kind : "none";
  const cloud = condition ? live.cloud : ahead.cloud;
  return { kind, cover: kind !== "none" ? Math.max(cloud, kind === "storm" ? .95 : .85) : cloud };
}
