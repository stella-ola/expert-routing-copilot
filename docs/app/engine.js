// Expert Routing Copilot: routing engine
// One module shared by the web simulator (docs/index.html) and the eval runner (evals/).
//
import { POLICY_BY_ID, retrievePolicy } from './policies.js';

// Architecture principle: understanding and deciding are separate steps.
//   extractFeatures(message)  -> what the customer said (swappable: rules today, LLM tomorrow)
//   decide(features, context) -> what we do about it (deterministic, auditable policy)
// An LLM may replace extractFeatures. It never replaces decide.

export const WEIGHTS = { harm: 35, time: 30, blockage: 25, attempts: 10 };

export const DEFAULT_CONFIG = {
  p0Threshold: 70,
  p1Threshold: 35,
  lowConfidence: 0.6,
  processingWindowDays: 3,
  overrides: true,
};

export const TEAMS = {
  fraud: 'Fraud specialists',
  billing: 'Billing specialists',
  product: 'Product support',
  unclear: 'General support',
};

export const CHANNELS = {
  ai_chat: 'AI resolves in chat',
  ai_clarify: 'AI asks a clarifying question',
  expert_chat: 'Expert chat',
  case_followup: 'Case with async follow-up',
  live_transfer: 'Live specialist transfer',
  priority_callback: 'Priority callback',
};

// Human-staffed channels. Used for "reached a human" metrics.
export const HUMAN_CHANNELS = new Set(['expert_chat', 'case_followup', 'live_transfer', 'priority_callback']);

// ---------------------------------------------------------------------------
// 1. Feature extraction (rules baseline)
// ---------------------------------------------------------------------------

