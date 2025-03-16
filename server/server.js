
const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

const app = express();
app.use(cors());
app.use(express.json());

// Email configuration (using Gmail as an example)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'kaushikrawalwork@gmail.com', // Your email
    pass: 'your-app-specific-password' // Replace with an App Password from Google Account settings
  }
});

// Load JSON "database"
const loadDB = async () => {
  const data = await fs.readFile('./db.json', 'utf8');
  return JSON.parse(data);
};

// Save to JSON "database"
const saveDB = async (data) => {
  await fs.writeFile('./db.json', JSON.stringify(data, null, 2));
};

// Middleware to protect routes (MOVED UP HERE)
const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Login required' });
  try {
    const decoded = jwt.verify(token, 'secretkey');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ error: 'Invalid token' });
  }
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
  try {
    const db = await loadDB();
    const user = db.users.find(u => u.email === email);
    if (!user) return res.status(400).json({ error: 'User not found' });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, role: user.role }, 'secretkey', { expiresIn: '1h' });
    res.json({ token, role: user.role, id: user.id });
  } catch (error) {
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Get current user info
app.get('/users/me', authMiddleware, async (req, res) => {
  try {
    const db = await loadDB();
    const user = db.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ name: user.name, email: user.email, dob: user.dob });
  } catch (error) {
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Jobs routes
app.get('/jobs', authMiddleware, async (req, res) => {
  try {
    if (req.user.role === 'Investor') return res.status(403).json({ error: 'Access denied' });
    const db = await loadDB();
    res.json(db.jobs);
  } catch (error) {
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

app.post('/jobs', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'Recruiter') return res.status(403).json({ error: 'Access denied' });
    const { title, description, requirements, questions } = req.body;
    if (questions && questions.length > 10) return res.status(400).json({ error: 'Maximum 10 questions allowed' });
    const db = await loadDB();
    const job = {
      id: Date.now().toString(),
      title,
      description,
      requirements,
      questions: questions || [],
      recruiterId: req.user.id,
      applications: [],
      postedDate: new Date().toISOString()
    };
    db.jobs.push(job);
    await saveDB(db);
    res.status(201).json({ message: 'Job posted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

app.put('/jobs/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'Recruiter') return res.status(403).json({ error: 'Access denied' });
    const { id } = req.params;
    const { title, description, requirements, questions } = req.body;
    if (questions && questions.length > 10) return res.status(400).json({ error: 'Maximum 10 questions allowed' });
    const db = await loadDB();
    const job = db.jobs.find(j => j.id === id && j.recruiterId === req.user.id);
    if (!job) return res.status(404).json({ error: 'Job not found or not authorized' });
    job.title = title || job.title;
    job.description = description || job.description;
    job.requirements = requirements || job.requirements;
    job.questions = questions || job.questions;
    await saveDB(db);
    res.json({ message: 'Job updated' });
  } catch (error) {
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

app.delete('/jobs/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'Recruiter') return res.status(403).json({ error: 'Access denied' });
    const { id } = req.params;
    const db = await loadDB();
    const jobIndex = db.jobs.findIndex(j => j.id === id && j.recruiterId === req.user.id);
    if (jobIndex === -1) return res.status(404).json({ error: 'Job not found or not authorized' });
    db.jobs.splice(jobIndex, 1);
    db.applications = db.applications.filter(app => app.jobId !== id);
    await saveDB(db);
    res.json({ message: 'Job deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

app.post('/jobs/apply/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'Seeker') {
      return res.status(403).json({ error: 'Only Seekers can apply' });
    }
    const { id } = req.params;
    const { name, dob, skills, email, phone } = req.body;
    if (!name || !dob || !skills || !email || !phone) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    const db = await loadDB();
    const job = db.jobs.find(j => j.id === id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    const application = {
      id: Date.now().toString(),
      jobId: id,
      seekerId: req.user.id,
      name,
      dob,
      skills,
      email,
      phone,
      appliedDate: new Date().toISOString(),
      status: 'pending'
    };
    db.applications.push(application);
    job.applications.push(application.id);
    await saveDB(db);

    // Send email to recruiter
    const recruiter = db.users.find(u => u.id === job.recruiterId);
    if (recruiter) {
      const mailOptions = {
        from: 'kaushikrawalwork@gmail.com',
        to: recruiter.email,
        subject: `New Application for ${job.title}`,
        text: `
          A seeker has applied for your job posting:
          - Job Title: ${job.title}
          - Seeker Name: ${name}
          - DOB: ${dob}
          - Skills: ${skills}
          - Email: ${email}
          - Phone: ${phone}
          - Applied Date: ${new Date(application.appliedDate).toLocaleString()}
        `
      };
      await transporter.sendMail(mailOptions);
    }

    res.status(200).json({ message: 'Application submitted', application });
  } catch (error) {
    console.error('Error in /jobs/apply/:id:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Freelancing routes
app.get('/freelancing', authMiddleware, async (req, res) => {
  try {
    if (req.user.role === 'Investor') return res.status(403).json({ error: 'Access denied' });
    const db = await loadDB();
    res.json(db.freelancing);
  } catch (error) {
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

app.post('/freelancing', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'Recruiter') return res.status(403).json({ error: 'Access denied' });
    const { title, description, skills, questions } = req.body;
    if (questions && questions.length > 10) return res.status(400).json({ error: 'Maximum 10 questions allowed' });
    const db = await loadDB();
    const gig = {
      id: Date.now().toString(),
      title,
      description,
      skills,
      questions: questions || [],
      recruiterId: req.user.id,
      applications: [],
      postedDate: new Date().toISOString()
    };
    db.freelancing.push(gig);
    await saveDB(db);
    res.status(201).json({ message: 'Gig posted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

app.put('/freelancing/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'Recruiter') return res.status(403).json({ error: 'Access denied' });
    const { id } = req.params;
    const { title, description, skills, questions } = req.body;
    if (questions && questions.length > 10) return res.status(400).json({ error: 'Maximum 10 questions allowed' });
    const db = await loadDB();
    const gig = db.freelancing.find(g => g.id === id && g.recruiterId === req.user.id);
    if (!gig) return res.status(404).json({ error: 'Gig not found or not authorized' });
    gig.title = title || gig.title;
    gig.description = description || gig.description;
    gig.skills = skills || gig.skills;
    gig.questions = questions || gig.questions;
    await saveDB(db);
    res.json({ message: 'Gig updated' });
  } catch (error) {
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

app.delete('/freelancing/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'Recruiter') return res.status(403).json({ error: 'Access denied' });
    const { id } = req.params;
    const db = await loadDB();
    const gigIndex = db.freelancing.findIndex(g => g.id === id && g.recruiterId === req.user.id);
    if (gigIndex === -1) return res.status(404).json({ error: 'Gig not found or not authorized' });
    db.freelancing.splice(gigIndex, 1);
    db.applications = db.applications.filter(app => app.freelancingId !== id);
    await saveDB(db);
    res.json({ message: 'Gig deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

app.post('/freelancing/apply/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'Seeker') return res.status(403).json({ error: 'Only Seekers can apply' });
    const { id } = req.params;
    const { name, dob, skills, email, phone } = req.body;
    if (!name || !dob || !skills || !email || !phone) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    const db = await loadDB();
    const gig = db.freelancing.find(g => g.id === id);
    if (!gig) return res.status(404).json({ error: 'Gig not found' });
    const application = {
      id: Date.now().toString(),
      freelancingId: id,
      seekerId: req.user.id,
      name,
      dob,
      skills,
      email,
      phone,
      appliedDate: new Date().toISOString(),
      status: 'pending'
    };
    db.applications.push(application);
    gig.applications.push(application.id);
    await saveDB(db);

    // Send email to recruiter
    const recruiter = db.users.find(u => u.id === gig.recruiterId);
    if (recruiter) {
      const mailOptions = {
        from: 'kaushikrawalwork@gmail.com',
        to: recruiter.email,
        subject: `New Application for ${gig.title}`,
        text: `
          A seeker has applied for your freelancing gig:
          - Gig Title: ${gig.title}
          - Seeker Name: ${name}
          - DOB: ${dob}
          - Skills: ${skills}
          - Email: ${email}
          - Phone: ${phone}
          - Applied Date: ${new Date(application.appliedDate).toLocaleString()}
        `
      };
      await transporter.sendMail(mailOptions);
    }

    res.json({ message: 'Application submitted', application });
  } catch (error) {
    console.error('Error in /freelancing/apply/:id:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Startup routes
app.get('/startup', authMiddleware, async (req, res) => {
    try {
      const db = await loadDB();
      // Sort by postedDate, latest first
      const sortedStartups = db.startup.sort((a, b) => new Date(b.postedDate) - new Date(a.postedDate));
      res.json(sortedStartups);
    } catch (error) {
      res.status(500).json({ error: 'Server error: ' + error.message });
    }
  });
  
  app.post('/startup', authMiddleware, async (req, res) => {
    try {
      const { name, topicName, briefDescription } = req.body;
      if (!name || !topicName || !briefDescription) {
        return res.status(400).json({ error: 'Name, topic name, and brief description are required' });
      }
      const db = await loadDB();
      const idea = {
        id: Date.now().toString(),
        name,
        topicName,
        briefDescription,
        posterId: req.user.id,
        postedDate: new Date().toISOString()
      };
      db.startup.push(idea);
      await saveDB(db);
      res.status(201).json({ message: 'Startup idea posted', idea });
    } catch (error) {
      res.status(500).json({ error: 'Server error: ' + error.message });
    }
  });
  
  app.put('/startup/:id', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, topicName, briefDescription } = req.body;
      if (!name || !topicName || !briefDescription) {
        return res.status(400).json({ error: 'Name, topic name, and brief description are required' });
      }
      const db = await loadDB();
      const idea = db.startup.find(s => s.id === id && s.posterId === req.user.id);
      if (!idea) {
        return res.status(404).json({ error: 'Startup idea not found or not authorized' });
      }
      idea.name = name;
      idea.topicName = topicName;
      idea.briefDescription = briefDescription;
      await saveDB(db);
      res.json({ message: 'Startup idea updated', idea });
    } catch (error) {
      res.status(500).json({ error: 'Server error: ' + error.message });
    }
  });

  app.delete('/startup/:id', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const db = await loadDB();
      const ideaIndex = db.startup.findIndex(s => s.id === id && s.posterId === req.user.id);
      if (ideaIndex === -1) {
        return res.status(404).json({ error: 'Startup idea not found or not authorized' });
      }
      db.startup.splice(ideaIndex, 1);
      await saveDB(db);
      res.json({ message: 'Startup idea deleted' });
    } catch (error) {
      res.status(500).json({ error: 'Server error: ' + error.message });
    }
  });

// Services routes
app.post('/services/ats-score', authMiddleware, upload.single('resume'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Please upload a resume file' });
      }
      const resumeText = await fs.readFile(req.file.path, 'utf8');
      const keywords = ['skills', 'experience', 'education', 'project', 'team'];
      const score = keywords.reduce((acc, keyword) => {
        return acc + (resumeText.toLowerCase().split(keyword).length - 1) * 10;
      }, 0);
      const finalScore = Math.min(score, 100);
      await fs.unlink(req.file.path);
      res.json({ score: finalScore, message: `ATS Score: ${finalScore}%` });
    } catch (error) {
      res.status(500).json({ error: 'Server error: ' + error.message });
    }
  });
  
  app.post('/services/roadmap', authMiddleware, async (req, res) => {
    try {
      const { jobTitle } = req.body;
      if (!jobTitle) {
        return res.status(400).json({ error: 'Job title is required' });
      }
      const jobSkills = {
        'software engineer': {
          skills: ['JavaScript', 'Python', 'React', 'Node.js', 'SQL'],
          roadmap: ['Learn basics (3 months)', 'Build projects (6 months)', 'Apply for junior roles (9 months)']
        },
        'data analyst': {
          skills: ['Excel', 'SQL', 'Python', 'Tableau', 'Statistics'],
          roadmap: ['Master Excel & SQL (2 months)', 'Learn Python & Tableau (4 months)', 'Analyze datasets (6 months)']
        },
        'project manager': {
          skills: ['Leadership', 'Agile', 'Scrum', 'Communication', 'Risk Management'],
          roadmap: ['Study Agile/Scrum (2 months)', 'Lead small projects (4 months)', 'Get PMP cert (8 months)']
        }
      };
      const lowerJobTitle = jobTitle.toLowerCase();
      const matchedJob = Object.keys(jobSkills).find(key => lowerJobTitle.includes(key)) || 'default';
      const result = jobSkills[matchedJob] || {
        skills: ['General Skill 1', 'General Skill 2'],
        roadmap: ['Start learning (1 month)', 'Practice (3 months)']
      };
      res.json({ jobTitle, skills: result.skills, roadmap: result.roadmap });
    } catch (error) {
      res.status(500).json({ error: 'Server error: ' + error.message });
    }
  });
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));