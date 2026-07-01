import { useEffect, useState } from 'react';
import { Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
}

function LandingPage({ authenticated }) {
  return (
    <div className="landing-shell">
      <div className="landing-grid">
        <section className="hero-panel">
          <span className="badge">Wellness planning made simple</span>
          <h1>Nutrition Assistant for modern meal coaching</h1>
          <p>
            Guide clients, build meal plans, and track daily progress in one calm, data-driven workspace.
          </p>
          <div className="btn-row">
            {authenticated ? (
              <Link className="button-link primary" to="/dashboard">Open dashboard</Link>
            ) : (
              <>
                <Link className="button-link primary" to="/register">Create account</Link>
                <Link className="button-link secondary" to="/login">Sign in</Link>
              </>
            )}
          </div>
        </section>

        <section className="feature-stack">
          <div className="feature-card">
            <h3>Personalized plans</h3>
            <p>Create structured plans aligned to each client goal.</p>
          </div>
          <div className="feature-card">
            <h3>Progress insights</h3>
            <p>Monitor calories and trend your nutrition journey over time.</p>
          </div>
          <div className="feature-card">
            <h3>Simple workflow</h3>
            <p>Keep client notes, plans, and momentum in one place.</p>
          </div>
        </section>
      </div>
    </div>
  );
}

