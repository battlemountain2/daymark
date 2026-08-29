import { type ColourKey } from "@/lib/term";
import {
  type Flashcard,
  type CourseStudyInfo,
  type StudyHubData,
  type WeeklyReviewData,
  parseAnkiCsv,
  calculateDeckStats,
} from "@/lib/study-hub-types";

export * from "@/lib/study-hub-types";

const POLS_CSV = `id,front,back,source,tags,status
pols-001,"What is Carol Cohn's central question regarding defense intellectuals?","How defense intellectuals can calmly plan for nuclear war and how their specialized language makes that thinking possible.","Cohn Signs 1987, p. 687","POLS2120::W02::Cohn::technostrategic",Verified
pols-002,"What is 'technostrategic' language?","Nuclear defense strategy constructed through technical vocabulary, systems analysis, mathematical modeling, and game theory that abstracts away human death.","Cohn Signs 1987, p. 690","POLS2120::W02::Cohn::technostrategic",Verified
pols-003,"How do euphemisms affect nuclear defense discourse?","They sanitize massive destruction and hide its emotional, moral, and human reality under antiseptic jargon.","Cohn Signs 1987, p. 695","POLS2120::W02::Cohn::language",Verified
pols-004,"Why is 'clean bomb' a critical example of technostrategic language?","It characterizes an enormously destructive thermonuclear weapon as pure or humane simply because it produces proportionally less radioactive fallout.","Cohn Signs 1987, p. 698","POLS2120::W02::Cohn::language",Verified
pols-005,"Why does Cohn analyze sexual and phallic imagery in nuclear weapon naming and testing?","It reveals underlying desires for domination, masculine power, and excitement beneath claims of purely rational, detached strategic analysis.","Cohn Signs 1987, p. 701","POLS2120::W02::Cohn::gender-critique",Needs review
pols-006,"What perspective does technostrategic language give its speaker?","The perspective of the planner, user, or launcher of weapons rather than the perspective of the potential victim on the ground.","Cohn Signs 1987, p. 705","POLS2120::W02::Cohn::perspective",Verified
pols-007,"Why can adopting strategic defense language paradoxically reduce anxiety?","Abstraction creates emotional distance, technical mastery offers a sense of control, and the speaker adopts the active role of planner.","Cohn Signs 1987, p. 709","POLS2120::W02::Cohn::psychology",Needs review
pols-008,"What is Cohn's 'insider-outsider dilemma'?","Critics must learn and speak the technostrategic language to be taken seriously by defense policymakers, but speaking it traps them within its militarized logic and premises.","Cohn Signs 1987, p. 714","POLS2120::W02::Cohn::dilemma",Verified`;

const GEOG1160_CSV = `id,front,back,source,tags,status
geog1160-001,"What are Earth's four interconnected environmental spheres?","Lithosphere (solid Earth/crust), Atmosphere (gaseous envelope), Hydrosphere (liquid and frozen water/cryosphere), and Biosphere (all living organisms).","GEOG 1160 Ch 1 Slides, Slide 8","GEOG1160::W02::CH01::earth-spheres",Verified
geog1160-002,"What is the difference between an open and closed thermodynamic system in physical geography?","An open system exchanges both energy and matter across its boundaries (like a river drainage basin), whereas a closed system exchanges energy but self-contains matter (Earth as a whole approximates a closed material system).","GEOG 1160 Ch 1 Slides, Slide 14","GEOG1160::W02::CH01::systems",Verified
geog1160-003,"How is positive vs negative feedback defined in climate equilibrium?","Positive feedback amplifies initial change (e.g. ice-albedo feedback), pushing the system away from balance; negative feedback dampens or resists change (e.g. cloud cover increasing albedo to limit warming), restoring stability.","GEOG 1160 Ch 1 Slides, Slide 19","GEOG1160::W02::CH01::feedback-loops",Needs review
geog1160-004,"What determines the solar constant and Earth's planetary energy budget?","Solar constant (~1361 W/m²) is the insolation received perpendicular to Earth's top of atmosphere; the energy balance is governed by insolation minus planetary albedo (~30%) balanced by outgoing longwave radiation.","GEOG 1160 Ch 1 Slides, Slide 27","GEOG1160::W02::CH01::energy-budget",Verified
geog1160-005,"Why does seasonality occur on Earth?","Axial tilt (obliquity of ~23.5°), parallelism of the axis, sphericity, rotation, and revolution around the Sun, which together alter solar altitude and daylength across latitudes.","GEOG 1160 Ch 1 Slides, Slide 33","GEOG1160::W02::CH01::seasonality",Verified
geog1160-006,"What is the subsolar point on the equinoxes vs solstices?","Equinoxes (March/Sept): Equator (0°). June Solstice: Tropic of Cancer (23.5° N). December Solstice: Tropic of Capricorn (23.5° S).","GEOG 1160 Ch 1 Slides, Slide 36","GEOG1160::W02::CH01::seasonality",Draft`;

