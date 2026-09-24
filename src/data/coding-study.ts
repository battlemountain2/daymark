export type QuizQuestion = {
  id: number;
  question: string;
  codeSnippet?: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export type KeyConcept = {
  term: string;
  definition: string;
  codeExample?: string;
};

export type GisApplication = {
  title: string;
  subtitle: string;
  description: string;
  realWorldScenario: string;
  code: string;
};

export type ZedChallenge = {
  title: string;
  description: string;
  starterCode: string;
  expectedOutput: string;
  hint: string;
};

export type CodingChapter = {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  bookUrl: string;
  summary: string;
  keyConcepts: KeyConcept[];
  gisApplication: GisApplication;
  zedChallenge: ZedChallenge;
  questions: QuizQuestion[];
};

export const CODING_CHAPTERS: CodingChapter[] = [
  {
    id: "ch1",
    number: 1,
    title: "Python Basics",
    subtitle: "Operators, Data Types, and Your First Program",
    bookUrl: "https://automatetheboringstuff.com/3e/chapter1.html",
    summary:
      "Computers evaluate expressions down to a single value using operators (+, -, *, /, //, %, **) and values (integers, floats, strings). Variables store values in memory. Functions like print(), input(), len(), int(), and str() let your program interact with users and convert between types.",
    keyConcepts: [
      {
        term: "Expression vs Statement",
        definition: "An expression reduces to a single value (e.g., 2 + 3 reduces to 5). An assignment statement (spam = 42) stores a value into a variable without evaluating to a visible result.",
        codeExample: "bacon = 20\nbacon + 1 # Evaluates to 21, but bacon remains 20!\nbacon = bacon + 1 # Now bacon is 21",
      },
      {
        term: "String Concatenation vs Replication",
        definition: "The + operator joins two strings together. The * operator replicates (repeats) a string a given number of times when multiplied by an integer.",
        codeExample: "'Alice' + 'Bob' # -> 'AliceBob'\n'GIS' * 3 # -> 'GISGISGIS'",
      },
      {
        term: "Type Conversions (int, float, str)",
        definition: "Python refuses to implicitly mix strings and numbers in concatenation. Use str() to turn numbers to text, and int() or float() to parse text into numbers.",
        codeExample: "'I eat ' + str(99) + ' burritos.' # Fixes TypeError",
      },
      {
        term: "The input() function",
        definition: "Always returns user input as a string (str), even if the user only typed digits. Wrap it in int() or float() before doing math.",
        codeExample: "age = int(input('Enter age: '))\nnext_year = age + 1",
      },
    ],
    gisApplication: {
      title: "GPS Coordinate Parsing & File Naming",
      subtitle: "Parsing string coordinates and batch naming shapefile outputs",
      description:
        "Raw GPS datasets, CSVs, and web forms invariably deliver coordinates as text strings (e.g. \"35.0844\", \"-106.6504\"). Without converting them to floating-point numbers, spatial libraries like GeoPandas or QGIS cannot calculate distances, buffers, or bounding boxes. Likewise, string concatenation is how automated scripts generate dynamic file output paths.",
      realWorldScenario:
        "You downloaded a CSV of weather stations in New Mexico. Latitude and longitude are stored as strings. You need to parse them to floats and generate export file paths labeled by study site.",
      code: `# 1. Parse coordinate strings from raw CSV into floats
raw_lat = "35.0844"
raw_lon = "-106.6504"

lat = float(raw_lat)
lon = float(raw_lon)

print("Parsed Coordinate Point: (" + str(lat) + ", " + str(lon) + ")")

# 2. Dynamic output file naming with string concatenation
study_site = "sandia_crest"
sensor_id = 402
export_filename = study_site + "_sensor_" + str(sensor_id) + ".geojson"

print("Export path: /data/gis/" + export_filename)`,
    },
    zedChallenge: {
      title: "Elevation & Coordinate Formatter",
      description:
        "Write a Python script that asks for a field site name, the recorded elevation in meters, and calculates the elevation in feet (1 meter = 3.28084 feet). Print a clean formatted summary.",
      starterCode: `# Elevation Converter Challenge
# 1. Ask for site name
site_name = input("Enter field site name: ")

# 2. Ask for elevation in meters
elev_meters_str = input("Enter elevation in meters: ")

# TODO: Convert elev_meters_str to float
elev_meters = float(elev_meters_str)

# TODO: Calculate elevation in feet (meters * 3.28084)
elev_feet = elev_meters * 3.28084

# TODO: Print the site name and calculated elevation in feet
print("Site: " + site_name)
print("Elevation in feet: " + str(round(elev_feet, 1)) + " ft")`,
      expectedOutput:
        "Site: Sandia Peak\nElevation in feet: 10678.0 ft",
      hint: "Remember to wrap elev_meters_str in float() before multiplying, and wrap the calculated number in str() when printing with concatenation!",
    },
    questions: [
      {
        id: 1,
        question: "Which of the following are operators, and which are values?",
        codeSnippet: "*   'hello'   -88.8   -   /   +   5",
        options: [
          "Operators: *, -, /, + | Values: 'hello', -88.8, 5",
          "Operators: *, 'hello', / | Values: -88.8, -, +, 5",
          "All of them are operators in Python",
          "Operators: + and - only | Values: all the rest",
        ],
        correctIndex: 0,
        explanation:
          "*, -, /, and + are mathematical operators. 'hello' (string), -88.8 (floating-point number), and 5 (integer) are values.",
      },
      {
        id: 2,
        question: "Which of the following is a variable, and which is a string?",
        codeSnippet: "spam\n'spam'",
        options: [
          "Both are variables",
          "spam is a variable; 'spam' is a string literal",
          "'spam' is a variable; spam is a string",
          "Both are strings",
        ],
        correctIndex: 1,
        explanation:
          "Quotes designate a string literal ('spam'). Without quotes, spam is treated by Python as a variable identifier.",
      },
      {
        id: 3,
        question: "What are three fundamental data types introduced in Chapter 1?",
        options: [
          "Integers (int), Floating-point numbers (float), Strings (str)",
          "Numbers, Sentences, Loops",
          "Arrays, Objects, Functions",
          "Variables, Expressions, Operators",
        ],
        correctIndex: 0,
        explanation:
          "The three core primitive data types covered in Chapter 1 are integers (whole numbers), floating-point numbers (decimals), and strings (text enclosed in quotes).",
      },
      {
        id: 4,
        question: "What does the variable bacon contain after the following code runs?",
        codeSnippet: "bacon = 20\nbacon + 1",
        options: [
          "21",
          "20",
          "TypeError: cannot add to variable",
          "None",
        ],
        correctIndex: 1,
        explanation:
          "bacon + 1 evaluates to 21, but the result is NEVER reassigned back to bacon. To update the variable, you must use an assignment: bacon = bacon + 1. Therefore, bacon is still 20.",
      },
      {
        id: 5,
        question: "What should the following two expressions evaluate to?",
        codeSnippet: "'spam' + 'spamspam'\n'spam' * 3",
        options: [
          "'spamspamspam' and 'spamspamspam'",
          "'spam spamspam' and 'spam 3'",
          "'spam+spamspam' and Error",
          "Error for both",
        ],
        correctIndex: 0,
        explanation:
          "String concatenation (+) joins 'spam' and 'spamspam' into 'spamspamspam'. String replication (*) repeats 'spam' 3 times, also yielding 'spamspamspam'.",
      },
      {
        id: 6,
        question: "Why is eggs a valid variable name, while 100 is invalid?",
        options: [
          "Variable names cannot begin with or consist solely of a number",
          "eggs is a reserved Python keyword, 100 is not",
          "Variable names must be at least 4 letters long",
          "100 can only be used in math statements",
        ],
        correctIndex: 0,
        explanation:
          "Python variable naming rules state that names can only contain letters, numbers, and underscores, and CANNOT begin with a number.",
      },
      {
        id: 7,
        question: "What three functions convert a value to an integer, float, or string respectively?",
        options: [
          "int(), float(), str()",
          "to_int(), to_float(), to_string()",
          "integer(), decimal(), text()",
          "parse_int(), parse_float(), string()",
        ],
        correctIndex: 0,
        explanation:
          "Python provides the built-in constructor functions int(), float(), and str() for explicit type conversion.",
      },
      {
        id: 8,
        question: "Why does the expression below cause an error, and how is it fixed?",
        codeSnippet: "'I eat ' + 99 + ' burritos.'",
        options: [
          "Cannot concatenate str and int. Fix: 'I eat ' + str(99) + ' burritos.'",
          "99 is too large for string math. Fix: use 9 instead.",
          "burritos is not defined. Fix: define burritos = True",
          "Strings cannot have spaces. Fix: remove all spaces.",
        ],
        correctIndex: 0,
        explanation:
          "Python raises a TypeError because it does not automatically coerce integers to strings during concatenation. Wrapping 99 with str(99) fixes the expression.",
      },
      {
        id: 9,
        question: "What does the len() function return when passed the string 'Albuquerque'?",
        codeSnippet: "len('Albuquerque')",
        options: ["11", "10", "12", "['A', 'l', 'b', ...]"],
        correctIndex: 0,
        explanation:
          "len() returns the total count of characters in the string. 'A-l-b-u-q-u-e-r-q-u-e' has exactly 11 characters.",
      },
      {
        id: 10,
        question: "What does the input() function ALWAYS return?",
        codeSnippet: "user_val = input('Enter a number: ')",
        options: [
          "Always a string (str), regardless of whether numbers were entered",
          "An integer if digits are typed, otherwise a string",
          "A float if decimals are typed",
          "None",
        ],
        correctIndex: 0,
        explanation:
          "input() always captures raw text from the terminal and returns a string (str). Even if you type 42, Python receives the string '42'.",
      },
    ],
  },
  {
    id: "ch2",
    number: 2,
    title: "Flow Control",
    subtitle: "Booleans, Comparison Operators, and if/elif/else",
    bookUrl: "https://automatetheboringstuff.com/3e/chapter2.html",
    summary:
      "Flow control statements decide which Python instructions to execute based on Boolean conditions (True or False). Comparison operators (==, !=, <, >, <=, >=) compare values, and Boolean operators (and, or, not) combine them. Python uses indentation to define code blocks inside if, elif, and else statements.",
    keyConcepts: [
      {
        term: "The Boolean Data Type",
        definition: "Has exactly two values: True and False. Always capitalized with no quotes.",
        codeExample: "is_active = True\nis_cloudy = False",
      },
      {
        term: "== (Equal To) vs = (Assignment)",
        definition: "== compares two values and evaluates to a Boolean. = assigns a value to a variable.",
        codeExample: "spam = 42 # Assignment\nspam == 42 # Comparison -> True\nspam == 99 # Comparison -> False",
      },
      {
        term: "Boolean Operators (and, or, not)",
        definition: "and is True only if BOTH sides are True. or is True if EITHER side is True. not flips the Boolean value.",
        codeExample: "True and False # -> False\nTrue or False  # -> True\nnot True       # -> False",
      },
      {
        term: "Code Blocks & Indentation",
        definition: "Python groups statements using consistent whitespace indentation (usually 4 spaces). Blocks begin after a colon (:) and end when indentation drops back.",
        codeExample: "if elevation > 2000:\n    print('High elevation zone')\n    is_mountain = True\nprint('Done check')",
      },
    ],
    gisApplication: {
      title: "Spatial Bounding Box & Elevation Zoning",
      subtitle: "Filter coordinates and classify geographical attributes",
      description:
        "Every GIS spatial query begins with a condition. When checking whether a GPS coordinate is inside a study boundary (a bounding box), or categorizing LiDAR elevation points into ecological zones, your script relies directly on Python comparison operators and if/elif/else blocks.",
      realWorldScenario:
        "You are filtering satellite telemetry points. You need to verify if coordinates fall within the state boundary of New Mexico, and tag each point with its ecological life zone based on elevation.",
      code: `# Bounding Box Check for New Mexico
# NM bounds approx: Lat 31.33 to 37.00, Lon -109.05 to -103.00
lat = 35.0844
lon = -106.6504
elevation = 2100 # meters

# Check if within New Mexico
if (31.33 <= lat <= 37.00) and (-109.05 <= lon <= -103.00):
    in_nm = True
    print("Point is within New Mexico boundary.")
else:
    in_nm = False
    print("Point is outside study area.")

# Ecological Life Zone Classification
if elevation >= 2900:
    zone = "Alpine Tundra"
elif elevation >= 2400:
    zone = "Subalpine Conifer"
elif elevation >= 1900:
    zone = "Ponderosa Pine / Pinon-Juniper"
else:
    zone = "Desert Grassland"

print("Ecological Zone: " + zone)`,
    },
    zedChallenge: {
      title: "Wildfire Danger Level Classifier",
      description:
        "Write a Python script that asks for temperature (in Fahrenheit) and relative humidity percentage. Use an if/elif/else block to classify the fire hazard as 'Extreme', 'High', or 'Moderate'.",
      starterCode: `# Wildfire Danger Classifier
temp_str = input("Enter temperature (F): ")
humidity_str = input("Enter relative humidity (%): ")

temp = float(temp_str)
humidity = float(humidity_str)

# TODO: Write flow control logic:
# If temp > 90 AND humidity < 15 -> 'Extreme Danger'
# Else If temp > 80 AND humidity < 25 -> 'High Danger'
# Else -> 'Moderate Danger'

if temp > 90 and humidity < 15:
    danger = "Extreme Danger 🔥"
elif temp > 80 and humidity < 25:
    danger = "High Danger ⚠️"
else:
    danger = "Moderate Danger 🌲"

print("Wildfire Risk Assessment: " + danger)`,
      expectedOutput:
        "Wildfire Risk Assessment: Extreme Danger 🔥",
      hint: "Use the `and` operator to combine both conditions for temperature and humidity!",
    },
    questions: [
      {
        id: 1,
        question: "What are the two values of the Boolean data type, and how are they written in Python?",
        options: [
          "True and False (capitalized, no quotes)",
          "true and false (all lowercase)",
          "'True' and 'False' (inside quotes)",
          "1 and 0 only",
        ],
        correctIndex: 0,
        explanation:
          "In Python, Boolean values are keywords written with an initial capital letter: True and False. Lowercase true or quoted 'True' are not Booleans.",
      },
      {
        id: 2,
        question: "What are the three Boolean logic operators?",
        options: [
          "and, or, not",
          "&&, ||, !",
          "equal, not_equal, greater",
          "if, elif, else",
        ],
        correctIndex: 0,
        explanation:
          "Python uses plain English keywords for Boolean logic: `and`, `or`, and `not`.",
      },
      {
        id: 3,
        question: "What does the following expression evaluate to in Python?",
        codeSnippet: "(5 > 4) and (3 == 5)",
        options: ["False", "True", "Error", "None"],
        correctIndex: 0,
        explanation:
          "5 > 4 is True, but 3 == 5 is False. Since `and` requires BOTH sides to be True, the expression evaluates to False.",
      },
      {
        id: 4,
        question: "What does the expression below evaluate to?",
        codeSnippet: "not ((5 > 4) or (3 == 5))",
        options: ["False", "True", "Error", "0"],
        correctIndex: 0,
        explanation:
          "(5 > 4) is True, so the `or` expression evaluates to True. `not (True)` inverts it to False.",
      },
      {
        id: 5,
        question: "What do (True and True) and (True == False) evaluate to?",
        codeSnippet: "(True and True) and (True == False)",
        options: ["False", "True", "Error", "None"],
        correctIndex: 0,
        explanation:
          "(True and True) evaluates to True. (True == False) evaluates to False. True and False evaluates to False.",
      },
      {
        id: 6,
        question: "What does (not False) or (not True) evaluate to?",
        codeSnippet: "(not False) or (not True)",
        options: ["True", "False", "None", "Error"],
        correctIndex: 0,
        explanation:
          "not False is True. Since the first operand of `or` is True, Python short-circuits and evaluates the whole expression to True.",
      },
      {
        id: 7,
        question: "What are the six comparison operators in Python?",
        options: [
          "==, !=, <, >, <=, >=",
          "=, /=, <, >, =<, =>",
          "is, is not, eq, ne, lt, gt",
          "and, or, not, if, elif, else",
        ],
        correctIndex: 0,
        explanation:
          "The six comparison operators are == (equal to), != (not equal to), < (less than), > (greater than), <= (less than or equal to), and >= (greater than or equal to).",
      },
      {
        id: 8,
        question: "What is the critical difference between == and = in Python?",
        options: [
          "== is for comparison (asking 'are these equal?'); = is for assignment (storing a value in a variable)",
          "= is for comparison; == is for math operations",
          "They are interchangeable in Python",
          "= is only used in numbers; == is only used in text",
        ],
        correctIndex: 0,
        explanation:
          "Confusing = and == is one of the most common beginner errors! = assigns a value to a variable, while == checks for equality and evaluates to True or False.",
      },
      {
        id: 9,
        question: "What will the following code output when run?",
        codeSnippet: "spam = 0\nif spam == 10:\n    print('eggs')\n    if spam > 5:\n        print('bacon')\n    else:\n        print('ham')\n    print('spam')\nprint('Done')",
        options: [
          "Done",
          "eggs\nham\nspam\nDone",
          "ham\nDone",
          "eggs\nDone",
        ],
        correctIndex: 0,
        explanation:
          "Because spam is 0, the initial condition `if spam == 10:` evaluates to False. Python skips the entire indented block beneath it and jumps straight to `print('Done')`!",
      },
    ],
  },
];
