export type Exercise = {
  name: string;
  sets: string;
  tip: string;
};

export type WorkoutDay = {
  day: string; // "Monday", etc.
  dow: number; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  label: string;
  color: string;
  isRest?: boolean;
  gym: Exercise[];
  home: Exercise[];
};

export type NutritionSection = {
  title: string;
  icon: string;
  color: string;
  items: string[];
};

export type TipSection = {
  title: string;
  color: string;
  icon: string;
  tips: string[];
};

export const WORKOUT_DAYS: WorkoutDay[] = [
  {
    day: "Sunday",
    dow: 0,
    label: "REST",
    color: "#636E72",
    isRest: true,
    gym: [],
    home: [
      { name: "Full Rest or Light Walk", sets: "—", tip: "Let your muscles recover and grow. Sleep is king." },
    ],
  },
  {
    day: "Monday",
    dow: 1,
    label: "CHEST + TRICEPS",
    color: "#FF6B35",
    gym: [
      { name: "Flat Bench Press (Barbell)", sets: "3×8–10", tip: "Squeeze chest at top. Don't flare elbows too wide." },
      { name: "Incline Chest Press Machine", sets: "3×10–12", tip: "Upper chest focus. Control the descent slowly." },
      { name: "Cable Fly (Low Pulley)", sets: "3×12", tip: "Slight bend in elbows. Think 'hugging a tree'." },
      { name: "Tricep Rope Pushdown (Cable)", sets: "3×12", tip: "Flare the rope at the bottom. Keep elbows pinned." },
      { name: "Overhead Tricep Extension (Cable)", sets: "3×12", tip: "Lean slightly forward. Full range of motion." },
    ],
    home: [
      { name: "Push-Ups", sets: "4×15", tip: "Widen hands for chest, narrow for triceps." },
      { name: "Diamond Push-Ups", sets: "3×10", tip: "Hands form a diamond under your chest." },
      { name: "Dips (Chair)", sets: "3×12", tip: "Lean forward slightly to hit chest more." },
      { name: "Pike Push-Ups", sets: "3×10", tip: "Elevate feet for more shoulder/upper chest." },
    ],
  },
  {
    day: "Tuesday",
    dow: 2,
    label: "BACK + BICEPS",
    color: "#4ECDC4",
    gym: [
      { name: "Lat Pulldown Machine", sets: "3×10–12", tip: "Pull to upper chest. Don't lean too far back." },
      { name: "Seated Cable Row", sets: "3×10", tip: "Drive elbows back, squeeze shoulder blades together." },
      { name: "Assisted Pull-Up Machine", sets: "3×8", tip: "Great if you can't do full pull-ups yet." },
      { name: "EZ-Bar Curl", sets: "3×12", tip: "Don't swing. Squeeze hard at the top." },
      { name: "Hammer Curl (Dumbbells)", sets: "3×12", tip: "Neutral grip hits the brachialis — adds arm thickness." },
    ],
    home: [
      { name: "Resistance Band Pull-Apart", sets: "3×15", tip: "Slow and controlled, feel the rear delts." },
      { name: "Doorframe Row", sets: "3×10", tip: "Grab a doorframe, lean back, pull yourself in." },
      { name: "Bicep Curl (Water Jugs / Bands)", sets: "3×12", tip: "Improvise with anything heavy." },
      { name: "Towel Row (Table)", sets: "3×10", tip: "Lie under a table, grab the edge, row up." },
    ],
  },
  {
    day: "Wednesday",
    dow: 3,
    label: "REST / ACTIVE RECOVERY",
    color: "#95A5A6",
    isRest: true,
    gym: [],
    home: [
      { name: "20-min Walk or Light Jog", sets: "1×20min", tip: "Gets blood flowing without taxing muscles." },
      { name: "Full Body Stretching Routine", sets: "1×15min", tip: "Hip flexors, hamstrings, chest, lats." },
      { name: "Foam Rolling", sets: "1×10min", tip: "Roll out soreness in quads, back, calves." },
    ],
  },
  {
    day: "Thursday",
    dow: 4,
    label: "SHOULDERS + TRAPS",
    color: "#A29BFE",
    gym: [
      { name: "Shoulder Press Machine (Seated)", sets: "3×10", tip: "Don't lock out elbows at top. Controlled down." },
      { name: "Lateral Raise (Dumbbells)", sets: "3×15", tip: "Slight forward lean. Pinky slightly up at top." },
      { name: "Front Raise (Cable)", sets: "3×12", tip: "Alternate arms. Isolates front delts." },
      { name: "Face Pull (Cable Rope)", sets: "3×15", tip: "Pull to nose. Great for posture + rear delts." },
      { name: "Shrugs (Dumbbells or Smith Machine)", sets: "3×15", tip: "Hold the top for 1 second. Don't roll shoulders." },
    ],
    home: [
      { name: "Pike Push-Ups", sets: "4×12", tip: "Feet elevated = more shoulder load." },
      { name: "Lateral Raise (Water Bottles)", sets: "3×15", tip: "Control counts more than weight here." },
      { name: "Band Face Pull / Band Pull-Apart", sets: "3×15", tip: "Essential for shoulder health." },
      { name: "Shrugs (Heavy Backpack)", sets: "3×15", tip: "Fill a backpack with books for resistance." },
    ],
  },
  {
    day: "Friday",
    dow: 5,
    label: "LEGS + GLUTES",
    color: "#FD79A8",
    gym: [
      { name: "Leg Press Machine", sets: "4×10–12", tip: "Feet shoulder-width. Don't let knees cave in." },
      { name: "Leg Extension Machine", sets: "3×12", tip: "Quad isolation. Pause at the top." },
      { name: "Leg Curl Machine (Seated or Lying)", sets: "3×12", tip: "Hamstring isolation. Slow lowering phase." },
      { name: "Hip Abductor Machine", sets: "3×15", tip: "Outer glutes. Great for shape and width." },
      { name: "Calf Raise Machine (Standing)", sets: "4×15", tip: "Full stretch at bottom, full flex at top." },
    ],
    home: [
      { name: "Squat (Bodyweight)", sets: "4×15", tip: "Chest up, weight in heels. Add backpack for resistance." },
      { name: "Romanian Deadlift (Jugs)", sets: "3×12", tip: "Hinge at hips, feel the hamstring stretch." },
      { name: "Glute Bridge", sets: "4×15", tip: "Drive through heels. Squeeze glutes hard at top." },
      { name: "Reverse Lunge", sets: "3×10 each", tip: "Step back, not forward — easier on knees." },
      { name: "Calf Raise (Step Edge)", sets: "4×20", tip: "Hold the wall. Full range of motion." },
    ],
  },
  {
    day: "Saturday",
    dow: 6,
    label: "ARMS + ABS",
    color: "#FDCB6E",
    gym: [
      { name: "Preacher Curl Machine", sets: "3×12", tip: "Bicep peak isolation. Slow negative." },
      { name: "Tricep Dip Machine (Assisted)", sets: "3×10", tip: "Or use a bench. Full lockout at bottom." },
      { name: "Cable Curl (Low Pulley)", sets: "3×12", tip: "Constant tension throughout the movement." },
      { name: "Ab Crunch Machine", sets: "3×15", tip: "Exhale hard at contraction." },
      { name: "Cable Woodchop", sets: "3×12 each", tip: "Oblique and core rotation work." },
    ],
    home: [
      { name: "Bicep Curl (Bands / Jugs)", sets: "3×15", tip: "Slow down the lowering phase for more growth." },
      { name: "Tricep Overhead Extension (Jug)", sets: "3×12", tip: "Hold one heavy jug with both hands." },
      { name: "Plank", sets: "3×45sec", tip: "Squeeze everything. Don't let hips sag." },
      { name: "Bicycle Crunch", sets: "3×20", tip: "Slow and controlled beats fast and sloppy." },
      { name: "Leg Raises (Floor)", sets: "3×15", tip: "Lower back pressed into the floor." },
    ],
  },
];

