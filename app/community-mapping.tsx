"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Footer, RevealObserver, SiteHeader } from "./site-shell";

const sections = [
  ["overview", "Overview"],
  ["meaning", "What it means"],
  ["layers", "The layers"],
  ["how-it-works", "How it works"],
  ["what-you-get", "What you get"],
  ["experience", "Experience"],
  ["pricing", "Pricing"],
  ["start", "Start"],
] as const;

const layers = [
  ["PEOPLE", "Demographics, communities, lived experience, needs and aspirations."],
  ["PLACES", "Schools, healthcare, community facilities, parks, retail, transport and other local assets."],
  ["RESOURCES", "Existing services, organisations, networks and community capacity."],
  ["RELATIONSHIPS", "How individuals, groups and organisations connect."],
  ["TRUST", "Who communities listen to and where credibility and influence sit."],
  ["OPPORTUNITIES", "Gaps, unmet needs, partnerships and areas where positive action could create value."],
] as const;

const process = [
  ["DEFINE", "Agree the place, the question and the decisions the work needs to inform."],
  ["MAP", "Build the underlying picture of demographics, organisations, facilities, services, assets and existing evidence."],
  ["LISTEN", "Engage with people and stakeholders to understand local perspectives and lived experience."],
  ["INTERPRET", "Combine evidence and human insight to identify strengths, needs, relationships, barriers and opportunities."],
  ["REPORT", "Turn the findings into a clear, visual Community Mapping report with insight and practical recommendations."],
] as const;

const deliverables = [
  ["COMMUNITY PROFILE", "Who lives there and the characteristics of the community."],
  ["PLACE & ASSET MAPPING", "Facilities, services, organisations and community resources."],
  ["STAKEHOLDER MAPPING", "Important people, organisations, networks and relationships."],
  ["COMMUNITY VOICE", "What people tell us about their experiences, needs and aspirations."],
  ["TRUST & INFLUENCE", "Where credibility, relationships and informal influence sit."],
  ["NEEDS & GAPS", "Where existing provision may not meet community need."],
  ["OPPORTUNITIES", "Potential partnerships, interventions and areas for positive action."],
  ["RECOMMENDATIONS", "What the evidence means and what could happen next."],
  ["COMMUNITY INTELLIGENCE REPORT", "A beautifully designed report bringing the evidence, analysis and human insight together."],
] as const;

const audiences = [
  ["PROPERTY & DEVELOPMENT", "Understand the community surrounding a development and inform engagement, social value and community strategy."],
  ["RETAILERS & BRANDS", "Understand the communities around physical locations and identify opportunities to become more relevant and valuable locally."],
  ["COUNCILS & PUBLIC BODIES", "Build a richer understanding of local needs, assets, relationships and community voices."],
  ["CHARITIES & NGOs", "Understand beneficiaries, neighbourhoods, local networks, gaps in provision and partnership opportunities."],
  ["FUNDERS & INVESTORS", "Understand the context surrounding an intervention or investment before deciding how resources may be used."],
  ["REGENERATION & PLACE", "Bring people, evidence and local insight into place-based strategy."],
] as const;

const extensions = [
  ["RESEARCH", "Test ideas, propositions or plans with communities."],
  ["WORKSHOPS", "Bring people together, listen and develop ideas collaboratively."],
  ["COMMUNITY ENGAGEMENT", "Create opportunities for people to participate and be heard."],
  ["COMMUNICATION", "Help organisations explain plans and build understanding and support."],
  ["SOCIAL IMPACT STRATEGY", "Turn insight into strategy, partnerships, interventions, measurement and reporting."],
  ["BESPOKE SUPPORT", "Additional activity depending on the community and the objective."],
] as const;

const prices = [
  ["FOCUSED MAPPING", "From £3,000", "For a clearly defined local area or question."],
  ["DEEPER COMMUNITY MAPPING", "Typically £5,000+", "For broader analysis and more stakeholder or community engagement."],
  ["BESPOKE / MULTI-LOCATION", "Up to £10,000+", "For larger geographies, multiple locations, deeper engagement or additional research."],
] as const;

