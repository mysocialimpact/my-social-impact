"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { additionalChecks, coreQuestions, eligibilityFor, readinessStages, tierLabel, type AdditionalAnswerValue, type AnswerValue, type AssessmentSetup } from "./sorp-questionnaire";

const SNAPSHOT_RESULT_KEY = "msi-sorp-readiness-result-v2";
const CONVERSATION_KEY = "msi-sorp-readiness-conversation-v1";

type Citation = { reference: string; module: string; page: number; extract: string };
type PublicSource = { label: string; url: string; detail: string; kind: "official_register" | "organisation_website" | "annual_report" | "other_public" };
type OrganisationCard = { name: string; locality: string };
type MessageAction = { label: string; value: string };
type FieldState = { answer: AnswerValue | null; evidence: string; confidence: number };
type AdditionalState = { answer: AdditionalAnswerValue | null; evidence: string; relevant: boolean };
type ContextEvidence = { basis: "publicly_observed" | "user_confirmed"; detail: string; sources: string[] };
type IntelligenceProvenance = {
  registry: string;
  assistantId: string;
  resolvedAt: string;
  layers: { id: string; name: string; kind: string; relationship: "INHERITED" | "EXTENDED" | "OVERRIDDEN"; version: number; label: string; publishedAt: string | null }[];
  runtimeOverrides: { name: string; label: string }[];
};

type ReadinessState = {
  charityName: string;
  assessmentMode: "sorp_readiness" | "impact_readiness";
  sorpApplicability: "unknown" | "likely_applies" | "not_applicable" | "uncertain";
  setup: AssessmentSetup;
  organisationResearch: unknown;
  contextEvidence: Record<string, ContextEvidence>;
  uncertainty: string[];
  fields: Record<string, FieldState>;
  additional: Record<string, AdditionalState>;
  completedStages: number[];
  currentStage: number;
  score: number | null;
  inheritedSnapshot: boolean;
};

type Result = {
  score: number;
  band: string;
  overview: string;
  sectionScores: { section: string; label: string; score: number; narrative: string }[];
  strong: string[];
  attention: string[];
  must: string[];
  should: string[];
  may: string[];
  judgement: string[];
  additionalChecks: string[];
  priorities: string[];
};

type Message = {
  role: "user" | "assistant";
  content: string;
  label?: "MUST" | "SHOULD" | "MAY" | "JUDGEMENT" | "MSI READINESS" | null;
  citations?: Citation[];
  publicSources?: PublicSource[];
  organisation?: OrganisationCard | null;
  actions?: MessageAction[];
};

type ReadinessResponse = {
  state: ReadinessState;
  assistant: { message: string; label: Message["label"]; citations: Citation[]; publicSources?: PublicSource[]; organisation?: OrganisationCard | null; actions?: MessageAction[]; responseKind: "assessment" | "detour" | "result" };
  result: Result | null;
  intelligence: IntelligenceProvenance;
};

const emptySetup: AssessmentSetup = { role: "", jurisdiction: "", startDate: "", endDate: "", accounts: "", income: "", nearBoundary: false, activities: [] };

function blankState(): ReadinessState {
  return {
    charityName: "",
    assessmentMode: "sorp_readiness",
    sorpApplicability: "unknown",
    setup: emptySetup,
    organisationResearch: { status: "unsearched", query: "", candidates: [], selected: null, checkedAt: "", enrichedAt: "" },
    contextEvidence: {},
    uncertainty: [],
    fields: Object.fromEntries(coreQuestions.map((question) => [String(question.id), { answer: null, evidence: "", confidence: 0 }])),
    additional: Object.fromEntries(additionalChecks.map((check) => [check.id, { answer: null, evidence: "", relevant: false }])),
    completedStages: [],
    currentStage: 1,
    score: null,
    inheritedSnapshot: false,
  };
}

