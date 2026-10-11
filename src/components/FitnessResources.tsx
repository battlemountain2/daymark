"use client";
import {NUTRITION_GUIDE, MEAL_IDEAS, GYM_TIPS} from "@/lib/fitness-data";
export default function FitnessResources({tab}:{tab:"nutrition"|"tips"}) {
return <>
      {/* TAB 2: NUTRITION & LEAN BULK */}
      {tab === "nutrition" && (
        <section className="card span12 fitness-card">
          <div className="card-head">
            <h2>Lean Bulk Nutrition Guide</h2>
            <span className="pill mono">Food is your second workout</span>
          </div>
          <div className="card-body">
            <div className="fit-nutrition-grid">
              {NUTRITION_GUIDE.map((n, i) => (
                <div key={i} className="fit-nutrition-card">
                  <div className="fnc-head">
                    <span className="fnc-icon">{n.icon}</span>
                    <span className="fnc-title">{n.title}</span>
                  </div>
                  <ul className="fnc-list">
                    {n.items.map((it, j) => (
                      <li key={j}>
                        <span className="fnc-dot">▸</span>
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Quick Meal Ideas */}
            <div className="fit-meals-card">
              <div className="fmc-head mono">
                <span>🍳 Quick Lean-Bulk Meal Formulas</span>
              </div>
              <div className="fmc-grid">
                {MEAL_IDEAS.map((m, i) => (
                  <div key={i} className="fmc-item">
                    <span className="fmc-k mono">{m.meal.toUpperCase()}</span>
                    <span className="fmc-v">{m.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Supplement Note */}
            <div className="fit-supp-note mono">
              <span className="fsn-badge">💊 Supplement Reality Check:</span>
              <p>
                <b>Creatine monohydrate (5g/day, every day)</b> is the gold standard for muscle hydration and ATP power output. <b>Whey protein isolate</b> is simply convenient food in powder form to hit your 0.8–1g/lb target. Everything else is secondary to sleep and consistent surplus.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* TAB 3: GYM ANXIETY & TIPS */}
      {tab === "tips" && (
        <section className="card span12 fitness-card">
          <div className="card-head">
            <h2>Navigating the Gym with Social Anxiety</h2>
            <span className="pill mono">UNM Johnson Center &amp; Campus Guide</span>
          </div>
          <div className="card-body">
            <div className="fit-tips-grid">
              {GYM_TIPS.map((sec, i) => (
                <div key={i} className="fit-tip-card">
                  <div className="ftc-head">
                    <span className="ftc-icon">{sec.icon}</span>
                    <span className="ftc-title">{sec.title}</span>
                  </div>
                  <ul className="ftc-list">
                    {sec.tips.map((t, j) => (
                      <li key={j}>
                        <span className="ftc-bullet">▸</span>
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

</>;
}
