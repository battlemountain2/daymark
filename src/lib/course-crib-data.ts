export interface CourseCrib {
  code: string;
  name: string;
  themeColor: string;
  theses: string[];
  keyConcepts: Array<{ term: string; def: string }>;
  promptQuestions: string[];
}

export const COURSE_CRIBS: Record<string, CourseCrib> = {
  "POLS 2120": {
    code: "POLS 2120",
    name: "International Relations",
    themeColor: "#5B8DEF",
    theses: [
      "International system is defined by structural anarchy (no central sovereign authority), forcing states into self-help security dilemmas.",
      "Carol Cohn's critique: Techno-strategic language ('clean surgical strikes', 'collateral damage') sanitizes human suffering and detaches defense analysts from nuclear reality.",
      "Realism prioritizes zero-sum relative gains and balance of power; Liberalism highlights institutional cooperation and non-zero-sum interdependence."
    ],
    keyConcepts: [
      { term: "Security Dilemma", def: "One state increasing defense inadvertently threatens others, sparking reciprocal arms buildups." },
      { term: "Techno-Strategic Discourse", def: "Specialized sanitized jargon abstracting weapons of mass destruction into technical abstractions." },
      { term: "Offense-Defense Balance", def: "Determines whether conquest is perceived as advantageous or defensive postures predominate." },
      { term: "Democratic Peace Theory", def: "Mature democracies rarely engage in armed interstate warfare against each other." }
    ],
    promptQuestions: [
      "How does structural anarchy compel rational state actors toward offensive realism?",
      "In what ways does defense jargon create gendered hierarchies in foreign policy?",
      "Can international institutions overcome absolute gains defection under the prisoner's dilemma?"
    ]
  },
  "HIST 300": {
    code: "HIST 300",
    name: "Water in History",
    themeColor: "#4E9A8E",
    theses: [
      "Water management dictates political structure: Karl Wittfogel's Hydraulic Hypothesis links large-scale irrigation to centralized despotic statecraft.",
      "The American West is legally shaped by the Prior Appropriation doctrine ('first in time, first in right'), prioritizing extractive mining and agriculture over riparian ecological flows.",
      "New Mexico's acequia systems embody communal water democracy and customary collective survival over purely commodified water rights."
    ],
    keyConcepts: [
      { term: "Acequia & Mayordomo", def: "Centuries-old community ditch irrigation managed by an elected ditch boss distributing scarce runoff democratically." },
      { term: "Prior Appropriation", def: "Western US water law allocating rights based on historical priority date, requiring beneficial use ('use it or lose it')." },
      { term: "Riparian Doctrine", def: "Eastern US water law granting reasonable use rights exclusively to property owners adjacent to waterways." },
      { term: "Reclamation Act of 1902", def: "Federal policy funding monumental dam construction (Hoover, Glen Canyon) transforming the arid West into an irrigated empire." }
    ],
    promptQuestions: [
      "Does Wittfogel's hydraulic hypothesis apply to New Mexican acequias, or do they represent decentralized communal governance?",
      "How did the Prior Appropriation doctrine facilitate resource privatization across the American Southwest?",
      "What are the historical origins of interstate water tension between New Mexico and Texas on the Rio Grande Compact?"
    ]
  },
  "GEOG 1160": {
    code: "GEOG 1160",
    name: "Home Planet: Land, Water, Life",
    themeColor: "#52B788",
    theses: [
      "Earth operates as an interconnected closed system of four spheres: Lithosphere, Hydrosphere, Atmosphere, and Biosphere.",
      "Albuquerque sits in a tectonic rift valley dependent on finite alluvial aquifer storage replenished primarily through the Sandia mountain watershed.",
      "Fluvial geomorphology demonstrates that river velocity, sediment load, and base level continually seek dynamic equilibrium."
    ],
    keyConcepts: [
      { term: "Albuquerque Basin Aquifer", def: "Santa Fe Group aquifer system historically drawn down faster than natural recharge, necessitating San Juan-Chama surface diversions." },
      { term: "Orographic Precipitation", def: "Moisture-laden air ascends mountain barriers (Sandias), cools adiabatically, condenses into precipitation on windward flanks." },
      { term: "Base Level", def: "The lowest elevation to which a stream can erode its bed, typically sea level or a local reservoir." },
      { term: "Hydrologic Cycle", def: "Global closed flux of water driven by solar insolation and gravity through evaporation, transpiration, condensation, runoff." }
    ],
    promptQuestions: [
      "How does adiabatic lapse rate affect microclimates between the Rio Grande valley floor and Sandia Crest?",
      "What mechanisms drive alluvial channel meandering and sediment deposition during flash flood discharge?",
      "How does groundwater mining induce land subsidence in semi-arid sedimentary basins?"
    ]
  },
  "GEOG 1150": {
    code: "GEOG 1150",
    name: "Intro to Environmental Studies",
    themeColor: "#80B918",
    theses: [
      "Humanity is now a primary geological agent of planetary change, defining the proposed Anthropocene epoch.",
      "Aldo Leopold's Land Ethic: A thing is right when it tends to preserve the integrity, stability, and beauty of the biotic community; it is wrong otherwise.",
      "Garrett Hardin's Tragedy of the Commons highlights open-access depletion, solvable through either private property rights or Elinor Ostrom's polycentric communal governance."
    ],
    keyConcepts: [
      { term: "Land Ethic", def: "Enlarging the boundaries of community to include soils, waters, plants, and animals, transforming humans from conquerors to plain members." },
      { term: "Elinor Ostrom's Commons", def: "Nobel-winning proof that local communities can sustainably govern shared resources without state coercion or complete privatization." },
      { term: "Tipping Points", def: "Critical thresholds where tiny environmental disturbances trigger irreversible systemic phase shifts (e.g. Amazon dieback, permafrost thaw)." },
      { term: "Urban Heat Island (UHI)", def: "Urbanized corridors retaining thermal mass via asphalt and concrete while lacking evaporative vegetation cooling." }
    ],
    promptQuestions: [
      "How does Ostrom's empirical evidence refute Hardin's assumption that shared resources inevitably face tragedy?",
      "In what ways does Leopold's 'thinking like a mountain' reframe deer population management and predator eradication?",
      "What spatial interventions effectively mitigate the Urban Heat Island effect in Albuquerque's South Valley?"
    ]
  },
  "PHED 2996": {
    code: "PHED 2996",
    name: "Introduction to Fitness",
    themeColor: "#E07A5F",
    theses: [
      "Hypertrophic adaptation is stimulated through mechanical tension, progressive overload, and sufficient proximity to failure (1–3 Reps in Reserve).",
      "Systemic fatigue accumulates from central nervous system load, necessitating scheduled deload phases and 48–72 hours of muscle group recovery.",
      "Energy balance dictates tissue partition: a conservative 200–300 kcal surplus with 0.8–1.0g protein/lb bodyweight maximizes muscle protein synthesis while minimizing adiposity."
    ],
    keyConcepts: [
      { term: "RPE / RIR", def: "Rate of Perceived Exertion (1–10 scale) and Reps in Reserve measuring proximity to muscular failure." },
      { term: "Progressive Overload", def: "Systematically increasing load, volume, movement control, or density over successive microcycles." },
      { term: "Mechanical Tension", def: "The fundamental driver of hypertrophy created by muscle fibers producing force against external resistance through full range." },
      { term: "Active Recovery", def: "Low-intensity non-fatiguing movement (walking, mobility) promoting lymph circulation, blood flow, and metabolic clearance." }
    ],
    promptQuestions: [
      "Why is training at 1–2 RIR superior to absolute technical failure for multi-joint compound movements?",
      "How does eccentric tempo influence mechanical tension and micro-trauma in hypertrophy protocols?",
      "What is the optimal protein distribution frequency across waking hours to maximize MPS peaks?"
    ]
  }
};