export const NUTRITION_GUIDE: NutritionSection[] = [
  {
    title: "PROTEIN — The Priority",
    icon: "🥩",
    color: "#FF6B35",
    items: [
      "Aim for 0.7–1g of protein per lb of bodyweight daily",
      "Chicken breast, ground beef (90/10), eggs, canned tuna",
      "Greek yogurt (plain, high protein) as a snack",
      "Protein shake (whey isolate) post-workout if you struggle to hit your goal",
    ],
  },
  {
    title: "CARBS — Fuel Your Lifts",
    icon: "🍚",
    color: "#4ECDC4",
    items: [
      "Eat most carbs around your workout (before + after)",
      "White rice, oats, sweet potatoes, whole grain bread",
      "Fruit (bananas especially) are great pre-workout",
      "Don't fear carbs — they are essential for bulking",
    ],
  },
  {
    title: "FATS — Don't Skip Them",
    icon: "🥑",
    color: "#FDCB6E",
    items: [
      "Healthy fats support testosterone and hormone production",
      "Eggs, avocado, peanut butter, olive oil, almonds",
      "Aim for ~0.4g per lb of bodyweight",
      "Avoid trans fats but don't fear saturated fats in moderation",
    ],
  },
  {
    title: "CALORIES — The Bulk",
    icon: "📈",
    color: "#A29BFE",
    items: [
      "Eat in a slight caloric surplus: +200–300 calories above maintenance",
      "Calculate maintenance with TDEE calculator online",
      "Weigh yourself weekly, same time each morning — aim for +0.5–1lb/week",
      "Don't bulk too hard — slow lean gains beat getting fat and cutting later",
    ],
  },
];