const HIST300_CSV = `id,front,back,source,tags,status
hist300-001,"What is Paul Sutter's core argument in 'The World with Us' regarding American environmental history?","That environmental history must move beyond wilderness preservation debates to examine hybrid landscapes, human labor, urban metabolism, and state infrastructure where nature and society are deeply entwined.","Sutter 2013, p. 94","HIST300::W01::Sutter::environmental-historiography",Verified
hist300-002,"How does Donald Worster conceptualize 'hydraulic society'?","An arid or semi-arid civilization whose political power, social hierarchy, and state apparatus centralize around the command and technological manipulation of scarce water resources.","Worster 1984, p. 112","HIST300::W01::Worster::hydraulic-theory",Verified
hist300-003,"What distinguishes the 'first nature' from 'second nature' in environmental history frameworks?","First nature refers to the biophysical environment prior to modern capitalist transformation; second nature is nature re-engineered into infrastructure, commodities, canals, and urban grids.","Sutter 2013, p. 102","HIST300::W01::Sutter::hybrid-landscapes",Needs review
hist300-004,"What role did New Deal federal projects play in the American West's water regime?","They established monumental Bureau of Reclamation dams (Hoover, Grand Coulee) that subsidized agribusiness, municipal growth, and hydro-power while locking in long-term ecological and water-rights crises.","Worster 1984, p. 125","HIST300::W01::Worster::dams-infrastructure",Verified
hist300-005,"What is the historiographical shift from 'declensionist' narratives to 'hybridity'?","Declensionist narratives viewed human history purely as a story of pristine wilderness destruction; hybridity recognizes continuous reciprocal socio-ecological co-production.","Sutter 2013, p. 108","HIST300::W01::Sutter::historiography",Draft`;

const GEOG1150_CSV = `id,front,back,source,tags,status
geog1150-001,"What was the foundational dispute between Gifford Pinchot and John Muir?","Pinchot advocated utilitarian 'Conservation' (sustainable resource extraction for the greatest good for the greatest number), while Muir championed spiritual 'Preservation' (protecting wilderness intact from commercial exploitation).","Geog1150 Unit 1a notes","GEOG1150::W01::Conservation::Pinchot-Muir",Verified
geog1150-002,"How did the Hetch Hetchy Valley controversy define early American environmental policy?","The 1913 decision to dam Hetch Hetchy in Yosemite to supply San Francisco water galvanized the preservationist movement and contributed directly to the 1916 creation of the National Park Service.","Geog1150 Unit 1b notes","GEOG1150::W01::Controversies::Hetch-Hetchy",Verified
geog1150-003,"What is the 'Wilderness Myth' identified by environmental geographers like William Cronon?","The problematic assumption that wilderness represents pristine, uninhabited nature, which historically erased Indigenous management and disconnected people from everyday urban/suburban environmental responsibility.","Cronon / Unit 1b Reading","GEOG1150::W01::Wilderness::Critique",Needs review
geog1150-004,"What are ecosystem services and how are they categorized?","Benefits humans derive from ecosystems: Provisioning (food, water, timber), Regulating (climate, flood prevention), Supporting (soil formation, nutrient cycling), and Cultural (recreation, spiritual).","Geog1150 Unit 1a notes","GEOG1150::W01::Ecosystems::Services",Verified`;

