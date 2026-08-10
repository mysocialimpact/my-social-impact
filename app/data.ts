import migratedPosts from "./blog/posts.json";

export type BlogPost = {
  slug: string;
  date: string;
  dateISO: string;
  title: string;
  excerpt: string;
  image: string | null;
  categories: string[];
  category: string;
  href: string;
};

export const posts = migratedPosts as BlogPost[];

export const team = [
  {
    name: "Marcus Warry",
    title: "Co-founder · Lead Social Impact Consultant & Account Director",
    image: "/assets/marcus-final.jpg",
    linkedin: "https://www.linkedin.com/in/marcuswarry/",
    quote:
      "I believe the impact economy is the future. And together, with data and technology, we can unlock better decisions, scale what works, and solve the social and environmental challenges of our time.",
    bio:
      "Chartered Accountant (ACA) with over twenty years’ experience helping organisations understand, evidence and communicate their impact. Marcus combines strategic thinking, finance, AI and innovation to help organisations make better decisions and create greater social value.",
  },
  {
    name: "Dr Chris Arnold",
    title: "Co-founder · Lead Creative Strategist",
    image: "/assets/chris-final.jpg",
    linkedin: "https://www.linkedin.com/in/dr-chris-arnold-2689004/",
    quote:
      "Brands have never faced greater scrutiny. The risk of greenwashing is real—and the reputational cost is rising. But so is the opportunity. Organisations that lead with integrity, back up their claims with evidence, and embed impact into the heart of their strategy won’t just avoid risk—they’ll build trust, strengthen their brand, and help shape a better future.",
    bio:
      "Chris is one of the UK’s leading thinkers on purpose-driven brands, helping organisations connect creativity, evidence and strategy to build trust and maximise social impact.",
  },
  {
    name: "Gareth Murphy",
    title: "Lead IT & Data Consultant · Managing Director, Fluid IT",
    image: "/assets/gareth-final.jpg",
    linkedin: "https://uk.linkedin.com/in/gareth-murphy-a706524",
    quote:
      "Data and AI have the power to transform how we understand the world and the problems within it. When we combine smart technology with human insight and purpose, we can turn complexity into clarity, drive better decisions, and create meaningful, measurable impact at scale.",
    bio:
      "Gareth specialises in AI, technology, data systems and digital transformation, helping organisations use technology responsibly to create better outcomes and stronger evidence.",
  },
] as const;