export const MEAL_IDEAS = [
  { meal: "Breakfast", desc: "4 eggs scrambled + oats with banana + glass of milk" },
  { meal: "Lunch", desc: "Rice + ground beef + veggies cooked in olive oil" },
  { meal: "Pre-Workout", desc: "Banana + peanut butter on toast" },
  { meal: "Post-Workout", desc: "Protein shake + white rice + chicken" },
  { meal: "Dinner", desc: "Salmon + sweet potato + broccoli" },
  { meal: "Snack", desc: "Greek yogurt + handful of almonds" },
];

export const GYM_TIPS: TipSection[] = [
  {
    title: "PEAK HOURS TO AVOID (UNM Johnson / Gyms)",
    color: "#FF6B35",
    icon: "🕐",
    tips: [
      "Worst times: 5–7pm weekdays (after-class rush), 10am–12pm Saturday",
      "Best times: 6–8am weekdays, or 1–3pm on weekdays (perfect between classes)",
      "Sunday mornings are surprisingly quiet for active recovery or cardio",
      "Ask the gym desk when traffic dips — staff always know the dead hours",
    ],
  },
  {
    title: "FIRST WEEK STRATEGY & ANXIETY",
    color: "#4ECDC4",
    icon: "🗺️",
    tips: [
      "Walk in with a written plan (use this page!) — eliminates awkward standing around",
      "Do a quick 'walk-through' on your first visit — get a mental map of where machines are",
      "Machines > free weights at first: guided paths feel less intimidating and safer",
      "Headphones are an unspoken social shield — nobody will bother you",
    ],
  },
  {
    title: "GYM ETIQUETTE (SIMPLE & PAINLESS)",
    color: "#A29BFE",
    icon: "✅",
    tips: [
      "Wipe machines down with disinfectant spray and paper towels after use",
      "'Are you using this?' or 'How many sets do you have left?' is the only sentence you need",
      "Re-rack weights in their designated slots when finished",
      "Nobody is judging you — everyone is hyper-focused on their own form and music",
    ],
  },
  {
    title: "PROGRESSIVE OVERLOAD TRACKING",
    color: "#FDCB6E",
    icon: "📊",
    tips: [
      "Log your sets in this tool or Notes — watching weights go up builds real momentum",
      "Focus on progressive overload: add 1 rep or 2.5–5 lbs every 1–2 weeks",
      "Form always beats ego weight — control the lowering (eccentric) phase",
      "The first 3 months yield rapid neurological adaptations and muscle growth",
    ],
  },
  {
    title: "SLEEP & RECOVERY (PHED 2996 PRINCIPLE)",
    color: "#FD79A8",
    icon: "😴",
    tips: [
      "Muscles are built during deep sleep, not during the lift",
      "Aim for 7–9 hours. Chronic sleep deprivation tanks anabolic hormone recovery",
      "Keep a consistent sleep/wake cycle — irregular schedules elevate cortisol",
      "Stay hydrated: 3–4 liters of water daily, especially in Albuquerque's dry altitude",
    ],
  },
];

export function getTodayWorkout(dow: number): WorkoutDay {
  return WORKOUT_DAYS.find((d) => d.dow === dow) || WORKOUT_DAYS[1];
}
