"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { posts, team } from "./data";

const values = [
  ["Curious", "We ask better questions before reaching for answers. Curiosity helps us understand what is really happening, rather than simply measuring what is easiest to count."],
  ["Creative", "We challenge convention and look for fresh, practical ways forward. Sometimes the answer is a framework. Sometimes it is research, a new tool or an idea nobody had considered yet."],
  ["Evidence-led", "Imagination matters. So does being able to prove what you say. We want evidence that is useful, proportionate and robust enough to stand up to scrutiny."],
  ["Human", "Behind every number is a person, a community and a story. Data matters enormously. We just never want to forget what the data is actually about."],
  ["Dynamic", "We move quickly, learn as we go and prefer progress to paperwork. Social impact should help organisations act, not bury them beneath another layer of process."],
  ["Tech-savvy", "We use AI and smart technology where it makes the work better, faster or more useful. Not because it is fashionable. Because used well, technology can reduce the boring work and leave more time for thinking."],
] as const;

const audiences = [
  ["Investors & development finance", "You need to know whether your capital is actually creating the change it was intended to create.", "We help investors and development finance organisations define, measure and understand impact, including social impact due diligence before investment and ongoing impact assessment afterwards. The result is stronger decision-making, clearer evidence and more credible reporting."],
  ["Social enterprises & B Corps", "Purpose may be built into your organisation, but proving your impact as you grow is harder.", "We help turn purpose into a practical management approach, with the evidence and systems to understand what is working and communicate it credibly."],
  ["NGOs & charities", "You may have an amazing purpose and be doing extraordinary work. The challenge is proving that the difference you are making will have a lasting impact.", "That is where we help. We work with charities and NGOs to understand what is changing, build credible evidence and communicate impact clearly to funders, trustees, regulators, supporters and the communities they serve."],
  ["Corporates & brands", "Customers are questioning corporate claims. Greenwashing and impact-washing have made trust harder to earn.", "We help organisations find genuine purpose, understand the impact behind their claims and communicate it credibly to build trust."],
] as const;

const services = [
  ["Impact strategy & measurement", "Clarifying what you are trying to achieve, how change happens and what is worth measuring."],
  ["Organisational learning & evaluation", "Using evidence to understand what is working, what isn’t and what to do differently."],
  ["Impact reporting", "Turning evidence into clear, credible reporting that people can actually understand."],
  ["Social Impact Excellence", "Strengthening purpose, leadership, data, delivery and communications."],
  ["Social Impact Claims", "Helping organisations make claims that are meaningful, proportionate and credible."],
  ["Capability building & training", "Helping teams develop the confidence and skills to manage impact themselves."],
  ["Tools & process design", "Using technology, including AI, to make social impact work simpler, quicker and more useful."],
] as const;

const products = [
  {
    name: "Social Impact Excellence™",
    kicker: "Flagship product",
    logo: "/assets/social-impact-excellence.svg",
    logoWidth: 1002,
    logoHeight: 693,
    logoClass: "logo-landscape",
    className: "flagship",
    lead: "A practical framework for organisations that want to get better at social impact, not simply report more of it.",
    copy: "Bringing purpose, leadership, evidence, delivery and communication together in one approach.",
    href: "/social-impact-excellence",
  },
  {
    name: "Charity Impact Reports",
    kicker: "Stronger evidence. Clearer storytelling.",
    logo: "/assets/charity-impact-reports-transparent.png",
    logoWidth: 852,
    logoHeight: 856,
    logoClass: "logo-square",
    className: "charity-product",
    lead: "A clearer way for charities to explain the difference they make.",
    copy: "Credible, accessible impact reporting that brings together strategy, evidence, outcomes and stories.",
    href: "/social-impact-report",
  },
  {
    name: "Festival Impact Reports",
    kicker: "Impact for culture and events",
    logo: "/assets/festival-impact-reports.svg",
    logoWidth: 2400,
    logoHeight: 988,
    logoClass: "logo-festival",
    className: "festival-product",
    lead: "Helping festivals and cultural and community events understand the difference they make.",
    copy: "We measure their economic, social and environmental impact, turning evidence into clearer decisions, stronger funding cases and credible stories.",
    href: null,
  },
  {
    name: "Social Impact Claims Code",
    kicker: "The principles behind everything we do",
    logo: "/assets/social-impact-claims-code-transparent.png",
    logoWidth: 1078,
    logoHeight: 1090,
    logoClass: "logo-square",
    className: "claims-product",
    lead: "Because good intentions don’t automatically make an impact claim a good one.",
    copy: "A practical framework for making social impact claims clearer, more credible and easier to trust.",
    href: "/social-impact-claims-code",
  },
] as const;

