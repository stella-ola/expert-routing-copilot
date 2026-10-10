// Approved policy knowledge base for AI answers. All content is fictional.
//
// Product rule: "No source, no answer." When the AI resolves a request in chat, its answer must come
// from one of these approved articles and must cite it. If no article covers the request, the AI does
// not improvise; it hands the customer to a person (see decide() in engine.js).
//
// Authoring note (eval integrity): these articles and the keyword retriever below were written from the
// policy topics and the golden set only, before the expanded held-out cases were written. The retriever
// has not been tuned on held-out results. See docs/evaluation-plan.md.

export const POLICIES = [
  {
    id: 'POL-PAY-01',
    title: 'Payment posting window',
    answer: 'Payments usually post within 3 business days. Your available credit updates when the payment posts. If a payment has not posted after 3 business days, we open a billing case to trace it.',
    patterns: [/(post(ed|ing)?|show(ing)? up|reflect(ed)?|appl(y|ied)|clear(ed)?)\b.*\b(payment|paid)|\b(payment|paid)\b.*\b(post(ed|ing)?|show(ing)?|show up|reflect(ed)?|appl(y|ied))/],
  },
  {
    id: 'POL-PAY-02',
    title: 'Minimum payment',
    answer: 'Your minimum payment is shown on your statement and in the app under Payments. It is the greater of $25 or 1% of your balance, plus any interest and fees for the cycle.',
    patterns: [/minimum payment/, /\bminimum\b/, /least (i|you) can pay/],
  },
  {
    id: 'POL-PAY-03',
    title: 'Setting up autopay',
    answer: 'Go to Payments, then Autopay. Choose the minimum payment, the statement balance, or a fixed amount, and pick the account to pay from. Autopay starts with your next statement.',
    patterns: [/auto.?pay/, /automatic payments?/],
  },
  {
    id: 'POL-PAY-04',
    title: 'Changing your payment due date',
    answer: 'You can change your due date once every 12 months in Settings, then Payment due date. The new date applies from the next full billing cycle.',
    patterns: [/due date/],
  },
  {
    id: 'POL-ACC-01',
    title: 'Balance, statements, and interest',
    answer: 'Your statement balance, current balance, available credit, and credit limit are on the Home screen. Balances change when pending charges post, when interest or fees are added, or when a refund or payment is reversed. Interest is charged on balances you carry past the due date.',
    patterns: [/balance/, /statement/, /credit limit/, /available credit/, /how much do i owe/],
  },
  {
    id: 'POL-REW-01',
    title: 'Redeeming rewards',
    answer: 'Open the Rewards tab to see your points balance and redeem for a statement credit, a bank deposit, or gift cards. Redemptions start at 2,500 points.',
    patterns: [/reward/, /points/, /cash ?back/, /\bmiles\b/, /redeem/],
  },
  {
    id: 'POL-REW-02',
    title: 'Card benefits',
    answer: 'This card has no foreign transaction fees and includes purchase protection, extended warranty, and travel accident insurance. Full benefit terms are in the app under Card benefits.',
    patterns: [/benefits?/, /perks?/, /insurance/, /warranty/, /foreign transaction/, /card features/],
  },
  {
    id: 'POL-SEC-01',
    title: 'Fraud alerts and scam messages',
    answer: 'We will never ask for your password, PIN, full card number, or a verification code by text, email, or phone. Do not tap links in unexpected messages. Our fraud alerts only ask you to reply YES or NO to confirm a purchase.',
    patterns: [/scam/, /phishing/, /suspicious (text|email|call|message)/, /fraud alerts?/],
  },
  {
    id: 'POL-SEC-02',
    title: 'Locking your card and travel',
    answer: 'You can lock and unlock your card instantly in the app under Card settings. A locked card blocks new purchases but keeps autopay and recurring bills running. You do not need to tell us before you travel.',
    patterns: [/lock/, /travel/, /traveling/, /trip/],
  },
  {
    id: 'POL-APP-01',
    title: 'Updating your contact details',
    answer: 'Update your address, phone number, or email in Profile, then Personal info. We send a verification code to your current phone or email to confirm the change.',
    patterns: [/update my (address|phone|email)/, /change (my|the) (address|phone|email)/, /(address|phone number|email)\b.*\b(update|change)/],
  },
  {
    id: 'POL-APP-02',
    title: 'Adding your card to a digital wallet',
    answer: 'In the app, open Card settings and tap Add to wallet. You can add the card to Apple Pay, Google Pay, or Samsung Pay. We may send a verification code to confirm it is you.',
    patterns: [/wallet/, /apple pay/, /google pay/, /samsung pay/],
  },
  {
    id: 'POL-APP-03',
    title: 'Password and sign-in help',
    answer: 'On the sign-in screen, tap Forgot password or Forgot username. We send a verification code to the phone or email on file. Codes expire after 10 minutes, so request a new one if it does not arrive.',
    patterns: [/password/, /log ?in/, /sign ?in/, /username/, /verification code/],
  },
];

export const POLICY_BY_ID = Object.fromEntries(POLICIES.map((p) => [p.id, p]));

/**
 * Keyword retriever (baseline). Returns the best-matching approved article, or null if nothing matches.
 * A retrieved article is a *candidate*; the eval measures whether it was the right one.
 */
export function retrievePolicy(text) {
  const m = text.toLowerCase().replace(/[‘’ʼ]/g, "'");
  let best = null;
  for (const p of POLICIES) {
    const score = p.patterns.filter((re) => re.test(m)).length;
    if (score > 0 && (!best || score > best.score)) best = { id: p.id, score };
  }
  return best ? best.id : null;
}
