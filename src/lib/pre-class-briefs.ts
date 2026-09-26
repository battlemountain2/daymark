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
  "HIST 300": {
    code: "HIST 300",
    title: "Water in History",
    where: "Ortega Hall 115",
    ck: "his",
    reading: "David Arnold, Water in World History, Chapter 1; Michael Harrower, 'Water Histories and Spatial Archaeology'",
    thesis: "Water history links material conditions to belief, settlement, labor, and authority. Spatial evidence can reveal how water systems organized social relations even when written records are limited.",
    authorDebate: "Arnold offers a broad historical account of water's cultural and political importance, while Harrower emphasizes archaeological space and infrastructure as evidence for reconstructing water histories.",
    questions: [
      {
        q: "How can water operate simultaneously as a physical resource, a sacred symbol, and a source of political authority?",
        cite: "Arnold, Chapter 1",
      },
      {
        q: "What can the spatial arrangement of canals, settlements, and fields reveal that a written political narrative may miss?",
        cite: "Harrower, assigned reading",
      },
    ],
    keyTakeaways: [
      "Treat water as both material and symbolic evidence.",
      "Infrastructure records labor, coordination, and unequal access.",
      "Connect spatial patterns to institutions without assuming that environment alone determines politics.",
    ],
  },
  "GEOG 1160": {
    code: "GEOG 1160",
    title: "Home Planet: Land, Water, Life",
    where: "Bandelier Hall East 105",
    ck: "geo",
    reading: "Chapter 2; Mastering Geography 2; Activity 2: Air Quality",
    thesis: "Earth–Sun geometry controls the seasonal distribution of solar energy, while atmospheric composition and circulation help determine how that energy and air pollutants vary across place and time.",
    authorDebate: "Idealized solar-geometry explanations establish the physical baseline; air-quality observations add atmospheric chemistry, weather, topography, and human emissions to explain local conditions.",
    questions: [
      {
        q: "How do axial tilt, parallelism, and revolution change solar altitude and day length through the year?",
        cite: "Chapter 2 and Week 3 prep package",
      },
      {
        q: "Why can two places with similar incoming sunlight experience different air-quality conditions?",
        cite: "Activity 2: Air Quality",
      },
    ],
    keyTakeaways: [
      "Axial tilt changes solar angle and day length, not Earth–Sun distance, as the main cause of seasons.",
      "Lower solar angles spread the same beam over a larger surface area.",
      "Air quality reflects emissions plus transport, mixing, topography, and atmospheric stability.",
    ],
  },
  "GEOG 1150": {
    code: "GEOG 1150",
    title: "Intro to Environmental Studies",
    where: "Mitchell Hall 120",
    ck: "geo",
    reading: "Unit 1b: Environmental Policy and Law; Week 4 preview: Unit 2 and Chapters 6–7",
    thesis: "Environmental policy converts competing values into enforceable rules, but the choice of legal authority and policy instrument determines who bears costs, who receives benefits, and how compliance is measured.",
    authorDebate: "Command-and-control rules establish clear standards, while market incentives and voluntary approaches emphasize flexibility. Their effectiveness depends on enforcement capacity, monitoring, and the distributional consequences of implementation.",
    questions: [
      {
        q: "Which level of government has authority, and what policy tool is being used to change behavior?",
        cite: "Unit 1b notes",
      },
      {
        q: "How do enforcement and unequal exposure change an environmental law's real-world effects?",
        cite: "Unit 1b notes",
      },
    ],
    keyTakeaways: [
      "Name the policy goal, legal authority, instrument, and enforcement mechanism.",
      "Distinguish a rule on paper from its implementation and outcomes.",
      "Track how environmental benefits and burdens are distributed.",
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
    reading: "Week 3 prep: microclimate equipment and isoline mapping; Week 4 atmosphere review (no lab meeting)",
    thesis: "Comparable microclimate measurements require consistent instrument placement, timing, units, and surface context; isolines then translate discrete observations into an interpreted spatial field.",
    authorDebate: "Direct measurements capture local variation, while isoline maps generalize between sample points. The map is only as defensible as the sampling design and interpolation assumptions behind it.",
    questions: [
      {
        q: "Which measurement conditions must stay consistent before temperatures from two sites can be compared?",
        cite: "Week 3 prep package; official lab instructions pending",
      },
    ],
    keyTakeaways: [
      "Record instrument, units, height, surface, shade, and observation time.",
      "Isolines connect equal values but interpolate between sampled locations.",
      "Keep the prep package provisional until the official Canvas handout appears.",
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
