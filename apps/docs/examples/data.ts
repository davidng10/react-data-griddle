export type Person = { id: number; name: string; role: string };

export type Employee = Person & {
  department: string;
  salary: number;
  startDate: string;
  active: boolean;
};

const firstNames = [
  "Ada",
  "Lin",
  "Sam",
  "Maya",
  "Leo",
  "Nora",
  "Owen",
  "Priya",
  "Theo",
  "Zoe",
];
const lastNames = [
  "Chen",
  "Patel",
  "Rivera",
  "Kim",
  "Morgan",
  "Tan",
  "Brooks",
  "Shah",
  "Park",
  "Reed",
];
const roles = [
  "Engineer",
  "Designer",
  "Researcher",
  "Product Manager",
  "Data Analyst",
  "QA Engineer",
  "Technical Writer",
  "Customer Success",
  "Operations Manager",
  "Engineering Manager",
  "UX Researcher",
  "Solutions Architect",
];
export const departments = [
  "Platform",
  "Growth",
  "Design",
  "Research",
  "Operations",
  "Support",
];

/** Call inside `useState(() => …)`, never at module scope. */
export function createPeople(count = 100): Person[] {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    name: `${firstNames[index % firstNames.length]} ${lastNames[Math.floor(index / firstNames.length) % lastNames.length]}`,
    role: roles[index % roles.length],
  }));
}

// mulberry32: tiny, fast, and the same sequence for the same seed.
function createRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Seeded rows for large-dataset demos. The same `count` and `seed` give the same rows, so server
 * and client renders match. Call inside `useState(() => …)`, never at module scope.
 */
export function createEmployees(count: number, seed = 1): Employee[] {
  const random = createRandom(seed);
  const pick = <T>(items: readonly T[]) =>
    items[Math.floor(random() * items.length)];
  const start = Date.UTC(2015, 0, 1);
  const span = Date.UTC(2025, 0, 1) - start;

  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    name: `${pick(firstNames)} ${pick(lastNames)}`,
    role: pick(roles),
    department: pick(departments),
    salary: 50_000 + Math.round(random() * 150) * 1_000,
    startDate: new Date(start + Math.floor(random() * span))
      .toISOString()
      .slice(0, 10),
    active: random() > 0.15,
  }));
}
