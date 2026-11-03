/**
 * Single source of truth for site content.
 * Anything marked `draft: true` is a PLACEHOLDER written for layout purposes
 * and must be confirmed or replaced by the team before the tech summit.
 */

export type BotId = "v1" | "v2" | "v3" | "v4";

export interface Feature {
  title: string;
  text: string;
  /** true = invented placeholder, not yet confirmed by the team */
  draft?: boolean;
}

export interface Spec {
  label: string;
  value: string;
  /** true = value is a placeholder / to be confirmed */
  draft?: boolean;
  /** true = figure reported by the press / team, not independently verified */
  reported?: boolean;
}

/** Where a robot sits on the home page's journey scroll. */
export interface Roadmap {
  /** approximate introduction date shown on the timeline */
  when: string;
  headline: string;
  /** one or two sentences: what this robot is for and why it came next */
  story: string;
  /** true = timing is an estimate the team still has to confirm */
  draft?: boolean;
}

export interface Bot {
  id: BotId;
  name: string;
  purpose: string;
  roadmap: Roadmap;
  environment: string;
  status: "Field-tested" | "In development";
  summary: string;
  cover: string;
  /** CSS object-position so the robot stays in frame on cropped cards */
  focus: string;
  gallery: string[];
  /** real photos (or design renders) with captions, shown under the product showroom */
  photos: { src: string; caption: string; credit?: string }[];
  features: Feature[];
  specs: Spec[];
}

