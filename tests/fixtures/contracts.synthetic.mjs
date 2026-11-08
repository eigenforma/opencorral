// Authored fault/shape cases, never harvested history or service performance data.
export const provenance = 'synthetic contract cases; authored, not harvested';
const human = { id: 'quality', label: 'The result meets the brief', kind: 'human', slot: 'report' };
const nonempty = { id: 'present', label: 'Report is present', kind: 'nonempty', slot: 'report' };
const contains = { id: 'heading', label: 'Required heading exists', kind: 'contains', slot: 'report', pattern: 'Summary' };
const goal = { title: 'Review a report', description: '', slots: ['report'], criteria: [human] };
const dependency = { goalId: 'prior-goal', revision: 1, acceptanceId: 'acceptance-1' };
const without = (value, key) => Object.fromEntries(Object.entries(value).filter(([name]) => name !== key));
const c = (id, expected, payload) => ({ id, contract: 'criterion', expected, payload });
const g = (id, expected, payload) => ({ id, contract: 'createGoal', expected, payload });

export const cases = [
  c('criterion-human', true, human),
  c('criterion-nonempty', true, nonempty),
  c('criterion-contains', true, contains),
  c('criterion-missing-id', false, without(human, 'id')),
  c('criterion-blank-label', false, { ...human, label: ' \n\t' }),
  c('criterion-unknown-kind', false, { ...human, kind: 'model-verdict' }),
  c('criterion-array-kind', false, { ...human, kind: ['human'] }),
  c('criterion-null', false, null),
  c('criterion-array', false, []),
  c('criterion-extra-authority', false, { ...human, accepted: true }),
  c('criterion-missing-pattern', false, without(contains, 'pattern')),
  c('criterion-empty-pattern', false, { ...contains, pattern: '' }),
  c('criterion-nonstring-pattern', false, { ...contains, pattern: 42 }),
  c('criterion-human-with-pattern', false, { ...human, pattern: 'Summary' }),
  c('criterion-nonempty-with-null-pattern', false, { ...nonempty, pattern: null }),
  c('criterion-invalid-id', false, { ...human, id: '../quality' }),
  c('criterion-reserved-id', false, { ...human, id: 'constructor' }),
  c('criterion-overlong-id', false, { ...human, id: 'a'.repeat(121) }),
  c('criterion-control-label', false, { ...human, label: 'Before\u0000after' }),
  c('criterion-label-at-limit', true, { ...human, label: 'x'.repeat(500) }),
  c('criterion-label-over-limit', false, { ...human, label: 'x'.repeat(501) }),
  c('criterion-pattern-at-limit', true, { ...contains, pattern: 'x'.repeat(4000) }),
  c('criterion-pattern-over-limit', false, { ...contains, pattern: 'x'.repeat(4001) }),
  c('criterion-unicode-label', true, { ...human, label: 'Résumé: 雪 🌱\nready' }),
  c('criterion-unicode-code-unit-limit', false, { ...human, label: '🌱'.repeat(251) }),
  c('criterion-unicode-whitespace', false, { ...human, label: '\ufeff' }),
  g('goal-minimal', true, goal),
  g('goal-multiple-criteria', true, { ...goal, criteria: [human, contains, nonempty] }),
  g('goal-dependency', true, { ...goal, dependencies: [dependency] }),
  g('goal-empty-dependencies', true, { ...goal, dependencies: [] }),
  g('goal-missing-title', false, without(goal, 'title')),
  g('goal-missing-description', false, without(goal, 'description')),
  g('goal-null-description', false, { ...goal, description: null }),
  g('goal-blank-title', false, { ...goal, title: '\t\n' }),
  g('goal-title-at-limit', true, { ...goal, title: 'x'.repeat(240) }),
  g('goal-title-over-limit', false, { ...goal, title: 'x'.repeat(241) }),
  g('goal-description-over-limit', false, { ...goal, description: 'x'.repeat(12001) }),
  g('goal-no-slots', false, { ...goal, slots: [] }),
  g('goal-duplicate-slots', false, { ...goal, slots: ['report', 'report'] }),
  g('goal-nonstring-slot', false, { ...goal, slots: [1] }),
  g('goal-dangerous-slot', false, { ...goal, slots: ['constructor'], criteria: [{ ...human, slot: 'constructor' }] }),
  g('goal-slot-limit', true, { ...goal, slots: ['report', ...Array.from({ length: 31 }, (_, i) => `s${i}`)] }),
  g('goal-too-many-slots', false, { ...goal, slots: ['report', ...Array.from({ length: 32 }, (_, i) => `s${i}`)] }),
  g('goal-no-criteria', false, { ...goal, criteria: [] }),
  g('goal-duplicate-criteria', false, { ...goal, criteria: [human, human] }),
  g('goal-criterion-missing-slot', false, { ...goal, criteria: [{ ...human, slot: 'unknown' }] }),
  g('goal-too-many-criteria', false, { ...goal, criteria: Array.from({ length: 65 }, (_, i) => ({ ...human, id: `c${i}` })) }),
  g('goal-extra-complete-field', false, { ...goal, status: 'accepted' }),
  g('goal-nonarray-dependencies', false, { ...goal, dependencies: {} }),
  g('goal-duplicate-dependency', false, { ...goal, dependencies: [dependency, dependency] }),
  g('goal-missing-dependency-acceptance', false, { ...goal, dependencies: [without(dependency, 'acceptanceId')] }),
  g('goal-zero-dependency-revision', false, { ...goal, dependencies: [{ ...dependency, revision: 0 }] }),
  g('goal-bool-dependency-revision', false, { ...goal, dependencies: [{ ...dependency, revision: true }] }),
  g('goal-fractional-dependency-revision', false, { ...goal, dependencies: [{ ...dependency, revision: 1.5 }] }),
  g('goal-unsafe-dependency-revision', false, { ...goal, dependencies: [{ ...dependency, revision: 9007199254740992 }] }),
  g('goal-too-many-dependencies', false, { ...goal, dependencies: Array.from({ length: 33 }, (_, i) => ({ ...dependency, goalId: `g${i}` })) }),
];