const SIGNALS = [
  // Fraud
  { id: 'stolen', label: 'Card or wallet stolen', cat: 'fraud', re: /\b(stolen|stole|pickpocket|wallet (was )?(taken|stolen)|robbed)\b/ },
  { id: 'lost', label: 'Card lost or missing', cat: 'fraud', re: /(lost (my|the) (credit |debit )?card|can'?t find my card|card (is |went )?missing|misplaced my card)/ },
  { id: 'unauthorized', label: 'Charges the customer did not make', cat: 'fraud', re: /(someone (used|is using|has) my card|didn'?t make|did not make|don'?t recogni[sz]e|do not recogni[sz]e|unrecogni[sz]ed|unfamiliar|unauthori[sz]ed|not mine|never made|fraud)/ },
  { id: 'takeover', label: 'Account takeover signs', cat: 'fraud', re: /(hacked|someone (else )?(logged|signed) in|changed my (password|email|phone)|(password|email|phone number) (was|has been|got) changed|didn'?t change (my|the) (password|email))/ },
  { id: 'scam', label: 'Possible scam contact', cat: 'fraud', re: /(scam|phishing|suspicious (text|email|call))/ },
  // Billing
  { id: 'payment_failed', label: 'Payment failed or declined', cat: 'billing', re: /(payment (failed|fails|keeps failing|was declined|got declined|declined|bounced|was returned|didn'?t go through|won'?t go through|keeps getting declined)|can'?t (make|submit|process) (a|my|the) payment)/ },
  { id: 'penalty', label: 'Late fee or penalty at risk', cat: 'billing', re: /(late fee|penalty|hurt my credit|credit score|be late)/ },
  { id: 'not_posted', label: 'Payment not showing as posted', cat: 'billing', re: /((hasn'?t|has not|haven'?t|not|isn'?t|is not|didn'?t|still not) (been )?(posted|showing|show up|shown up|reflected|applied))/ },
  { id: 'fee', label: 'Disputed fee or interest', cat: 'billing', re: /((?<!late )\bfee\b|annual fee|interest charge|charged (me )?interest|interest on)/ },
  { id: 'refund', label: 'Refund issue', cat: 'billing', re: /refund/ },
  { id: 'duplicate', label: 'Duplicate charge or payment', cat: 'billing', re: /(duplicate|charged (me )?twice|paid twice|double charged|charged two times)/ },
  { id: 'balance_q', label: 'Balance or statement question', cat: 'billing', re: /(balance|statement|minimum payment|how much do i owe|\bapr\b)/ },
  { id: 'paid', label: 'Customer made a payment', cat: 'billing', re: /(\bi paid\b|i made (a|my) payment|payment i (made|sent)|sent (a|my|the) payment|\bmy payment\b)/ },
  { id: 'hardship', label: 'Financial hardship mentioned', cat: 'billing', re: /(can'?t afford|lost my job|hardship|overdraft|rent is due|no money left)/ },
  // Product support
  { id: 'login', label: 'Login or password help', cat: 'product', re: /(password|log ?in|sign ?in|username|two.factor|2fa|verification code)/ },
  { id: 'rewards', label: 'Rewards question', cat: 'product', re: /(reward|points|cash ?back|miles|redeem)/ },
  { id: 'autopay', label: 'Autopay setup', cat: 'product', re: /(auto.?pay|automatic payments?)/ },
  { id: 'howto', label: 'How-to or navigation', cat: 'product', re: /(how (do|can) i|where (do|can) i|set up|turn on|update my (address|phone|email)|the app|card (benefits|features)|travel notice|lock my card|payment date|change my due date)/ },
  // Conversation context (no category)
  { id: 'urgent_time', label: 'Happening now', cat: null, re: /(just now|right now|an hour ago|minutes ago|this morning|today|tonight|keep (seeing|getting)|still happening|new charges?|two new|more charges)/ },
  { id: 'old_time', label: 'Happened a while ago', cat: null, re: /(last month|weeks ago|last statement|a month ago|last year)/ },
  { id: 'due_now', label: 'Due today or tomorrow', cat: null, re: /(due (today|tomorrow|tonight)|due date is (today|tomorrow))/ },
  { id: 'human_request', label: 'Asked for a person', cat: null, re: /(\bhuman\b|real person|live (agent|person)|representative|talk to (someone|a person|an agent)|speak (to|with) (someone|a person|an agent)|agent please)/ },
  { id: 'frustration', label: 'Frustration', cat: null, re: /(ridiculous|frustrat|third time|again and again|unacceptable|!!)/ },
  { id: 'tried_before', label: 'Already tried to fix it', cat: null, re: /(tried (twice|two times|three times|\d+ times|everything|again)|keeps? (failing|happening)|still (doesn'?t|does not|won'?t) work|didn'?t work)/ },
  { id: 'manipulation', label: 'Tried to steer the router', cat: null, re: /(ignore (all |your |the |previous |prior )*(instructions|rules)|mark (this|me|it) (as )?(p0|urgent|priority)|system prompt|you are now|set (the )?priority)/ },
];

const NUMBER_WORDS = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };

function parseDaysAgo(m) {
  if (/\b(just now|this morning|an hour ago|minutes ago)\b/.test(m)) return 0;
  if (/\b(paid|sent|made).{0,30}\btoday\b/.test(m)) return 0;
  if (/\byesterday\b/.test(m)) return 1;
  if (/\blast week\b/.test(m)) return 7;
  const hit = m.match(/\b(\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten) (business )?(day|week)s? ago\b/);
  if (!hit) return null;
  const n = /^\d+$/.test(hit[1]) ? Number(hit[1]) : NUMBER_WORDS[hit[1]];
  return hit[3] === 'week' ? n * 7 : n;
}

function parseAttempts(m) {
  if (/tried (three|3) times/.test(m)) return 3;
  if (/tried (twice|two times|2 times)|third time/.test(m)) return 2;
  if (/(tried (again|everything)|still (doesn'?t|does not|won'?t) work|didn'?t work)/.test(m)) return 1;
  return 0;
}

const SENSITIVE = [
  { id: 'card_number', re: /\b(?:\d[ -]?){13,19}\b/g, mask: '[card number removed]' },
  { id: 'ssn', re: /\b\d{3}-\d{2}-\d{4}\b/g, mask: '[SSN removed]' },
];

export function redact(text) {
  let out = text;
  const found = [];
  for (const s of SENSITIVE) {
    if (out.match(s.re)) found.push(s.id);
    out = out.replace(s.re, s.mask);
  }
  return { text: out, found };
}

// Crude unsupported-language check. Real system: a language-ID model.
function looksUnsupportedLanguage(m) {
  const spanish = /\b(tarjeta|cargos|robaron|pago|cuenta|ayuda|no hice|perd[ií])\b/;
  const nonLatin = /[^\u0000-\u024F\s\p{P}\p{S}\d]/u;
  return spanish.test(m) || nonLatin.test(m);
}

/**
 * Turn a raw customer message into structured features.
 * This is the swappable "understanding" layer. evals/llm-extractor.mjs returns the same shape.
 */
export function extractFeatures(message, config = DEFAULT_CONFIG) {
  const { text: safeText, found: redacted } = redact(message);
  // Normalize curly quotes: real customer text is full of them, and they silently break keyword rules.
  const m = safeText.toLowerCase().replace(/[\u2018\u2019\u02bc]/g, "'");
  const hits = SIGNALS.filter((s) => s.re.test(m));
  const has = (id) => hits.some((h) => h.id === id);

  // Category votes. Fraud and billing signals carry more evidence than generic how-to phrasing.
  const votes = { fraud: 0, billing: 0, product: 0 };
  for (const h of hits) if (h.cat) votes[h.cat] += h.cat === 'product' ? 0.8 : 1;
  // "Paid" alone is weak billing evidence; don't let it outvote a real signal.
  if (has('paid') && votes.billing > 1) votes.billing -= 0.5;

  const ranked = Object.entries(votes).sort((a, b) => b[1] - a[1] || order(a[0]) - order(b[0]));
  const [topCat, top] = ranked[0];
  const second = ranked[1][1];
  const unsupportedLanguage = top === 0 && looksUnsupportedLanguage(m);
  const category = top === 0 ? 'unclear' : topCat;

  // Confidence: evidence strength minus ambiguity. Deliberately simple and inspectable.
  let confidence = top === 0 ? 0.3 : 0.5 + 0.17 * top - 0.2 * second;
  confidence = Math.round(Math.max(0.2, Math.min(0.97, confidence)) * 100) / 100;

  const daysAgo = parseDaysAgo(m);
  const amounts = [...safeText.matchAll(/\$\s?(\d[\d,]*(?:\.\d{2})?)/g)].map((x) => '$' + x[1]);

  const f = {
    source: 'rules',
    category,
    confidence,
    signals: hits.map((h) => ({ id: h.id, label: h.label })),
    flags: {
      stolen: has('stolen'),
      lost: has('lost'),
      unauthorized: has('unauthorized'),
      takeover: has('takeover'),
      scam: has('scam'),
      active: has('urgent_time') && !has('old_time'),
      old: has('old_time'),
      paymentFailed: has('payment_failed'),
      dueNow: has('due_now'),
      penalty: has('penalty'),
      notPosted: has('not_posted'),
      fee: has('fee'),
      refund: has('refund'),
      duplicate: has('duplicate'),
      balanceQ: has('balance_q'),
      hardship: has('hardship'),
      login: has('login'),
      humanRequest: has('human_request'),
      frustration: has('frustration'),
      manipulation: has('manipulation'),
      unsupportedLanguage,
    },
    daysAgo,
    attemptsMentioned: parseAttempts(m),
    amounts,
    redacted,
    safeText,
  };
  f.factors = scoreFactors(f, config);
  return f;
}

function order(cat) {
  // Safety-first tie-break: when evidence is equal, prefer the team that can prevent harm.
  return { fraud: 0, billing: 1, product: 2 }[cat] ?? 3;
}

/** Map features to the four 0-3 factor scores defined in the spec. */
export function scoreFactors(f, config = DEFAULT_CONFIG) {
  const x = f.flags;
  let harm = 0, time = 0, blockage = 0;
  const why = { harm: [], time: [], blockage: [] };
  const set = (k, v, reason) => {
    const cur = { harm, time, blockage }[k];
    if (v > cur) {
      if (k === 'harm') harm = v; else if (k === 'time') time = v; else blockage = v;
      why[k] = [reason];
    }
  };

  if (f.category === 'fraud') {
    if (x.takeover) { set('harm', 3, 'Account takeover'); set('time', 3, 'Attacker may still have access'); set('blockage', 3, 'Customer locked out of own account'); }
    if (x.stolen) { set('harm', 3, 'Stolen card is exposed'); set('time', 3, 'Card can be used right now'); set('blockage', 2, 'Card unusable until replaced'); }
    if (x.lost) { set('harm', 2, 'Lost card may be exposed'); set('time', 2, 'Should be locked soon'); set('blockage', 2, 'Card unusable until found or replaced'); }
    if (x.unauthorized && x.active) { set('harm', 3, 'Unauthorized charges happening now'); set('time', 3, 'Activity is ongoing'); }
    if (x.unauthorized && !x.active) { set('harm', 2, 'Unrecognized charge'); set('time', 1, 'Charge is not recent'); }
    if (x.unauthorized) set('blockage', 1, 'Customer can still use the account');
    if (x.scam) { set('harm', 1, 'Possible scam exposure'); set('time', 1, 'Worth checking soon'); }
  }

  if (f.category === 'billing') {
    const window = config.processingWindowDays;
    const within = f.daysAgo !== null && f.daysAgo <= window;
    const past = f.daysAgo !== null && f.daysAgo > window;
    if (x.hardship) { set('harm', 3, 'Customer describes financial hardship'); set('blockage', 2, 'Customer may not be able to pay'); }
    if (x.paymentFailed) { set('harm', 2, 'Payment did not go through'); set('time', 1, 'Due date approaching'); set('blockage', 2, 'Customer cannot complete a payment'); }
    if (x.paymentFailed && (x.dueNow || x.penalty)) { set('harm', 3, 'Missed payment means fees or credit impact'); }
    if (x.dueNow) set('time', 3, 'Due today or tomorrow');
    if (x.penalty) set('time', 2, 'Penalty is approaching');
    if (x.paymentFailed && f.attemptsMentioned >= 2) set('blockage', 3, 'Repeated payment failures');
    if (x.notPosted && past) { set('harm', 2, `Payment not posted after ${f.daysAgo} days`); set('time', 1, 'Outside the normal processing window'); set('blockage', 1, 'Balance looks wrong to the customer'); }
    if (x.notPosted && within) { why.time.push(`Paid ${f.daysAgo} day(s) ago, inside the ${window}-day window`); }
    if (x.duplicate) { set('harm', 2, 'Customer may be charged twice'); set('time', 1, 'Should be fixed before the statement closes'); set('blockage', 1, 'Available credit reduced'); }
    if (x.fee || x.refund) { set('harm', 2, x.fee ? 'Disputed fee or interest' : 'Missing refund'); set('time', 1, 'Interest may accrue on the amount'); set('blockage', 1, 'Balance looks wrong to the customer'); }
  }

  if (f.category === 'product') {
    if (x.login) { set('time', 1, 'Customer wants access now'); set('blockage', 2, 'Customer cannot sign in'); }
    else set('blockage', 1, 'Customer needs guidance to finish a task');
  }

  return { harm, time, blockage, why };
}

// ---------------------------------------------------------------------------
// 2. Policy: deterministic, auditable decision
// ---------------------------------------------------------------------------

export function riskScore({ harm, time, blockage, attempts }) {
  const s = (harm / 3) * WEIGHTS.harm + (time / 3) * WEIGHTS.time + (blockage / 3) * WEIGHTS.blockage + (attempts / 3) * WEIGHTS.attempts;
  return Math.round(s * 10) / 10;
}

/**
 * @param f        features from extractFeatures (or an LLM extractor)
 * @param context  { attempts: 0-3, capacity: 'available'|'constrained', authenticated: bool }
 */
export function decide(f, context = {}, config = DEFAULT_CONFIG) {
  const ctx = { attempts: 0, capacity: 'available', authenticated: true, ...context };
  const x = f.flags;
  const attempts = Math.min(3, Math.max(ctx.attempts, f.attemptsMentioned || 0));
  const factors = { harm: f.factors.harm, time: f.factors.time, blockage: f.factors.blockage, attempts };
  const score = riskScore(factors);
  const trace = [];

  trace.push({ step: 'Issue', text: f.category === 'unclear' ? 'No clear intent detected' : `Classified as ${f.category} (confidence ${Math.round(f.confidence * 100)}%)` });
  trace.push({ step: 'Owner', text: TEAMS[f.category] });

  let priority = score >= config.p0Threshold ? 'P0' : score >= config.p1Threshold ? 'P1' : 'P2';
  trace.push({ step: 'Severity', text: `Score ${score} maps to ${priority}` });

  // Safety overrides take precedence over the score.
  const overrides = [];
  if (config.overrides) {
    const safety = [];
    if (f.category === 'fraud' && x.takeover) safety.push('account takeover');
    if (f.category === 'fraud' && x.stolen) safety.push('stolen card');
    if (f.category === 'fraud' && x.lost && x.unauthorized) safety.push('lost card with unrecognized charges');
    if (f.category === 'fraud' && x.unauthorized && x.active) safety.push('active unauthorized activity');
    if (f.category === 'billing' && x.paymentFailed && (x.dueNow || x.penalty)) safety.push('imminent financial harm');
    if (f.category === 'billing' && x.hardship && (x.dueNow || x.penalty)) safety.push('hardship with a deadline');
    if (safety.length && priority !== 'P0') {
      overrides.push({ type: 'safety', text: `Raised to P0: ${safety.join(', ')}` });
      priority = 'P0';
    } else if (safety.length) {
      overrides.push({ type: 'safety', text: `Safety rule also requires P0: ${safety.join(', ')}` });
    }
  }
  if (x.manipulation) overrides.push({ type: 'integrity', text: 'Message tried to set its own priority. Instruction ignored; routed on content only.' });

  // Does a human need to be involved, regardless of severity?
  const humanReasons = [];
  const lowConfidence = f.confidence < config.lowConfidence;
  if (x.humanRequest) humanReasons.push('customer asked for a person');
  if (attempts >= 2) humanReasons.push(`${attempts} failed AI attempts`);
  if (lowConfidence && f.category !== 'unclear') humanReasons.push('AI confidence below threshold');
  if (x.unsupportedLanguage) humanReasons.push('language not supported by AI intake');
  if (humanReasons.length) overrides.push({ type: 'human', text: `Human involved: ${humanReasons.join(', ')}` });

  // Resolution ability + channel
  let channel, needsCase, clarifyingQuestion = null;
  if (priority === 'P0') {
    channel = ctx.capacity === 'constrained' ? 'priority_callback' : 'live_transfer';
    needsCase = true;
  } else if (priority === 'P1') {
    channel = humanReasons.length ? 'expert_chat' : 'case_followup';
    needsCase = true;
  } else if (humanReasons.length) {
    channel = 'expert_chat';
    needsCase = true;
  } else if (f.category === 'unclear') {
    channel = 'ai_clarify';
    needsCase = false;
    clarifyingQuestion = 'Can you tell me a bit more about what you need help with today: a charge, a payment, or something in your account?';
  } else if (f.category === 'billing' && x.notPosted && f.daysAgo === null) {
    channel = 'ai_clarify';
    needsCase = false;
    clarifyingQuestion = 'When did you send the payment? Most payments post within 3 business days.';
  } else {
    channel = 'ai_chat';
    needsCase = false;
  }

  // Grounding: an AI answer must come from an approved article. No source, no answer.
  let citation = null;
  if (channel === 'ai_chat') {
    // An extractor may propose an article (the LLM does). Otherwise use the keyword retriever.
    const proposed = 'policyId' in f ? f.policyId : retrievePolicy(f.safeText);
    const policy = proposed && POLICY_BY_ID[proposed];
    if (policy) {
      citation = { id: policy.id, title: policy.title, answer: policy.answer };
      trace.push({ step: 'Source', text: `Answer grounded in ${policy.id} (${policy.title})` });
    } else {
      channel = 'expert_chat';
      needsCase = true;
      overrides.push({ type: 'human', text: 'Human involved: no approved source covers this question, so the AI does not guess' });
      trace.push({ step: 'Source', text: 'No approved article found; handed to a person instead of guessing' });
    }
  }
  trace.push({ step: 'Resolution', text: HUMAN_CHANNELS.has(channel) ? 'Needs a specialist' : 'AI can handle this safely' });
  trace.push({ step: 'Channel', text: `${CHANNELS[channel]}${needsCase ? ', case opened' : ''}${channel === 'priority_callback' ? ' (specialist capacity constrained)' : ''}` });

  return {
    team: f.category,
    teamLabel: TEAMS[f.category],
    priority,
    score,
    factors,
    factorReasons: f.factors.why,
    channel,
    channelLabel: CHANNELS[channel],
    human: HUMAN_CHANNELS.has(channel),
    needsCase,
    clarifyingQuestion,
    citation,
    overrides,
    trace,
    handoff: buildHandoff(f, { priority, score, channel, needsCase, overrides, ctx }),
    reply: customerReply(f, priority, channel, clarifyingQuestion, citation),
  };
}

function buildHandoff(f, d) {
  const x = f.flags;
  const facts = [];
  if (f.daysAgo !== null) facts.push(f.daysAgo === 0 ? 'Happened today' : `Timing: ${f.daysAgo} day(s) ago`);
  if (f.amounts.length) facts.push(`Amounts mentioned: ${f.amounts.join(', ')}`);
  for (const s of f.signals) if (!['urgent_time', 'old_time', 'manipulation', 'frustration'].includes(s.id)) facts.push(s.label);
  if (x.frustration) facts.push('Customer is frustrated; acknowledge before re-asking anything');

  const actions = ['Captured issue and timing in the customer’s words'];
  if (f.redacted.length) actions.push('Removed sensitive numbers the customer typed; do not ask for them again in chat');
  if (f.category === 'fraud' && (x.lost || x.stolen)) actions.push('Recommended the approved card-security workflow; no account action was performed by this prototype');
  if (d.ctx.attempts) actions.push(`AI attempted resolution ${d.ctx.attempts} time(s)`);

  const nextStep = {
    fraud: d.priority === 'P0' ? 'Verify identity, lock the card, review recent transactions, start disputes' : 'Review the transaction with the customer and decide whether to dispute',
    billing: d.priority === 'P0' ? 'Confirm payment method, prevent the late fee, take payment by another route' : 'Trace the payment or charge and post a correction or explanation',
    product: 'Pick up from the AI’s last step; screen share if the customer is stuck in the app',
    unclear: 'Confirm what the customer needs before routing again',
  }[f.category];

  return {
    customerRef: 'CUST-48213 (synthetic)',
    authStatus: d.ctx.authenticated ? 'Authenticated in app' : 'Not yet authenticated: verify before discussing account details',
    issue: `${TEAMS[f.category]}, ${d.priority}`,
    severity: `${d.priority}, risk score ${d.score}/100${d.overrides.some((o) => o.type === 'safety') ? ', safety override' : ''}`,
    summary: summarize(f),
    facts,
    actions,
    confidence: `${Math.round(f.confidence * 100)}% (${f.source})`,
    nextStep,
  };
}

function summarize(f) {
  const x = f.flags;
  if (x.unsupportedLanguage) return 'Customer wrote in a language the AI intake does not support. Read the message directly.';
  if (f.category === 'fraud') {
    if (x.takeover) return 'Customer believes someone else has accessed their account.';
    if (x.stolen) return `Card was stolen${x.unauthorized ? ' and there are charges the customer did not make' : ''}.`;
    if (x.lost) return `Card is lost${x.unauthorized ? ' and there are unrecognized charges' : '; no unrecognized charges reported yet'}.`;
    if (x.unauthorized) return `Customer does not recognize a charge${x.active ? ' and activity is ongoing' : ' from a while ago'}.`;
    return 'Customer is worried about a possible scam.';
  }
  if (f.category === 'billing') {
    if (x.paymentFailed) return `Payment is failing${x.dueNow ? ' on the due date' : ''}${x.penalty ? ' and a late fee is a concern' : ''}.`;
    if (x.notPosted) return f.daysAgo === null ? 'Payment has not posted; payment date unknown.' : `Payment sent ${f.daysAgo} day(s) ago has not posted.`;
    if (x.duplicate) return 'Customer sees a duplicate charge or payment.';
    if (x.fee) return 'Customer disputes a fee or interest charge.';
    if (x.refund) return 'Customer is waiting on a refund.';
    if (x.hardship) return 'Customer describes financial hardship.';
    return 'Customer has a balance or statement question.';
  }
  if (f.category === 'product') return x.login ? 'Customer cannot sign in.' : 'Customer needs help using a card or app feature.';
  return 'Intent unclear.';
}

function customerReply(f, priority, channel, q, citation) {
  if (q) return q;
  if (channel === 'ai_chat' && citation) {
    const timing = f.flags.notPosted && f.daysAgo !== null ? `Your payment was sent ${f.daysAgo === 0 ? 'today' : f.daysAgo + ' day(s) ago'}. ` : '';
    return `${timing}${citation.answer} [Source: ${citation.id}, ${citation.title}]`;
  }
  if (f.flags.unsupportedLanguage) return 'I’m connecting you with a human specialist. Available language support must be confirmed by the support team.';
  const replies = {
    live_transfer: f.category === 'fraud'
      ? 'I can help secure this right away. I’ve captured the details you shared and I’m connecting you to a fraud specialist now, so you won’t need to repeat yourself.'
      : 'This is time-sensitive. I’m connecting you to a billing specialist now with everything you’ve told me.',
    priority_callback: 'Specialists are busy, so I’ve placed this in the simulated priority-callback path. A real callback time must follow an operations-approved urgent SLA.',
    case_followup: 'I’ve opened a case with the details a specialist needs. You’ll get updates right here in chat, and you won’t need to explain this again.',
    expert_chat: 'I’m bringing in a specialist to this chat. They’ll see everything we’ve covered so far.',
    ai_chat: 'I can help with that here. Let’s walk through it together, and I’ll check that it worked before we finish.',
  };
  if (channel === 'ai_chat' && f.flags.notPosted && f.daysAgo !== null) {
    return `This synthetic policy uses a 3-business-day posting window. Your payment was sent ${f.daysAgo === 0 ? 'today' : f.daysAgo + ' day(s) ago'}. I can explain the expected timeline and open a case if it remains unposted after the approved window.`;
  }
  if (channel === 'ai_chat' && f.flags.scam) {
    return 'We never ask for your password or full card number by text. Don’t tap the link. I can check your account for any recent activity with you right now.';
  }
  return replies[channel];
}

/** Convenience: message in, decision out. */
export function route(message, context = {}, config = DEFAULT_CONFIG) {
  const features = extractFeatures(message, config);
  return { features, decision: decide(features, context, config) };
}

// ---------------------------------------------------------------------------
// 3. Golden-set evaluation
// ---------------------------------------------------------------------------

export function evaluate(goldenSet, config = DEFAULT_CONFIG, extractor = (msg) => extractFeatures(msg, config)) {
  const rows = goldenSet.map((c) => {
    const f = extractor(c.message, c);
    const d = decide(f, c.context || {}, config);
    const ok = {
      team: d.team === c.expect.team,
      priority: d.priority === c.expect.priority,
      channel: d.channel === c.expect.channel,
    };
    ok.all = ok.team && ok.priority && ok.channel;
    // Citation is scored separately from exact match so routing numbers stay comparable across versions.
    if (c.expect.citation) ok.citation = d.citation?.id === c.expect.citation;
    return { ...c, actual: { team: d.team, priority: d.priority, channel: d.channel, score: d.score, confidence: f.confidence, citation: d.citation?.id ?? null }, ok, meta: f.meta };
  });
  return { rows, summary: summarize_(rows), slices: sliceSummary(rows) };
}

/** Exact match and P0 recall for each tag, so weak spots are visible instead of averaged away. */
export function sliceSummary(rows) {
  const pct = (n, d) => (d ? Math.round((n / d) * 1000) / 10 : null);
  const tags = [...new Set(rows.flatMap((r) => r.tags))].sort();
  return tags.map((tag) => {
    const rs = rows.filter((r) => r.tags.includes(tag));
    const p0 = rs.filter((r) => r.expect.priority === 'P0');
    return { tag, cases: rs.length, exactMatch: pct(rs.filter((r) => r.ok.all).length, rs.length), p0Cases: p0.length, p0Recall: pct(p0.filter((r) => r.actual.priority === 'P0').length, p0.length) };
  });
}

function summarize_(rows) {
  const pct = (n, d) => (d ? Math.round((n / d) * 1000) / 10 : null);
  const gated = rows.filter((r) => !r.tags.includes('known-gap'));
  const trueP0 = rows.filter((r) => r.expect.priority === 'P0');
  const predP0 = rows.filter((r) => r.actual.priority === 'P0');
  const needsHuman = rows.filter((r) => HUMAN_CHANNELS.has(r.expect.channel));
  const aiOk = rows.filter((r) => !HUMAN_CHANNELS.has(r.expect.channel));
  const cited = rows.filter((r) => r.expect.citation);
  return {
    cases: rows.length,
    exactMatch: pct(rows.filter((r) => r.ok.all).length, rows.length),
    exactMatchGated: pct(gated.filter((r) => r.ok.all).length, gated.length),
    teamAccuracy: pct(rows.filter((r) => r.ok.team).length, rows.length),
    priorityAccuracy: pct(rows.filter((r) => r.ok.priority).length, rows.length),
    channelAccuracy: pct(rows.filter((r) => r.ok.channel).length, rows.length),
    p0Recall: pct(trueP0.filter((r) => r.actual.priority === 'P0').length, trueP0.length),
    p0RecallGated: pct(trueP0.filter((r) => !r.tags.includes('known-gap') && r.actual.priority === 'P0').length, trueP0.filter((r) => !r.tags.includes('known-gap')).length),
    p0Precision: pct(predP0.filter((r) => r.expect.priority === 'P0').length, predP0.length),
    reachedHumanWhenNeeded: pct(needsHuman.filter((r) => HUMAN_CHANNELS.has(r.actual.channel)).length, needsHuman.length),
    overEscalation: pct(aiOk.filter((r) => HUMAN_CHANNELS.has(r.actual.channel)).length, aiOk.length),
    knownGaps: rows.filter((r) => r.tags.includes('known-gap')).length,
    // Grounding: of the questions the AI should answer itself, how often did it cite the right article?
    citationCases: cited.length,
    citationAccuracy: pct(cited.filter((r) => r.ok.citation).length, cited.length),
    citationAccuracyGated: pct(cited.filter((r) => !r.tags.includes('known-gap') && r.ok.citation).length, cited.filter((r) => !r.tags.includes('known-gap')).length),
    // The dangerous failure: the AI answered in chat, but from the wrong article (confidently wrong).
    wrongSourceAnswers: rows.filter((r) => r.actual.channel === 'ai_chat' && r.actual.citation && r.expect.citation && r.actual.citation !== r.expect.citation).length,
    // Answers given in chat on a case that should not have been answered in chat at all.
    answeredWhenShouldNot: rows.filter((r) => r.actual.channel === 'ai_chat' && r.expect.channel !== 'ai_chat').length,
  };
}

// ---------------------------------------------------------------------------
// 4. Population simulation for the tradeoff lab
// Illustrative only. Every number here is an assumption, stated in docs/metrics.md.
// ---------------------------------------------------------------------------

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const ARCHETYPES = [
  { id: 'fraud_active', share: 0.05, h: [3, 3], t: [3, 3], b: [2, 3], safety: true },
  { id: 'lost_card', share: 0.04, h: [2, 2], t: [2, 2], b: [2, 2], safety: false },
  { id: 'fraud_old', share: 0.06, h: [2, 2], t: [1, 1], b: [1, 1], safety: false },
  { id: 'billing_urgent', share: 0.05, h: [2, 3], t: [2, 3], b: [2, 3], safety: true },
  { id: 'billing_case', share: 0.2, h: [2, 2], t: [1, 1], b: [1, 1], safety: false },
  { id: 'billing_routine', share: 0.22, h: [0, 0], t: [0, 0], b: [0, 1], safety: false },
  { id: 'product', share: 0.38, h: [0, 0], t: [0, 1], b: [1, 2], safety: false },
];

export function simulatePopulation({ n = 10000, p0Threshold = 70, p1Threshold = 35, noise = 0.2, overrides = true, overrideRecall = 0.92, liveCapacity = 0.12, seed = 7 } = {}) {
  const rand = mulberry32(seed);
  const pick = ([lo, hi]) => lo + Math.floor(rand() * (hi - lo + 1));
  const jitter = (v) => (rand() < noise ? Math.max(0, Math.min(3, v + (rand() < 0.5 ? -1 : 1))) : v);
  const cum = [];
  let acc = 0;
  for (const a of ARCHETYPES) cum.push([(acc += a.share), a]);

  let trueP0 = 0, missedP0 = 0, routedP0 = 0, falseP0 = 0, human = 0;
  for (let i = 0; i < n; i++) {
    const r = rand();
    const a = cum.find(([c]) => r <= c)?.[1] ?? ARCHETYPES.at(-1);
    const truth = { harm: pick(a.h), time: pick(a.t), blockage: pick(a.b), attempts: 0 };
    const trueScore = riskScore(truth);
    const isTrueP0 = a.safety || trueScore >= 70; // ground truth uses the policy as written
    const obs = { harm: jitter(truth.harm), time: jitter(truth.time), blockage: jitter(truth.blockage), attempts: 0 };
    let p = riskScore(obs) >= p0Threshold ? 'P0' : riskScore(obs) >= p1Threshold ? 'P1' : 'P2';
    if (overrides && a.safety && rand() < overrideRecall) p = 'P0';
    const escalated = p === 'P2' && rand() < 0.12; // AI could not resolve
    if (isTrueP0) trueP0++;
    if (isTrueP0 && p !== 'P0') missedP0++;
    if (p === 'P0') routedP0++;
    if (p === 'P0' && !isTrueP0) falseP0++;
    if (p !== 'P2' || escalated) human++;
  }
  const liveShare = routedP0 / n;
  const util = Math.min(0.98, liveShare / liveCapacity);
  const waitMin = Math.min(60, Math.round((3 * util) / (1 - util) * 10) / 10);
  return {
    missedUrgentPct: Math.round((missedP0 / trueP0) * 1000) / 10,
    missedUrgentPer10k: Math.round((missedP0 / n) * 10000),
    liveLoadPct: Math.round(liveShare * 1000) / 10,
    humanTouchPct: Math.round((human / n) * 1000) / 10,
    falseUrgentPer10k: Math.round((falseP0 / n) * 10000),
    liveUtilizationPct: Math.round(util * 100),
    urgentWaitMin: waitMin,
    callbacks: util > 0.9,
  };
}