export const bots: Bot[] = [
  {
    id: "v1",
    name: "SCRUB V1",
    purpose: "Large lakes & rivers",
    roadmap: {
      when: "Early 2026",
      headline: "Where it all began.",
      story:
        "The first SCRUB proved that a robot could lift floating waste and weeds off a big lake. Built for municipal-scale water, it was tested at Kengeri Lake with BBMP and later put to work on Madiwala.",
      draft: true,
    },
    environment: "Municipal-scale water bodies",
    status: "Field-tested",
    summary:
      "Our first platform. A twin-hull workhorse built to sweep floating waste and aquatic weeds from large lakes, first proven on Kengeri Lake with BBMP and later on Madiwala Lake.",
    cover: "/media/bots/v1/cover.webp",
    focus: "50% 80%",
    gallery: ["/media/bots/v1/cover.webp", "/media/bots/v1/gallery-1.webp"],
    photos: [
      { src: "/media/impact/madiwala-trial.webp", caption: "On-water trial at Madiwala Lake", credit: "SCRUB, 8 Sep 2026" },
      { src: "/media/impact/madiwala-lake.webp", caption: "SCRUB V1 at Madiwala Lake", credit: "SCRUB, 8 Sep 2026" },
      { src: "/media/impact/kengeri-test.webp", caption: "Test run beside a lake wall", credit: "Cover image: Electronics For You" },
      { src: "/media/bots/v1/cover.webp", caption: "SCRUB V1" },
    ],
    features: [
      { title: "Conveyor collection", text: "Lifts floating waste and aquatic weeds out of the water into an onboard hold." },
      { title: "Dual-mode control", text: "Operate it by remote or hand over to autonomous sweeping patterns." },
      { title: "Solar-assisted", text: "Solar panels extend working time between charges on open water." },
      { title: "Twin-hull stability", text: "Wide, stable catamaran stance for calm handling in light chop.", draft: true },
      { title: "Weed-cutting paddles", text: "Paddle-wheel propulsion that churns through floating vegetation.", draft: true },
      { title: "Field-serviceable", text: "Aluminium-extrusion frame so a small team can repair it on the bank.", draft: true },
    ],
    specs: [
      { label: "Hull", value: "Twin PVC pipe hulls" },
      { label: "Propulsion", value: "Dual paddle wheels" },
      { label: "Control", value: "Dual-mode (manual + autonomous)" },
      { label: "Power", value: "Battery, solar-assisted" },
      { label: "Payload", value: "To be confirmed", draft: true },
      { label: "Endurance", value: "To be confirmed", draft: true },
    ],
  },
  {
    id: "v2",
    name: "SCRUB V2",
    purpose: "Ponds, estates & mid-size lakes",
    roadmap: {
      when: "Mid 2026",
      headline: "Smaller, simpler, autonomous.",
      story:
        "Not every water body needs a heavy machine. V2 drops the conveyor for a passive intake, so a compact robot can clear the ponds and mid-size lakes inside estates and campuses. Reported at 25 kg per run, 500 m range and up to 5 hours.",
      draft: true,
    },
    environment: "Gated communities, campuses, managed ponds",
    status: "Field-tested",
    summary:
      "A compact passive-intake collector with fewer moving parts. Waste enters through the front opening as it moves forward; the opening closes when it reverses, trapping what it collected.",
    cover: "/media/bots/v2/cover.webp",
    focus: "50% 55%",
    gallery: ["/media/bots/v2/cover.webp", "/media/bots/v2/gallery-1.webp"],
    photos: [
      { src: "/media/impact/v2-trees.webp", caption: "SCRUB V2 along the lakeshore", credit: "Cover image: India Today" },
      { src: "/media/impact/v2-algae.webp", caption: "SCRUB V2 testing in algae-green water", credit: "SCRUB V2 testing video" },
      { src: "/media/impact/v2-lab.webp", caption: "Passive-intake prototype on the bench", credit: "SCRUB" },
      { src: "/media/impact/kengeri-reflection.webp", caption: "Field trial on a still lake", credit: "SCRUB" },
    ],
    features: [
      { title: "Passive intake", text: "Waste flows in as the robot advances; reversing closes the opening and holds it." },
      { title: "Few moving parts", text: "No conveyor to jam. Simpler to build, maintain and transport." },
      { title: "Fully autonomous run", text: "Sweeps a water body without someone steering it throughout." },
      { title: "Easy transport", text: "Compact enough to move and launch from a bank or ramp.", draft: true },
      { title: "Live telemetry", text: "Stable telemetry link to the operator during a run.", draft: true },
      { title: "Quick unload", text: "Tray lifts out so the catch can be emptied in minutes.", draft: true },
    ],
    specs: [
      { label: "Waste per run", value: "25 kg", reported: true },
      { label: "Range", value: "500 m", reported: true },
      { label: "Runtime", value: "Up to 5 hours", reported: true },
      { label: "Collection", value: "Passive intake, no conveyor" },
      { label: "Control", value: "Autonomous" },
      { label: "Indigenous content", value: "To be confirmed", draft: true },
    ],
  },
  {
    id: "v3",
    name: "SCRUB V3",
    purpose: "Rivers & canals",
    roadmap: {
      when: "Aug 2026",
      headline: "Let the river do the work.",
      story:
        "On flowing water, chasing debris is the wrong game. V3 is a floating boom that steers drifting waste to a shore-side collection point, built for rivers, canals and storm-water channels. Still in development.",
      draft: true,
    },
    environment: "Flowing water, storm-water channels",
    status: "In development",
    summary:
      "A floating-boom interceptor. Instead of chasing debris, it guides drifting waste towards a shore-side collection point, built for rivers and canals where flow does the delivering.",
    cover: "/media/bots/v3/cover.webp",
    focus: "50% 50%",
    gallery: ["/media/bots/v3/cover.webp"],
    photos: [{ src: "/media/bots/v3/cover.webp", caption: "Design render: boom, ramp, tank and shelter", credit: "SCRUB pitch deck" }],
    features: [
      { title: "Floating boom", text: "A line of buoyant floats that steers debris towards the bank." },
      { title: "Shore collection point", text: "Debris is lifted out at a sheltered station on the bank." },
      { title: "Modular interception", text: "Boom sections can be extended to suit channel width." },
      { title: "Flood-ready", text: "Designed to ride out the changing water levels of monsoon.", draft: true },
      { title: "Low-energy operation", text: "Uses river flow to deliver waste, so power draw stays low.", draft: true },
      { title: "Debris sensing", text: "Counts and logs what it intercepts for municipal reporting.", draft: true },
    ],
    specs: [
      { label: "Concept", value: "Floating-boom interceptor" },
      { label: "Deployment", value: "Canals, rivers, outfalls" },
      { label: "Collection", value: "Shore-based station" },
      { label: "Stage", value: "In development" },
      { label: "Boom length", value: "To be confirmed", draft: true },
      { label: "Capacity", value: "To be confirmed", draft: true },
    ],
  },
  {
    id: "v4",
    name: "SCRUB V4",
    purpose: "Water intelligence",
    roadmap: {
      when: "Sep 2026",
      headline: "Know the water, not just clean it.",
      story:
        "Cleaning only works if you know what is in the water. V4 is a compact, modular survey robot that takes GPS-tagged pH, TDS and turbidity readings and feeds the SCRUB Observatory. Its first lake map was Madiwala, on 8 Sep 2026.",
      draft: true,
    },
    environment: "Any lake that needs monitoring",
    status: "Field-tested",
    summary:
      "A compact, agile and modular sensing platform. It travels a planned path taking GPS-tagged pH, TDS and turbidity readings, then feeds the SCRUB Observatory for mapping and reports.",
    cover: "/media/bots/v4/cover.webp",
    focus: "80% 50%", // the render has pitch-deck notes on its left; keep the robot in frame
    gallery: ["/media/bots/v4/cover.webp"],
    photos: [{ src: "/media/bots/v4/cover.webp", caption: "Design render: compact, agile, modular", credit: "SCRUB pitch deck" }],
    features: [
      { title: "pH · TDS · Turbidity", text: "Core water-quality sensors on a configurable payload." },
      { title: "GPS-tagged readings", text: "Every reading is stamped with where it was taken." },
      { title: "SCRUB Observatory", text: "Spatial maps and monitoring reports from the collected data." },
      { title: "Modular payload", text: "Swap sensor modules without rebuilding the platform.", draft: true },
      { title: "Twin-thruster agility", text: "Precise manoeuvring to hold survey lines and loops.", draft: true },
      { title: "Repeat surveys", text: "Re-run the same route to track a lake's health over time.", draft: true },
    ],
    specs: [
      { label: "Sensors", value: "pH, TDS, turbidity" },
      { label: "Positioning", value: "GPS-tagged readings" },
      { label: "Software", value: "SCRUB Observatory" },
      { label: "Propulsion", value: "Twin thrusters" },
      { label: "Survey endurance", value: "To be confirmed", draft: true },
      { label: "Extra sensors", value: "To be confirmed", draft: true },
    ],
  },
];

