/**
 * Single source of truth for all portfolio content.
 * Edit this file to update copy anywhere on the site.
 *
 * Voice: short, plain sentences anyone can follow. One richer word now and
 * then is fine; a sentence that needs re-reading is not.
 */

export const site = {
  name: "Monu Raj",
  firstName: "Monu",
  role: "Software Engineer",
  tagline: "Engineer by training. Builder by instinct.",
  description:
    "Monu Raj is a software engineer focused on AI software and robotics. He co-founded CodeMasti and Monadnocks, is on the founding teams of NewtonBotics and MoreThanMe, works on drone R&D and has worked with IIT Roorkee on a Government of India project. He studies Computer Science & AI at Newton School of Technology.",
  email: "monu@codemasti.com",
  location: "Aurangabad, Bihar, India",
  timezone: "Asia/Kolkata",
  /** The public address of the site, used wherever a link must work outside the current deployment (emails). */
  domain: "https://monu.codemasti.com",
  /** Address of the running deployment (metadata, sitemap); falls back to the public domain. */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://monu.codemasti.com",
  portrait: "/myimage.png",
  links: {
    linkedin: "https://www.linkedin.com/in/monurajj/",
    codemasti: "https://www.codemasti.com/",
    newtonbotics: "https://www.newtonbotics.in/DashBoard",
    morethanme: "https://www.morethanme.in/",
    foundation: "https://foundation.monadnocks.in/",
    // TODO: replace with the verified personal GitHub profile URL.
    github: "https://github.com/monurajj",
    // TODO: drop a PDF at /public/Monu-Raj-Resume.pdf to enable the résumé link.
    resume: "/Monu-Raj-Resume.pdf",
  },
} as const;

export const nav = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "Experience", href: "#experience" },
  { label: "Projects", href: "#projects" },
  { label: "Skills", href: "#skills" },
  { label: "Beyond Tech", href: "#beyond" },
  { label: "Contact", href: "#contact" },
] as const;

export const hero = {
  status: "Open to AI software & robotics roles · Batch of 2027",
  headline: "Monu Raj",
  ghost: "Monu",
  subline: "AI software & robotics · engineer by training, builder by instinct",
  rail: { role: "AI software & robotics", year: "2026" },
  roles: ["AI Software & Robotics Engineer", "Co-Founder & CEO, CodeMasti", "R&D Engineer, UUPL"],
  intro:
    "I'm Monu Raj. I build AI software and robots: an ed-tech company, drone prototypes and shipped products, while studying Computer Science & AI.",
  stats: [
    { value: "20", label: "Businesses taken online" },
    { value: "4", label: "Ventures co-founded" },
  ],
} as const;

export const about = {
  title: "I turn ideas into *working products.*",
  lead: "I study Computer Science & AI and build AI software and robots. I like taking an idea and turning it into something people can actually use.",
  /** Short lines instead of a paragraph: scannable at a glance. */
  story: [
    { year: "2023", text: "Started at Newton School of Technology. First-year software developer with IIT Roorkee on a Government of India project." },
    { year: "2025", text: "Software engineering intern at PsyTech.ai. Turned an idea into a shipped product." },
    { year: "2026", text: "Co-founded CodeMasti. Joined Utsedha Unmanned as a drone R&D engineer." },
    { year: "Along the way", text: "Founded Monadnocks and Monadnocks Foundation. Founding member of NewtonBotics and the MoreThanMe NGO." },
  ],
  closing: "I learn best by building. Try it, test it, improve it, repeat.",
  facts: [
    { k: "Based in", v: "Aurangabad, Bihar · India" },
    { k: "Education", v: "B.Tech, Computer Science & AI" },
    { k: "Institution", v: "Newton School of Technology (Delhi NCR)" },
    { k: "Batch", v: "2023 — 2027" },
    { k: "Focus", v: "AI software · Robotics" },
  ],
  currently: [
    { label: "Co-Founder & CEO", at: "CodeMasti" },
    { label: "R&D Engineer", at: "Utsedha Unmanned Pvt. Ltd." },
    { label: "Founder", at: "Monadnocks" },
    { label: "B.Tech student", at: "Newton School of Technology" },
  ],
  principles: [
    { title: "Learn deeply", body: "Understand the system before writing code." },
    { title: "Build practically", body: "A working prototype beats a perfect plan." },
    { title: "Work in the open", body: "Teams that share what they know win." },
    { title: "Keep improving", body: "Every build is feedback. Use it." },
  ],
  marquee: [
    "Software Engineering",
    "Artificial Intelligence",
    "Robotics",
    "Drones",
    "EdTech",
    "Product",
    "Entrepreneurship",
    "Web Development",
    "Community",
  ],
} as const;