const GEOG1115L_CSV = `id,front,back,source,tags,status
gis-001,"What are the primary differences between Vector and Raster geospatial data models?","Vector represents discrete geographical features using Points, Lines, and Polygons with coordinate geometry; Raster represents continuous phenomena using a regular grid of cells/pixels with assigned values (e.g. DEMs, satellite imagery).","GEOG 1115L Lab Manual W01","GEOG1115L::W01::DataModels::Vector-Raster",Verified
gis-002,"What three spatial properties are unavoidably distorted when projecting Earth onto a 2D map?","Area (equivalence), Shape/Angles (conformality), and Distance/Direction (equidistance/azimuthal). No flat map can preserve all simultaneously.","GEOG 1115L Lab Manual W01","GEOG1115L::W01::Projections::Distortion",Verified
gis-003,"What is the difference between a Geographic Coordinate System (GCS) and a Projected Coordinate System (PCS)?","GCS defines locations on a 3D ellipsoidal surface using angular units (Latitude/Longitude in decimal degrees); PCS projects that onto a flat 2D plane with linear units (e.g. UTM Easting/Northing in meters).","GEOG 1115L Lab Manual W01","GEOG1115L::W01::Datums::GCS-PCS",Needs review`;

const PHED2996_CSV = `id,front,back,source,tags,status
phed-001,"What are the five health-related components of physical fitness?","Cardiorespiratory endurance, muscular strength, muscular endurance, flexibility, and body composition.","PHED 2996 Syllabus & Mod 1","PHED2996::W01::FitnessComponents::Health",Verified
phed-002,"What does the FITT-VP exercise prescription framework represent?","Frequency, Intensity, Time (duration), Type (mode), Volume (total work), and Progression (systematic overload over time).","PHED 2996 Mod 1 Notes","PHED2996::W01::Principles::FITT-VP",Verified
phed-003,"How is target heart rate zone estimated using the Karvonen formula (Heart Rate Reserve)?","Target HR = ((Max HR − Resting HR) × % Intensity) + Resting HR, where Max HR is approximately 220 − Age.","PHED 2996 Mod 1 Notes","PHED2996::W01::Cardio::HRR-Formula",Needs review`;

const COURSE_CK: Record<string, ColourKey> = {
  "GEOG 1160": "geo",
  "GEOG 1160L": "geo",
  "GEOG 1150": "geo",
  "GEOG 1115L": "geo",
  "HIST 300": "his",
  "POLS 2120": "pol",
  "PHED 2996": "fit",
};