export const getBot = (id: string | undefined) => bots.find((b) => b.id === id);

/* ------------------------------ ABOUT ------------------------------ */

export const brand = {
  tagline: "Clean waters, cleaner future.",
  subline: "Autonomous robots that take floating waste and algae out of our lakes.",
  mission:
    "India's lakes are choking on floating plastic and algae, and clearing them is still manual, slow and unsafe. SCRUB builds autonomous, affordable robots that lift surface waste and algae out of the water, and measure the water as they go, so every lake can be cleaned, monitored and trusted again.",
  pillars: [
    { k: "01", title: "Collect", text: "Remove floating waste and algae from the surface." },
    { k: "02", title: "Measure", text: "Map water quality with GPS-tagged readings." },
    { k: "03", title: "Restore", text: "Return healthier lakes to the communities around them." },
  ],
  videoSrc: "/media/videos/mission.mp4",
};

/** What comes after the four robots, shown at the end of the journey scroll. Both are team-confirmable drafts. */
export const nextUp = [
  { title: "Doddathoguru Lake", text: "The Electronic City survey on 29 Oct 2026 scoped our next lake deployment." },
  { title: "V3 into the water", text: "Moving the river and canal interceptor from design towards field trials.", draft: true },
];

/* ------------------------------ IMPACT ------------------------------ */

export const press = [
  {
    outlet: "India Today",
    date: "13 Oct 2026",
    title: "Bengaluru startup Scrub Robotics designs robot that can clean dirty lakes, rivers",
    href: "https://www.indiatoday.in/science/story/bengaluru-startup-lake-cleaning-robot-scrub-v2-technology-3016321-2026-10-13",
  },
  {
    outlet: "Electronics For You",
    date: "14 Oct 2026",
    title: "Robot collects floating waste from lakes",
    href: "https://www.electronicsforu.com/news/robot-collects-floating-waste-from-lakes",
  },
  {
    outlet: "Asianet News Kannada",
    date: "14 Oct 2026",
    title: "Bengaluru: Lake cleaning without people? What this startup's robot can do",
    href: "https://kannada.asianetnews.com/bengaluru-urban/bengaluru-lake-cleaning-robot-scrub-v2-startup-suh/articleshow-xzgnmc5",
  },
  {
    outlet: "Startup Pedia",
    date: "Oct 2026",
    title: "Bengaluru's Scrub Robotics builds, tests an autonomous water-cleaning robot that can collect up to 25 kg of floating waste",
    href: "https://startuppedia.in/trending/startup-news/bengalurus-scrub-robotics-builds-tests-an-autonomous-water-cleaning-robot-12672736",
  },
  {
    outlet: "Runtime (X)",
    date: "Oct 2026",
    title: "Scrub Robotics has successfully built and tested SCRUB V2: 25 kg capacity, 500 m range, 5-hour runtime",
    href: "https://x.com/RuntimeBRT/status/2109924368390483983",
  },
];

