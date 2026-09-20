"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { SorpSnapshotLink } from "./sorp-snapshot-link";
import { SorpResultActions } from "./sorp-result-actions";
import { SorpJourneyProgress, SorpKnownContext, SorpBasisDrawer, type ReadinessWorkflow } from "./sorp-journey";
import { additionalChecks, coreQuestions, readinessStages, type AdditionalAnswerValue, type AnswerValue, type AssessmentSetup } from "./sorp-questionnaire";

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
  effectiveVersion: string;
  resolvedAt: string;
  mode: "CURRENT" | "PINNED" | "LAST_KNOWN_PUBLISHED";
  usedFallback: boolean;
  layers: { id: string; name: string; kind: string; relationship: "INHERITED" | "EXTENDED" | "OVERRIDDEN"; version: number; label: string; status: "ACTIVE" | "ARCHIVED"; publishedAt: string | null }[];
  runtimeControls: { name: string; type: string; representedBy: string }[];
};

export type ReadinessState = {
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
  workflow?: ReadinessWorkflow;
  responseKind?: "assessment" | "detour" | "result";
  role: "user" | "assistant";
  content: string;
  label?: "MUST" | "SHOULD" | "MAY" | "JUDGEMENT" | "MSI READINESS" | null;
  citations?: Citation[];
  publicSources?: PublicSource[];
  organisation?: OrganisationCard | null;
  actions?: MessageAction[];
};