const SEED_COURSES = [
  {
    code: "POLS 2120",
    name: "International Relations",
    where: "Mitchell Hall 101",
    ck: "pol" as ColourKey,
    currentWeek: "Week 2",
    currentTopic: "Feminist IR Theory & Technostrategic Discourse (Carol Cohn)",
    readings: [
      "Cohn - Signs 1987 (Sex and Death in the Rational World of Defense Intellectuals)",
      "Waltz - Realist Theory Foundations"
    ],
    nextAssessment: {
      title: "IR Theoretical Frameworks Brief",
      due: "2026-09-04",
      type: "Assignment"
    }
  },
  {
    code: "GEOG 1160",
    name: "Home Planet: Land, Water, Life",
    where: "Bandelier Hall East 105",
    ck: "geo" as ColourKey,
    currentWeek: "Week 2",
    currentTopic: "Earth System Spheres, Insolation & Seasonality (Ch 1)",
    readings: [
      "Geog 1160 Chapter 1: Earth as a Rotating Sphere",
      "Lecture Slides Set 1"
    ],
    nextAssessment: {
      title: "Earth Systems & Insolation Quiz 1",
      due: "2026-09-03",
      type: "Quiz"
    }
  },
  {
    code: "HIST 300",
    name: "Water in History",
    where: "Ortega Hall 115",
    ck: "his" as ColourKey,
    currentWeek: "Week 2",
    currentTopic: "American Environmental Historiography & Hydraulic Societies",
    readings: [
      "Sutter - The World with Us (2013)",
      "Donald Worster - History as Natural History (1984)"
    ],
    nextAssessment: {
      title: "Primary Source Water Dossier",
      due: "2026-09-08",
      type: "Assignment"
    }
  },
  {
    code: "GEOG 1150",
    name: "Intro to Environmental Studies",
    where: "Mitchell Hall 120",
    ck: "geo" as ColourKey,
    currentWeek: "Week 2",
    currentTopic: "Conservation vs Preservation & The Wilderness Myth",
    readings: [
      "Geog 1150 Unit 1a: Foundations of Conservation",
      "Geog 1150 Unit 1b: Hetch Hetchy & Cronon Wilderness"
    ],
    nextAssessment: {
      title: "Film 01 Assignment: The Wilderness Idea",
      due: "2026-09-01",
      type: "Assignment"
    }
  },
  {
    code: "GEOG 1115L",
    name: "Maps & GIScience Laboratory",
    where: "Bandelier Hall East 106",
    ck: "geo" as ColourKey,
    currentWeek: "Week 2",
    currentTopic: "Geospatial Coordinate Systems & Vector vs Raster Models",
    readings: [
      "Lab 01: Coordinate Projections and Datums",
      "GIScience Lab Manual"
    ],
    nextAssessment: {
      title: "Lab 01 Map Projection Deliverable",
      due: "2026-09-02",
      type: "Lab"
    }
  },
  {
    code: "GEOG 1160L",
    name: "Home Planet Laboratory",
    where: "Bandelier Hall East 106",
    ck: "geo" as ColourKey,
    currentWeek: "Week 2",
    currentTopic: "Solar Angle & Planetary Temperature Models",
    readings: [
      "Lab 01 Manual: Insolation and Solar Angles"
    ],
    nextAssessment: {
      title: "Solar Angle Measurement Lab",
      due: "2026-08-31",
      type: "Lab"
    }
  },
  {
    code: "PHED 2996",
    name: "Intro to Fitness",
    where: "Online",
    ck: "fit" as ColourKey,
    currentWeek: "Week 2",
    currentTopic: "Cardiorespiratory Physiology & The FITT-VP Principle",
    readings: [
      "Module 01: Five Components of Health-Related Fitness"
    ],
    nextAssessment: {
      title: "Weekly Fitness Activity Log 1",
      due: "2026-09-06",
      type: "Journal"
    }
  }
];

