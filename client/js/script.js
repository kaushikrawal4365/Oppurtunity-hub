// State management
let isLoggedIn = false;
let role = '';
let token = '';

// DOM elements
const header = document.getElementById('header');
const mainContent = document.getElementById('main-content');
const footer = document.getElementById('footer');

// Routes
const routes = {
  '/': 'home',
  '/courses': 'courses',
  '/jobs': 'jobs',
  '/freelancing': 'freelancing', // Ensure this route is defined
  '/startup': 'startup',
  '/services': 'services',
  '/login': 'login',
  '/signup': 'signup'
};

// Render header
function renderHeader() {
  header.innerHTML = `
    <nav>
      <div>Opportunity Hub</div>
      <div>
        <a href="#/" data-route="/">Home</a>
        <a href="#/courses" data-route="/courses">Courses</a>
        ${isLoggedIn && (role === 'Seeker' || role === 'Recruiter') ? '<a href="#/jobs" data-route="/jobs">Jobs</a>' : ''}
        ${isLoggedIn && (role === 'Seeker' || role === 'Recruiter') ? '<a href="#/freelancing" data-route="/freelancing">Freelancing</a>' : ''} <!-- Ensure this line is present -->
        ${isLoggedIn ? '<a href="#/startup" data-route="/startup">Startup</a>' : ''}
        ${isLoggedIn ? '<a href="#/services" data-route="/services">Services</a>' : ''}
        ${isLoggedIn ? '<button onclick="logout()">Logout</button>' : '<a href="#/signup" data-route="/signup">Register Now</a>'}
      </div>
    </nav>
  `;
}

// Render footer
function renderFooter() {
  footer.innerHTML = `
    <p>© 2025 Opportunity Hub</p>
    <div>
      <a href="https://twitter.com"><i class="fab fa-twitter"></i></a>
      <a href="https://linkedin.com"><i class="fab fa-linkedin"></i></a>
      <a href="https://github.com"><i class="fab fa-github"></i></a>
    </div>
  `;
}

// Render content based on route
function renderContent(route) {
  const page = routes[route] || 'home';
  switch (page) {
    case 'home':
      mainContent.innerHTML = `
        <div class="home-hero">
          <h1>Unlock Your Future</h1>
          <p>Explore jobs, freelancing, and startup opportunities.</p>
          <button onclick="window.location.hash='#/signup'">Get Started</button>
        </div>
      `;
      break;
    case 'courses':
      mainContent.innerHTML = `
        <h1>Courses</h1>
        <div class="course-card">
          <h2>Learn Coding</h2>
          <p>Master programming basics.</p>
          <a href="https://youtube.com">Start Now</a>
        </div>
      `;
      break;
    case 'jobs':
      renderJobsPage();
      break;
    case 'freelancing':
      renderFreelancingPage();
      break;
    case 'startup':
      mainContent.innerHTML = `<h1>Startup</h1><p>Coming soon!</p>`;
      break;
    case 'services':
      mainContent.innerHTML = `<h1>Services</h1><p>Coming soon!</p>`;
      break;
    case 'login':
      renderLoginPage();
      break;
    case 'signup':
      renderSignupPage();
      break;
  }
}

// Render Jobs page with fetch and form
function renderJobsPage() {
  fetchJobs().then(jobs => {
    mainContent.innerHTML = `
      <div class="page-header">
        <i class="fas fa-briefcase"></i>
        <h1>Jobs</h1>
      </div>
      ${role === 'Recruiter' ? `
        <div class="form-container">
          <h2>Post a Job</h2>
          <form id="job-form">
            <input type="text" id="job-title" placeholder="Job Title" required>
            <textarea id="job-description" placeholder="Description" required></textarea>
            <input type="text" id="job-requirements" placeholder="Requirements (e.g., HTML, CSS)" required>
            <button type="submit">Post Job</button>
          </form>
        </div>
      ` : ''}
      <div>
        ${jobs.length === 0 ? '<p class="text-center">No jobs available.</p>' : jobs.map(job => `
          <div class="job-card">
            <h2>${job.title}</h2>
            <p>${job.description}</p>
            <p><strong>Requirements:</strong> ${job.requirements}</p>
            <p><strong>Posted:</strong> ${new Date(job.postedDate).toLocaleDateString()}</p>
          </div>
        `).join('')}
      </div>
    `;
    if (role === 'Recruiter') {
      document.getElementById('job-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('job-title').value;
        const description = document.getElementById('job-description').value;
        const requirements = document.getElementById('job-requirements').value;
        await postJob(title, description, requirements);
        fetchJobs().then(renderJobsPage);
      });
    }
  });
}