function stateFromSnapshot(raw: string): { state: ReadinessState; result: Result | null } | null {
  try {
    const snapshot = JSON.parse(raw) as {
      setup?: AssessmentSetup;
      coreQuestions?: { id: number; answer?: AnswerValue; context?: string }[];
      additionalChecks?: { id: string; answer?: AdditionalAnswerValue }[];
      result?: { score?: number; band?: string; sectionScores?: { section: string; label: string; score: number }[]; flags?: { must?: string[]; should?: string[]; may?: string[]; judgement?: string[] } };
    };
    if (!snapshot.setup || !snapshot.coreQuestions?.length || typeof snapshot.result?.score !== "number") return null;
    const state = blankState();
    state.setup = { ...emptySetup, ...snapshot.setup };
    state.inheritedSnapshot = true;
    state.completedStages = [1, 2, 3, 4, 5, 6];
    state.currentStage = 6;
    state.score = snapshot.result.score;
    for (const field of snapshot.coreQuestions) {
      state.fields[String(field.id)] = { answer: field.answer ?? null, evidence: field.context ?? "Snapshot answer", confidence: field.context ? .95 : .8 };
    }
    for (const check of snapshot.additionalChecks ?? []) {
      state.additional[check.id] = { answer: check.answer ?? null, evidence: "Snapshot answer", relevant: true };
    }
    const sectionScores = snapshot.result.sectionScores ?? [];
    const result: Result = {
      score: snapshot.result.score,
      band: snapshot.result.band ?? "Initial readiness picture",
      overview: "This is your Quick Snapshot result. The conversation can add context and nuance without asking all 15 questions again.",
      sectionScores: sectionScores.map((section) => ({ ...section, narrative: "The conversation can add a more specific explanation of this area." })),
      strong: sectionScores.filter((section) => section.score >= 70).map((section) => section.label),
      attention: sectionScores.filter((section) => section.score < 60).map((section) => section.label),
      must: snapshot.result.flags?.must ?? [],
      should: snapshot.result.flags?.should ?? [],
      may: snapshot.result.flags?.may ?? [],
      judgement: snapshot.result.flags?.judgement ?? [],
      additionalChecks: (snapshot.additionalChecks ?? []).map((check) => additionalChecks.find((item) => item.id === check.id)?.title ?? check.id),
      priorities: [],
    };
    return { state, result };
  } catch {
    return null;
  }
}

function InlineText({ text }: { text: string }) {
  return <>{text.split(/(\*\*[^*]+\*\*)/).filter(Boolean).map((part, index) => part.startsWith("**") && part.endsWith("**")
    ? <strong key={`${index}-${part.slice(0, 18)}`}>{part.slice(2, -2)}</strong>
    : part)}</>;
}

function MessageContent({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  return <>{blocks.map((block, index) => {
    const heading = block.match(/^\*\*(.+)\*\*$/);
    if (heading) return <h3 className="readiness-message-heading" key={`${index}-${heading[1]}`}>{heading[1]}</h3>;
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    if (lines.length && lines.every((line) => line.startsWith("- "))) {
      return <ul className="readiness-message-list" key={`${index}-${block.slice(0, 18)}`}>{lines.map((line) => <li key={line}><InlineText text={line.slice(2)} /></li>)}</ul>;
    }
    return <p key={`${index}-${block.slice(0, 24)}`}>{lines.map((line, lineIndex) => <span key={`${lineIndex}-${line.slice(0, 18)}`}><InlineText text={line} />{lineIndex < lines.length - 1 && <br />}</span>)}</p>;
  })}</>;
}

function recordingTime(seconds: number) {
  return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}

function dateLabel(value: string) {
  if (!value) return "To establish";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}

function sourceKindLabel(kind: PublicSource["kind"]) {
  return {
    official_register: "Official register",
    organisation_website: "Organisation website",
    annual_report: "Annual report",
    other_public: "Public source",
  }[kind];
}

function EvidenceBasis({ evidence }: { evidence?: ContextEvidence }) {
  if (!evidence) return <small className="readiness-context-basis is-uncertain">Currently uncertain</small>;
  return <small className={`readiness-context-basis is-${evidence.basis}`}>{evidence.basis === "publicly_observed" ? "Publicly found" : "User confirmed"}</small>;
}

function confirmationSourceLabel(source: PublicSource) {
  if (source.kind === "organisation_website") return "Website";
  if (/compan(?:y|ies)house|company-information/i.test(source.url)) return "Companies House";
  return "Charity register";
}

function intelligenceLayerLabel(layer: IntelligenceProvenance["layers"][number]) {
  if (layer.id === "msi-core") return "MSI Intelligence";
  if (layer.id === "sorp-readiness-intelligence") return "SORP Intelligence";
  return layer.name;
}

function reviewPrice(setup: AssessmentSetup) {
  if (setup.income === "tier2") return "Tier 2 · £100";
  if (setup.income === "tier3") return "Tier 3 · £200";
  if (setup.income === "tier1_low" || setup.income === "tier1_high") return "Tier 1 · £50";
  return "Tiered pricing from £50";
}

function ResultList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return <article><h4>{title}</h4>{items.length ? <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul> : <p>{empty}</p>}</article>;
}

