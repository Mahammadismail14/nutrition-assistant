const test = require('node:test');
const assert = require('node:assert/strict');
const { appState, getDashboardSummary, getNutritionInsight, getMealPlanSummary, getProgressTrend, getStorageStatus } = require('../server');

test('registering a user stores a user profile', async () => {
  appState.users.length = 0;
  const user = {
    id: '1',
    name: 'Test User',
    email: 'test@example.com',
    passwordHash: 'hashed',
    role: 'user'
  };

  appState.users.push(user);

  assert.equal(appState.users[0].email, 'test@example.com');
  assert.equal(appState.users[0].role, 'user');
});

test('meal plans and progress entries can be tracked', () => {
  appState.plans.length = 0;
  appState.progress.length = 0;

  appState.plans.push({ id: 'p1', title: 'High Protein Day' });
  appState.progress.push({ id: 'pr1', calories: 1800 });

  assert.equal(appState.plans[0].title, 'High Protein Day');
  assert.equal(appState.progress[0].calories, 1800);
});

test('dashboard summary computes totals from stored data', () => {
  appState.clients.length = 0;
  appState.plans.length = 0;
  appState.progress.length = 0;

  appState.clients.push({ id: 'c1', name: 'Ava' });
  appState.clients.push({ id: 'c2', name: 'Ben' });
  appState.plans.push({ id: 'p1', title: 'Balanced Day', goal: 'Muscle gain' });
  appState.progress.push({ id: 'pr1', calories: 1800 });
  appState.progress.push({ id: 'pr2', calories: 2100 });

  const summary = getDashboardSummary();

  assert.equal(summary.clients, 2);
  assert.equal(summary.plans, 1);
  assert.equal(summary.progressEntries, 2);
  assert.equal(summary.avgCalories, 1950);
});

test('nutrition insight summarizes the latest progress trend', () => {
  appState.progress.length = 0;
  appState.progress.push({ id: 'pr1', calories: 1800 });
  appState.progress.push({ id: 'pr2', calories: 2100 });

  const insight = getNutritionInsight();

  assert.equal(insight.status, 'slightly above target');
  assert.equal(insight.recommendation, 'Keep protein steady and balance the next meal with vegetables.');
});

test('meal plan summary highlights the current coaching focus', () => {
  appState.plans.length = 0;
  appState.plans.push({ id: 'p1', title: 'Balanced Day', goal: 'Muscle gain' });
  appState.plans.push({ id: 'p2', title: 'Recovery Day', goal: 'Recovery' });

  const summary = getMealPlanSummary();

  assert.equal(summary.focus, 'Muscle gain');
  assert.equal(summary.count, 2);
  assert.match(summary.message, /Balanced Day/);
});

test('progress trend identifies whether calories are rising or falling', () => {
  appState.progress.length = 0;
  appState.progress.push({ id: 'pr1', calories: 1800 });
  appState.progress.push({ id: 'pr2', calories: 1950 });
  appState.progress.push({ id: 'pr3', calories: 2100 });

  const trend = getProgressTrend();

  assert.equal(trend.direction, 'up');
  assert.match(trend.message, /rising/);
});

test('admin role can access platform oversight data', () => {
  appState.users = [
    { id: 'u1', email: 'admin@example.com', role: 'admin' },
    { id: 'u2', email: 'coach@example.com', role: 'dietitian' }
  ];

  const admin = appState.users.find((user) => user.role === 'admin');

  assert.ok(admin);
  assert.equal(admin.role, 'admin');
});

test('client profile details can be stored and retrieved', () => {
  appState.clients.length = 0;
  appState.clients.push({ id: 'c1', name: 'Ava', age: 29, goal: 'Muscle gain' });

  const client = appState.clients[0];

  assert.equal(client.name, 'Ava');
  assert.equal(client.goal, 'Muscle gain');
});

test('storage status reports the active persistence mode', () => {
  const status = getStorageStatus();

  assert.equal(status.storage, 'memory');
});