export type Experience = {
  company: string;
  role: string;
  period: string;
  affiliation?: string;
  summary: string;
  scope: readonly string[];
  tags: readonly string[];
  link?: string;
  current?: boolean;
};

export const experience: readonly Experience[] = [
  {
    company: "Utsedha Unmanned Pvt. Ltd.",
    role: "R&D Engineer",
    period: "2026 — Present",
    affiliation: "Drones and unmanned aerial systems · work associated with IIT Ropar",
    summary:
      "I work on drones. The main project is a drone that paints walls. We took it from a first prototype into a second, improved version.",
    scope: [
      "Building and testing multirotor drone prototypes.",
      "Wall-painting drone: payload, power and putting the hardware together.",
      "Weighing trade-offs between frame layouts, batteries and parts.",
      "Earned a pre-placement offer (PPO) in R&D engineering.",
      "Represented IIT Ropar at the national level.",
    ],
    tags: ["Aerial Robotics", "Prototyping", "System Integration", "Hardware"],
    current: true,
  },
  {
    company: "CodeMasti",
    role: "Co-Founder & CEO",
    period: "2026 — Present",
    affiliation: "Education technology · Classes 5–12",
    summary:
      "CodeMasti teaches school students coding and AI by having them build real projects. I look after the product, the curriculum, strategy and school partnerships.",
    scope: [
      "Product and technology for the learning platform.",
      "Curriculum for coding, AI and project-based programs.",
      "Business strategy, pricing and partnerships with schools.",
      "Finished the first student batch; run the team and key decisions.",
    ],
    tags: ["Product", "EdTech", "Curriculum", "Strategy", "Leadership"],
    link: "https://www.codemasti.com/",
    current: true,
  },
  {
    company: "PsyTech.ai",
    role: "Software Engineering Intern",
    period: "Jan 2025 — Jul 2025",
    summary:
      "I took an idea from a whiteboard sketch to a working product that the team could use. Scoped it, built it, shipped it.",
    scope: [
      "Turned a raw idea into a shipped product.",
      "Built the software end to end: design, code, testing.",
      "Worked with the team to shape what the product should do.",
    ],
    tags: ["Python", "Product Building", "Software Engineering"],
  },
  {
    company: "IIT Roorkee",
    role: "Software Developer",
    period: "2023 — 2024 · First year",
    affiliation: "Government of India project",
    summary:
      "In my first year of college I worked with IIT Roorkee as a software developer on a Government of India project. It was my first time writing software that real people depended on.",
    scope: [
      "Software development on a government project.",
      "Working alongside IIT Roorkee researchers and engineers.",
      "Learning to ship reliable code under real deadlines.",
    ],
    tags: ["Software Development", "IIT Roorkee", "Government Project"],
  },
  {
    company: "Monadnocks",
    role: "Founder · Web & Digital",
    period: "Earlier",
    summary:
      "I started Monadnocks to help small businesses get online. So far it has taken more than 20 businesses from no website to a live one.",
    scope: [
      "Websites and online presence for clients.",
      "End-to-end delivery: scope, design, build, launch.",
    ],
    tags: ["Web Development", "React", "Next.js", "Client Work"],
    link: "https://solution.monadnocks.in/",
  },
] as const;