export function SorpReadinessConversation() {
  const [started, setStarted] = useState(false);
  const [state, setState] = useState<ReadinessState>(() => blankState());
  const [messages, setMessages] = useState<Message[]>([]);
  const [composer, setComposer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [intelligence, setIntelligence] = useState<IntelligenceProvenance | null>(null);
  const [snapshotAvailable, setSnapshotAvailable] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [recordingState, setRecordingState] = useState<"idle" | "recording" | "transcribing">("idle");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const restore = window.setTimeout(() => {
      try {
        const wantsSnapshot = new URLSearchParams(window.location.search).get("from") === "snapshot";
        const snapshotRaw = window.localStorage.getItem(SNAPSHOT_RESULT_KEY);
        const snapshot = snapshotRaw ? stateFromSnapshot(snapshotRaw) : null;
        setSnapshotAvailable(Boolean(snapshot));
        if (wantsSnapshot && snapshot) {
          setState(snapshot.state);
          setResult(snapshot.result);
          setStarted(true);
          setMessages([{ role: "assistant", content: `I’ve got your Snapshot, so we don’t need to start again.\n\nYour initial score is ${snapshot.result?.score}/100. I’ll use those answers and focus on the areas where richer context would genuinely improve the result.\n\nTell me what feels least certain—or ask me about any part of your result.` }]);
        } else {
          const saved = window.localStorage.getItem(CONVERSATION_KEY);
          if (saved) {
            const parsed = JSON.parse(saved) as { started?: boolean; state?: ReadinessState; messages?: Message[]; result?: Result | null; intelligence?: IntelligenceProvenance | null };
            if (parsed.started && parsed.state && parsed.messages?.length) {
              setStarted(true);
              setState({ ...blankState(), ...parsed.state, charityName: parsed.state.charityName ?? "", contextEvidence: parsed.state.contextEvidence ?? {} });
              setMessages(parsed.messages);
              setResult(parsed.result ?? null);
              setIntelligence(parsed.intelligence ?? null);
            }
          }
        }
      } catch {
        setError("We could not restore the local conversation, so you can start cleanly.");
      }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(restore);
  }, []);

  useEffect(() => {
    if (!hydrated || !started) return;
    window.localStorage.setItem(CONVERSATION_KEY, JSON.stringify({ started, state, messages, result, intelligence }));
  }, [hydrated, started, state, messages, result, intelligence]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, busy, result]);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  function startConversation(useSnapshot = false) {
    if (useSnapshot) {
      const raw = window.localStorage.getItem(SNAPSHOT_RESULT_KEY);
      const snapshot = raw ? stateFromSnapshot(raw) : null;
      if (snapshot) {
        setState(snapshot.state);
        setResult(snapshot.result);
        setIntelligence(null);
        setMessages([{ role: "assistant", content: `I’ve got your Snapshot, so we don’t need to start again.\n\nYour initial score is ${snapshot.result?.score}/100. I’ll focus on the weaker areas, uncertainty and any context that could change the interpretation.\n\nWhich part would you most like to talk through?` }]);
        setStarted(true);
        return;
      }
    }
    setState(blankState());
    setResult(null);
    setIntelligence(null);
    setMessages([{ role: "assistant", content: "Let’s work out where you stand.\n\nFirst — what’s the charity called, and in your own words, what does it actually do?\n\nDon’t worry about giving me the formal charitable objects. I’m more interested in how you’d explain it to another person." }]);
    setStarted(true);
  }

  async function sendMessage(rawValue: string) {
    const value = rawValue.trim();
    if (!value || busy || recordingState !== "idle") return;
    const userMessage: Message = { role: "user", content: value };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setComposer("");
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/readiness", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: value, state, history: nextMessages.slice(-40).map(({ role, content }) => ({ role, content })) }),
      });
      const data = await response.json() as ReadinessResponse & { error?: string };
      if (!response.ok) throw new Error(data.error || "The readiness conversation is temporarily unavailable.");
      setState(data.state);
      setIntelligence(data.intelligence);
      setMessages((current) => [...current, {
        role: "assistant",
        content: data.assistant.message,
        label: data.assistant.label,
        citations: data.assistant.citations,
        publicSources: data.assistant.publicSources,
        organisation: data.assistant.organisation,
        actions: data.assistant.actions,
      }]);
      if (data.result) setResult(data.result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The readiness conversation is temporarily unavailable.");
    } finally {
      setBusy(false);
      window.setTimeout(() => composerRef.current?.focus(), 60);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void sendMessage(composer);
  }

  async function startRecording() {
    setError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") throw new Error("Voice recording is not available in this browser. You can still type your answer.");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const preferred = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = preferred ? new MediaRecorder(stream, { mimeType: preferred }) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => void transcribe(recorder.mimeType || preferred || "audio/webm");
      recorder.start(250);
      setRecordingSeconds(0);
      setRecordingState("recording");
      timerRef.current = setInterval(() => setRecordingSeconds((seconds) => seconds + 1), 1000);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We could not start the microphone.");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setRecordingState("transcribing");
  }

  async function transcribe(mimeType: string) {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    try {
      const audio = new Blob(chunksRef.current, { type: mimeType });
      const form = new FormData();
      form.append("audio", audio, mimeType.includes("mp4") ? "readiness.m4a" : "readiness.webm");
      const response = await fetch("/api/readiness/transcribe", { method: "POST", body: form });
      const data = await response.json() as { transcript?: string; error?: string };
      if (!response.ok || !data.transcript) throw new Error(data.error || "We could not transcribe that recording.");
      setComposer((current) => [current.trim(), data.transcript?.trim()].filter(Boolean).join(" "));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We could not transcribe that recording.");
    } finally {
      chunksRef.current = [];
      setRecordingState("idle");
      window.setTimeout(() => composerRef.current?.focus(), 60);
    }
  }

  const completedCount = state.completedStages.length;
  const currentStage = Math.min(Math.max(state.currentStage || 1, 1), 6);
  const eligibility = eligibilityFor(state.setup);
  const hasEligibilityContext = Boolean(state.setup.jurisdiction && state.setup.startDate && state.setup.accounts);
  const impactMode = state.assessmentMode === "impact_readiness";
  const applicabilityLabel = state.sorpApplicability === "not_applicable" ? "Does not apply" : state.sorpApplicability === "likely_applies" ? "Likely applies" : state.sorpApplicability === "uncertain" ? "Currently uncertain" : hasEligibilityContext ? eligibility.status : "Currently uncertain";

  if (!started) return <section className="readiness-intro">
    <p className="readiness-kicker">SORP 2026<br /><strong>Impact readiness</strong></p>
    <h1>Let’s work out<br />how ready you are.</h1>
    <div className="readiness-intro-copy"><p>I’ll begin by establishing whether SORP appears to apply, your jurisdiction and reporting period, whether the accounts are accruals or receipts &amp; payments, and your likely tier.</p><p>If SORP may not apply, you can still continue—the impact questions may still be useful.</p><p>You don’t need to know the technical language. Just answer naturally.</p></div>
    <div className="readiness-intro-actions"><button type="button" onClick={() => startConversation(false)}>Start the conversation <span>→</span></button>{snapshotAvailable && <button type="button" className="is-secondary" onClick={() => startConversation(true)}>Use my completed Snapshot <span>→</span></button>}</div>
    <p className="readiness-intro-note">Your progress is saved only in this browser. This is an impact-readiness assessment, not a declaration of SORP compliance.</p>
  </section>;

  return <div className="readiness-chat">
    <header className="readiness-progress">
      <div><span>{impactMode ? "Impact readiness mode" : "SORP readiness"}</span><strong>{impactMode && currentStage === 1 ? "YOUR ORGANISATION" : readinessStages[currentStage - 1]}</strong><small>{completedCount} of 6 stages complete</small></div>
      <div className="readiness-progress-track" aria-label={`${completedCount} of 6 assessment stages complete`}>{readinessStages.map((stage, index) => <span key={stage} className={state.completedStages.includes(index + 1) ? "is-complete" : index + 1 === currentStage ? "is-current" : ""}><i />{index < 5 && <b />}</span>)}</div>
    </header>

    <section className={`readiness-context${impactMode ? " is-impact-mode" : ""}`} aria-label={impactMode ? "Current impact-readiness context" : "Current SORP context"} aria-live="polite">
      {state.charityName && <p className="readiness-charity-name">Working with <strong>{state.charityName}</strong></p>}
      <dl>
        <div><dt>SORP applicability</dt><dd>{applicabilityLabel}<EvidenceBasis evidence={state.contextEvidence.jurisdiction} /></dd></div>
        <div><dt>Jurisdiction</dt><dd>{{ ew: "England & Wales", scotland: "Scotland", ni: "Northern Ireland", roi: "Republic of Ireland", elsewhere: "Outside the UK / Ireland", not_sure: "Currently uncertain", "": "Currently uncertain" }[state.setup.jurisdiction]}<EvidenceBasis evidence={state.contextEvidence.jurisdiction} /></dd></div>
        {!impactMode && <><div><dt>Period begins</dt><dd>{state.setup.startDate ? dateLabel(state.setup.startDate) : "Currently uncertain"}<EvidenceBasis evidence={state.contextEvidence.startDate} /></dd></div>
        <div><dt>Accounts</dt><dd>{{ accruals: "Accruals", receipts: "Receipts & payments", not_sure: "Currently uncertain", "": "Currently uncertain" }[state.setup.accounts]}<EvidenceBasis evidence={state.contextEvidence.accounts} /></dd></div>
        <div><dt>Likely tier</dt><dd>{state.setup.income ? tierLabel(state.setup) : "Currently uncertain"}<EvidenceBasis evidence={state.contextEvidence.income} /></dd></div></>}
      </dl>
      {!impactMode && hasEligibilityContext && eligibility.tone !== "yes" && <div className="readiness-continue-anyway"><p>{eligibility.reasons.at(-1)} The impact questions may still be useful.</p><button type="button" onClick={() => composerRef.current?.focus()}>Continue anyway <span>→</span></button></div>}
    </section>

    <div className="readiness-thread" aria-live="polite">
      {messages.map((message, index) => <article key={`${index}-${message.content.slice(0, 24)}`} className={`readiness-message is-${message.role}`}>
        <span>{message.role === "user" ? "You" : impactMode ? "Impact readiness" : "SORP 2026 · Impact readiness"}</span>
        {message.label && <strong className={`readiness-label is-${message.label.toLowerCase().replace(" ", "-")}`}>{message.label}</strong>}
        <div><MessageContent text={message.content} /></div>
        {message.organisation && <section className="readiness-organisation-card" aria-label="Organisation found">
          <h3>{message.organisation.name}</h3>
          {message.organisation.locality && <p className="readiness-organisation-location">{message.organisation.locality}</p>}
          {message.publicSources?.length ? <nav className="readiness-organisation-links" aria-label="Organisation sources">{message.publicSources.slice(0, 2).map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{confirmationSourceLabel(source)}</a>)}</nav> : null}
        </section>}
        {message.actions?.length ? <nav className="readiness-message-actions" aria-label="Choose an answer">{message.actions.map((action) => <button key={`${action.label}-${action.value}`} type="button" disabled={busy || index !== messages.length - 1} onClick={() => void sendMessage(action.value)}>{action.label}<span>→</span></button>)}</nav> : null}
        {message.citations?.length ? <details><summary>Source</summary><div>{message.citations.map((citation) => <article key={citation.reference}><strong>SORP 2026 · paragraph {citation.reference}</strong><small>{citation.module} · PDF page {citation.page}</small><p>{citation.extract}</p></article>)}</div></details> : null}
        {!message.organisation && message.publicSources?.length ? <details><summary>Sources</summary><div>{message.publicSources.map((source) => <article key={`${source.url}-${source.detail}`}><strong>{sourceKindLabel(source.kind)} · {source.label}</strong>{source.detail && <p>{source.detail}</p>}<a href={source.url}>View source <span>→</span></a></article>)}</div></details> : null}
      </article>)}
      {busy && <article className="readiness-message is-assistant is-loading"><span>{impactMode ? "Impact readiness" : "SORP 2026 · Impact readiness"}</span><div><p>{!state.charityName && state.currentStage === 1 ? "Looking for the right organisation…" : "Understanding what you’ve said and checking the relevant public and SORP evidence…"}</p></div></article>}
      {error && <div className="readiness-error" role="alert"><strong>That step did not complete.</strong><p>{error}</p><button type="button" onClick={() => { setError(""); composerRef.current?.focus(); }}>Try again</button></div>}
      {result && messages.at(-1)?.role === "assistant" && state.score !== null && <section className="readiness-result">
        <header><div><p>{state.charityName ? `${state.charityName} · ${impactMode ? "Impact readiness" : "Your SORP 2026"}` : impactMode ? "Impact readiness" : "Your SORP 2026"}</p><h2>Impact readiness</h2><span>{result.overview}</span></div><div><strong>{result.score}</strong><span>/ 100</span><b>{result.band}</b></div></header>
        <p className="readiness-result-note">This is an impact-readiness assessment. It does not say the charity is SORP compliant.</p>
        <div className="readiness-result-sections">{result.sectionScores.map((section) => <article key={section.section}><div><h3>{section.label}</h3><strong>{section.score}</strong></div><i><b style={{ width: `${section.score}%` }} /></i><p>{section.narrative}</p></article>)}</div>
        <div className="readiness-result-grid"><ResultList title="What looks strong" items={result.strong} empty="No clear strength has been evidenced yet." /><ResultList title="What needs attention" items={result.attention} empty="No immediate weaker area was identified." /><ResultList title="MUST areas" items={result.must} empty="No applicable MUST area was flagged by this initial assessment." /><ResultList title="SHOULD opportunities" items={result.should} empty="No weaker SHOULD opportunity was identified." /><ResultList title="MAY options" items={result.may} empty="No additional MAY option was identified." /><ResultList title="JUDGEMENT areas" items={result.judgement} empty="No specific judgement area was flagged, although context still matters." /><ResultList title="Additional SORP checks" items={result.additionalChecks} empty="No additional check was triggered by the information supplied." /><ResultList title="Three priority actions" items={result.priorities} empty="Add more context to build practical priorities." /></div>
        <aside className="readiness-human-review"><div><span>Want a human view?</span><h3>SORP 2026<br />Impact Readiness Review</h3><p>{reviewPrice(state.setup)} · 60 minutes</p></div><div><p>When you arrange the review, you can share this readiness assessment and conversation beforehand, so you won’t need to repeat everything.</p><p>You can also optionally send your latest Trustees’ Annual Report and/or latest Impact Report.</p><ul><li>Your readiness</li><li>Gaps</li><li>Judgement areas</li><li>Practical next steps</li><li>Opportunities beyond minimum compliance</li></ul><strong>The review fee is credited against subsequent MSI project work.</strong><a href="/are-you-sorp-ready#review">Explore human review <span>→</span></a></div></aside>
      </section>}
      {intelligence && <details className="readiness-intelligence" aria-label="Effective intelligence provenance">
        <summary>{intelligence.layers.filter((layer) => layer.id === "msi-core" || layer.id === "sorp-readiness-intelligence").map((layer) => `${intelligenceLayerLabel(layer)} · ${layer.label}`).join(" · ")}</summary>
        <div>
          <p><strong>{intelligence.registry}</strong><span>Published intelligence only</span></p>
          {intelligence.layers.map((layer) => <p key={`${layer.id}-${layer.version}`}><strong>{intelligenceLayerLabel(layer)} · {layer.label}</strong><span>{layer.relationship.toLowerCase()} · published {layer.publishedAt ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(layer.publishedAt)) : "date unavailable"}</span></p>)}
          {intelligence.runtimeOverrides.map((override) => <p key={`${override.name}-${override.label}`}><strong>{override.name} · {override.label}</strong><span>Explicit runtime/product override</span></p>)}
        </div>
      </details>}
      <div ref={threadEndRef} />
    </div>

    <form className="readiness-composer" onSubmit={submit}>
      <label htmlFor="readiness-answer">Answer naturally—or ask a SORP question at any point.</label>
      <textarea ref={composerRef} id="readiness-answer" rows={3} value={composer} onChange={(event) => setComposer(event.target.value)} placeholder="Type or say what you know…" maxLength={4000} />
      <div><button type="button" className="readiness-mic" onClick={recordingState === "recording" ? stopRecording : () => void startRecording()} disabled={busy || recordingState === "transcribing"}>{recordingState === "recording" ? `Stop · ${recordingTime(recordingSeconds)}` : recordingState === "transcribing" ? "Transcribing…" : "Use microphone"}</button><button type="submit" disabled={busy || composer.trim().length < 2 || recordingState !== "idle"}>{busy ? "Understanding…" : result ? "Keep talking" : "Continue"} <span>→</span></button></div>
    </form>
  </div>;
}