type ReadinessResponse = {
  workflow: ReadinessWorkflow;
  state: ReadinessState;
  assistant: { message: string; label: Message["label"]; citations: Citation[]; publicSources?: PublicSource[]; organisation?: OrganisationCard | null; actions?: MessageAction[]; responseKind: "assessment" | "detour" | "result" };
  result: Result | null;
  intelligence: IntelligenceProvenance;
  sessionId: string;
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

function newSessionId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `sorp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function stateFromSnapshot(raw: string): { state: ReadinessState; result: Result | null } | null {
  try {
    const snapshot = JSON.parse(raw) as {
      setup?: AssessmentSetup;
      setupState?: ReadinessState;
      coreQuestions?: { id: number; answer?: AnswerValue; context?: string }[];
      additionalChecks?: { id: string; answer?: AdditionalAnswerValue }[];
      result?: { score?: number; band?: string; sectionScores?: { section: string; label: string; score: number }[]; flags?: { must?: string[]; should?: string[]; may?: string[]; judgement?: string[] } };
    };
    if (!snapshot.setup || !snapshot.coreQuestions?.length || typeof snapshot.result?.score !== "number") return null;
    const state = { ...blankState(), ...snapshot.setupState };
    state.setup = { ...emptySetup, ...snapshot.setup };
    state.inheritedSnapshot = true;
    state.completedStages = [1, 2, 3, 4, 5, 6, 7];
    state.currentStage = 7;
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

function sourceKindLabel(kind: PublicSource["kind"]) {
  return {
    official_register: "Official register",
    organisation_website: "Organisation website",
    annual_report: "Annual report",
    other_public: "Public source",
  }[kind];
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

function ResultList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return <article><h4>{title}</h4>{items.length ? <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul> : <p>{empty}</p>}</article>;
}

export function SorpReadinessConversation({ setupOnly = false, onSetupComplete }: { setupOnly?: boolean; onSetupComplete?: (state: ReadinessState, workflow: ReadinessWorkflow) => void }) {
  const storageKey = setupOnly ? "msi-sorp-snapshot-setup-v1" : CONVERSATION_KEY;
  const [started, setStarted] = useState(false);
  const [state, setState] = useState<ReadinessState>(() => blankState());
  const [messages, setMessages] = useState<Message[]>([]);
  const [composer, setComposer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [intelligence, setIntelligence] = useState<IntelligenceProvenance | null>(null);
  const [sessionId, setSessionId] = useState("");
  const [workflow, setWorkflow] = useState<ReadinessWorkflow | null>(null);
  const [completionNotice, setCompletionNotice] = useState("");
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
    const viewport = window.visualViewport;
    const resize = () => document.documentElement.style.setProperty("--sorp-viewport-height", `${viewport?.height || window.innerHeight}px`);
    resize();
    viewport?.addEventListener("resize", resize);
    return () => { viewport?.removeEventListener("resize", resize); document.documentElement.style.removeProperty("--sorp-viewport-height"); };
  }, []);

  useEffect(() => {
    const restore = window.setTimeout(() => {
      try {
        const wantsSnapshot = !setupOnly && new URLSearchParams(window.location.search).get("from") === "snapshot";
        const snapshotRaw = window.localStorage.getItem(SNAPSHOT_RESULT_KEY);
        const snapshot = snapshotRaw ? stateFromSnapshot(snapshotRaw) : null;
        setSnapshotAvailable(Boolean(snapshot));
        if (wantsSnapshot && snapshot) {
          setSessionId(newSessionId());
          setState(snapshot.state);
          setResult(snapshot.result);
          setStarted(true);
          setMessages([{ role: "assistant", content: `I’ve got your Snapshot, so we don’t need to start again.\n\nYour initial score is ${snapshot.result?.score}/100. I’ll use those answers and focus on the areas where richer context would genuinely improve the result.\n\nTell me what feels least certain—or ask me about any part of your result.` }]);
        } else {
          const saved = window.localStorage.getItem(storageKey);
          if (saved) {
            const parsed = JSON.parse(saved) as { started?: boolean; state?: ReadinessState; messages?: Message[]; result?: Result | null; intelligence?: IntelligenceProvenance | null; sessionId?: string; workflow?: ReadinessWorkflow };
            if (parsed.started && parsed.state && parsed.messages?.length) {
              setStarted(true);
              setState({ ...blankState(), ...parsed.state, charityName: parsed.state.charityName ?? "", contextEvidence: parsed.state.contextEvidence ?? {} });
              setMessages(parsed.messages);
              setResult(parsed.result ?? null);
              setWorkflow(parsed.workflow ?? null);
              setIntelligence(parsed.workflow?.version === 2 ? parsed.intelligence ?? null : null);
              setSessionId(parsed.sessionId || newSessionId());
            }
          }
        }
      } catch {
        setError("We could not restore the local conversation, so you can start cleanly.");
      }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(restore);
  }, [setupOnly, storageKey]);

  useEffect(() => {
    if (!hydrated || !started) return;
    try { window.localStorage.setItem(storageKey, JSON.stringify({ started, state, messages, result, intelligence, sessionId, workflow })); } catch { setError("Your browser could not save this conversation. Keep this page open to retain your progress."); }
  }, [hydrated, started, state, messages, result, intelligence, sessionId, workflow, storageKey]);

  useEffect(() => {
    const body = document.querySelector<HTMLElement>(".sorp-journey-body");
    const target = document.querySelector<HTMLElement>(completionNotice ? ".sorp-completion-notice" : "#readiness-current-question");
    if (body && target) body.scrollTo({ top: completionNotice.includes("Organisation confirmed") ? 0 : body.scrollTop + target.getBoundingClientRect().top - body.getBoundingClientRect().top - 20, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }, [messages, busy, result, completionNotice]);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  function startConversation(useSnapshot = false) {
    setWorkflow(null);
    setCompletionNotice("");
    setSessionId(newSessionId());
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
    setMessages([{ role: "assistant", content: "Let’s find your charity.\n\nWhat is the charity called? A location or a few words about its work can help us find the right one." }]);
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
        body: JSON.stringify({
          message: value,
          state,
          history: nextMessages.slice(-40).map(({ role, content }) => ({ role, content })),
          sessionId: sessionId || newSessionId(),
          intelligencePin: intelligence?.effectiveVersion ? { effectiveVersion: intelligence.effectiveVersion } : null,
        }),
      });
      const data = await response.json() as ReadinessResponse & { error?: string };
      if (!response.ok) throw new Error(data.error || "The readiness conversation is temporarily unavailable.");
      setState(data.state);
      setWorkflow(data.workflow);
      if (setupOnly && data.workflow.completedStages.includes(2)) onSetupComplete?.(data.state, data.workflow);
      const newlyKnown = data.workflow.known.filter(item => item.established && !workflow?.known.find(previous => previous.id === item.id)?.established);
      const newlyCompleted = data.workflow.completedStages.filter(stage => !workflow?.completedStages.includes(stage));
      setCompletionNotice(newlyCompleted.length ? `✓ ${newlyCompleted.map(stage => `Stage ${stage}`).join(" & ")} complete. ${data.workflow.currentStage === 2 ? "Good — that’s the first thing sorted." : data.workflow.currentStage === 3 ? "We’ve got the context we need." : "One more part of your readiness picture established."}` : !workflow?.known.find(item => item.id === "charityName")?.established && data.workflow.known.find(item => item.id === "charityName")?.established ? "✓ Organisation confirmed. Here’s what we’ve found so far." : newlyKnown.length ? `✓ ${newlyKnown.map(item => item.label).join(" · ")} confirmed. Good — that’s one more thing sorted.` : "");
      setIntelligence(data.intelligence);
      setSessionId(data.sessionId || sessionId || newSessionId());
      setMessages((current) => [...current, {
        role: "assistant",
        content: data.assistant.message,
        label: data.assistant.label,
        citations: data.assistant.citations,
        publicSources: data.assistant.publicSources,
        organisation: data.assistant.organisation,
        actions: data.assistant.actions,
        workflow: data.workflow,
        responseKind: data.assistant.responseKind,
      }]);
      if (data.result) setResult(data.result);
    } catch (caught) {
      setMessages(messages);
      setComposer(value);
      setError(caught instanceof Error ? caught.message : "The readiness conversation is temporarily unavailable.");
    } finally {
      setBusy(false);
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

  const currentStage = workflow?.currentStage || 1;
  const impactMode = state.assessmentMode === "impact_readiness";

  if (!started) return <section className="readiness-intro">
    <p className="readiness-kicker">SORP 2026<br /><strong>Completely free</strong></p>
    <h1>{setupOnly ? <>A quick route.<br />The right context first.</> : <>Talk it through.<br />Get your free report.</>}</h1>
    <div className="readiness-intro-copy">{setupOnly && <p>We’ll find your organisation and establish what applies, then take you straight to the 15-question snapshot.</p>}<p>You’re about to talk to <strong>My Social Impact Intelligence</strong>: specialist guidance built from MSI’s SORP and social impact expertise.</p><p>First we’ll establish whether SORP 2026 applies, then gather the context and explore your readiness for its narrative and impact-reporting expectations. You’ll see what we know, why we’re asking and the SORP basis as we go.</p><p>At the end, you’ll receive your personalised SORP readiness report. <strong>There is no charge, no card and no surprise paywall.</strong></p></div>
    <div className="readiness-intro-actions"><button type="button" onClick={() => startConversation(false)}>{setupOnly ? "Find my organisation" : "Start my free conversation"} <span>→</span></button>{!setupOnly && (snapshotAvailable ? <button type="button" className="is-secondary" onClick={() => startConversation(true)}>Use my completed Snapshot <span>→</span></button> : <SorpSnapshotLink className="is-secondary" startLabel="Take the 15-question shortcut" />)}</div>
    {!setupOnly && <p className="readiness-intro-note"><strong>Prefer to whiz through?</strong> The Quick Snapshot takes around eight minutes. Both routes produce the same free initial report, and you can return to the conversation afterwards. Your progress is saved only in this browser.</p>}
  </section>;

  return <div className="readiness-chat">
    <SorpJourneyProgress current={currentStage} completed={workflow?.completedStages || []} result={Boolean(result)} />

    <div className="sorp-journey-body">
    <aside className="sorp-journey-aside">{workflow && <SorpKnownContext workflow={workflow} />}<p className="sorp-journey-assurance">Your free SORP readiness report<br /><span>Narrative and impact reporting · saved on this device</span></p><a className="sorp-save-exit" href="/are-you-sorp-ready">Save &amp; exit ↗</a></aside>

    <div className="readiness-thread" aria-live="polite">
      {setupOnly && workflow?.completedStages.includes(2) && <button type="button" className="sorp-setup-continue" onClick={() => onSetupComplete?.(state, workflow)}>✓ Context established — continue to the 15 questions →</button>}
      {messages.length > 1 && <details className="sorp-conversation-history"><summary>Our conversation so far <span>{messages.filter(message => message.role === "user").length} replies</span></summary>{messages.slice(0, -1).map((message, index) => <article key={index}><small>{message.role === "user" ? "You" : "My Social Impact Intelligence"}</small><MessageContent text={message.content} />{message.organisation && <strong>{message.organisation.name} · {message.organisation.locality}</strong>}</article>)}</details>}
      {completionNotice && <p className="sorp-completion-notice" role="status">{completionNotice}</p>}
      {workflow?.completedStages.includes(1) && currentStage === 2 && state.sorpApplicability === "likely_applies" && <p className="sorp-applicability-confirmed">✓ SORP 2026 applies to you <span>For the charity and reporting context established here.</span></p>}
      {messages.map((message, index) => index === messages.length - 1 && <article id="readiness-current-question" key={`${index}-${message.content.slice(0, 24)}`} className={`readiness-message is-${message.role}`}>
        {message.role === "assistant" && <p className="sorp-current-stage">Stage {currentStage} · {readinessStages[currentStage - 1]}</p>}
        <span>{message.role === "user" ? "You" : "My Social Impact Intelligence"}</span>
        {message.label && message.responseKind === "detour" && <strong className={`readiness-label is-${message.label.toLowerCase().replace(" ", "-")}`}>{message.label}</strong>}
        <div><MessageContent text={message.organisation ? "I think I’ve found you." : message.content} /></div>
        {message.role === "assistant" && !message.organisation && message.responseKind !== "result" && <section className="sorp-question-purpose"><strong>{message.responseKind === "detour" ? "What we need next" : "Why we’re asking"}</strong><p>{message.responseKind === "detour" ? message.workflow?.next.question : message.workflow?.next.why || "Finding the right organisation lets us use public information and establish whether SORP 2026 applies to you."}</p></section>}
        {message.organisation && <section className="readiness-organisation-card" aria-label="Organisation found">
          <h3>{message.organisation.name}</h3>
          {message.organisation.locality && <p className="readiness-organisation-location">{message.organisation.locality}</p>}
          {message.publicSources?.length ? <nav className="readiness-organisation-links" aria-label="Organisation sources">{message.publicSources.slice(0, 2).map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{confirmationSourceLabel(source)}</a>)}</nav> : null}
        </section>}
        {message.organisation && <p className="sorp-confirm-question">Is this the right organisation?</p>}
        {message.actions?.length ? <nav className="readiness-message-actions" aria-label="Choose an answer">{message.actions.map((action) => <button key={`${action.label}-${action.value}`} type="button" disabled={busy || index !== messages.length - 1} onClick={() => void sendMessage(action.value)}>{action.label}<span>→</span></button>)}</nav> : null}
        {message.workflow && !message.organisation && message.responseKind !== "detour" && <SorpBasisDrawer basis={message.workflow.next.basis} />}
        {message.responseKind === "detour" && message.citations?.length ? <SorpBasisDrawer basis={{classification: message.label || "MSI JUDGEMENT", explanation: "The SORP passages relevant to your question.", citations: message.citations}} /> : null}
        {!message.organisation && message.publicSources?.length ? <details><summary>Sources</summary><div>{message.publicSources.map((source) => <article key={`${source.url}-${source.detail}`}><strong>{sourceKindLabel(source.kind)} · {source.label}</strong>{source.detail && <p>{source.detail}</p>}<a href={source.url}>View source <span>→</span></a></article>)}</div></details> : null}
      </article>)}
      {busy && <article className="readiness-message is-assistant is-loading"><span>My Social Impact Intelligence</span><div><p>{!state.charityName && state.currentStage === 1 ? "Looking for the right organisation…" : "Understanding what you’ve said and checking the relevant public and SORP evidence…"}</p></div></article>}
      {error && <div className="readiness-error" role="alert"><strong>That step did not complete.</strong><p>{error}</p><button type="button" onClick={() => { setError(""); composerRef.current?.focus(); }}>Try again</button></div>}
      {result && messages.at(-1)?.role === "assistant" && state.score !== null && <section className="readiness-result">
        <header><div><p>{state.charityName || "Are You SORP Ready?"}</p><h2>Your SORP readiness result</h2><span>{result.overview}</span></div><div><strong>{result.score}</strong><span>/ 100</span><b>{result.band}</b></div></header>
        <p className="readiness-result-note">{impactMode ? "SORP does not apply in the circumstances established. This report offers wider narrative and impact-reporting guidance." : "This assesses readiness for the narrative and impact-reporting aspects of SORP 2026. It is not a declaration of full SORP compliance."}</p>
        <div className="readiness-result-sections">{result.sectionScores.map((section) => <article key={section.section}><div><h3>{section.label}</h3><strong>{section.score}</strong></div><i><b style={{ width: `${section.score}%` }} /></i><p>{section.narrative}</p></article>)}</div>
        <div className="readiness-result-grid"><ResultList title="What looks strong" items={result.strong} empty="No clear strength has been evidenced yet." /><ResultList title="What needs attention" items={result.attention} empty="No immediate weaker area was identified." /><ResultList title="MUST areas" items={result.must} empty="No applicable MUST area was flagged by this initial assessment." /><ResultList title="SHOULD opportunities" items={result.should} empty="No weaker SHOULD opportunity was identified." /><ResultList title="MAY options" items={result.may} empty="No additional MAY option was identified." /><ResultList title="JUDGEMENT areas" items={result.judgement} empty="No specific judgement area was flagged, although context still matters." /><ResultList title="Additional SORP checks" items={result.additionalChecks} empty="No additional check was triggered by the information supplied." /><ResultList title="Three priority actions" items={result.priorities} empty="Add more context to build practical priorities." /></div>
        {sessionId && <SorpResultActions sessionId={sessionId} organisation={state.charityName} income={state.setup.income} />}
      </section>}
      {intelligence && <details className="readiness-intelligence" aria-label="Effective intelligence provenance">
        <summary>{intelligence.layers.filter((layer) => layer.id === "msi-core" || layer.id === "sorp-readiness-intelligence").map((layer) => `${intelligenceLayerLabel(layer)} · ${layer.label}`).join(" · ")}</summary>
        <div>
          <p><strong>{intelligence.registry} · {intelligence.effectiveVersion}</strong><span>Published intelligence only · {intelligence.mode === "CURRENT" ? "latest for this new session" : intelligence.mode === "PINNED" ? "pinned for this conversation" : "last known published — Cow Console was temporarily unavailable"}</span></p>
          {intelligence.layers.map((layer) => <p key={`${layer.id}-${layer.version}`}><strong>{intelligenceLayerLabel(layer)} · {layer.label}</strong><span>{layer.relationship.toLowerCase()} · {layer.status.toLowerCase()} · published {layer.publishedAt ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(layer.publishedAt)) : "date unavailable"}</span></p>)}
          {intelligence.runtimeControls.map((control) => <p key={`${control.name}-${control.type}`}><strong>{control.name} · {control.type}</strong><span>Represented by {control.representedBy}</span></p>)}
        </div>
      </details>}
      <div ref={threadEndRef} />
    </div>

    </div>
    <form className="readiness-composer" onSubmit={submit}>
      <label htmlFor="readiness-answer">{impactMode ? "Answer naturally—or ask an impact question at any point." : "Answer naturally—or ask a SORP question at any point."}</label>
      <textarea ref={composerRef} id="readiness-answer" rows={2} value={composer} onChange={(event) => setComposer(event.target.value)} placeholder="Type or say what you know…" maxLength={4000} />
      <div><button type="button" className="readiness-mic" onClick={recordingState === "recording" ? stopRecording : () => void startRecording()} disabled={busy || recordingState === "transcribing"}>{recordingState === "recording" ? `Stop · ${recordingTime(recordingSeconds)}` : recordingState === "transcribing" ? "Transcribing…" : "Use microphone"}</button><button type="submit" disabled={busy || composer.trim().length < 2 || recordingState !== "idle"}>{busy ? "Understanding…" : result ? "Keep talking" : "Continue"} <span>→</span></button></div>
    </form>
  </div>;
}
