"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { posts, team } from "./data";

const values = [
  ["Curious", "We ask better questions that lead to better answers."],
  ["Creative", "We challenge convention and find fresh, practical ways forward."],
  ["Evidence-led", "We combine imagination with rigour. Claims should stand up to scrutiny."],
  ["Human", "Behind every metric is a person, a community and a story. That never gets lost."],
  ["Dynamic", "We move quickly, adapt and focus on progress—not producing paperwork."],
  ["Tech-savvy", "We use AI and smart technology to improve quality, speed and value—not because it’s trendy."],
] as const;

const products = [
  {
    name: "Social Impact Excellence™",
    kicker: "Our flagship methodology",
    logo: "/assets/social-impact-excellence.svg",
    logoWidth: 1002,
    logoHeight: 693,
    logoClass: "logo-landscape",
    mark: null,
    className: "flagship",
    body: (
      <>
        <p>Social Impact Excellence™ helps organisations embed social impact as a management discipline.</p>
        <p>Designed for B Corps, businesses, brands, social enterprises and charities, it provides a practical framework for making better decisions, strengthening governance and creating more meaningful impact.</p>
        <p>Whether you’re pursuing B Corp certification, strengthening your ESG approach or putting impact at the heart of your organisation, Social Impact Excellence™ helps make impact part of everyday leadership rather than simply something that’s reported once a year.</p>
      </>
    ),
  },
  {
    name: "Charity Impact Reports",
    kicker: "Stronger evidence. Clearer storytelling.",
    logo: "/assets/charity-impact-reports.png",
    logoWidth: 1254,
    logoHeight: 1254,
    logoClass: "logo-square",
    mark: null,
    className: "",
    body: <p>Helping charities build stronger Trustees’ Annual Reports through better impact evidence, clearer storytelling and SORP 2026 readiness.<br /><br />We help charities understand the difference they make—not simply report what they do.</p>,
  },
  {
    name: "Festival Impact Reports",
    kicker: "Impact for culture and events",
    logo: "/assets/festival-impact-reports.svg",
    logoWidth: 2400,
    logoHeight: 988,
    logoClass: "logo-festival",
    mark: null,
    className: "",
    body: <p>A specialist service helping festivals and cultural events measure and communicate their social, cultural, environmental and economic impact.<br /><br /><a className="text-link" href="http://festivalimpact.org" target="_blank" rel="noreferrer">Learn more at festivalimpact.org ↗</a></p>,
  },
  {
    name: "Social Impact Claims Code",
    kicker: "The principles behind everything we do",
    logo: "/assets/social-impact-claims-code.png",
    logoWidth: 1254,
    logoHeight: 1254,
    logoClass: "logo-square",
    mark: null,
    className: "",
    body: <p>Helping organisations communicate social impact with credibility, transparency and confidence, while developing independent verification badges and certificates that build trust in the impact they communicate.</p>,
  },
] as const;

function BrandMark({ small = false }: { small?: boolean }) {
  return (
    <span className={small ? "brand brand-small" : "brand"} aria-label="My Social Impact">
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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`site-header ${scrolled ? "is-scrolled" : ""}`}>
      <Link href="/" className="header-brand" aria-label="My Social Impact home">
        <Image className="header-logo" src="/assets/my-social-impact-horizontal.png" alt="" width={1088} height={124} priority unoptimized />
      </Link>
      <button className={`menu-button ${open ? "is-open" : ""}`} onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-label="Toggle menu"><span /><span /></button>
      <nav className={open ? "nav-open" : ""} aria-label="Main navigation">
        <Link href="/" onClick={() => setOpen(false)}>Home</Link>
        <Link href="/#products" onClick={() => setOpen(false)}>Products</Link>
        <Link href="/#values" onClick={() => setOpen(false)}>Values</Link>
        <Link href="/#what-we-do" onClick={() => setOpen(false)}>Work</Link>
        <Link href="/#team" onClick={() => setOpen(false)}>Team</Link>
        <Link href="/#insights" onClick={() => setOpen(false)}>Insights</Link>
        <Link href="/#ecosystem" onClick={() => setOpen(false)}>Ecosystem</Link>
        <Link href="/blog" onClick={() => setOpen(false)}>Blog</Link>
        <Link href="/contact" onClick={() => setOpen(false)}>Contact</Link>
      </nav>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div><BrandMark small /><p>Strategy for Social Impact Excellence</p></div>
      <div className="footer-links"><Link href="/">Home</Link><Link href="/blog">Blog</Link><Link href="/contact">Contact</Link><a href="https://www.linkedin.com/company/my-social-impact" target="_blank" rel="noreferrer">LinkedIn ↗</a></div>
      <div className="footer-meta"><p>Ideas brought to action with <a href="https://www.theideasshed.com/" target="_blank" rel="noreferrer">The Ideas Shed ↗</a></p><p>© {new Date().getFullYear()} My Social Impact</p></div>
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

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="eyebrow"><span />{children}</p>;
}