// Render Freelancing page with fetch and form
function renderFreelancingPage() {
  fetchFreelancing().then(gigs => {
    mainContent.innerHTML = `
      <div class="page-header">
        <i class="fas fa-laptop-code"></i>
        <h1>Freelancing Opportunities</h1>
      </div>
      ${role === 'Recruiter' ? `
        <div class="form-container">
          <h2>Post a Freelancing Opportunity</h2>
          <form id="freelancing-form">
            <input type="text" id="freelancing-title" placeholder="Project Title" required>
            <textarea id="freelancing-description" placeholder="Description" required></textarea>
            <input type="text" id="freelancing-skills" placeholder="Skills (e.g., React, UI/UX)" required>
            <button type="submit">Post Opportunity</button>
          </form>
        </div>
      ` : ''}
      <div>
        ${gigs.length === 0 ? '<p class="text-center">No freelancing opportunities available.</p>' : gigs.map(gig => `
          <div class="freelancing-card">
            <h2>${gig.title}</h2>
            <p>${gig.description}</p>
            <p><strong>Skills:</strong> ${gig.skills}</p>
            <p><strong>Posted:</strong> ${new Date(gig.postedDate).toLocaleDateString()}</p>
          </div>
        `).join('')}
      </div>
    `;
    if (role === 'Recruiter') {
      document.getElementById('freelancing-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('freelancing-title').value;
        const description = document.getElementById('freelancing-description').value;
        const skills = document.getElementById('freelancing-skills').value;
        await postFreelancing(title, description, skills);
        fetchFreelancing().then(renderFreelancingPage);
      });
    }
  });
}

// Render Login page
function renderLoginPage() {
  mainContent.innerHTML = `
    <div class="form-container">
      <h1>Sign In</h1>
      <form id="login-form">
        <input type="email" id="login-email" placeholder="Email" required>
        <input type="password" id="login-password" placeholder="Password" required>
        <button type="submit">Sign In</button>
        <p class="text-center mt-2">Don't have an account? <a href="#/signup" data-route="/signup">Register Now</a></p>
      </form>
    </div>
  `;
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    try {
      const res = await fetch('http://localhost:5000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data || 'Unknown error');
      }
      token = data.token;
      role = data.role;
      isLoggedIn = true;
      localStorage.setItem('token', token);
      localStorage.setItem('role', role);
      renderHeader();
      window.location.hash = '#/';
    } catch (error) {
      alert('Login failed: ' + error.message);
    }
  });
}

// Render Signup page
function renderSignupPage() {
  mainContent.innerHTML = `
    <div class="form-container">
      <h1>Register Now</h1>
      <form id="signup-form">
        <input type="text" id="signup-name" placeholder="Name" required>
        <input type="email" id="signup-email" placeholder="Email" required>
        <input type="date" id="signup-dob" placeholder="Date of Birth" required>
        <input type="password" id="signup-password" placeholder="Password" required>
        <select id="signup-role">
          <option value="Seeker">Seeker</option>
          <option value="Recruiter">Recruiter</option>
          <option value="Investor">Investor</option>
        </select>
        <button type="submit">Register Now</button>
        <p class="text-center mt-2">Already have an account? <a href="#/login" data-route="/login">Sign In</a></p>
      </form>
    </div>
  `;
  document.getElementById('signup-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const dob = document.getElementById('signup-dob').value;
    const password = document.getElementById('signup-password').value;
    const role = document.getElementById('signup-role').value;
    try {
      const res = await fetch('http://localhost:5000/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, dob, password, role })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Unknown error');
      }
      alert('Signup successful! Please sign in.');
      window.location.hash = '#/login';
    } catch (error) {
      alert('Signup failed: ' + error.message);
    }
  });
}

// API calls
async function fetchJobs() {
  try {
    const res = await fetch('http://localhost:5000/jobs', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData || 'Access denied');
    }
    return await res.json();
  } catch (error) {
    console.error('Fetch jobs error:', error);
    return [];
  }
}

async function postJob(title, description, requirements) {
  try {
    const res = await fetch('http://localhost:5000/jobs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ title, description, requirements })
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData || 'Failed to post job');
    }
  } catch (error) {
    console.error('Post job error:', error);
    throw error;
  }
}

async function fetchFreelancing() {
  try {
    const res = await fetch('http://localhost:5000/freelancing', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData || 'Access denied');
    }
    return await res.json();
  } catch (error) {
    console.error('Fetch freelancing error:', error);
    return [];
  }
}

async function postFreelancing(title, description, skills) {
  try {
    const res = await fetch('http://localhost:5000/freelancing', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ title, description, skills })
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData || 'Failed to post freelancing opportunity');
    }
  } catch (error) {
    console.error('Post freelancing error:', error);
    throw error;
  }
}

function logout() {
  isLoggedIn = false;
  role = '';
  token = '';
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  renderHeader();
  window.location.hash = '#/';
}

// Handle route changes
function handleRouteChange() {
  const hash = window.location.hash || '#/';
  const route = hash.split('#')[1];
  renderHeader();
  renderContent(route);
  renderFooter();
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Check if user is already logged in
  token = localStorage.getItem('token');
  role = localStorage.getItem('role');
  if (token && role) isLoggedIn = true;

  renderHeader();
  renderFooter();
  handleRouteChange();

  // Listen for hash changes
  window.addEventListener('hashchange', handleRouteChange);
});