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
    title: "Co-founder | Social Impact & Strategy",
    image: "/assets/marcus-final.jpg",
    linkedin: "https://www.linkedin.com/in/marcuswarry/",
    bio: [
      "Marcus is a Chartered Accountant and social impact consultant who has worked with charities, businesses and purpose-led organisations for many years.",
      "He combines financial and strategic thinking with a particular interest in impact strategy, reporting and innovation. He has been exploring new ways for organisations to understand and communicate social impact, including developing social impact statements and practical approaches to making impact evidence more useful.",
      "His focus is often on turning complicated questions into practical approaches that organisations can actually use.",
    ],
  },
  {
    name: "Dr Chris Arnold",
    title: "Co-founder | Brand, Purpose & Ethical Marketing",
    image: "/assets/chris-final.jpg",
    linkedin: "https://www.linkedin.com/in/dr-chris-arnold-2689004/",
    bio: [
      "Chris is a creative strategist, author and ethical marketing specialist with extensive experience helping organisations connect purpose, brand and positive social impact.",
      "A former Board Director at Saatchi & Saatchi, he has spent his career working across brand strategy, communications and creativity, with a particular interest in how organisations communicate purpose credibly and build trust. He is the author of Ethical Marketing and the New Consumer.",
      "At My Social Impact, Chris brings a creative and communications perspective to impact strategy, helping ensure that evidence is not only robust but understood.",
    ],
  },
  {
    name: "Nicholas Demeter",
    title: "International Development, Evaluation & Systems",
    image: "/assets/nicholas-final.jpg",
    linkedin: "https://ug.linkedin.com/in/nicholasdemeter",
    bio: [
      "Nicholas is an American international development specialist based in Kampala, with more than 20 years’ experience working across development programmes and donor-funded environments.",
      "His experience includes USAID-related work, programme design and delivery, monitoring and evaluation, localisation and systems thinking. He has also spent several years exploring how AI can strengthen research, programme design, delivery and learning.",
      "At My Social Impact, Nicholas brings deep on-the-ground experience of how impact programmes actually work—particularly in Uganda and international development.",
    ],
  },
  {
    name: "Gareth Murphy",
    title: "Data, Systems & Technology",
    image: "/assets/gareth-final.jpg",
    linkedin: "https://uk.linkedin.com/in/gareth-murphy-a706524",
    bio: [
      "Gareth is Managing Director of Fluid IT and brings deep expertise in technology, data and business systems. His work spans data architecture, CRM, digital transformation and the systems organisations need to turn information into something genuinely useful for management and decision-making.",
      "At My Social Impact, Gareth helps bridge the gap between impact ambition and the technology and data infrastructure required to support it, particularly where organisations need better systems for collecting, managing, analysing and reporting impact information.",
    ],
  },
] as const;
