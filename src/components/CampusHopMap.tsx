"use client";

type Props = {
  from: string;
  to: string;
  gapMinutes: number;
  leaveAtMinutes: number;
  nextClassCode: string;
  nextClassWhere: string;
};

const fmtTime = (m: number) => {
  const h = Math.floor(m / 60), mm = m % 60;
  return `${h % 12 || 12}:${String(mm).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
};

export default function CampusHopMap({
  from,
  to,
  gapMinutes,
  leaveAtMinutes,
  nextClassCode,
  nextClassWhere,
}: Props) {
  return (
    <div className="campus-hop-card">
      <div className="ch-header mono">
        <span className="ch-tag">⚡ TIGHT CAMPUS HOP</span>
        <span className="ch-leave">Head out by <b>{fmtTime(leaveAtMinutes)}</b></span>
      </div>

      <div className="ch-details">
        <div className="ch-route mono">
          <span className="ch-loc from">{from}</span>
          <span className="ch-arrow">━━━━ 4 min walk (350 yds) ━━━▶</span>
          <span className="ch-loc to">{to}</span>
        </div>
        <div className="ch-sub sub">
          {gapMinutes} minutes total between classes. Destination: <b>{nextClassCode}</b> at {nextClassWhere}.
        </div>
      </div>

      {/* Stylized Vector Path SVG */}
      <div className="ch-map-svg-wrap">
        <svg viewBox="0 0 400 70" className="ch-svg" aria-hidden="true">
          {/* Background grid line */}
          <line x1="30" y1="35" x2="370" y2="35" stroke="var(--line-strong)" strokeWidth="2" strokeDasharray="4 4" />
          
          {/* Start node: Bandelier */}
          <circle cx="30" cy="35" r="10" fill="var(--surface)" stroke="var(--ink-2)" strokeWidth="3" />
          <text x="30" y="58" textAnchor="middle" fill="var(--ink-3)" fontSize="9" fontFamily="monospace">BANDELIER</text>
          
          {/* Animated walker indicator */}
          <circle cx="200" cy="35" r="6" fill="var(--heat)" className="pulse-walker" />
          <text x="200" y="22" textAnchor="middle" fill="var(--heat)" fontSize="9" fontFamily="monospace" fontWeight="bold">UNM MALL</text>
          
          {/* Destination node: Mitchell */}
          <circle cx="370" cy="35" r="10" fill="var(--accent)" stroke="var(--ink)" strokeWidth="3" />
          <text x="370" y="58" textAnchor="middle" fill="var(--ink)" fontSize="9" fontFamily="monospace" fontWeight="bold">MITCHELL</text>
        </svg>
      </div>
    </div>
  );
}