function ProductCard({ product, index }: { product: typeof products[number]; index: number }) {
  return (
    <article className={`product-card ${product.className}`} data-reveal style={{ "--delay": `${index * 70}ms` } as React.CSSProperties}>
      <div className="product-trigger">
        <span className="product-number">0{index + 1}</span>
        <span className="product-heading"><h3 className="product-name">{product.name}</h3><span className="product-kicker">{product.kicker}</span></span>
      </div>
      <div className="product-expand">
        <div className="product-inner">
          <div className={`product-mark ${product.logoClass}`}>
            <Image src={product.logo} alt={`${product.name} logo`} width={product.logoWidth} height={product.logoHeight} unoptimized />
            {index === 0 && <div className="product-credentials" aria-label="Social Impact Excellence certifications">
              <Image className="bcorp-logo" src="/assets/b-corp-logo-black.png" alt="Certified B Corporation" width={500} height={731} unoptimized />
              <Image className="impact-certified-logo" src="/assets/certified-for-impact-2026.png" alt="Social Impact Excellence — Certified for Impact 2026" width={1501} height={1048} unoptimized />
            </div>}
          </div>
          <div className="product-copy">{product.body}</div>
        </div>
      </div>
    </article>
  );
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
    <section className="newsletter" id="newsletter" data-reveal>
      <div><SectionLabel>Newsletter</SectionLabel><h2>Stay in<br />the loop.</h2></div>
      <div><p>Sign up to receive practical insights on social impact, B Corps, SORP 2026, AI, impact reporting and the latest thinking from My Social Impact.</p>
        {sent ? <p className="success" role="status">Thank you. You’re on the list.</p> : <form onSubmit={submit}><label className="sr-only" htmlFor="email">Email address</label><input id="email" type="email" placeholder="Email address" required /><button type="submit">Subscribe <span>→</span></button></form>}
      </div>
    </section>
  );
}