function CommunityNavigation() {
  const [active, setActive] = useState("overview");

  useEffect(() => {
    const update = () => {
      const readingLine = window.innerHeight * 0.36;
      const reached = sections.filter(([id]) => {
        const element = document.getElementById(id);
        return element ? element.getBoundingClientRect().top <= readingLine : false;
      });
      setActive(reached.length ? reached[reached.length - 1][0] : "overview");
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  useEffect(() => {
    const link = document.querySelector<HTMLAnchorElement>(`.cm-subnav a[href="#${active}"]`);
    const track = link?.parentElement;
    if (link && track) track.scrollTo({ left: link.offsetLeft - (track.clientWidth - link.offsetWidth) / 2, behavior: "smooth" });
  }, [active]);

  return <nav className="cm-subnav" aria-label="Community Mapping sections"><div>{sections.map(([id, label]) => <a key={id} className={active === id ? "is-active" : ""} href={`#${id}`} aria-current={active === id ? "location" : undefined}>{label}</a>)}</div></nav>;
}

function MapArtwork({ compact = false }: { compact?: boolean }) {
  return <figure className={`cm-map ${compact ? "is-compact" : ""}`} aria-label="Community map showing interconnected people, places, trust, ideas and opportunities">
    <Image src="/assets/community-mapping-network.png" alt="" fill sizes={compact ? "(max-width: 760px) 100vw, 46vw" : "100vw"} priority={!compact} unoptimized />
    <span className="cm-map-label label-people">PEOPLE</span>
    <span className="cm-map-label label-places">PLACES</span>
    <span className="cm-map-label label-trust">TRUST</span>
    <span className="cm-map-label label-ideas">IDEAS</span>
    <span className="cm-map-label label-opportunities">OPPORTUNITIES</span>
  </figure>;
}

function MappingCta({ inverse = false }: { inverse?: boolean }) {
  return <div className={`cm-actions ${inverse ? "is-inverse" : ""}`}>
    <a className="cm-primary-action" href="mailto:marcus@mysocialimpact.org?cc=chris@mysocialimpact.org&subject=Community%20Mapping%20enquiry">Talk to us about Community Mapping <span>→</span></a>
    <div><a href="mailto:marcus@mysocialimpact.org">marcus@mysocialimpact.org</a><a href="mailto:chris@mysocialimpact.org">chris@mysocialimpact.org</a></div>
  </div>;
}

export function CommunityMappingPage() {
  return <><RevealObserver /><SiteHeader /><CommunityNavigation /><main className="cm-page">
    <section className="cm-hero" id="overview">
      <div className="cm-hero-copy" data-reveal>
        <p className="cm-eyebrow">COMMUNITY INTELLIGENCE REPORTS</p>
        <h1>COMMUNITY<br />MAPPING</h1>
        <h2>Understand a community.<br />Not just the data.</h2>
        <p className="cm-hero-intro">Our Community Mapping combines data, research and human intelligence to help organisations understand the people, places, relationships, needs and opportunities that shape a community.</p>
        <div className="cm-price-line"><strong>£3,000 – £10,000</strong><span>depending on location, scale, research depth and engagement.</span></div>
        <div className="cm-hero-actions"><a href="mailto:marcus@mysocialimpact.org?cc=chris@mysocialimpact.org&subject=Community%20Mapping%20enquiry">Talk to us about Community Mapping <span>→</span></a><a href="#meaning">See how it works <span>↓</span></a></div>
      </div>
      <MapArtwork />
    </section>

    <section className="cm-core" id="meaning">
      <div className="cm-core-heading" data-reveal><p className="cm-section-number">01 / THE CORE IDEA</p><h2>Community mapping shows you what is there.</h2><h3>Community Intelligence tells you what it means.</h3></div>
      <div className="cm-core-copy" data-reveal>
        <p>Data is an important part of understanding a place.</p>
        <p>It can tell us who lives there, what facilities exist, what services are available and how a community is changing.</p>
        <p>But communities are more complicated than datasets.</p>
        <p>Understanding a place properly also means understanding the people within it:</p>
        <div className="cm-questions">{["Who do they trust?", "What matters to them?", "Where are the frustrations?", "How do people connect?", "Who influences what happens?", "What is missing?", "Where are the opportunities?"].map((question, index) => <span key={question}><b>{String(index + 1).padStart(2, "0")}</b>{question}</span>)}</div>
        <p className="cm-strong-line">Community Mapping brings those different layers together.</p>
      </div>
    </section>

    <section className="cm-layers" id="layers">
      <header data-reveal><p className="cm-section-number">02 / PEOPLE + PLACE + INSIGHT</p><h2>A community is a connected system.</h2><p>We bring together the visible facts of a place with the relationships, voices and lived experience that make it work.</p></header>
      <div className="cm-network-system" data-reveal>
        <div className="cm-network-centre"><span>COMMUNITY</span><strong>UNDERSTANDING</strong></div>
        {layers.map(([title, copy], index) => <article className={`cm-layer cm-layer-${index + 1}`} key={title}><span>{String(index + 1).padStart(2, "0")}</span><h3>{title}</h3><p>{copy}</p></article>)}
      </div>
    </section>

    <section className="cm-intelligence">
      <div className="cm-intelligence-intro" data-reveal><p className="cm-section-number">03 / AI + HUMAN INTELLIGENCE</p><h2>Technology helps us find the evidence.<br /><em>People help us understand it.</em></h2></div>
      <div className="cm-equation" data-reveal><span>DATA + AI</span><b>+</b><span>HUMAN INTELLIGENCE</span><b>=</b><span>COMMUNITY UNDERSTANDING</span></div>
      <div className="cm-intelligence-grid">
        <article data-reveal><h3>Technology can help us understand</h3><ul>{["demographics", "existing data", "published research", "facilities", "organisations", "services", "patterns", "geographic context"].map((item) => <li key={item}>{item}</li>)}</ul></article>
        <article data-reveal><h3>People help us understand</h3><ul>{["trust", "sentiment", "relationships", "informal influence", "tensions", "lived experience", "hopes", "fears", "local nuance"].map((item) => <li key={item}>{item}</li>)}</ul></article>
      </div>
      <div className="cm-intelligence-close" data-reveal><p>AI and modern research tools are extremely useful for bringing together large quantities of information quickly. But understanding the meaning within a community requires listening, observation, engagement and experienced human interpretation.</p><strong>People understand people.</strong></div>
    </section>

    <section className="cm-process" id="how-it-works">
      <header data-reveal><p className="cm-section-number">04 / HOW COMMUNITY MAPPING WORKS</p><h2>From a place and a question<br />to useful understanding.</h2></header>
      <div className="cm-process-grid">{process.map(([title, copy], index) => <article key={title} data-reveal style={{ "--delay": `${index * 65}ms` } as React.CSSProperties}><span>{String(index + 1).padStart(2, "0")}</span><h3>{title}</h3><p>{copy}</p></article>)}</div>
      <div className="cm-process-line" data-reveal><span>DEFINE</span><b>→</b><span>MAP</span><b>→</b><span>LISTEN</span><b>→</b><span>UNDERSTAND</span><b>→</b><span>ACT</span></div>
    </section>

    <section className="cm-deliverables" id="what-you-get">
      <header data-reveal><p className="cm-section-number">05 / WHAT THE CLIENT GETS</p><h2>More than a map.</h2><p>The exact scope depends on the place and the question, but a Community Mapping project can include:</p></header>
      <div className="cm-deliverables-list">{deliverables.map(([title, copy], index) => <article key={title} data-reveal><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{title}</h3><p>{copy}</p></div></article>)}</div>
      <p className="cm-output-note" data-reveal><strong>Community Mapping</strong> is the product. A <strong>Community Intelligence Report</strong> is one possible output.</p>
    </section>

    <section className="cm-experience" id="experience">
      <div className="cm-experience-copy" data-reveal><p className="cm-section-number">06 / PROVEN EXPERIENCE</p><h2>We’ve already mapped communities across the UK.</h2><p className="cm-client">BREWERS DECORATING CENTRES</p><p>Members of the My Social Impact team have previously undertaken Community Mapping work for Brewers Decorator Centres across four UK locations.</p><p>Each project involved understanding the local area around the location and building a clearer picture of the surrounding community, local assets and opportunities.</p><small>Previous work delivered by members of the My Social Impact team.</small></div>
      <div className="cm-experience-visual" data-reveal><MapArtwork compact /><div className="cm-location-list">{["YORK", "CANTERBURY", "SHREWSBURY", "WELLINGBOROUGH"].map((location, index) => <span key={location}><b>0{index + 1}</b>{location}</span>)}</div><div className="cm-location-statement"><strong>4 LOCATIONS</strong><span>1 APPROACH</span><span>DIFFERENT COMMUNITIES</span></div></div>
    </section>

    <section className="cm-audiences">
      <header data-reveal><p className="cm-section-number">07 / WHO COMMUNITY MAPPING IS FOR</p><h2>Useful wherever understanding place matters.</h2></header>
      <div className="cm-audience-grid">{audiences.map(([title, copy], index) => <article key={title} data-reveal style={{ "--delay": `${index * 55}ms` } as React.CSSProperties}><span>{String(index + 1).padStart(2, "0")}</span><h3>{title}</h3><p>{copy}</p></article>)}</div>
    </section>

    <section className="cm-impact-link">
      <div data-reveal><p className="cm-section-number">08 / THE SOCIAL IMPACT CONNECTION</p><h2>Understand the community before deciding how to change it.</h2><div className="cm-impact-questions">{["WHO is affected?", "WHAT already exists?", "WHAT do people need?", "WHERE are the gaps?", "WHO should be involved?", "WHERE does trust sit?", "WHAT could realistically change?"].map((item) => <span key={item}>{item}</span>)}</div></div>
      <div className="cm-impact-journey" data-reveal><span>UNDERSTAND</span><b>↓</b><span>DESIGN</span><b>↓</b><span>ACT</span><b>↓</b><span>MEASURE</span><b>↓</b><span>LEARN</span><p>Community Mapping can be an important starting point for social impact strategy. Before designing a programme, partnership or intervention, organisations need to understand the community around it.</p><Link href="/social-impact-excellence">Explore Social Impact Excellence <b>→</b></Link></div>
    </section>

    <section className="cm-extensions">
      <header data-reveal><p className="cm-section-number">09 / ADDITIONAL SUPPORT</p><h2>Mapping can be the beginning.</h2><p>These are potential additional services rather than activities automatically included in every Community Mapping project.</p></header>
      <div>{extensions.map(([title, copy], index) => <article key={title} data-reveal><span>{String(index + 1).padStart(2, "0")}</span><h3>{title}</h3><p>{copy}</p></article>)}</div>
    </section>

    <section className="cm-pricing" id="pricing">
      <header data-reveal><p className="cm-section-number">10 / PRICING</p><h2>COMMUNITY MAPPING</h2><strong>£3,000 – £10,000</strong><p>Projects are scoped according to the geography, research requirements, amount of community engagement and depth of analysis required.</p></header>
      <div className="cm-pricing-grid">{prices.map(([title, price, copy], index) => <article key={title} data-reveal><span>{String(index + 1).padStart(2, "0")}</span><h3>{title}</h3><strong>{price}</strong><p>{copy}</p></article>)}</div>
      <p className="cm-indicative">These are indicative ranges. The scope and price are agreed around the place, question and level of engagement required.</p>
      <MappingCta />
    </section>

    <section className="cm-why">
      <p className="cm-section-number" data-reveal>11 / WHY MY SOCIAL IMPACT</p><div data-reveal><h2>Data matters.<br />Experience matters too.</h2></div><div data-reveal><p>Our work sits at the intersection of people, place, purpose and impact.</p><p>We combine research, social impact expertise, communications thinking and real-world community experience to understand not simply what exists within a community, but what it means for the organisations trying to work within it.</p><strong>This is what turns Community Mapping into useful intelligence.</strong></div>
    </section>

    <section className="cm-final" id="start">
      <MapArtwork compact />
      <div className="cm-final-copy" data-reveal><p className="cm-section-number">COMMUNITY MAPPING</p><h2>Before you decide what a community needs,<br /><em>understand the community.</em></h2><p className="cm-final-words">PEOPLE. PLACES. RELATIONSHIPS. TRUST. OPPORTUNITY.</p><MappingCta inverse /></div>
    </section>
  </main><Footer /></>;
}