export type Project = {
  slug: string;
  index: string;
  title: string;
  category: string;
  status: string;
  description: string;
  highlights: readonly string[];
  tags: readonly string[];
  link?: string;
  size: "large" | "medium";
  /** Which procedural cover art to render. */
  art: "codemasti" | "drone" | "nidar" | "robotics";
};

export const projects: readonly Project[] = [
  {
    slug: "codemasti",
    index: "01",
    title: "CodeMasti",
    category: "EdTech · Product",
    status: "Live · Co-Founder & CEO",
    description:
      "A learning platform and company for students in Classes 5 to 12. Live and recorded classes, assignments, progress tracking, monthly tests and school partnerships. Everything is built around one idea: students learn technology by building with it.",
    highlights: [
      "Structured coding and AI programs",
      "Progress tracking and assessments",
      "Sold directly to students and through schools",
    ],
    tags: ["Next.js", "React", "Product Design", "Curriculum"],
    link: "https://www.codemasti.com/",
    size: "large",
    art: "codemasti",
  },
  {
    slug: "wall-painting-drone",
    index: "02",
    title: "Wall-Painting Drone",
    category: "Robotics · R&D",
    status: "Phase II in development",
    description:
      "A drone built to paint walls. It started as a first prototype and is now in its second version. The hard parts are balancing the weight it carries, the battery it needs and how all the hardware fits together.",
    highlights: [
      "Multirotor platform design",
      "Payload and power budgeting",
      "Prototype to Phase II",
    ],
    tags: ["Multirotor", "Payload Systems", "Batteries", "Integration"],
    link: "https://www.utsedha.com/",
    size: "large",
    art: "drone",
  },
  {
    slug: "nidar-2025",
    index: "03",
    title: "NIDAR 2025",
    category: "Drones · AI",
    status: "National drone competition · Team",
    description:
      "NIDAR is a national innovation challenge for drone applications and research. I worked with my team on the hardware and the AI: training detection models and running YOLO on the drone so it could see and react on its own.",
    highlights: ["Hardware build and integration", "Model training", "YOLO object detection on-board"],
    tags: ["YOLO", "Computer Vision", "Model Training", "Drone Hardware"],
    link: "https://www.nidar.org.in/",
    size: "medium",
    art: "nidar",
  },
  {
    slug: "newtonbotics",
    index: "04",
    title: "NewtonBotics",
    category: "Robotics · Community",
    status: "Founding team",
    description:
      "The robotics club at Newton School of Technology. I'm part of the founding team. It's a place for students to build robots, work on real engineering problems and learn by doing.",
    highlights: ["Community building", "Robotics projects", "Club dashboard and website"],
    tags: ["Robotics", "Leadership", "Community"],
    link: "https://www.newtonbotics.in/DashBoard",
    size: "medium",
    art: "robotics",
  },
] as const;

export type SkillGroup = {
  title: string;
  icon: "code" | "brain" | "cpu" | "briefcase";
  blurb: string;
  items: readonly string[];
};

export const skills: readonly SkillGroup[] = [
  {
    title: "Software Engineering",
    icon: "code",
    blurb: "Web apps, frontends and shipped products.",
    items: [
      "Python",
      "JavaScript",
      "TypeScript",
      "React",
      "Next.js",
      "Tailwind CSS",
      "Product building",
    ],
  },
  {
    title: "AI & Computer Science",
    icon: "brain",
    blurb: "The fundamentals, and how to teach them.",
    items: [
      "Artificial intelligence",
      "Machine learning",
      "Data analytics",
      "Data mining",
      "Computational thinking",
      "Algorithms",
      "Technology education",
    ],
  },
  {
    title: "Robotics & Engineering",
    icon: "cpu",
    blurb: "From calculations to a flying prototype.",
    items: [
      "Drone technology",
      "Multirotor systems",
      "Hardware prototyping",
      "Engineering calculations",
      "System integration",
    ],
  },
  {
    title: "Product & Business",
    icon: "briefcase",
    blurb: "Building the product, and the company around it.",
    items: [
      "Product development",
      "Curriculum design",
      "Startup operations",
      "School partnerships",
      "Team collaboration",
      "Community initiatives",
      "Election campaign management",
    ],
  },
] as const;

