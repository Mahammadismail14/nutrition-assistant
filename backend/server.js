const path = require('path');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const dotenv = require('dotenv');


dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = Number(process.env.PORT) || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');

const appState = {
  users: [],
  clients: [],
  plans: [],
  progress: []
};

function getDashboardSummary() {
  const calories = appState.progress.reduce((sum, entry) => sum + Number(entry.calories || 0), 0);
  const avgCalories = appState.progress.length ? Math.round(calories / appState.progress.length) : 0;

  return {
    clients: appState.clients.length,
    plans: appState.plans.length,
    progressEntries: appState.progress.length,
    avgCalories
  };
}

function getNutritionInsight() {
  const avgCalories = appState.progress.length
    ? Math.round(appState.progress.reduce((sum, entry) => sum + Number(entry.calories || 0), 0) / appState.progress.length)
    : 0;

  if (avgCalories <= 1800) {
    return {
      status: 'on target',
      recommendation: 'Maintain the current rhythm and keep hydration high.'
    };
  }

  if (avgCalories <= 2100) {
    return {
      status: 'slightly above target',
      recommendation: 'Keep protein steady and balance the next meal with vegetables.'
    };
  }

  return {
    status: 'above target',
    recommendation: 'Trim one calorie-dense snack and add more fiber-rich foods.'
  };
}

function getMealPlanSummary() {
  if (!appState.plans.length) {
    return {
      count: 0,
      focus: 'No active plans',
      message: 'Create a meal plan to start coaching with structure.'
    };
  }

  const primaryPlan = appState.plans[0];
  return {
    count: appState.plans.length,
    focus: primaryPlan.goal || 'Balanced nutrition',
    message: `${primaryPlan.title} is currently guiding the coaching focus.`
  };
}

function getProgressTrend() {
  if (appState.progress.length < 2) {
    return {
      direction: 'steady',
      message: 'Add more progress entries to see a trend.'
    };
  }

  const values = appState.progress.slice(-3).map((entry) => Number(entry.calories || 0));
  const first = values[0];
  const last = values[values.length - 1];

  if (last > first) {
    return {
      direction: 'up',
      message: 'Calories are rising, so consider balancing portions and meal timing.'
    };
  }

  if (last < first) {
    return {
      direction: 'down',
      message: 'Calories are falling, so keep protein intake consistent.'
    };
  }

  return {
    direction: 'steady',
    message: 'Calories are staying steady, which is a healthy sign of consistency.'
  };
}

function getStorageStatus() {
  return {
    storage: usingMongo ? 'mongodb' : 'memory'
  };
}

let usingMongo = false;
const mongoEnabled = process.env.MONGODB_ENABLED === 'true';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, default: 'user' }
}, { timestamps: true });

const clientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: Number,
  goal: String
}, { timestamps: true });

const planSchema = new mongoose.Schema({
  title: { type: String, required: true },
  goal: String
}, { timestamps: true });

const progressSchema = new mongoose.Schema({
  calories: { type: Number, required: true }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const Client = mongoose.model('Client', clientSchema);
const Plan = mongoose.model('Plan', planSchema);
const ProgressEntry = mongoose.model('ProgressEntry', progressSchema);

async function connectDatabase() {
  if (!mongoEnabled || !process.env.MONGODB_URI) {
    console.log('MongoDB disabled or not configured; using in-memory storage');
    return;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 1500,
      connectTimeoutMS: 1500,
      family: 4
    });
    usingMongo = true;
    console.log('MongoDB connected');
  } catch (error) {
    usingMongo = false;
    console.warn(`MongoDB unavailable; using in-memory storage (${error.message})`);
  }
}

connectDatabase();

function signToken(user) {
  return jwt.sign({ id: user.id || user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
}

function authenticateToken(req, res, next) {
  const header = req.headers.authorization;
  const token = header && header.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  jwt.verify(token, JWT_SECRET, (error, user) => {
    if (error) {
      return res.status(403).json({ error: 'Invalid token' });
    }

    req.user = user;
    next();
  });
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: 'Access denied' });
    }

    next();
  };
}

async function findUserByEmail(email) {
  if (usingMongo) {
    return User.findOne({ email }).lean();
  }

  return appState.users.find((user) => user.email === email) || null;
}