/** Outlets that have covered SCRUB (from the team's published list). */
export const outlets = ["India Today", "Electronics For You", "Asianet News Kannada", "Startup Pedia", "Startupro", "Runtime", "AIM Media House"];

export const socials = [
  { name: "Instagram", handle: "@team_.scrub", href: "https://instagram.com/team_.scrub" },
  { name: "YouTube", handle: "@scrub-robotics", href: "https://youtube.com/@scrub-robotics" },
  { name: "X", handle: "@ScrubRobotics", href: "https://x.com/ScrubRobotics" },
  { name: "Website", handle: "scrubrobotics.in", href: "https://www.scrubrobotics.in" },
];

export const impactStats = [
  { value: 7, suffix: "", label: "Media outlets have covered SCRUB" },
  { value: 3, suffix: "", label: "Lakes visited for trials and surveys" },
  { value: 4, suffix: "", label: "Robot platforms, V1 to V4" },
  { value: 25, suffix: " kg", label: "V2 waste capacity per run (as reported)" },
];

export const timeline = [
  { when: "Earlier", title: "SCRUB V1 tested at Kengeri Lake", text: "First lake trials, in coordination with BBMP." },
  { when: "8 Sep 2026", title: "On-water trial at Madiwala Lake", text: "On-water trial runs, with GPS-tagged water-quality readings mapped in SCRUB Observatory." },
  { when: "13 to 14 Oct 2026", title: "National press coverage", text: "India Today, Electronics For You and Asianet Kannada cover SCRUB V2." },
  { when: "29 Oct 2026", title: "Site survey at Doddathoguru Lake", text: "Electronic City survey for the next deployment." },
];

export interface Photo {
  src: string;
  alt: string;
  caption: string;
  /** credit shown for images that first appeared in the press or on social media */
  credit?: string;
  /** CSS object-position when the photo is cropped */
  focus?: string;
}

/** Best field photos and story covers, in display order. */
export const gallery: Photo[] = [
  { src: "/media/impact/madiwala-trial.webp", alt: "SCRUB on Madiwala Lake with ripples spreading around it", caption: "On-water trial at Madiwala Lake", credit: "SCRUB, 8 Sep 2026", focus: "50% 55%" },
  { src: "/media/impact/kengeri-reflection.webp", alt: "A SCRUB robot on a still lake, mirrored in the water", caption: "Field trial on a still lake", credit: "SCRUB" },
  { src: "/media/impact/v2-trees.webp", alt: "SCRUB V2 beside a tree-lined lake shore", caption: "SCRUB V2 along the lakeshore", credit: "Cover image: India Today" },
  { src: "/media/impact/madiwala-lake.webp", alt: "SCRUB V1 seen from above on Madiwala Lake", caption: "SCRUB V1 at Madiwala Lake", credit: "SCRUB, 8 Sep 2026", focus: "50% 50%" },
  { src: "/media/impact/story-startupro.webp", alt: "Startupro story cover about SCRUB's autonomous floating robots", caption: "Featured by Startupro", credit: "Startupro" },
  { src: "/media/impact/on-the-water.webp", alt: "SCRUB on calm water with the city skyline behind", caption: "Sweeping calm water", credit: "SCRUB video" },
  { src: "/media/impact/kengeri-test.webp", alt: "A SCRUB robot on brown water by a stone wall during a test run", caption: "Test run beside a lake wall", credit: "Cover image: Electronics For You" },
  { src: "/media/impact/v2-algae.webp", alt: "SCRUB V2 testing in green, algae-rich water", caption: "SCRUB V2 testing in algae-green water", credit: "SCRUB V2 testing video" },
  { src: "/media/impact/observatory-map.webp", alt: "SCRUB Observatory map of GPS-tagged water-quality readings on Madiwala Lake", caption: "SCRUB Observatory: Madiwala water-quality map", credit: "SCRUB" },
  { src: "/media/impact/v2-lab.webp", alt: "SCRUB V2 passive-intake prototype on the workshop bench", caption: "SCRUB V2 passive-intake prototype", credit: "SCRUB" },
];

export const youtubeId = "B9N0zEVcq4w";

/* ------------------------------ CONTACT ------------------------------ */

export const contact = {
  email: "team.scrub0415@gmail.com",
  location: "Bengaluru, Karnataka, India",
  enquiryTypes: [
    "Sponsorship or partnership",
    "Lake, municipal or BBMP pilot",
    "Campus, township or estate pond",
    "Media or press",
    "Join the team",
    "Something else",
  ],
};