export const techMarquee = [
  "Python",
  "JavaScript",
  "TypeScript",
  "React",
  "Next.js",
  "Tailwind CSS",
  "Three.js",
  "Node.js",
  "Git",
  "YOLO",
  "Data Analytics",
  "Multirotor UAS",
  "Prototyping",
  "Product Strategy",
  "Curriculum Design",
] as const;

export type BeyondItem = {
  title: string;
  kicker: string;
  body: string;
  bullets?: readonly string[];
  link?: string;
  icon: "bot" | "handHeart" | "trophy" | "globe" | "vote";
  span: "wide" | "normal";
};

export const beyond: readonly BeyondItem[] = [
  {
    title: "MoreThanMe",
    kicker: "Founding member · NGO",
    body: "An NGO we started in college to help the underprivileged villages around us. Founded on one idea: we owe more than ourselves. We run learning support, supplies and community drives for children and families who need them most.",
    bullets: ["Founding member", "Village outreach", "Education support", "Community drives"],
    link: "https://www.morethanme.in/",
    icon: "handHeart",
    span: "normal",
  },
  {
    title: "Monadnocks Foundation",
    kicker: "Founder · Non-profit",
    body: "A foundation I started in my own village to help people in tier 2 and tier 3 cities in every way we can: education, sports, women's empowerment and community events like the NCM Championship 2026.",
    bullets: ["Founder", "Education", "Sports", "Women's empowerment", "NCM Championship 2026"],
    link: "https://foundation.monadnocks.in/",
    icon: "trophy",
    span: "normal",
  },
  {
    title: "Panchayat Election Campaign",
    kicker: "Campaign manager",
    body: "Planned and ran my father's panchayat election campaign from start to finish: the strategy, the team of volunteers, outreach across villages and polling-day logistics.",
    bullets: ["Strategy", "Volunteer team", "Village outreach", "Polling-day ops"],
    icon: "vote",
    span: "normal",
  },
] as const;

/** Feature section for Monadnocks Digital Solutions. */
export const monadnocks = {
  handle: "@monurajj",
  avatar: "/myimage.png",
  portrait: "/monu-sitting-full.png",
  left: "If your business isn't online,",
  right: "who will find you?",
  name: "Monadnocks Digital Solutions",
  body: "Monadnocks is the web studio I founded to take small businesses online. We plan, design, build and launch, then keep the site running.",
  stat: { value: "20+", label: "businesses taken online" },
  services: ["Business websites", "Landing pages", "Digital presence", "Launch & upkeep"],
  url: "https://solution.monadnocks.in/",
  cta: { label: "Visit Monadnocks", href: "https://solution.monadnocks.in/" },
} as const;

export const milestones = [
  "Earned a pre-placement offer in R&D engineering at Utsedha Unmanned Pvt. Ltd., where I represented IIT Ropar at the national level.",
  "Worked with IIT Roorkee as a software developer on a Government of India project, in my first year of college.",
  "Took a wall-painting drone through its first prototype and into Phase II.",
  "Finished the first CodeMasti student batch.",
  "Started direct partnerships with schools for CodeMasti.",
  "Took 20+ small businesses online through Monadnocks.",
  "Co-founded the NewtonBotics robotics club.",
  "Founded Monadnocks Foundation in my village to support education, sports and women's empowerment in tier 2 and 3 cities.",
  "Founding member of MoreThanMe, an NGO started in college to help underprivileged villages nearby.",
  "Planned and ran my father's panchayat election campaign end to end.",
] as const;

export const contact = {
  title: "Let's build *something useful.*",
  body: "I want to grow as an engineer working on AI software and robotics, on products that matter, with teams that like to experiment. If that sounds like you, say hello.",
} as const;

export const builtWith = ["Next.js 16", "TypeScript", "Three.js", "React Three Fiber", "Motion", "Tailwind CSS"] as const;
