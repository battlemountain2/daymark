import { type ColourKey } from "@/lib/term";

export type PreClassBrief = {
  code: string;
  title: string;
  where: string;
  ck: ColourKey;
  reading: string;
  thesis: string;
  authorDebate: string;
  questions: Array<{ q: string; cite: string }>;
  keyTakeaways: string[];
};

export const PRE_CLASS_BRIEFS: Record<string, PreClassBrief> = {
  "POLS 2120": {
    code: "POLS 2120",
    title: "International Relations",
    where: "Mitchell Hall 101",
    ck: "pol",
    reading: "Carol Cohn, 'Sex and Death in the Rational World of Defense Intellectuals' (Signs 1987)",
    thesis: "Technostrategic language sanitizes nuclear annihilation through clinical euphemism, mathematical modeling, and gendered imagery, creating a detached planner viewpoint that systematically ignores victim reality.",
    authorDebate: "Rationalist/Realist deterrence theory (Waltz) models states as unitary rational actors calculating survivability, whereas Cohn's feminist critique shows how defense discourse is shaped by emotional suppression, domestic metaphors ('clean bomb', 'patting the missile'), and gendered power.",
    questions: [
      {
        q: "Why does Cohn argue that 'clean bombs' (weapons with low radioactive fallout) are the ultimate euphemism of technostrategic rationality?",
        cite: "Cohn 1987, p. 698",
      },
      {
        q: "What constitutes Cohn's 'insider-outsider dilemma', and is it possible to challenge militarized policy without adopting its foundational vocabulary?",
        cite: "Cohn 1987, p. 714",
      },
    ],
    keyTakeaways: [
      "Language does not just describe weapons; it actively shapes what questions are considered professional.",
      "Abstraction reduces terror by placing the speaker in the active role of planner rather than target.",
      "Reference points in defense discourse calculate weapon survival rather than human survival.",
    ],
  },
  "HIST 300": {
    code: "HIST 300",
    title: "Water in History",
    where: "Ortega Hall 115",
    ck: "his",
    reading: "Paul S. Sutter, 'The World with Us' (2013) & Donald Worster, 'History as Natural History' (1984)",
    thesis: "American environmental history has moved past romantic declensionist wilderness narratives toward analyzing hybrid socio-ecological landscapes, labor, and the American West as a centralized hydraulic empire.",
    authorDebate: "Donald Worster argues water scarcity inevitably concentrated state power and capital into a hierarchical 'hydraulic society' commanded by federal dams, while Sutter complicates this by emphasizing continuous, reciprocal co-production where 'first nature' is re-engineered into commodified 'second nature'.",
    questions: [
      {
        q: "How did New Deal Bureau of Reclamation mega-dams (Hoover, Grand Coulee) institutionalize federal subsidies for corporate agribusiness while engineering long-term ecological crises?",
        cite: "Worster 1984, p. 12",
      },
      {
        q: "Why does Sutter argue that environmental historians must abandon pristine wilderness baselines to focus on hybrid industrial, urban, and agricultural environments?",
        cite: "Sutter 2013, p. 102",
      },
    ],
    keyTakeaways: [
      "Aridity in the American West turned water management into the central lever of political power.",
      "The transition from pristine nature to infrastructure creates hybrid working landscapes.",
      "Hydraulic infrastructure locks in institutional dependencies that outlive original policy goals.",
    ],
  },
  "GEOG 1160": {
    code: "GEOG 1160",
    title: "Home Planet: Land, Water, Life",
    where: "Bandelier Hall East 105",
    ck: "geo",
    reading: "Chapter 1: Earth Systems, Planetary Energy Budget & Seasonality",
    thesis: "Earth functions as an open thermodynamic system for energy (~1361 W/m² solar constant minus 30% planetary albedo) but an essentially closed system for matter, balanced through dynamic interactions across its 4 spheres.",
    authorDebate: "Climate stability is maintained through equilibrium feedbacks: positive feedbacks (e.g. ice-albedo reduction) accelerate deviation from balance, while negative feedbacks (e.g. cloud-temperature damping) restore steady-state stability.",
    questions: [
      {
        q: "How do axial tilt (23.5° obliquity), parallelism, and revolution combine to migrate the subsolar point between the Tropics of Cancer and Capricorn across equinoxes and solstices?",
        cite: "Lecture Slides Set 1, Slide 33",
      },
      {
        q: "Why is the distinction between an open system (exchanging matter & energy) and a closed system (energy only) fundamental to global biogeochemical cycles?",
        cite: "Lecture Slides Set 1, Slide 14",
      },
    ],
    keyTakeaways: [
      "Four interconnected spheres: Lithosphere, Atmosphere, Hydrosphere, and Biosphere.",
      "Planetary energy balance: Net radiation equals incoming shortwave minus reflected shortwave and outgoing longwave.",
      "Solar altitude directly controls beam spreading and atmospheric attenuation.",
    ],
  },
  "GEOG 1150": {
    code: "GEOG 1150",
    title: "Intro to Environmental Studies",
    where: "Mitchell Hall 120",
    ck: "geo",
    reading: "Unit 1: Conservation vs Preservation & William Cronon, 'The Trouble with Wilderness' (1995)",
    thesis: "The historic conflict between utilitarian Conservation (Pinchot) and romantic Preservation (Muir) codified modern environmental policy, but both historically reinforced a dualistic 'Wilderness Myth' that disconnected humans from everyday urban ecology.",
    authorDebate: "Gifford Pinchot advocated sustainable extraction for the 'greatest good for the greatest number', while John Muir fought for sacred protection. Cronon critiques both by revealing that the cultural ideal of untouched wilderness historically erased Indigenous stewardship.",
    questions: [
      {
        q: "How did the 1913 Hetch Hetchy Valley controversy in Yosemite catalyze the national split between conservationists and preservationists, leading to the 1916 National Park Service Organic Act?",
        cite: "Unit 1b Reading Notes",
      },
      {
        q: "How does Cronon argue that idolizing remote wilderness paradoxically gives people permission to neglect the environmental health of the cities and suburbs where they actually live?",
        cite: "Cronon 1995, p. 81",
      },
    ],
    keyTakeaways: [
      "Conservation = Utilitarian resource management; Preservation = Non-consumptive protection.",
      "Wilderness is a cultural invention, not a timeless pristine state.",
      "Ecosystem services are classified as Provisioning, Regulating, Supporting, and Cultural.",
    ],
  },
  "GEOG 1115L": {
    code: "GEOG 1115L",
    title: "Maps & GIScience Laboratory",
    where: "Bandelier Hall East 106",
    ck: "geo",
    reading: "GIScience Lab Manual: Coordinate Systems, Datums & Projections",
    thesis: "Transforming 3D ellipsoidal datums (GCS) to 2D planar coordinates (PCS) mathematically compromises either area, shape, or distance, dictating which spatial data model (Vector vs Raster) is appropriate for analysis.",
    authorDebate: "Choosing between conformal projections (preserving angles/shapes like Mercator/State Plane) vs equivalent equal-area projections (preserving proportional areas like Albers Equal Area) depends on whether the spatial question is navigational or quantitative.",
    questions: [
      {
        q: "Why can no flat 2D map preserve conformality (shape) and equivalence (area) simultaneously?",
        cite: "GIScience Manual, Lab 01",
      },
      {
        q: "What are the analytical trade-offs of storing elevation data as a continuous raster DEM versus discrete vector contour polylines?",
        cite: "GIScience Manual, Lab 01",
      },
    ],
    keyTakeaways: [
      "GCS uses angular degrees on an ellipsoid; PCS uses planar linear units (e.g. UTM meters).",
      "Vector excels for discrete boundaries (points, lines, polygons); Raster excels for continuous fields.",
      "Datum shifts (e.g. NAD27 to WGS84) create significant spatial offset if unprojected.",
    ],
  },
  "GEOG 1160L": {
    code: "GEOG 1160L",
    title: "Home Planet Laboratory",
    where: "Bandelier Hall East 106",
    ck: "geo",
    reading: "Lab 01: Insolation, Solar Zenith Angles & Atmospheric Attenuation",
    thesis: "Solar zenith angle calculations determine the intensity of solar radiation received per unit surface area, driving microclimate variations across latitude and terrain aspect.",
    authorDebate: "Empirical insolation measurements vs idealized solar constant models: accounting for cloud optical thickness, aerosol scattering, and surface albedo variations in Albuquerque.",
    questions: [
      {
        q: "How does solar elevation angle at local solar noon change between equinox and solstice at Albuquerque's latitude (35.1° N)?",
        cite: "Lab 01 Guide",
      },
    ],
    keyTakeaways: [
      "Solar altitude = 90° − Zenith Angle.",
      "Beam spreading reduces energy density proportional to the sine of the sun's elevation angle.",
    ],
  },
  "PHED 2996": {
    code: "PHED 2996",
    title: "Intro to Fitness",
    where: "Online",
    ck: "fit",
    reading: "Module 01: Health-Related Fitness Components & Exercise Prescription",
    thesis: "Physiological adaptation follows the principle of progressive overload structured through the FITT-VP framework and individualized heart rate reserve calculations.",
    authorDebate: "High-intensity interval training (HIIT) vs steady-state cardiorespiratory endurance for metabolic adaptation and mitochondrial biogenesis.",
    questions: [
      {
        q: "How does the Karvonen formula use resting heart rate to establish precise target intensity training zones?",
        cite: "Mod 01 Fitness Manual",
      },
    ],
    keyTakeaways: [
      "Five health components: Cardiorespiratory, Strength, Muscular Endurance, Flexibility, Body Composition.",
      "FITT-VP: Frequency, Intensity, Time, Type, Volume, Progression.",
    ],
  },
};

export function getPreClassBrief(courseCode: string): PreClassBrief | null {
  const norm = courseCode.replace(/\s+/g, "").toUpperCase();
  for (const [key, brief] of Object.entries(PRE_CLASS_BRIEFS)) {
    if (key.replace(/\s+/g, "").toUpperCase() === norm) {
      return brief;
    }
  }
  return null;
}