export function HomePage() {
  return (
    <><RevealObserver /><SiteHeader /><main>
      <section className="hero">
        <Spray className="spray-hero-pink" />
        <div className="hero-brand" data-reveal><BrandMark /><p>Strategy for Social Impact Excellence</p></div>
        <div className="hero-vision" data-reveal style={{ "--delay": "100ms" } as React.CSSProperties}><SectionLabel>Our vision</SectionLabel><h1>Imagine a world where social impact was taken as seriously as financial performance.</h1></div>
        <a className="scroll-cue" href="#introduction" aria-label="Scroll to introduction"><span />Explore</a>
      </section>

      <section className="introduction split-section" id="introduction">
        <div data-reveal><SectionLabel>Introduction</SectionLabel><h2>We help organisations create more social impact, understand it deeply, prove it credibly and communicate it with confidence.</h2></div>
        <div className="intro-side" data-reveal style={{ "--delay": "100ms" } as React.CSSProperties}><p>We bring curiosity, creativity and rigour to everything we do—so you can make better decisions and change more lives.</p><div className="spray-quote"><Spray className="spray-quote-yellow" /><blockquote>Serious about impact.<br />Human about everything else.</blockquote></div></div>
      </section>

      <section className="products section-pad" id="products">
        <Spray className="spray-products-orange" />
        <div className="section-intro" data-reveal><SectionLabel>Our products</SectionLabel><h2>Better tools.<br />Clearer thinking.<br />Stronger evidence.</h2><p>We believe social impact deserves better tools, clearer thinking and stronger evidence.<br /><br />That’s why we’ve developed a family of frameworks, methodologies and specialist services that help mission-driven organisations embed, improve, measure and communicate meaningful social impact.</p></div>
        <div className="product-list">{products.map((product, index) => <ProductCard key={product.name} product={product} index={index} />)}</div>
      </section>

      <section className="values section-pad" id="values">
        <div className="section-intro compact" data-reveal><SectionLabel>Our values</SectionLabel><h2>How we show up.</h2></div>
        <div className="values-grid">{values.map(([name, body], i) => <article key={name} data-reveal style={{ "--delay": `${i * 55}ms` } as React.CSSProperties}><span>0{i + 1}</span><h3>{name}</h3><p>{body}</p></article>)}</div>
      </section>

      <section className="practice-sections">
        <article className="practice-feature what-we-do section-pad" id="what-we-do" data-reveal><SectionLabel>What we do</SectionLabel><h2>We work with mission-driven organisations to strengthen their impact and influence.</h2><ul><li>Impact strategy & measurement</li><li>Organisational learning & evaluation</li><li>Impact reporting (including SORP 2026)</li><li>Social Impact Excellence™ implementation</li><li>Social Impact Claims Code support</li><li>Capability building & training</li><li>AI-powered tools & process design</li></ul></article>
        <article className="practice-feature approach-feature section-pad" id="approach" data-reveal><SectionLabel>Our approach</SectionLabel><div className="approach-steps">{[["Listen & Understand", "We start by listening properly. To people, the context and what really matters."],["Think & Co-create", "We bring ideas, challenge assumptions and co-design practical solutions that fit."],["Act & Deliver", "We turn plans into practical action and build capability along the way."],["Measure & Improve", "We help organisations learn, adapt and get better—always."]].map(([title, copy], i) => <div className="approach-step" key={title}><span>0{i + 1}</span><h3>{title}</h3><p>{copy}</p></div>)}</div></article>
        <article className="practice-feature working section-pad" id="working-with-us" data-reveal><Spray className="spray-working-pink" /><SectionLabel>Working with us is…</SectionLabel><h2>Collaborative.<br />Straightforward.<br />Thought-provoking.<br /><em>(And often pretty enjoyable.)</em></h2><p>We don’t take ourselves too seriously.<br /><br />We take the work—and the impact—incredibly seriously.</p></article>
      </section>

      <section className="team section-pad" id="team">
        <div className="section-intro" data-reveal><SectionLabel>Our team</SectionLabel><h2>Small and senior,<br />by design.</h2><p>We are a small, senior team by design.<br /><br />We focus on clarity, structure and direction, working with trusted partners to support delivery.<br /><br />Together, we combine expertise in social impact, strategy, creativity, technology, AI, data and communications to help organisations create meaningful and measurable change.</p></div>
        <div className="team-grid">{team.map((person, i) => <article className="profile-card" key={person.name} data-reveal style={{ "--delay": `${i * 100}ms` } as React.CSSProperties}><div className="portrait"><Image src={person.image} alt={person.name} fill sizes="(max-width: 760px) 100vw, (max-width: 1050px) 50vw, 33vw" unoptimized /></div><div className="profile-head"><div><h3>{person.name}</h3><p>{person.title}</p></div><a href={person.linkedin} target="_blank" rel="noreferrer" aria-label={`${person.name} on LinkedIn`}>in</a></div><blockquote>“{person.quote}”</blockquote><p className="profile-bio">{person.bio}</p></article>)}</div>
      </section>

      <section className="insights section-pad" id="insights">
        <div className="section-intro compact" data-reveal><SectionLabel>Latest insights</SectionLabel><h2>The latest thinking from My Social Impact.</h2><p>Articles exploring social impact, SORP 2026, B Corps, AI, evaluation, strategy and impact reporting.</p></div>
        <div className="articles-grid">{posts.slice(0, 3).map((post, index) => <ArticleCard key={post.href} post={post} index={index} />)}</div>
        <Link className="button-link" href="/blog">View all articles <span>→</span></Link>
      </section>

      <section className="ecosystem section-pad" id="ecosystem">
        <div className="section-intro" data-reveal><SectionLabel>Our ecosystem</SectionLabel><h2>Specialists,<br />working together.</h2><p>Creating meaningful social impact often requires more than impact expertise.<br /><br />Through our ecosystem of specialist organisations, we help clients innovate, strengthen their organisations and build sustainable impact.</p></div>
        <div className="ecosystem-grid"><article data-reveal><div className="ecosystem-mark ideas"><Image src="/assets/ideas-shed.jpg" alt="The Ideas Shed — From ideas to action" width={1254} height={1254} unoptimized /></div><SectionLabel>The Ideas Shed</SectionLabel><h3>Turning ideas into action.</h3><p>Our innovation partner, helping organisations embrace AI, develop ideas, build products and solve complex challenges creatively.</p></article><article data-reveal style={{ "--delay": "90ms" } as React.CSSProperties}><div className="ecosystem-mark good"><Image src="/assets/good-numbers-transparent.png" alt="Good Numbers" width={1536} height={1024} unoptimized /></div><SectionLabel>Good Numbers</SectionLabel><h3>Stronger financial foundations for greater impact.</h3><p>Specialists in social impact accounting, SORP 2026 reporting and business planning, working alongside charities, social enterprises and accountancy firms to strengthen impact reporting and support sustainable growth.</p></article></div>
      </section>

      <section className="promise" data-reveal><SectionLabel>Our promise</SectionLabel><blockquote>We will challenge, support and partner with you to create social impact that is real, meaningful and recognised—today and for the future.</blockquote></section>
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