const organisations = [
  { name: "Interim Spaces", logo: "/assets/clients/interim-spaces.jpg", width: 1920, height: 1920, className: "client-square" },
  { name: "Brook", logo: "/assets/clients/brook.png", width: 979, height: 220, className: "client-wide" },
  { name: "Bean About Town", logo: "/assets/clients/bean-about-town.png", width: 957, height: 762, className: "client-square" },
  { name: "The Wild Ones", logo: "/assets/clients/the-wild-ones.png", width: 402, height: 383, className: "client-square" },
  { name: "Traidcraft", logo: "/assets/clients/traidcraft.png", width: 942, height: 1024, className: "client-tall" },
  { name: "AgriEvolve", logo: "/assets/clients/agrievolve.png", width: 173, height: 100, className: "client-wide" },
  { name: "Diageo", logo: "/assets/clients/diageo.png", width: 226, height: 49, className: "client-wide" },
  { name: "Kyoto Foundation", logo: "/assets/clients/kyoto-foundation.png", width: 992, height: 711, className: "client-landscape" },
  { name: "Crouch End Festival", logo: "/assets/clients/crouch-end.png", width: 352, height: 276, className: "client-landscape" },
  { name: "Stroke Association", logo: "/assets/clients/stroke-association.png", width: 300, height: 143, className: "client-wide" },
] as const;

function BrandMark({ small = false }: { small?: boolean }) {
  return (
    <span className={small ? "brand brand-small" : "brand"} role="img" aria-label="My Social Impact">
      <span>MY</span><span>SOCIAL</span><span>IMPACT</span>
    </span>
  );
}

