const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

// Load JSON "database"
const loadDB = async () => {
  const data = await fs.readFile('./db.json', 'utf8');
  return JSON.parse(data);
};

// Save to JSON "database"
const saveDB = async (data) => {
  await fs.writeFile('./db.json', JSON.stringify(data, null, 2));
};

// Test route
app.get('/', (req, res) => {
  res.send('Hello from Opportunity Hub!');
});

// Signup route
app.post('/signup', async (req, res) => {
    const { name, email, dob, password, role } = req.body;
    try {
      const db = await loadDB();
      if (db.users.find(u => u.email === email)) {
        return res.status(400).json({ error: 'Email already exists' });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = {
        id: Date.now().toString(),
        name,
        email,
        dob,
        password: hashedPassword,
        role,
      };
      db.users.push(user);
      await saveDB(db);
      res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Server error: ' + error.message });
    }
  });

// Login route
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const db = await loadDB();
  const user = db.users.find(u => u.email === email);
  if (!user) return res.status(400).send('User not found');
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).send('Invalid credentials');
  const token = jwt.sign({ id: user.id, role: user.role }, 'secretkey', { expiresIn: '1h' });
  res.json({ token, role: user.role });
});

// Middleware to protect routes
const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).send('Login required');
  try {
    const decoded = jwt.verify(token, 'secretkey');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).send('Invalid token');
  }
};

// Jobs routes
app.get('/jobs', authMiddleware, async (req, res) => {
  if (req.user.role === 'Investor') return res.status(403).send('Access denied');
  const db = await loadDB();
  res.json(db.jobs);
});

app.post('/jobs', authMiddleware, async (req, res) => {
  if (req.user.role !== 'Recruiter') return res.status(403).send('Access denied');
  const db = await loadDB();
  const job = { 
    id: Date.now().toString(), 
    ...req.body, 
    recruiterId: req.user.id, 
    applications: [],
    postedDate: new Date().toISOString()
  };
  db.jobs.push(job);
  await saveDB(db);
  res.status(201).send('Job posted');
});

// Freelancing routes
app.get('/freelancing', authMiddleware, async (req, res) => {
  if (req.user.role === 'Investor') return res.status(403).send('Access denied');
  const db = await loadDB();
  res.json(db.freelancing);
});

app.post('/freelancing', authMiddleware, async (req, res) => {
  if (req.user.role !== 'Recruiter') return res.status(403).send('Access denied');
  const db = await loadDB();
  const gig = { 
    id: Date.now().toString(), 
    ...req.body, 
    recruiterId: req.user.id, 
    applications: [],
    postedDate: new Date().toISOString()
  };
  db.freelancing.push(gig);
  await saveDB(db);
  res.status(201).send('Gig posted');
});

// Startup routes
app.get('/startup', authMiddleware, async (req, res) => {
  const db = await loadDB();
  res.json(db.startup);
});

app.post('/startup', authMiddleware, async (req, res) => {
  const db = await loadDB();
  const idea = { 
    id: Date.now().toString(), 
    ...req.body, 
    posterId: req.user.id, 
    postedDate: new Date().toISOString()
  };
  db.startup.push(idea);
  await saveDB(db);
  res.status(201).send('Idea posted');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));