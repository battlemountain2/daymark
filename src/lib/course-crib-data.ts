export interface CourseCrib {
  code: string;
  name: string;
  themeColor: string;
  theses: string[];
  keyConcepts: Array<{ term: string; def: string }>;
  promptQuestions: string[];
}

export const COURSE_CRIBS: Record<string, CourseCrib> = {
  "GEOG 1115L": {
    code: "GEOG 1115L",
    name: "Maps & GIScience Lab",
    themeColor: "#2A9D8F",
    theses: [
      "Vector geometries (points, lines, polygons) represent discrete spatial entities, while raster matrices represent continuous geographic surfaces (elevation, temperature).",
      "Spatial reference systems (SRS/CRS) project the 3D ellipsoidal Earth onto 2D Cartesian planes, necessitating unavoidable trade-offs between conformal (shape), equivalent (area), and equidistant properties.",
      "Vector topology guarantees spatial integrity (adjacency, connectivity, containment), preventing slivers, gaps, and invalid geometric overlaps in geospatial workflows."
    ],
    keyConcepts: [
      { term: "Spatial Query & Topological Overlay", def: "Selecting and intersecting features using topological operators (ST_Intersects, ST_Within, ST_Contains) combined with boolean attribute SQL." },
      { term: "Coordinate Reference System (CRS)", def: "Geographic coordinate system and map projection (e.g. EPSG:4326 WGS84 vs EPSG:32613 UTM Zone 13N) defining coordinate math." },
      { term: "Attribute Join vs Spatial Join", def: "Attribute joins link tables via foreign keys; spatial joins assign attributes based on relative geometric proximity or intersection." },
      { term: "Python Geospatial Automation", def: "Using Shapely, GeoPandas, and PyQGIS to script automated buffering, clipping, and coordinate transformation pipelines." }
    ],
    promptQuestions: [
      "Why must map projections make trade-offs between preserving area, shape, distance, and direction (Tissot's Indicatrix)?",
      "How does a spatial join differ from an attribute join when analyzing environmental vulnerability across census tracts?",
      "What steps guarantee topological consistency when digitizing adjacent parcel boundaries in QGIS?"
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
  "GEOG 1160L": {
    code: "GEOG 1160L",
    name: "Home Planet Laboratory",
    themeColor: "#3D85C6",
    theses: [
      "Physical geography laboratory observation requires empirical measurement of thermodynamic, hydrological, and lithospheric variables.",
      "Adiabatic lapse rates dictate cloud formation: dry parcels cool at 10°C/km until saturation (LCL), transitioning to moist adiabatic cooling (6°C/km) with latent heat release.",
      "Psychrometric tables and sling psychrometer measurements determine relative humidity and dew point temperature through evaporative cooling differentials."
    ],
    keyConcepts: [
      { term: "Lifting Condensation Level (LCL)", def: "The precise altitude where an ascending air parcel cools to its dew point, triggering condensation and cloud base formation." },
      { term: "Sling Psychrometer", def: "Instrument using dry-bulb and wet-bulb thermometers to calculate relative humidity based on evaporative latent heat absorption." },
      { term: "Adiabatic Lapse Rates", def: "Rate of temperature change in an ascending or descending gas parcel without external thermal exchange (DAR: 10°C/km, MAR: 6°C/km)." },
      { term: "Orographic Rain Shadow", def: "Precipitation depletion on leeward mountain flanks caused by adiabatic descent and compression warming." }
    ],
    promptQuestions: [
      "How does the difference between wet-bulb and dry-bulb temperature correlate with environmental relative humidity?",
      "Why does an ascending air parcel cool at a slower rate once condensation begins above the LCL?",
      "How do Sandia mountain rain shadows affect precipitation distribution across the Rio Grande valley?"
    ]
  }
};