function AuthForm({ type, onSuccess }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      const endpoint = type === 'register' ? '/auth/register' : '/auth/login';
      const response = await api.post(endpoint, { name, email, password });
      localStorage.setItem('token', response.data.token);
      onSuccess();
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to authenticate');
    }
  }

  return (
    <div className="auth-shell">
      <form className="card auth-card" onSubmit={handleSubmit}>
        <h2>{type === 'register' ? 'Create account' : 'Welcome back'}</h2>
        <p>Access your wellness dashboard and plan your next coaching session.</p>
        {type === 'register' && (
          <input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
        )}
        <input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="error">{error}</p>}
        <button type="submit">{type === 'register' ? 'Register' : 'Login'}</button>
        <div className="auth-links">
          {type === 'register' ? <Link to="/login">I already have an account</Link> : <Link to="/register">Create an account</Link>}
          <Link to="/">Back home</Link>
        </div>
      </form>
    </div>
  );
}

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [insight, setInsight] = useState(null);
  const [mealPlanSummary, setMealPlanSummary] = useState(null);
  const [progressTrend, setProgressTrend] = useState(null);
  const [adminOverview, setAdminOverview] = useState(null);
  const [profile, setProfile] = useState({ name: '', email: '' });
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [plans, setPlans] = useState([]);
  const [progress, setProgress] = useState([]);
  const [clientName, setClientName] = useState('');
  const [goal, setGoal] = useState('');
  const [calories, setCalories] = useState('');
  const [planTitle, setPlanTitle] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      const token = localStorage.getItem('token');
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
      const [dashboardRes, clientsRes, plansRes, progressRes, profileRes] = await Promise.all([
        api.get('/dashboard'),
        api.get('/clients'),
        api.get('/plans'),
        api.get('/progress'),
        api.get('/profile')
      ]);
      setStats(dashboardRes.data.stats);
      setInsight(dashboardRes.data.insight);
      setMealPlanSummary(dashboardRes.data.mealPlanSummary);
      setProgressTrend(dashboardRes.data.progressTrend);
      setClients(clientsRes.data);
      setProfile(profileRes.data.user);

      try {
        const adminRes = await api.get('/admin/oversight');
        setAdminOverview(adminRes.data.overview);
      } catch (error) {
        setAdminOverview(null);
      }
      setPlans(plansRes.data);
      setProgress(progressRes.data);
    }

    load();
  }, []);

  async function addClient(event) {
    event.preventDefault();
    const res = await api.post('/clients', { name: clientName });
    setClients([...clients, res.data]);
    setClientName('');
    setMessage(`Added ${res.data.name} to your care list.`);
  }

  async function addPlan(event) {
    event.preventDefault();
    const res = await api.post('/plans', { title: planTitle, goal });
    setPlans([...plans, res.data]);
    setPlanTitle('');
    setGoal('');
    setMessage(`Saved ${res.data.title} to your nutrition plan library.`);
  }

  async function addProgressEntry(event) {
    event.preventDefault();
    const res = await api.post('/progress', { calories: Number(calories) });
    setProgress([...progress, res.data]);
    setCalories('');
    setMessage(`Logged ${res.data.calories} kcal for your latest check-in.`);
  }

  async function saveProfile(event) {
    event.preventDefault();
    const res = await api.put('/profile', profile);
    setProfile(res.data.user);
    setMessage(`Updated profile for ${res.data.user.name}.`);
  }

  async function updateClient(event) {
    event.preventDefault();
    if (!selectedClient) {
      return;
    }

    const res = await api.put(`/clients/${selectedClient.id}`, selectedClient);
    setClients(clients.map((client) => (client.id === selectedClient.id ? res.data : client)));
    setSelectedClient(null);
    setMessage(`Updated ${res.data.name}'s details.`);
  }

  function handleLogout() {
    localStorage.removeItem('token');
    navigate('/');
  }

  return (
    <div className="app-shell">
      <nav className="topbar">
        <h1>Nutrition Assistant</h1>
        <button onClick={handleLogout}>Logout</button>
      </nav>

      <main className="content">
        <section className="hero">
          <h2>Personalized nutrition management</h2>
          <p>Create clients, build meal plans, and track daily progress from one place.</p>
          {message && <div className="message">{message}</div>}
        </section>

        {stats && (
          <section className="stats-grid">
            <div className="card stat-card"><h3>{stats.clients}</h3><p>Clients</p></div>
            <div className="card stat-card"><h3>{stats.plans}</h3><p>Meal plans</p></div>
            <div className="card stat-card"><h3>{stats.progressEntries}</h3><p>Progress entries</p></div>
            <div className="card stat-card"><h3>{stats.avgCalories} kcal</h3><p>Average intake</p></div>
          </section>
        )}

        {insight && (
          <section className="card insight-card">
            <h3>Today’s nutrition insight</h3>
            <p className="insight-status">{insight.status}</p>
            <p>{insight.recommendation}</p>
          </section>
        )}

        {mealPlanSummary && (
          <section className="card insight-card">
            <h3>Meal planning focus</h3>
            <p className="insight-status">{mealPlanSummary.focus}</p>
            <p>{mealPlanSummary.message}</p>
            <small>{mealPlanSummary.count} active plan{mealPlanSummary.count === 1 ? '' : 's'}</small>
          </section>
        )}

        {progressTrend && (
          <section className="card insight-card">
            <h3>Progress trend</h3>
            <p className="insight-status">{progressTrend.direction}</p>
            <p>{progressTrend.message}</p>
          </section>
        )}

        {adminOverview && (
          <section className="card insight-card">
            <h3>Admin oversight</h3>
            <p className="insight-status">Platform snapshot</p>
            <p>Users: {adminOverview.users} • Clients: {adminOverview.clients}</p>
            <p>Plans: {adminOverview.plans} • Progress entries: {adminOverview.progressEntries}</p>
            <ul>
              <li>Review new client intake daily</li>
              <li>Approve coaching goals and plan updates</li>
              <li>Monitor active progress logs for consistency</li>
            </ul>
          </section>
        )}

        <section className="grid">
          <form className="card" onSubmit={saveProfile}>
            <h3>Profile</h3>
            <input placeholder="Name" value={profile.name || ''} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
            <input placeholder="Email" value={profile.email || ''} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
            <button type="submit">Save profile</button>
          </form>

          <form className="card" onSubmit={addClient}>
            <h3>Add client</h3>
            <input placeholder="Client name" value={clientName} onChange={(e) => setClientName(e.target.value)} />
            <button type="submit">Save</button>
          </form>

          <form className="card" onSubmit={addPlan}>
            <h3>Create meal plan</h3>
            <input placeholder="Plan title" value={planTitle} onChange={(e) => setPlanTitle(e.target.value)} />
            <input placeholder="Goal" value={goal} onChange={(e) => setGoal(e.target.value)} />
            <button type="submit">Save</button>
          </form>

          <form className="card" onSubmit={addProgressEntry}>
            <h3>Log progress</h3>
            <input placeholder="Calories" type="number" value={calories} onChange={(e) => setCalories(e.target.value)} />
            <button type="submit">Save</button>
          </form>
        </section>

        <section className="grid">
          <div className="card">
            <h3>Clients</h3>
            <ul>
              {clients.map((client) => (
                <li key={client.id}>
                  <button type="button" className="link-button" onClick={() => setSelectedClient(client)}>
                    {client.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="card">
            <h3>Client details</h3>
            {selectedClient ? (
              <form onSubmit={updateClient}>
                <input value={selectedClient.name || ''} onChange={(e) => setSelectedClient({ ...selectedClient, name: e.target.value })} />
                <input value={selectedClient.goal || ''} onChange={(e) => setSelectedClient({ ...selectedClient, goal: e.target.value })} />
                <input type="number" value={selectedClient.age || ''} onChange={(e) => setSelectedClient({ ...selectedClient, age: Number(e.target.value) })} />
                <button type="submit">Update client</button>
              </form>
            ) : (
              <p>Select a client from the list to edit their details.</p>
            )}
          </div>
          <div className="card">
            <h3>Meal Plans</h3>
            <ul>{plans.map((plan) => <li key={plan.id}>{plan.title} - {plan.goal}</li>)}</ul>
          </div>
          <div className="card">
            <h3>Progress</h3>
            <ul>{progress.map((entry) => <li key={entry.id}>{entry.calories} kcal</li>)}</ul>
          </div>
        </section>
      </main>
    </div>
  );
}

function App() {
  const [authenticated, setAuthenticated] = useState(Boolean(localStorage.getItem('token')));

  function handleAuthSuccess() {
    setAuthenticated(true);
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage authenticated={authenticated} />} />
      <Route path="/login" element={<AuthForm type="login" onSuccess={handleAuthSuccess} />} />
      <Route path="/register" element={<AuthForm type="register" onSuccess={handleAuthSuccess} />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to={authenticated ? '/dashboard' : '/'} replace />} />
    </Routes>
  );
}

export default App;
