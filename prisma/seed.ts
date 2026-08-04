import { PrismaClient, type LeadSource, type LeadStage, type UserRole } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Deterministic PRNG (mulberry32) so the "~2,000 contacts / ~300 leads" scale
// from the JD scenario is reproducible across runs, not re-randomized every
// seed (BA §3.5 / PM risk R7).
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(42);
const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)] as T;
const pickWeighted = <T,>(entries: [T, number][]): T => {
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let r = rand() * total;
  for (const [value, weight] of entries) {
    if (r < weight) return value;
    r -= weight;
  }
  return entries[entries.length - 1]![0];
};

const FIRST_NAMES = [
  'Somchai', 'Suda', 'Anan', 'Kanya', 'Wichai', 'Nattaya', 'Pichet', 'Siriporn', 'Chatchai', 'Ratana',
  'James', 'Emily', 'Michael', 'Sarah', 'David', 'Laura', 'Daniel', 'Amy', 'Kevin', 'Lisa',
];
const LAST_NAMES = [
  'Srisuk', 'Boonmee', 'Charoen', 'Wongsa', 'Thongdee', 'Prasert', 'Rattanakul', 'Sombat',
  'Tanaka', 'Lee', 'Smith', 'Johnson', 'Brown', 'Wilson', 'Taylor', 'Chen', 'Kim', 'Patel',
];
const COMPANY_WORDS = [
  'Siam', 'Global', 'Northstar', 'Bluewave', 'Summit', 'Pinnacle', 'Vantage', 'Horizon',
  'Prime', 'Unity', 'Nexus', 'Orbit', 'Meridian', 'Catalyst', 'Anchor', 'Sterling',
];
const COMPANY_SUFFIXES = ['Co., Ltd.', 'Group', 'Holdings', 'Trading', 'Enterprise', 'Industries'];
const INDUSTRIES = ['Retail', 'Manufacturing', 'Logistics', 'Finance', 'Technology', 'Hospitality', 'Healthcare', 'Real Estate'];

const LEAD_STAGES: LeadStage[] = ['NEW', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST'];
const LEAD_SOURCE_WEIGHTS: [LeadSource, number][] = [
  ['WEBSITE', 45],
  ['MANUAL', 35],
  ['LINE', 20],
];

const DEMO_PASSWORD = 'Passw0rd!'; // same demo password for every seeded user — printed below, README documents this

async function main() {
  console.log('Seeding Jenosize AI CRM demo data...');
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // 1. Users — 1 Admin, 2 Sales Managers, 17 Sales Reps ≈ 20-person team (BA §1.5)
  const userSpecs: Array<{ email: string; name: string; role: UserRole }> = [
    { email: 'admin@jenosize.demo', name: 'Admin User', role: 'ADMIN' },
    { email: 'manager1@jenosize.demo', name: 'Manager One', role: 'SALES_MANAGER' },
    { email: 'manager2@jenosize.demo', name: 'Manager Two', role: 'SALES_MANAGER' },
    ...Array.from({ length: 17 }, (_, i) => ({
      email: `rep${i + 1}@jenosize.demo`,
      name: `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[i % LAST_NAMES.length]}`,
      role: 'SALES_REP' as UserRole,
    })),
  ];

  const users = [];
  for (const spec of userSpecs) {
    const user = await prisma.user.upsert({
      where: { email: spec.email },
      update: {},
      create: { ...spec, passwordHash },
    });
    users.push(user);
  }
  const admin = users.find((u) => u.role === 'ADMIN')!;
  const salesReps = users.filter((u) => u.role === 'SALES_REP');
  console.log(`  users: ${users.length}`);

  // 2. Companies
  const companyCount = 60;
  const companies = Array.from({ length: companyCount }, () => ({
    id: randomUUID(),
    name: `${pick(COMPANY_WORDS)} ${pick(COMPANY_SUFFIXES)}`,
    industry: pick(INDUSTRIES),
    website: null as string | null,
  }));
  await prisma.company.createMany({ data: companies });
  console.log(`  companies: ${companies.length}`);

  // 3. Contacts — ~2,000 per JD scenario, spread across companies
  const contactCount = 2000;
  const contacts = Array.from({ length: contactCount }, (_, i) => {
    const company = pick(companies);
    return {
      id: randomUUID(),
      companyId: company.id,
      name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
      email: `contact${i + 1}@example-synthetic.test`,
      phone: `08${String(10000000 + i).slice(0, 8)}`,
      lineUserId: null as string | null,
    };
  });
  // createMany in chunks to keep individual statements reasonably sized
  const CHUNK = 500;
  for (let i = 0; i < contacts.length; i += CHUNK) {
    await prisma.contact.createMany({ data: contacts.slice(i, i + CHUNK) });
  }
  console.log(`  contacts: ${contacts.length}`);

  // 4. Leads — ~300 active leads per JD scenario, drawn from a subset of contacts
  const leadCount = 300;
  const leadContacts = contacts.slice(0, leadCount);
  const leads = leadContacts.map((contact) => ({
    id: randomUUID(),
    contactId: contact.id,
    companyId: contact.companyId,
    ownerId: pick(salesReps).id,
    stage: pick(LEAD_STAGES),
    source: pickWeighted(LEAD_SOURCE_WEIGHTS),
    budget: Math.floor(rand() * 500_000) + 10_000,
    scopeNotes: 'Synthetic seed lead for demo purposes.',
  }));
  for (let i = 0; i < leads.length; i += CHUNK) {
    await prisma.lead.createMany({ data: leads.slice(i, i + CHUNK) });
  }
  console.log(`  leads: ${leads.length}`);

  // 5. Activities — one creation note per lead
  const activities = leads.map((lead) => ({
    id: randomUUID(),
    leadId: lead.id,
    actorId: lead.ownerId,
    type: 'NOTE' as const,
    payload: { note: `Lead created from source=${lead.source} (seed data)` },
    viaAI: false,
  }));
  for (let i = 0; i < activities.length; i += CHUNK) {
    await prisma.activity.createMany({ data: activities.slice(i, i + CHUNK) });
  }
  console.log(`  activities: ${activities.length}`);

  // 6. Messages — a short LINE conversation for leads sourced from LINE
  const lineLeads = leads.filter((l) => l.source === 'LINE').slice(0, 40);
  const messages = lineLeads.flatMap((lead) => {
    const contact = leadContacts.find((c) => c.id === lead.contactId)!;
    return [
      {
        id: randomUUID(),
        leadId: lead.id,
        contactId: contact.id,
        direction: 'INBOUND' as const,
        channel: 'LINE',
        lineEventId: `seed-${lead.id}-in`,
        content: 'สวัสดีครับ สนใจสอบถามราคาสินค้าครับ',
        status: 'SENT' as const,
      },
      {
        id: randomUUID(),
        leadId: lead.id,
        contactId: contact.id,
        direction: 'OUTBOUND' as const,
        channel: 'LINE',
        lineEventId: `seed-${lead.id}-out`,
        content: 'ขอบคุณที่สนใจครับ ทางเจ้าหน้าที่จะติดต่อกลับโดยเร็วที่สุดครับ',
        status: 'SENT' as const,
        approvedById: admin.id,
      },
    ];
  });
  if (messages.length > 0) {
    await prisma.message.createMany({ data: messages });
  }
  console.log(`  messages: ${messages.length}`);

  console.log('\nSeed complete. Demo login (any user):');
  console.log(`  email:    admin@jenosize.demo | manager1@jenosize.demo | rep1@jenosize.demo ...`);
  console.log(`  password: ${DEMO_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