const SEED_WEEKLY_REVIEW: WeeklyReviewData = {
  weekTitle: "Week 2 Synthesis & Review",
  scheduledReviewDate: "Friday, 8:00 PM (Weekly)",
  takeaways: [
    {
      course: "POLS 2120",
      title: "Technostrategic Language & Nuclear Defense Abstraction",
      detail: "Carol Cohn demonstrates that nuclear defense intellectuals sanitize catastrophic destruction through mathematical modeling and clinical euphemisms ('clean bombs', 'collateral damage'), placing planners in an active, detached control position while excluding victim perspectives.",
      ck: "pol"
    },
    {
      course: "GEOG 1160",
      title: "Earth's Four Spheres & Planetary Energy Budget",
      detail: "Planetary stability relies on dynamic equilibrium across the lithosphere, atmosphere, hydrosphere, and biosphere. Earth operates as an open system for energy (~1361 W/m² solar constant minus 30% planetary albedo) but an essentially closed material system.",
      ck: "geo"
    },
    {
      course: "HIST 300",
      title: "Hydraulic Empires & Second-Nature Infrastructures",
      detail: "Paul Sutter and Donald Worster show that the modern American West is not an empty frontier but a highly orchestrated 'hydraulic society' where federal Bureau of Reclamation mega-dams commodified water to subsidize corporate agriculture and urban growth.",
      ck: "his"
    },
    {
      course: "GEOG 1150",
      title: "Conservation (Pinchot) vs Preservation (Muir) Paradigms",
      detail: "The Hetch Hetchy dispute codified the enduring tension between utilitarian resource conservation and romantic preservation, while modern geography critiques the erasure of Indigenous stewardship in the traditional 'Wilderness Myth'.",
      ck: "geo"
    },
    {
      course: "GEOG 1115L & PHED",
      title: "Spatial Projections & Exercise Progression (FITT-VP)",
      detail: "All 2D map projections mathematically distort area, shape, or distance (GCS vs PCS). Concurrently, physical training relies on systematic progressive overload structured via Frequency, Intensity, Time, Type, Volume, and Progression.",
      ck: "fit"
    }
  ],
  weakAreas: [
    {
      course: "POLS 2120",
      topic: "Carol Cohn: Sexual Imagery & Gendered Domination",
      reason: "Review specific citations on missile naming conventions and masculine control metaphors (Cohn 1987, p. 701).",
      cardId: "pols-005",
      ck: "pol"
    },
    {
      course: "GEOG 1160",
      topic: "Equilibrium Climate Feedback Mechanisms",
      reason: "Clarify distinctions between positive ice-albedo loops and negative cloud-thermal damping mechanisms.",
      cardId: "geog1160-003",
      ck: "geo"
    },
    {
      course: "HIST 300",
      topic: "First Nature vs Second Nature Dialectics",
      reason: "Strengthen differentiation between biophysical environments and engineered commodified infrastructures in Sutter's framework.",
      cardId: "hist300-003",
      ck: "his"
    },
    {
      course: "GEOG 1115L",
      topic: "GCS vs PCS Datum Transformations",
      reason: "Practice identifying ellipsoid reference systems vs projected UTM Easting/Northing coordinates.",
      cardId: "gis-003",
      ck: "geo"
    }
  ]
};

export async function getStudyHubData(): Promise<StudyHubData> {
  const csvList = [POLS_CSV, GEOG1160_CSV, HIST300_CSV, GEOG1150_CSV, GEOG1115L_CSV, PHED2996_CSV];
  let allCards: Flashcard[] = [];

  for (const csv of csvList) {
    allCards.push(...parseAnkiCsv(csv));
  }

  const seen = new Set<string>();
  allCards = allCards.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });

  const courses: CourseStudyInfo[] = SEED_COURSES.map((c) => {
    const code = c.code || "";
    const courseCards = allCards.filter((card) => {
      const normCard = card.courseCode.replace(/\s+/g, "").toUpperCase();
      const normCourse = code.replace(/\s+/g, "").toUpperCase();
      return normCard === normCourse || normCard.startsWith(normCourse);
    });

    const deckStats = calculateDeckStats(courseCards);

    return {
      code,
      name: c.name || code,
      where: c.where || "",
      ck: COURSE_CK[code] || c.ck || "adm",
      currentWeek: c.currentWeek || "Week 2",
      currentTopic: c.currentTopic || "Course Module",
      readings: c.readings || [],
      nextAssessment: c.nextAssessment,
      deckStats,
      cards: courseCards,
    };
  });

  const overallDeckStats = calculateDeckStats(allCards);

  return {
    activeTerm: "Fall 2026",
    currentWeekNumber: 2,
    lastSynced: new Date().toISOString(),
    weeklyReview: SEED_WEEKLY_REVIEW,
    courses,
    allCards,
    overallDeckStats,
  };
}