async function createUser(userData) {
  if (usingMongo) {
    const created = await User.create(userData);
    return created.toObject();
  }

  appState.users.push(userData);
  return userData;
}

async function addClient(clientData) {
  if (usingMongo) {
    const created = await Client.create(clientData);
    return created.toObject();
  }

  appState.clients.push(clientData);
  return clientData;
}

async function addPlan(planData) {
  if (usingMongo) {
    const created = await Plan.create(planData);
    return created.toObject();
  }

  appState.plans.push(planData);
  return planData;
}

async function addProgress(progressData) {
  if (usingMongo) {
    const created = await ProgressEntry.create(progressData);
    return created.toObject();
  }

  appState.progress.push(progressData);
  return progressData;
}

app.get('/api/health', (req, res) => {
  res.json(getStorageStatus());
});

app.use(express.static(frontendDist));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }

  res.sendFile(path.join(frontendDist, 'index.html'));
});

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, role = 'user' } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required' });
  }

  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    return res.status(409).json({ error: 'User already exists' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await createUser({
    id: `${Date.now()}`,
    name,
    email,
    passwordHash,
    role
  });

  const token = signToken(user);
  res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = await findUserByEmail(email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = signToken(user);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

app.get('/api/profile', authenticateToken, async (req, res) => {
  const currentUser = await findUserByEmail(req.user.email);
  if (!currentUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ user: { id: currentUser.id, name: currentUser.name, email: currentUser.email, role: currentUser.role } });
});

app.put('/api/profile', authenticateToken, async (req, res) => {
  const currentUser = await findUserByEmail(req.user.email);
  if (!currentUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  const updatedUser = {
    ...currentUser,
    name: req.body.name || currentUser.name,
    email: req.body.email || currentUser.email,
    role: req.body.role || currentUser.role
  };

  const index = appState.users.findIndex((user) => user.id === currentUser.id);
  if (index >= 0) {
    appState.users[index] = updatedUser;
  }

  res.json({ user: updatedUser });
});

app.get('/api/dashboard', authenticateToken, (req, res) => {
  const summary = getDashboardSummary();
  res.json({
    message: `Welcome ${req.user.email}`,
    stats: summary,
    insight: getNutritionInsight(),
    mealPlanSummary: getMealPlanSummary(),
    progressTrend: getProgressTrend()
  });
});

app.get('/api/admin/oversight', authenticateToken, requireRole('admin'), (req, res) => {
  res.json({
    message: 'Admin oversight view',
    overview: {
      users: appState.users.length,
      clients: appState.clients.length,
      plans: appState.plans.length,
      progressEntries: appState.progress.length
    }
  });
});

app.get('/api/clients', authenticateToken, (req, res) => {
  res.json(appState.clients);
});

app.post('/api/clients', authenticateToken, async (req, res) => {
  const client = await addClient({ id: `${Date.now()}`, ...req.body });
  res.status(201).json(client);
});

app.put('/api/clients/:id', authenticateToken, (req, res) => {
  const client = appState.clients.find((entry) => entry.id === req.params.id);
  if (!client) {
    return res.status(404).json({ error: 'Client not found' });
  }

  Object.assign(client, req.body);
  res.json(client);
});

app.get('/api/plans', authenticateToken, (req, res) => {
  res.json(appState.plans);
});

app.post('/api/plans', authenticateToken, async (req, res) => {
  const plan = await addPlan({ id: `${Date.now()}`, ...req.body });
  res.status(201).json(plan);
});

app.get('/api/progress', authenticateToken, (req, res) => {
  res.json(appState.progress);
});

app.post('/api/progress', authenticateToken, async (req, res) => {
  const entry = await addProgress({ id: `${Date.now()}`, ...req.body });
  res.status(201).json(entry);
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Unexpected server error' });
});

const isMainModule = require.main && path.resolve(require.main.filename) === path.resolve(__filename);

if (isMainModule) {
  const server = app.listen(PORT, () => {
    console.log(`Nutrition assistant API listening on port ${PORT}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.warn(`Port ${PORT} is already in use; continuing without starting the server.`);
      return;
    }

    throw error;
  });
}

module.exports = { app, appState, getDashboardSummary, getNutritionInsight, getMealPlanSummary, getProgressTrend, getStorageStatus };