function Spray({ className }: { className: string }) {
  return <span className={`spray ${className}`} aria-hidden="true"><i /></span>;
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("menu-is-open", open);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("menu-is-open");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const navigation = [
    { href: "/social-impact-excellence", label: "Social Impact Excellence", note: "Our flagship methodology" },
    { href: "/social-impact-report", label: "Charity Impact Reports", note: "Stronger evidence. Clearer storytelling." },
    { href: "/social-impact-claims-code", label: "Social Impact Claims Code", note: "Make claims people can trust" },
    { href: "/blog", label: "Blog", note: "Ideas, evidence and useful provocations" },
  ];

  return (
    <header className={`site-header ${scrolled ? "is-scrolled" : ""} ${open ? "is-menu-open" : ""}`}>
      <Link href="/" className="header-brand" aria-label="My Social Impact home">
        <Image className="header-logo" src="/assets/my-social-impact-horizontal.png" alt="" width={1088} height={124} priority unoptimized />
      </Link>
      <button className={`menu-button ${open ? "is-open" : ""}`} onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-label="Toggle menu"><span /><span /></button>
      <nav className={open ? "nav-open" : ""} aria-label="Main navigation">
        {navigation.map((item, index) => {
          const current = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className={current ? "is-current" : ""} aria-current={current ? "page" : undefined} onClick={() => setOpen(false)}>
              <span className="nav-number">{String(index + 1).padStart(2, "0")}</span>
              <span className="nav-copy"><span className="nav-label">{item.label}</span><span className="nav-note">{item.note}</span></span>
              <span className="nav-arrow" aria-hidden="true">↗</span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <BrandMark small />
        <p>Strategy for Social Impact Excellence</p>
      </div>
      <div className="footer-ideas">
        <p className="footer-kicker">Website built by</p>
        <h2><a href="https://www.theideasshed.com/" target="_blank" rel="noreferrer">The Ideas Shed ↗</a></h2>
        <p>A creative venture studio that turns promising ideas into practical projects, tools and businesses.</p>
        <blockquote>Imagine a world where curiosity and creativity were valued as highly as certainty.</blockquote>
        <a className="footer-address" href="https://www.theideasshed.com/" target="_blank" rel="noreferrer">www.theideasshed.com ↗</a>
      </div>
      <div className="footer-bottom">
        <div className="footer-links"><Link href="/">Home</Link><Link href="/blog">Blog</Link><Link href="/#contact">Contact</Link><a href="https://www.linkedin.com/company/my-social-impact" target="_blank" rel="noreferrer">LinkedIn ↗</a></div>
        <p className="footer-meta">© {new Date().getFullYear()} My Social Impact</p>
      </div>
    </footer>
  );
}

export function RevealObserver() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    document.documentElement.classList.add("motion-ready");
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    }), { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    document.querySelectorAll("[data-reveal]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  return null;
}

export function SectionLabel({ children, major = false }: { children: React.ReactNode; major?: boolean }) {
  return major ? <p className="section-marker">{children}</p> : <p className="eyebrow"><span />{children}</p>;
}

const homeSections = [
  ["introduction", "About", ["introduction", "who-we-help", "better-tools"]],
  ["products", "Products", ["products"]],
  ["values", "How we show up", ["values"]],
  ["what-we-do", "What we do", ["what-we-do"]],
  ["approach", "How we work", ["approach", "working-with-us"]],
  ["team", "People", ["organisations", "team"]],
  ["insights", "Thinking", ["insights"]],
  ["ecosystem", "Ecosystem", ["ecosystem", "promise"]],
  ["contact", "Contact", ["contact", "newsletter"]],
] as const;

function SectionNavigation() {
  const [active, setActive] = useState("");

  useEffect(() => {
    const update = () => {
      const readingLine = window.innerHeight * .38;
      const candidates = homeSections.flatMap(([navId, , sectionIds]) => sectionIds.map((sectionId) => ({ navId, element: document.getElementById(sectionId) }))).filter((item) => item.element) as { navId: string; element: HTMLElement }[];
      const entered = candidates.filter(({ element }) => element.getBoundingClientRect().top <= readingLine);
      setActive(entered.length ? entered[entered.length - 1].navId : "");
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  useEffect(() => {
    document.querySelector<HTMLAnchorElement>(`.section-navigation a[href="#${active}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [active]);

  return (
    <nav className="section-navigation" aria-label="Homepage sections">
      <div>
        {homeSections.map(([id, label]) => <a key={id} className={active === id ? "is-active" : ""} href={`#${id}`} aria-current={active === id ? "location" : undefined}>{label}</a>)}
      </div>
    </nav>
  );
}

function ProductCard({ product, index }: { product: typeof products[number]; index: number }) {
  const content = (
    <>
      <div className="product-trigger">
        <span className="product-number">0{index + 1}</span>
        <span className="product-heading"><h3 className="product-name">{product.name}</h3><span className="product-kicker">{product.kicker}</span></span>
      </div>
      <div className="product-preview">
        <div className={`product-mark ${product.logoClass}`}>
          <div className="product-logo-stage">
            <Image src={product.logo} alt={`${product.name} logo`} width={product.logoWidth} height={product.logoHeight} unoptimized />
          </div>
          {index === 0 && <div className="product-credentials" aria-label="Social Impact Excellence certifications">
            <Image className="bcorp-logo" src="/assets/b-corp-logo-black.png" alt="Certified B Corporation" width={500} height={731} unoptimized />
            <Image className="impact-certified-logo" src="/assets/certified-for-impact-2026.png" alt="Social Impact Excellence — Certified for Impact 2026" width={1501} height={1048} unoptimized />
          </div>}
        </div>
        <div className="product-summary"><p className="product-lead">{product.lead}</p><p>{product.copy}</p>{product.href && <span className="product-link">Explore {product.name.replace("™", "")} <b>→</b></span>}</div>
      </div>
    </>
  );

  return product.href ? <a className={`product-card ${product.className}`} href={product.href} data-reveal style={{ "--delay": `${index * 70}ms` } as React.CSSProperties}>{content}</a> : <article className={`product-card ${product.className}`} data-reveal style={{ "--delay": `${index * 70}ms` } as React.CSSProperties}>{content}</article>;
}

export function ArticleCard({ post, index = 0 }: { post: typeof posts[number]; index?: number }) {
  return (
    <Link className="article-card" href={post.href} data-reveal style={{ "--delay": `${index * 80}ms` } as React.CSSProperties}>
      <div className={`article-image ${post.image ? "" : "article-image-empty"}`}>{post.image ? <Image src={post.image} alt="" fill sizes="(max-width: 760px) 100vw, 33vw" unoptimized /> : <span className="article-placeholder">My Social<br />Impact</span>}<span className="article-read">Read article →</span></div>
      <p className="article-meta">{post.category} · {post.date}</p>
      <h3>{post.title}</h3>
      <p>{post.excerpt}</p>
    </Link>
  );
}

function Newsletter() {
  const [sent, setSent] = useState(false);
  const submit = (event: FormEvent) => { event.preventDefault(); setSent(true); };
  return (
    <section className="newsletter major-section" id="newsletter" data-reveal>
      <div><SectionLabel major>Stay in the loop</SectionLabel><h2>Newsletter.</h2></div>
      <div><p className="newsletter-lead">Interesting ideas about social impact. Occasionally even useful ones.</p><p>Our newsletter brings together new thinking, practical ideas, research and things we’ve spotted in the world of social impact.</p><p>No relentless marketing emails. No pretending that every minor company announcement is fascinating.</p><p>Just things we genuinely think are worth sharing.</p>
        {sent ? <p className="success" role="status">Thank you. You’re on the list.</p> : <form onSubmit={submit}><label className="sr-only" htmlFor="email">Email address</label><input id="email" type="email" placeholder="Email address" required /><button type="submit">Subscribe <span>→</span></button></form>}
      </div>
    </section>
  );
}

function LocationJourney() {
  return (
    <div className="location-journey" data-reveal>
      <Image className="location-journey-desktop" src="/location-journey-contemporary-v2.png" alt="A contemporary line illustration travelling from the Somerset countryside, through London, to Uganda, with a giraffe and a distant orange Land Rover" width={1981} height={793} unoptimized />
      <div className="location-journey-mobile" role="img" aria-label="An editorial ink journey from Somerset to London to Uganda">
        <span className="journey-crop journey-somerset"><b>Somerset</b></span>
        <span className="journey-crop journey-london"><b>London</b></span>
        <span className="journey-crop journey-uganda"><b>Uganda</b></span>
      </div>
    </div>
  );
}

function ContactLocations() {
  const locations = [
    ["Somerset", ["The Offices", "10 Marketplace", "Shepton Mallet", "Somerset", "BA4 5AZ", "United Kingdom"]],
    ["London", ["PopHub Leicester Square", "Floors 1 & 2", "41 Whitcomb Street", "London", "WC2H 7DT", "United Kingdom"]],
    ["Kampala", ["The Wild Ones", "Tank Hill Road", "Muyenga", "Kampala", "Uganda"]],
  ] as const;

  return (
    <section className="contact-locations section-pad major-section" id="contact">
      <div className="section-intro contact-intro" data-reveal>
        <SectionLabel major>Contact</SectionLabel>
        <h2>Three places.<br />One team.</h2>
        <div className="contact-actions">
          <p>We work between Somerset, London and Kampala, bringing different perspectives, experiences and ideas into the work we do.</p>
          <p><strong>Have something interesting to talk about?</strong></p>
          <p>We’d love to hear about it.</p>
          <a className="contact-email-link" href="mailto:marcus@mysocialimpact.org">marcus@mysocialimpact.org <span>↗</span></a>
          <a className="whatsapp-link" href="https://wa.me/447879812789" target="_blank" rel="noreferrer">WhatsApp us <span>↗</span></a>
        </div>
      </div>
      <div className="locations-grid">
        {locations.map(([name, address], index) => <article className="location-column" key={name} data-reveal style={{ "--delay": `${index * 80}ms` } as React.CSSProperties}><span>0{index + 1}</span><h3>{name}</h3><address>{address.map((line) => <span key={line}>{line}</span>)}</address></article>)}
      </div>
      <LocationJourney />
    </section>
  );
}

export function HomePage() {
  return (
    <><RevealObserver /><SiteHeader /><SectionNavigation /><main className="home-page">
      <section className="hero major-section" id="vision">
        <Spray className="spray-hero-pink" />
        <div className="hero-brand" data-reveal><BrandMark /><p>Strategy for Social Impact Excellence</p></div>
        <div className="hero-vision" data-reveal style={{ "--delay": "100ms" } as React.CSSProperties}><SectionLabel major>Our vision</SectionLabel><h1>Imagine a world where social impact was taken as seriously as financial performance.</h1><p>That’s the world we’re working for.</p></div>
        <a className="scroll-cue" href="#introduction" aria-label="Scroll to introduction"><span />Explore</a>
      </section>

      <section className="introduction split-section major-section" id="introduction">
        <div data-reveal><SectionLabel major>About</SectionLabel><h2>We help organisations understand the difference they make, make more of it, and show it credibly.</h2></div>
        <div className="intro-side" data-reveal style={{ "--delay": "100ms" } as React.CSSProperties}><p>We combine curiosity, creativity and rigour to turn evidence into better decisions, clearer stories and stronger impact.</p><div className="spray-quote"><Spray className="spray-quote-yellow" /><blockquote>Serious about impact.<br />Human about everything else.</blockquote></div></div>
      </section>

      <section className="audiences section-pad major-section" id="who-we-help">
        <div className="section-intro compact" data-reveal><SectionLabel major>Who we help</SectionLabel><h2>Different organisations. Different pressures. The same need for credible impact.</h2></div>
        <div className="audiences-grid">{audiences.map(([name, lead, body], index) => <article key={name} data-reveal style={{ "--delay": `${index * 70}ms` } as React.CSSProperties}><span>0{index + 1}</span><h3>{name}</h3><p className="audience-lead">{lead}</p><p>{body}</p></article>)}</div>
      </section>

      <section className="better-tools section-pad major-section" id="better-tools" data-reveal>
        <SectionLabel major>How we think</SectionLabel>
        <h2>Better tools.<br />Clearer thinking.<br />Stronger evidence.</h2>
        <div className="editorial-copy"><p>Social impact can get complicated very quickly. We try to make it simpler.</p><p>That means asking better questions, finding the evidence that actually matters and creating practical ways for organisations to understand, improve and communicate their impact.</p><p>We don’t believe in measurement for measurement’s sake. The point is to learn, make better decisions and ultimately create more impact.</p></div>
      </section>

      <section className="products section-pad major-section" id="products">
        <Spray className="spray-products-orange" />
        <div className="section-intro" data-reveal><SectionLabel major>Products</SectionLabel><h2>We don’t just advise.<br />We build things.</h2><p>We develop practical tools, frameworks and approaches that make social impact easier to understand, improve and communicate.</p></div>
        <div className="product-showcase">
          <ProductCard product={products[0]} index={0} />
          <div className="product-grid">
            {products.slice(1).map((product, index) => <ProductCard key={product.name} product={product} index={index + 1} />)}
          </div>
        </div>
      </section>

      <section className="values section-pad major-section" id="values">
        <div className="section-intro compact" data-reveal><SectionLabel major>How we show up</SectionLabel><h2>How we work matters almost as much as what we do.</h2></div>
        <div className="values-grid">{values.map(([name, body], i) => <article key={name} data-reveal style={{ "--delay": `${i * 55}ms` } as React.CSSProperties}><span>0{i + 1}</span><h3>{name}</h3><p>{body}</p></article>)}</div>
      </section>

      <section className="practice-sections">
        <article className="practice-feature what-we-do section-pad major-section" id="what-we-do" data-reveal><SectionLabel major>What we do</SectionLabel><h2>We work with mission-driven organisations that want to understand their impact and create more of it.</h2><p className="practice-intro">Our work ranges from focused research and reporting to longer-term support embedding social impact across an organisation.</p><ul>{services.map(([title, copy]) => <li key={title}><strong>{title}</strong><span>{copy}</span></li>)}</ul></article>
        <article className="practice-feature approach-feature section-pad major-section" id="approach" data-reveal><SectionLabel major>How we work</SectionLabel><p className="practice-intro">Good social impact work starts with understanding the problem, not reaching immediately for a framework.</p><div className="approach-steps">{[["Listen & understand", "We start by listening properly: to the people involved, the context, the evidence already available and the questions that actually matter."],["Think & co-create", "We bring ideas, challenge assumptions and work with you to find an approach that fits."],["Act & deliver", "We turn thinking into something useful: a strategy, measurement framework, report, workshop, tool or better process."],["Measure & improve", "We use what we discover to help you learn, adapt and make better decisions next time."]].map(([title, copy], i) => <div className="approach-step" key={title}><span>0{i + 1}</span><h3>{title}</h3><p>{copy}</p></div>)}</div></article>
      </section>

      <section className="working section-pad major-section" id="working-with-us" data-reveal><Spray className="spray-working-pink" /><div className="working-layout"><SectionLabel major>Working with us</SectionLabel><h2>Collaborative.<br />Straightforward.<br />Thought-provoking.<br /><em>Occasionally quite funny.</em></h2><div className="working-copy editorial-copy"><p>We ask questions. We challenge assumptions. We say what we think. We also listen.</p><p>We want clients to enjoy working with us because good conversations tend to produce better thinking, and better thinking tends to produce better work.</p><p>We take the work seriously. We don’t always take ourselves quite so seriously.</p></div></div></section>

      <section className="organisations section-pad major-section" id="organisations">
        <div className="section-intro" data-reveal><SectionLabel major>Organisations</SectionLabel><h2>Some of the organisations we’ve worked with.</h2><p>Our team has worked with organisations across charities, social enterprise, business, international development, events and the creative industries.</p></div>
        <div className="organisation-list" data-reveal>{organisations.map((organisation, index) => <article className={`organisation-tile ${organisation.className}`} key={organisation.name}><b>{String(index + 1).padStart(2, "0")}</b><div className="organisation-logo-stage"><Image src={organisation.logo} alt={organisation.name} width={organisation.width} height={organisation.height} unoptimized /></div></article>)}</div>
      </section>

      <section className="team section-pad major-section" id="team">
        <div className="section-intro" data-reveal><SectionLabel major>People</SectionLabel><h2>Senior people,<br />directly involved.</h2><div className="section-support editorial-copy"><p>My Social Impact is a boutique consultancy, deliberately kept small and senior.</p><p>Our clients work directly with the people doing the thinking and the work.</p><p>We stay closely involved from the first conversation through to delivery. When a project needs additional specialist expertise, we bring in trusted professionals from our wider network.</p><p>It means we can remain experienced, flexible and close to the problem, without building unnecessary layers between our clients and us.</p></div></div>
        <div className="team-grid">{team.map((person, i) => <article className="profile-card" key={person.name} data-reveal style={{ "--delay": `${i * 100}ms` } as React.CSSProperties}><div className="portrait"><Image src={person.image} alt={person.name} fill sizes="(max-width: 760px) 100vw, (max-width: 1050px) 50vw, 33vw" unoptimized /></div><div className="profile-head"><div><h3>{person.name}</h3><p>{person.title}</p></div><a href={person.linkedin} target="_blank" rel="noreferrer" aria-label={`${person.name} on LinkedIn`}>in</a></div><div className="profile-bio">{person.bio.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div></article>)}</div>
        <p className="team-together">Together, the team combines strategy, finance, brand, communications, data and technology around a common question: how can organisations create more meaningful social impact?</p>
      </section>

      <section className="insights section-pad major-section" id="insights">
        <div className="section-intro compact" data-reveal><SectionLabel major>Thinking</SectionLabel><h2>The latest thinking from My Social Impact.</h2><p>We’re curious about where social impact is going next. Our thinking covers impact measurement, reporting, charity regulation, social impact claims, new approaches to evidence and the occasional idea that simply seemed too interesting not to explore.</p></div>
        <div className="articles-grid">{posts.slice(0, 3).map((post, index) => <ArticleCard key={post.href} post={post} index={index} />)}</div>
        <Link className="button-link" href="/blog">View all articles <span>→</span></Link>
      </section>

      <section className="ecosystem section-pad major-section" id="ecosystem">
        <div className="section-intro" data-reveal><SectionLabel major>Ecosystem</SectionLabel><h2>Specialists,<br />working together.</h2><div className="section-support editorial-copy"><p>Sometimes the right expertise sits outside the traditional consultancy model.</p><p>We work alongside specialist ventures and collaborators where their expertise can make the work better.</p></div></div>
        <div className="ecosystem-grid"><article data-reveal><div className="ecosystem-mark ideas"><Image src="/assets/ideas-shed-transparent.png" alt="The Ideas Shed — From ideas to action" width={1254} height={1251} unoptimized /></div><SectionLabel>The Ideas Shed</SectionLabel><h3>Turning ideas into action.</h3><p>The Ideas Shed explores new ideas, ventures and technologies, helping turn promising concepts into practical projects, tools and businesses.</p><p>Its work sits between strategy, creativity and experimentation: shaping early ideas, testing what has potential and finding clear routes from possibility to action.</p><p>We collaborate where a social impact challenge needs fresh thinking, a new product or a more imaginative way forward. That perspective helps keep innovation at the heart of My Social Impact.</p><p><a className="text-link" href="https://www.theideasshed.com/" target="_blank" rel="noreferrer">Explore The Ideas Shed →</a></p></article><article data-reveal style={{ "--delay": "90ms" } as React.CSSProperties}><div className="ecosystem-mark good"><Image src="/assets/good-numbers-transparent-cropped.png" alt="Good Numbers" width={1106} height={495} unoptimized /></div><SectionLabel>Good Numbers</SectionLabel><h3>Social impact accountants for a world in which the numbers need to tell more than half the story.</h3><p>Good Numbers brings accounting and social impact together, helping charities and purpose-led organisations connect financial reporting with a clearer understanding of the difference they create.</p><p>A particular focus is SORP 2026 and the changing expectations around how charities communicate impact alongside their financial reporting.</p><p>Good Numbers also works with accountancy firms, providing specialist social impact expertise that complements their existing charity accounting, audit and advisory relationships.</p><p><a className="text-link" href="#contact">Explore Good Numbers →</a></p></article></div>
      </section>

      <section className="promise major-section" id="promise" data-reveal><SectionLabel major>Our promise</SectionLabel><div><blockquote>We will challenge you, support you and partner with you to create social impact that is real, meaningful and recognised today and for tomorrow.</blockquote><p>Not more measurement for the sake of measurement.</p><p>Not another report destined for a shelf.</p><p><strong>Better understanding. Better decisions. More impact.</strong></p></div></section>
      <ContactLocations />
      <Newsletter />
    </main><Footer /></>
  );
}

export function BlogPage() {
  return <><RevealObserver /><SiteHeader /><main className="subpage"><header className="page-hero" data-reveal><Spray className="spray-page-pink" /><SectionLabel>Latest insights</SectionLabel><h1>Ideas, evidence<br />and action.</h1><p>The latest thinking from My Social Impact.</p></header><section className="blog-list"><div className="articles-grid">{posts.map((post, index) => <ArticleCard key={post.href} post={post} index={index % 3} />)}</div></section><Newsletter /></main><Footer /></>;
}

export function ContactPage() {
  const [sent, setSent] = useState(false);
  return <><RevealObserver /><SiteHeader /><main className="subpage"><section className="contact-page"><div data-reveal><SectionLabel>Contact</SectionLabel><h1>Let’s create<br />meaningful impact.</h1><p>Tell us what you’re working on, what you’re trying to change, or where you need greater clarity.</p><a className="contact-email" href="mailto:marcus@mysocialimpact.org">marcus@mysocialimpact.org ↗</a></div><div data-reveal style={{ "--delay": "100ms" } as React.CSSProperties}>{sent ? <div className="contact-success"><SectionLabel>Thank you</SectionLabel><h2>Your message is ready to make an impact.</h2><p>We’ll be in touch soon.</p></div> : <form className="contact-form" onSubmit={(e) => { e.preventDefault(); setSent(true); }}><label>Name<input type="text" required /></label><label>Email address<input type="email" required /></label><label>Organisation<input type="text" /></label><label>How can we help?<textarea rows={5} required /></label><button type="submit">Send enquiry <span>→</span></button></form>}</div></section></main><Footer /></>;
}
