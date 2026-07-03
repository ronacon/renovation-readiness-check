import { useState, useRef, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Calendar, Shield, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

const C = {
  bg: '#1a3430', bgDeep: '#122724',
  panel: 'rgba(255,255,255,0.055)', panelHover: 'rgba(255,255,255,0.09)',
  border: 'rgba(255,255,255,0.10)', borderHover: 'rgba(212,169,58,0.55)',
  gold: '#d4a93a', goldLight: '#e8c060', goldPale: 'rgba(212,169,58,0.13)',
  cream: '#f2ede0', creamMid: 'rgba(242,237,224,0.65)', creamFaint: 'rgba(242,237,224,0.35)',
  red: '#c0483a', redPale: 'rgba(192,72,58,0.15)',
  green: '#4e8860', greenPale: 'rgba(78,136,96,0.13)',
  amber: '#c47f1a', amberPale: 'rgba(196,127,26,0.13)',
};

const CALENDLY = {
  urgent: 'https://calendly.com/simonbawden/renovation-readiness-call',
  review: 'https://calendly.com/simonbawden/renovation-readiness-call',
  confirm: 'https://calendly.com/simonbawden/renovation-readiness-call',
};

type CalendlyKey = keyof typeof CALENDLY;
type Category = 'vision' | 'budget' | 'team' | 'planning' | 'readiness';
type Severity = 'high' | 'medium';

interface Option {
  label: string;
  points: number;
  flag: string | null;
}

interface Question {
  section: string;
  category: Category;
  id: string;
  question: string;
  sub: string;
  type: 'single';
  options: Option[];
}

// ── Shuffle helper ────────────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── RAW QUESTIONS (options will be shuffled on load) ─────────────────────────
const RAW_QUESTIONS: Question[] = [
  {
    section: 'Vision & Brief',
    category: 'vision',
    id: 'q_brief_timing',
    question: 'You have a rough idea of what you want. When should you first contact an architect?',
    sub: 'Think carefully. This is the single most common sequencing mistake.',
    type: 'single',
    options: [
      { label: 'Once I have a detailed written brief, moodboard, and a clear set of non-negotiables', points: 10, flag: null },
      { label: 'As soon as I have a rough idea. They can help shape the brief', points: 0, flag: 'BRIEF_TOO_EARLY' },
      { label: 'After I\'ve got a rough builder quote so I know what\'s realistic', points: 0, flag: 'SEQUENCE_BUILDER_FIRST' },
      { label: 'Once planning permission is sorted', points: 0, flag: 'PLANNING_FIRST_WRONG' },
    ],
  },
  {
    section: 'Vision & Brief',
    category: 'vision',
    id: 'q_pd_proof',
    question: 'You believe your project falls under Permitted Development. What should you do?',
    sub: 'Assuming is not the same as confirming.',
    type: 'single',
    options: [
      { label: 'Apply for a Certificate of Lawfulness from my local planning authority. It costs around £100 to £200 and gives legal proof', points: 10, flag: null },
      { label: 'Ask my architect. If they say it\'s fine, I\'ll proceed', points: 3, flag: 'PLANNING_ASSUMED' },
      { label: 'Check the government Permitted Development rules online and proceed if they apply', points: 2, flag: 'PLANNING_ASSUMED' },
      { label: 'My neighbour did a similar extension. If they didn\'t need permission, I won\'t either', points: 0, flag: 'PLANNING_ASSUMED' },
    ],
  },
  {
    section: 'Vision & Brief',
    category: 'vision',
    id: 'q_estate_agent',
    question: 'Before finalising your renovation plans, which of these is Simon\'s recommended but commonly skipped step?',
    sub: 'Drawn directly from the Vision checklist in the guide.',
    type: 'single',
    options: [
      { label: 'Speak to at least one estate agent about what the renovation could do to the property\'s value', points: 10, flag: null },
      { label: 'Get three architect quotes and pick the middle one', points: 0, flag: 'SKIPPED_ESTATE_AGENT' },
      { label: 'Check Google Street View to see what neighbours have built', points: 3, flag: 'SKIPPED_ESTATE_AGENT' },
      { label: 'Apply for planning permission before spending money on architects', points: 0, flag: 'SKIPPED_ESTATE_AGENT' },
    ],
  },
  {
    section: 'Budget & Contingency',
    category: 'budget',
    id: 'q_budget_split',
    question: 'You have a £200,000 total budget. How should it be split across construction, finishes, and fees?',
    sub: 'These are the guide\'s own figures. Most homeowners get this badly wrong.',
    type: 'single',
    options: [
      { label: 'Construction 70% (£140k), finishes and fixtures 20% (£40k), fees and contingency 10%+ (£20k+)', points: 10, flag: null },
      { label: 'Construction 80%, finishes 15%, fees 5%', points: 3, flag: 'BUDGET_SPLIT_WRONG' },
      { label: 'Construction 50%, finishes 30%, fees 20%', points: 2, flag: 'BUDGET_SPLIT_WRONG' },
      { label: 'It depends entirely on the builder\'s quote', points: 0, flag: 'BUDGET_SPLIT_WRONG' },
    ],
  },
  {
    section: 'Budget & Contingency',
    category: 'budget',
    id: 'q_contingency_pct',
    question: 'What contingency percentage does Simon recommend, and where must that money sit?',
    sub: 'A lot of people know they need contingency. Very few hold it correctly.',
    type: 'single',
    options: [
      { label: '15 to 20%, held back completely and not counted as available project spend', points: 10, flag: null },
      { label: '5 to 10%, kept in a separate savings account just in case', points: 3, flag: 'CONTINGENCY_LOW' },
      { label: '10%, included in the total builder budget figure', points: 2, flag: 'CONTINGENCY_INCLUDED' },
      { label: 'Whatever is left over once the build is finished', points: 0, flag: 'CONTINGENCY_MISSING' },
    ],
  },
  {
    section: 'Budget & Contingency',
    category: 'budget',
    id: 'q_survey_timing',
    question: 'When is the right time to set your renovation budget?',
    sub: 'Simon calls this the Golden Rule. Most people get it backwards.',
    type: 'single',
    options: [
      { label: 'After receiving the survey report. It reveals hidden issues that directly change the cost', points: 10, flag: null },
      { label: 'Before viewing properties, so I know my ceiling', points: 0, flag: 'SURVEY_IGNORED' },
      { label: 'After the architect has done the concept design', points: 2, flag: 'SURVEY_IGNORED' },
      { label: 'Budget and survey are independent. They don\'t affect each other', points: 0, flag: 'SURVEY_IGNORED' },
    ],
  },
  {
    section: 'Professional Sequence',
    category: 'team',
    id: 'q_hire_order',
    question: 'In what order should you appoint the key professionals on a rear extension?',
    sub: 'Get this wrong and you pay for it twice.',
    type: 'single',
    options: [
      { label: 'Architect, then structural engineer, then party wall surveyor, then building control, then three builders quoting against the same drawings', points: 10, flag: null },
      { label: 'Builder first for a rough budget, then architect, then everyone else', points: 0, flag: 'SEQUENCE_WRONG' },
      { label: 'Planning authority first, then architect, then builder', points: 2, flag: 'SEQUENCE_PARTIAL' },
      { label: 'All at the same time. They can coordinate between themselves', points: 0, flag: 'SEQUENCE_WRONG' },
    ],
  },
  {
    section: 'Professional Sequence',
    category: 'team',
    id: 'q_quotes_right_way',
    question: 'You want three builder quotes. What must be true before you approach them?',
    sub: 'Quoting without this is how apples get compared to oranges.',
    type: 'single',
    options: [
      { label: 'Architect\'s drawings must be complete, and all three must quote against the same Scope of Works document', points: 10, flag: null },
      { label: 'I have a rough description of the work and some photos of the space', points: 0, flag: 'QUOTES_NO_SOW' },
      { label: 'I\'ve had planning permission granted', points: 2, flag: 'QUOTES_NO_SOW' },
      { label: 'The architect has done a sketch scheme. Builders can estimate from that', points: 0, flag: 'QUOTES_NO_SOW' },
    ],
  },
  {
    section: 'Professional Sequence',
    category: 'team',
    id: 'q_architect_red_flag',
    question: 'Which of these is a genuine red flag when interviewing an architect?',
    sub: 'All four might sound plausible. Only one is taken directly from the guide.',
    type: 'single',
    options: [
      { label: 'They cannot show you planning applications they\'ve submitted in your borough', points: 10, flag: null },
      { label: 'They recommend a structural engineer they\'ve worked with before', points: 0, flag: 'ARCHITECT_RED_FLAG_MISSED' },
      { label: 'They charge a fixed fee rather than a percentage of build cost', points: 0, flag: 'ARCHITECT_RED_FLAG_MISSED' },
      { label: 'They want two weeks to prepare a proper quote', points: 0, flag: 'ARCHITECT_RED_FLAG_MISSED' },
    ],
  },
  {
    section: 'Planning & Legal',
    category: 'planning',
    id: 'q_party_wall_notice',
    question: 'How much notice must you give neighbours before starting work on a shared wall?',
    sub: 'Getting this wrong stops your project dead.',
    type: 'single',
    options: [
      { label: 'At least 2 months (1 month for some excavation works)', points: 10, flag: null },
      { label: 'At least 2 weeks. Enough time for them to raise any concerns', points: 0, flag: 'PARTY_WALL_RISK' },
      { label: 'At least 1 month', points: 3, flag: 'PARTY_WALL_RISK' },
      { label: 'No formal notice is required. Just have a friendly conversation', points: 0, flag: 'PARTY_WALL_RISK' },
    ],
  },
  {
    section: 'Planning & Legal',
    category: 'planning',
    id: 'q_leasehold',
    question: 'You own a leasehold flat and want to remove an internal (non-structural) wall. What do you need?',
    sub: 'The guide covers this explicitly. Most flat owners get it wrong.',
    type: 'single',
    options: [
      { label: 'Written permission from the freeholder via a signed Licence for Alterations. Most leases require this even for non-structural work', points: 10, flag: null },
      { label: 'Building control approval only. Internal walls don\'t need planning', points: 0, flag: 'LEASEHOLD_RISK' },
      { label: 'Nothing. It\'s my flat and my wall', points: 0, flag: 'LEASEHOLD_RISK' },
      { label: 'A verbal agreement with the freeholder is enough', points: 0, flag: 'LEASEHOLD_RISK' },
    ],
  },
  {
    section: 'Planning & Legal',
    category: 'planning',
    id: 'q_insurance',
    question: 'You\'re about to start structural works. What must you do about home insurance?',
    sub: 'Most homeowners assume this is covered. It almost never is.',
    type: 'single',
    options: [
      { label: 'Notify my insurer in writing before work starts. If they won\'t cover structural works, get a specialist renovation policy', points: 10, flag: null },
      { label: 'My builder\'s public liability insurance covers the property during the build', points: 0, flag: 'INSURANCE_RISK' },
      { label: 'Standard home insurance automatically covers renovation works', points: 0, flag: 'INSURANCE_RISK' },
      { label: 'Update the insurance once the build is complete', points: 0, flag: 'INSURANCE_RISK' },
    ],
  },
  {
    section: 'Construction & Control',
    category: 'readiness',
    id: 'q_variation_orders',
    question: 'Your builder suggests a change to the agreed scope. What is the correct process?',
    sub: 'This is how projects go £20,000 over budget without anyone realising.',
    type: 'single',
    options: [
      { label: 'A written Variation Order signed by both parties, stating what is changing, the agreed cost, and any programme impact, before work proceeds', points: 10, flag: null },
      { label: 'A verbal agreement on site is fine for small changes', points: 0, flag: 'VARIATION_RISK' },
      { label: 'A WhatsApp message from me saying yes, go ahead is sufficient', points: 3, flag: 'VARIATION_PARTIAL' },
      { label: 'Tell the builder to crack on and sort the cost out at the end', points: 0, flag: 'VARIATION_RISK' },
    ],
  },
  {
    section: 'Construction & Control',
    category: 'readiness',
    id: 'q_procurement_delay',
    question: 'Which of these items has the longest typical lead time and must be ordered on Day 1 of the build?',
    sub: 'Ordering this late is the guide\'s number one delay culprit.',
    type: 'single',
    options: [
      { label: 'Bi-fold and sliding doors. Lead times of 8 to 14 weeks are common', points: 10, flag: null },
      { label: 'Kitchen units. Four to six weeks is usually enough', points: 3, flag: 'PROCUREMENT_RISK' },
      { label: 'Bathroom sanitaryware. Order any time before plastering', points: 2, flag: 'PROCUREMENT_RISK' },
      { label: 'Flooring. Available off the shelf from most suppliers', points: 0, flag: 'PROCUREMENT_RISK' },
    ],
  },
  {
    section: 'Construction & Control',
    category: 'readiness',
    id: 'q_snagging',
    question: 'When should you start your snagging list, and when should you release the retention payment?',
    sub: 'The guide is very specific on both of these.',
    type: 'single',
    options: [
      { label: 'Start snagging from day one of finishes as a rolling list, and release retention only after 4 weeks of occupation', points: 10, flag: null },
      { label: 'Snag once the builder declares completion, and pay retention when the list is resolved', points: 4, flag: 'SNAGGING_PARTIAL' },
      { label: 'Do one walk-through at the end and release retention immediately when satisfied', points: 0, flag: 'SNAGGING_RISK' },
      { label: 'Snagging is the builder\'s job. They should hand over a clean property', points: 0, flag: 'SNAGGING_RISK' },
    ],
  },
  {
    section: 'Construction & Control',
    category: 'readiness',
    id: 'q_payment_deposit',
    question: 'A builder asks for 30% upfront before starting. How should you respond?',
    sub: 'The guide gives explicit numbers here.',
    type: 'single',
    options: [
      { label: 'Decline. The standard is a 5% deposit on signing, then payments tied to completed milestones. Asking for more than 25% upfront is a red flag', points: 10, flag: null },
      { label: 'Agree. Builders need cash to buy materials upfront', points: 0, flag: 'PAYMENT_RISK' },
      { label: 'Negotiate down to 20%. A reasonable compromise', points: 2, flag: 'PAYMENT_RISK' },
      { label: 'It depends on the builder\'s reputation', points: 2, flag: 'PAYMENT_RISK' },
    ],
  },
];

const QUESTIONS: Question[] = RAW_QUESTIONS.map(q => ({ ...q, options: shuffle(q.options) }));

// ── SCORING ──────────────────────────────────────────────────────────────────
const MAX_POINTS: Record<Category, number> = { vision: 30, budget: 30, team: 30, planning: 30, readiness: 40 };
const TOTAL_MAX = Object.values(MAX_POINTS).reduce((a, b) => a + b, 0);

interface ScoreResult {
  byCategory: Record<Category, number>;
  total: number;
  pct: number;
  flags: string[];
}

function scoreAnswers(answers: Record<string, string>): ScoreResult {
  const byCategory: Record<Category, number> = { vision: 0, budget: 0, team: 0, planning: 0, readiness: 0 };
  const flags: string[] = [];
  QUESTIONS.forEach(q => {
    const ans = answers[q.id];
    if (!ans) return;
    const opt = q.options.find(o => o.label === ans);
    if (opt) {
      byCategory[q.category] = Math.min(byCategory[q.category] + opt.points, MAX_POINTS[q.category]);
      if (opt.flag) flags.push(opt.flag);
    }
  });
  const total = Object.values(byCategory).reduce((a, b) => a + b, 0);
  const pct = Math.round((total / TOTAL_MAX) * 100);
  return { byCategory, total, pct, flags };
}

// ── FLAG MESSAGES ────────────────────────────────────────────────────────────
const FLAG_MESSAGES: Record<string, { sev: Severity; msg: string }> = {
  BRIEF_TOO_EARLY: { sev: 'high', msg: 'Going to an architect with a rough idea means paying for revision rounds you shouldn\'t need. Simon\'s rule: brief first, architect second. Two weeks on a moodboard and a written brief saves thousands in architect fees.' },
  SEQUENCE_BUILDER_FIRST: { sev: 'high', msg: 'Approaching a builder before you have architect\'s drawings means getting guesses, not quotes. A builder cannot price accurately without drawings and a Scope of Works. The correct sequence is: architect, structural engineer, party wall surveyor, building control — then builders.' },
  PLANNING_FIRST_WRONG: { sev: 'high', msg: 'You cannot apply for planning permission without architect drawings. Planning comes after the architect has produced a scheme, not before.' },
  PLANNING_ASSUMED: { sev: 'high', msg: 'Assuming Permitted Development without confirmation is one of the most common and costly mistakes. A Certificate of Lawfulness costs £100–200 and takes 8 weeks. Future buyers\' solicitors will ask for it. Get one — no exceptions.' },
  SKIPPED_ESTATE_AGENT: { sev: 'medium', msg: 'Before committing to a renovation, Simon recommends speaking to at least one estate agent about what it could do to your property\'s value. You need to know whether your investment makes financial sense before a single penny is spent on professionals.' },
  BUDGET_SPLIT_WRONG: { sev: 'high', msg: 'The correct split is: build costs 70%, finishes and fixtures 20%, professional fees and contingency 10%+. Most homeowners only budget for the build and are blindsided by kitchen costs, bathroom specification, flooring, and lighting — which together account for around 20% of the total.' },
  CONTINGENCY_LOW: { sev: 'medium', msg: 'A 5–10% contingency disappears fast on a live site. Simon recommends 15–20%, held back completely and not included in the available project spend. The money you don\'t spend comes back to you at the end.' },
  CONTINGENCY_INCLUDED: { sev: 'high', msg: 'If contingency is folded into the total budget figure, it is effectively already spent. It must be held completely separately, untouched, and not counted as available budget.' },
  CONTINGENCY_MISSING: { sev: 'high', msg: 'Starting any project without contingency is one of the fastest routes to a financial crisis mid-build. Surveys reveal hidden issues. Variations creep in. Every project hits something unexpected. Without 15% held back, the first surprise empties the pot.' },
  SURVEY_IGNORED: { sev: 'high', msg: 'The survey report is your single biggest variable in project cost. Structural movement, damp, roof condition — these can add £10,000–30,000 to your budget overnight. Simon\'s golden rule: never set your renovation budget before you have your survey report in hand.' },
  SEQUENCE_WRONG: { sev: 'high', msg: 'The correct sequence is architect first, then structural engineer, then party wall surveyor, then building control, then builders (all quoting against the same drawings and Scope of Works). Getting this wrong means paying professionals twice and waiting months for work to catch up.' },
  SEQUENCE_PARTIAL: { sev: 'medium', msg: 'Planning authority involvement comes after the architect has produced drawings — you cannot apply without them. Make sure you understand the full sequence before committing any fees.' },
  QUOTES_NO_SOW: { sev: 'high', msg: 'Quotes without a Scope of Works are estimates, not prices. When three builders quote against a description rather than completed drawings, you cannot compare them and you cannot hold the cheapest to anything. The SOW is not optional.' },
  ARCHITECT_RED_FLAG_MISSED: { sev: 'medium', msg: 'The clearest red flag Simon identifies is an architect who cannot show you planning applications they have submitted in your specific borough. Local knowledge and track record matter — not just portfolio quality.' },
  PARTY_WALL_RISK: { sev: 'high', msg: 'Party wall notice must be served at least 2 months before work starts on a shared wall (1 month for some excavation works). If your neighbour dissents, the process can take up to 12 months. Missing this notice stops your project dead on its start date.' },
  LEASEHOLD_RISK: { sev: 'high', msg: 'Leasehold leases almost always require the freeholder\'s written permission via a Licence for Alterations — even for non-structural internal work. Simon has seen homeowners get three months into a renovation and then discover their freeholder won\'t consent. Check your lease before you brief your architect.' },
  INSURANCE_RISK: { sev: 'high', msg: 'Your builder\'s public liability insurance covers their liability — not your building or your contents. Standard home insurance policies typically become invalid the moment structural work begins. A specialist renovation policy costs £300–800 and is non-negotiable.' },
  VARIATION_RISK: { sev: 'high', msg: 'Every uncosted verbal change is how projects go £20,000 over budget without anyone being dishonest. The rule is simple: no variation proceeds without a written Variation Order signed by both parties, stating the cost and programme impact, before work begins.' },
  VARIATION_PARTIAL: { sev: 'medium', msg: 'A WhatsApp message is better than nothing, but a formal written Variation Order is significantly stronger. Make sure the message explicitly states the agreed cost and both parties confirm it before work proceeds.' },
  PROCUREMENT_RISK: { sev: 'high', msg: 'Bi-fold and sliding doors carry 8–14 week lead times. If you don\'t order on Day 1 of the build, your builder will be standing in an empty room waiting — at your cost, at £800–1,500 per week in standing time. Procurement is one of your most important responsibilities as project manager.' },
  PAYMENT_RISK: { sev: 'high', msg: 'Asking for more than 25% upfront is explicitly listed in the guide as a builder red flag. The normal structure is a 5% deposit on signing, then milestone payments tied to verifiable completed stages. Never pay a stage until that stage is visibly and verifiably complete.' },
  SNAGGING_PARTIAL: { sev: 'medium', msg: 'Starting a rolling snagging list from day one of finishes is much more manageable than a last-minute blitz. And the 4-week retention rule exists because issues like sticking doors, settlement cracks, and incomplete sealing only appear after occupation — the retention is your leverage.' },
  SNAGGING_RISK: { sev: 'high', msg: 'Snagging is entirely your responsibility. Release retention only after 4 weeks of occupation, once you can see which issues only show up after living in the property. Once the retention is paid, your negotiating position is gone.' },
};

const CATEGORY_LABELS: Record<Category, string> = {
  vision: 'Vision & Brief',
  budget: 'Budget & Contingency',
  team: 'Professional Sequence',
  planning: 'Planning & Legal',
  readiness: 'Construction & Control',
};

function getCategoryBand(score: number, max: number): 'strong' | 'caution' | 'risk' {
  const pct = (score / max) * 100;
  if (pct >= 80) return 'strong';
  if (pct >= 50) return 'caution';
  return 'risk';
}

interface Profile {
  band: 'green' | 'amber' | 'red';
  title: string;
  subtitle: string;
  body: string;
  calendlyKey: CalendlyKey;
  ctaHeadline: string;
  ctaBody: string;
  ctaLabel: string;
}

function getProfile(pct: number, flags: string[]): Profile {
  const highCount = flags.filter(f => FLAG_MESSAGES[f]?.sev === 'high').length;
  if (pct >= 78 && highCount === 0) return {
    band: 'green',
    title: 'Genuinely well prepared',
    subtitle: 'You understand the process. Very few homeowners score here.',
    body: 'You know the sequence, the legal requirements, the financial structure, and the traps most people fall into. A short call with Simon will confirm whether your specific project has any remaining gaps before you commit.',
    calendlyKey: 'confirm',
    ctaHeadline: 'One conversation before you commit to anything.',
    ctaBody: 'You\'re well ahead of most people. A 20-minute call with Simon will either confirm your plan is solid or surface the one or two things worth tightening before you proceed.',
    ctaLabel: 'Book a free Renovation Readiness Call',
  };
  if (pct >= 50 || highCount <= 2) return {
    band: 'amber',
    title: 'Partially prepared — with real gaps',
    subtitle: 'Some strong foundations, but the gaps below will cause problems.',
    body: 'You have a working understanding of the process, but the gaps in your answers are the specific things that regularly stop projects, blow budgets, and end in disputes. They\'re all fixable — but they need to be fixed before work starts.',
    calendlyKey: 'review',
    ctaHeadline: 'These gaps are fixable — if you act before work starts.',
    ctaBody: 'Simon works through exactly these situations with homeowners every week. A 20-minute call will identify what needs to happen next, in what order, and what it will cost you if you don\'t.',
    ctaLabel: 'Book a free Renovation Review Call',
  };
  return {
    band: 'red',
    title: 'Significant preparation required',
    subtitle: 'Multiple critical gaps that would cause serious problems on a live project.',
    body: 'The issues flagged below aren\'t edge cases — they\'re the most common causes of blown budgets, legal disputes, stalled projects, and homeowner stress. None are insurmountable, but every one of them needs to be resolved before any professional is appointed and before any money is committed.',
    calendlyKey: 'urgent',
    ctaHeadline: 'Do not proceed until you\'ve addressed these.',
    ctaBody: 'Simon has guided 400+ homeowners through exactly this situation. Getting one of these wrong on a live project costs between £5,000 and £30,000 to unpick. A 20-minute call this week is worth taking.',
    ctaLabel: 'Book a free Renovation Risk Call — this week',
  };
}

// ── COMPONENT ────────────────────────────────────────────────────────────────
export default function RenovationReadinessCheck() {
  const [phase, setPhase] = useState<'intro' | 'quiz' | 'email' | 'results'>('intro');
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [emailError, setEmailError] = useState('');
  const [results, setResults] = useState<ScoreResult | null>(null);

  const q = QUESTIONS[qIndex];
  const progress = (qIndex / QUESTIONS.length) * 100;
  const canNext = !!answers[q?.id];

  const pick = (label: string) => setAnswers(a => ({ ...a, [q.id]: label }));

  const next = () => {
    if (qIndex + 1 >= QUESTIONS.length) setPhase('email');
    else setQIndex(i => i + 1);
  };
  const back = () => {
    if (qIndex > 0) setQIndex(i => i - 1);
    else setPhase('intro');
  };

  // Kajabi form loaded invisibly in the background so the existing custom
  // name/email UI above can stay pixel-identical - on submit its values are
  // copied into this hidden Kajabi form and that gets submitted instead,
  // which is what actually captures the lead in Kajabi.
  const kajabiHostRef = useRef<HTMLDivElement | null>(null);
  const kajabiDocRef = useRef<Document | null>(null);
  useEffect(() => {
    const container = kajabiHostRef.current;
    if (!container) return;
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.tabIndex = -1;
    container.appendChild(iframe);
    const doc = iframe.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write('<script src="https://thrivepropertyeducation.mykajabi.com/forms/2149632397/embed.js"></script>');
    doc.close();
    kajabiDocRef.current = doc;
  }, []);

  const submitToKajabi = () => {
    const doc = kajabiDocRef.current;
    const form = doc?.querySelector('form') as HTMLFormElement | null | undefined;
    if (!form) return;
    const nameInput = form.querySelector('input[name="form_submission[name]"]') as HTMLInputElement | null;
    const emailInput = form.querySelector('input[name="form_submission[email]"]') as HTMLInputElement | null;
    // Our UI treats first name as optional; Kajabi's field is required, so
    // that constraint is dropped here to match our own validation contract.
    if (nameInput) { nameInput.removeAttribute('required'); nameInput.value = name; }
    if (emailInput) emailInput.value = email;
    form.requestSubmit ? form.requestSubmit() : form.submit();
  };

  const submitEmail = () => {
    if (!email.trim() || !email.includes('@')) { setEmailError('Please enter a valid email address.'); return; }
    submitToKajabi();
    const scored = scoreAnswers(answers);
    setResults(scored);
    setPhase('results');
  };
  const skipEmail = () => { setResults(scoreAnswers(answers)); setPhase('results'); };
  const reset = () => { setPhase('intro'); setQIndex(0); setAnswers({}); setEmail(''); setName(''); setResults(null); setEmailError(''); };

  const inp: React.CSSProperties = { width: '100%', background: C.bgDeep, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '13px 16px', color: C.cream, fontSize: '15px', outline: 'none', marginBottom: '10px', fontFamily: 'inherit', boxSizing: 'border-box' };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.cream, fontFamily: 'system-ui,-apple-system,sans-serif', padding: '24px 20px' }}>
      <div ref={kajabiHostRef} />
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>

        {/* HEADER */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px', paddingBottom: '18px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {[0,1,2].map(i => <div key={i} style={{ width: '28px', height: '3px', background: C.gold }} />)}
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.gold, marginBottom: '2px' }}>Thrive Property Education</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: C.cream }}>Renovation Readiness Check</div>
          </div>
        </div>

        {/* INTRO */}
        {phase === 'intro' && (
          <div>
            <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '32px', marginBottom: '20px' }}>
              <div style={{ fontSize: '28px', fontWeight: 700, color: C.gold, marginBottom: '12px', lineHeight: 1.2 }}>Do you actually know what you're doing?</div>
              <p style={{ fontSize: '15px', lineHeight: 1.7, color: C.cream, margin: '0 0 14px' }}>Most homeowners planning a renovation think they understand the process. The majority don't — and the gaps in their knowledge are exactly what turns a straightforward project into a £20,000 overrun, a six-month delay, or a legal dispute with a neighbour.</p>
              <p style={{ fontSize: '15px', lineHeight: 1.7, color: C.cream, margin: '0 0 20px' }}>This 17-question diagnostic is deliberately hard. It tests specific knowledge drawn from 20 years of high-end London renovations across five critical areas. The questions are designed to catch common mistakes — including the ones that sound right but aren't.</p>
              <div style={{ background: C.bgDeep, borderRadius: '10px', padding: '16px 20px', marginBottom: '24px', borderLeft: `3px solid ${C.gold}` }}>
                <div style={{ fontSize: '13px', color: C.gold, fontWeight: 600, marginBottom: '6px' }}>What this tests</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 20px' }}>
                  {['Vision & Brief', 'Budget & Contingency', 'Professional Sequence', 'Planning & Legal', 'Construction & Control', 'Procurement Timing'].map((a, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', color: C.goldLight }}>
                      <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: C.gold, flexShrink: 0 }} />{a}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ fontSize: '13px', color: C.creamFaint, fontStyle: 'italic', marginBottom: '24px' }}>Takes around 5 minutes. Honest answers only — the report is most useful when it reflects where you actually are.</div>
              <button onClick={() => setPhase('quiz')} style={{ width: '100%', background: C.gold, border: 'none', borderRadius: '12px', padding: '16px', color: C.bgDeep, fontSize: '16px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                Start the diagnostic <ChevronRight size={20} />
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: C.creamFaint, justifyContent: 'center' }}>
              <Shield size={13} /> Simon Bawden · Thrive Property Education · 20 years · 400+ projects
            </div>
          </div>
        )}

        {/* QUIZ */}
        {phase === 'quiz' && q && (
          <div>
            <div style={{ marginBottom: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: C.creamFaint }}>
              <span style={{ color: C.goldLight, fontWeight: 600 }}>{q.section}</span>
              <span>Question {qIndex + 1} of {QUESTIONS.length}</span>
            </div>
            <div style={{ background: C.panel, height: '5px', borderRadius: '3px', marginBottom: '24px', overflow: 'hidden' }}>
              <div style={{ width: `${progress}%`, height: '100%', background: C.gold, transition: 'width 0.3s ease', borderRadius: '3px' }} />
            </div>
            <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '28px', marginBottom: '16px' }}>
              <div style={{ fontSize: '21px', fontWeight: 600, color: C.cream, marginBottom: '8px', lineHeight: 1.35 }}>{q.question}</div>
              {q.sub && <div style={{ fontSize: '13px', color: C.creamMid, marginBottom: '22px', lineHeight: 1.6, fontStyle: 'italic', borderLeft: `2px solid ${C.gold}`, paddingLeft: '12px' }}>{q.sub}</div>}
              <div style={{ display: 'grid', gap: '10px' }}>
                {q.options.map((opt, i) => {
                  const sel = answers[q.id] === opt.label;
                  return (
                    <button key={i} onClick={() => pick(opt.label)} style={{ background: sel ? C.goldPale : C.bgDeep, border: `1px solid ${sel ? C.gold : C.border}`, borderRadius: '10px', padding: '14px 18px', color: sel ? C.goldLight : C.cream, textAlign: 'left', cursor: 'pointer', fontSize: '14px', lineHeight: 1.5, display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.15s' }}>
                      <div style={{ width: '18px', height: '18px', flexShrink: 0, borderRadius: '50%', border: `2px solid ${sel ? C.gold : C.border}`, background: sel ? C.gold : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {sel && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: C.bgDeep }} />}
                      </div>
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={back} style={{ flex: '0 0 auto', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: '10px', padding: '13px 18px', color: C.creamMid, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ChevronLeft size={16} /> Back
              </button>
              <button onClick={next} disabled={!canNext} style={{ flex: 1, background: canNext ? C.gold : 'rgba(212,169,58,0.2)', border: 'none', borderRadius: '10px', padding: '13px', color: canNext ? C.bgDeep : C.creamFaint, fontSize: '15px', fontWeight: 700, cursor: canNext ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' }}>
                {qIndex + 1 >= QUESTIONS.length ? 'Get my report' : 'Next'} <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* EMAIL */}
        {phase === 'email' && (
          <div>
            <div style={{ background: C.panel, border: `1px solid ${C.gold}`, borderRadius: '16px', padding: '32px', marginBottom: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>📋</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: C.gold, marginBottom: '10px' }}>Your report is ready.</div>
              <p style={{ fontSize: '14px', color: C.creamMid, lineHeight: 1.7, marginBottom: '24px', maxWidth: '480px', margin: '0 auto 24px' }}>Enter your details to unlock your personalised risk report — including a breakdown of every area, specific guidance on your gaps, and a recommended next step based on where you actually are.</p>
              <input type="text" placeholder="First name (optional)" value={name} onChange={e => setName(e.target.value)} style={inp} />
              <input type="email" placeholder="Your email address *" value={email} onChange={e => { setEmail(e.target.value); setEmailError(''); }} style={{ ...inp, borderColor: emailError ? C.red : C.border }} onKeyDown={e => e.key === 'Enter' && submitEmail()} />
              {emailError && <p style={{ color: C.red, fontSize: '13px', marginBottom: '10px', textAlign: 'left' }}>{emailError}</p>}
              <button onClick={submitEmail} style={{ width: '100%', background: C.gold, border: 'none', borderRadius: '12px', padding: '15px', color: C.bgDeep, fontSize: '15px', fontWeight: 700, cursor: 'pointer', marginBottom: '12px' }}>Unlock my Renovation Report</button>
              <button onClick={skipEmail} style={{ background: 'transparent', border: 'none', color: C.creamFaint, fontSize: '13px', cursor: 'pointer', padding: '6px' }}>Skip — show results without saving</button>
            </div>
            <div style={{ textAlign: 'center', fontSize: '12px', color: C.creamFaint }}>
              <Shield size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> No spam. Your data stays with Thrive.
            </div>
          </div>
        )}

        {/* RESULTS */}
        {phase === 'results' && results && (() => {
          const profile = getProfile(results.pct, results.flags);
          const highFlags = [...new Set(results.flags.filter(f => FLAG_MESSAGES[f]?.sev === 'high'))];
          const medFlags = [...new Set(results.flags.filter(f => FLAG_MESSAGES[f]?.sev === 'medium'))];
          const pc = profile.band === 'green' ? C.green : profile.band === 'amber' ? C.amber : C.red;
          const ppale = profile.band === 'green' ? C.greenPale : profile.band === 'amber' ? C.amberPale : C.redPale;
          const cl = CALENDLY[profile.calendlyKey];

          return (
            <div>
              {/* Score */}
              <div style={{ background: ppale, border: `1px solid ${pc}`, borderRadius: '16px', padding: '28px', marginBottom: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '52px', fontWeight: 800, color: pc, letterSpacing: '-2px', marginBottom: '4px' }}>{results.pct}<span style={{ fontSize: '26px', fontWeight: 500 }}>%</span></div>
                <div style={{ fontSize: '21px', fontWeight: 700, color: C.cream, marginBottom: '6px' }}>{profile.title}</div>
                <div style={{ fontSize: '13px', color: C.creamMid, marginBottom: '14px' }}>{profile.subtitle}</div>
                <div style={{ fontSize: '14px', color: C.cream, lineHeight: 1.7 }}>{profile.body}</div>
              </div>

              {/* Category bars */}
              <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '24px', marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.gold, marginBottom: '16px' }}>Score by area</div>
                {(Object.entries(results.byCategory) as [Category, number][]).map(([cat, score]) => {
                  const max = MAX_POINTS[cat];
                  const pct = Math.round((score / max) * 100);
                  const band = getCategoryBand(score, max);
                  const bc = band === 'strong' ? C.green : band === 'caution' ? C.amber : C.red;
                  return (
                    <div key={cat} style={{ marginBottom: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                        <div style={{ fontSize: '13px', color: C.cream, fontWeight: 500 }}>{CATEGORY_LABELS[cat]}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '12px', color: C.creamFaint }}>{score}/{max}</span>
                          {band === 'strong' && <CheckCircle size={14} color={C.green} />}
                          {band === 'caution' && <AlertTriangle size={14} color={C.amber} />}
                          {band === 'risk' && <XCircle size={14} color={C.red} />}
                        </div>
                      </div>
                      <div style={{ background: C.bgDeep, height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: bc, borderRadius: '3px' }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* High flags */}
              {highFlags.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.red, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <XCircle size={14} /> Critical gaps — address before proceeding
                  </div>
                  {highFlags.map((flag, i) => (
                    <div key={i} style={{ background: C.redPale, border: `1px solid ${C.red}`, borderRadius: '10px', padding: '14px 16px', marginBottom: '8px' }}>
                      <div style={{ fontSize: '13px', color: C.cream, lineHeight: 1.65 }}>{FLAG_MESSAGES[flag]?.msg}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Medium flags */}
              {medFlags.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.amber, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={14} /> Worth addressing before you go further
                  </div>
                  {medFlags.map((flag, i) => (
                    <div key={i} style={{ background: C.amberPale, border: `1px solid ${C.amber}`, borderRadius: '10px', padding: '14px 16px', marginBottom: '8px' }}>
                      <div style={{ fontSize: '13px', color: C.cream, lineHeight: 1.65 }}>{FLAG_MESSAGES[flag]?.msg}</div>
                    </div>
                  ))}
                </div>
              )}

              {results.flags.length === 0 && (
                <div style={{ background: C.greenPale, border: `1px solid ${C.green}`, borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: C.green, fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>
                    <CheckCircle size={16} /> No critical gaps identified
                  </div>
                  <div style={{ fontSize: '13px', color: C.cream, lineHeight: 1.6 }}>Your preparation is strong across all five areas. A short call with Simon will confirm your plan before you commit any further.</div>
                </div>
              )}

              {/* CTA */}
              <div style={{ background: ppale, border: `1px solid ${pc}`, borderRadius: '16px', padding: '24px', marginBottom: '16px' }}>
                <div style={{ fontSize: '16px', fontWeight: 700, color: C.cream, marginBottom: '8px', lineHeight: 1.35 }}>{profile.ctaHeadline}</div>
                <div style={{ fontSize: '14px', color: C.creamMid, marginBottom: '18px', lineHeight: 1.65 }}>{profile.ctaBody}</div>
                <a href={cl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: pc, borderRadius: '12px', padding: '15px', color: profile.band === 'red' ? C.cream : C.bgDeep, fontSize: '15px', fontWeight: 700, textDecoration: 'none', marginBottom: '8px' }}>
                  <Calendar size={18} /> {profile.ctaLabel} →
                </a>
                <div style={{ textAlign: 'center', fontSize: '12px', color: C.creamFaint }}>Free · 20 minutes · No obligation</div>
              </div>

              {/* Simon card */}
              <div style={{ background: C.goldPale, border: `1px solid ${C.gold}`, borderRadius: '12px', padding: '18px 20px', marginBottom: '16px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div style={{ fontSize: '26px', flexShrink: 0 }}>👤</div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: C.gold, marginBottom: '4px' }}>Simon Bawden · Thrive Property Education</div>
                  <div style={{ fontSize: '13px', color: C.creamMid, lineHeight: 1.6 }}>20 years · 400+ projects · West and South West London. This diagnostic is built on the same framework Simon uses on every discovery call with a new homeowner.</div>
                  <div style={{ fontSize: '12px', color: C.creamFaint, marginTop: '6px' }}>simon@thrivepropertygroup.co.uk</div>
                </div>
              </div>

              <button onClick={reset} style={{ width: '100%', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: '12px', padding: '13px', color: C.creamMid, fontSize: '14px', cursor: 'pointer' }}>
                ↩ Start again
              </button>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
