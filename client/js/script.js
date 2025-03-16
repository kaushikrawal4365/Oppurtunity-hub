// State management
let isLoggedIn = false;
let role = '';
let token = '';
let userInfo = null;

// DOM elements
const header = document.getElementById('header');
const mainContent = document.getElementById('main-content');
const footer = document.getElementById('footer');

// Routes
const routes = {
  '/': 'home',
  '/courses': 'courses',
  '/jobs': 'jobs',
  '/freelancing': 'freelancing',
  '/startup': 'startup',
  '/services': 'services',
  '/login': 'login',
  '/signup': 'signup'
};

// Fetch user info for pre-filling forms
async function fetchUserInfo() {
  try {
    const email = localStorage.getItem('email');
    if (!email) return;
    const res = await fetch('http://localhost:5000/users/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      userInfo = await res.json();
    } else {
      console.error('Failed to fetch user info:', await res.text());
    }
  } catch (error) {
    console.error('Fetch user info error:', error);
  }
}

// Render header
function renderHeader() {
  header.innerHTML = `
    <nav>
      <div>Opportunity Hub</div>
      <div>
        <a href="#/" data-route="/">Home</a>
        <a href="#/courses" data-route="/courses">Courses</a>
        ${isLoggedIn && (role === 'Seeker' || role === 'Recruiter') ? '<a href="#/jobs" data-route="/jobs">Jobs</a>' : ''}
        ${isLoggedIn && (role === 'Seeker' || role === 'Recruiter') ? '<a href="#/freelancing" data-route="/freelancing">Freelancing</a>' : ''}
        ${isLoggedIn ? '<a href="#/startup" data-route="/startup">Startup</a>' : ''}
        ${isLoggedIn ? `
            <div class="dropdown">
              <a href="#/services" data-route="/services">Services</a>
              <div class="dropdown-content">
                <a href="/ats-score.html">ATS Score Checker</a>
                <a href="/skills-roadmap.html">Skills Roadmap</a>
              </div>
            </div>
          ` : ''}
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
            <div class="page-header">
                <i class="fas fa-book"></i>
                <h1>Courses</h1>
                <p>Explore these starter courses!</p>
            </div>
            <div class="course-card">
                <h2>Software Development</h2>
                <p>Learn coding with Python and JavaScript.</p>
                <a href="https://codecademy.com" target="_blank">Start Now</a>
            </div>
            <div class="course-card">
                <h2>Project Management</h2>
                <p>Master leading teams and projects.</p>
                <a href="https://pmi.org" target="_blank">Start Now</a>
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
        renderStartupPage();
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

// Render Jobs page
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
            <div id="questions-container">
              <h3>Add Questions (Max 10)</h3>
              <button type="button" onclick="addQuestionField('job')">Add Question</button>
            </div>
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
            <p><strong>Applications:</strong> ${job.applications.length}</p>
            ${role === 'Seeker' ? `<button class="btn apply-btn" data-id="${job.id}" data-type="job">Apply</button>` : ''}
            ${role === 'Recruiter' && job.recruiterId === localStorage.getItem('userId') ? `
              <button class="btn edit-btn" data-id="${job.id}" data-type="job">Edit</button>
              <button class="btn delete-btn" data-id="${job.id}" data-type="job">Delete</button>
            ` : ''}
          </div>
        `).join('')}
      </div>
      <div id="modal" class="modal"></div>
    `;
    if (role === 'Recruiter') {
      document.getElementById('job-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('job-title').value;
        const description = document.getElementById('job-description').value;
        const requirements = document.getElementById('job-requirements').value;
        const questions = Array.from(document.querySelectorAll('.question-input'))
          .map(input => input.value)
          .filter(q => q.trim() !== '');
        await postJob(title, description, requirements, questions);
        fetchJobs().then(renderJobsPage);
      });
    }
    addApplyButtonListeners();
    if (role === 'Recruiter') {
      addEditDeleteButtonListeners('job');
    }
  });
}

// Render Freelancing page
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
            <div id="questions-container">
              <h3>Add Questions (Max 10)</h3>
              <button type="button" onclick="addQuestionField('freelancing')">Add Question</button>
            </div>
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
            <p><strong>Applications:</strong> ${gig.applications.length}</p>
            ${role === 'Seeker' ? `<button class="btn apply-btn" data-id="${gig.id}" data-type="freelancing">Apply</button>` : ''}
            ${role === 'Recruiter' && gig.recruiterId === localStorage.getItem('userId') ? `
              <button class="btn edit-btn" data-id="${gig.id}" data-type="freelancing">Edit</button>
              <button class="btn delete-btn" data-id="${gig.id}" data-type="freelancing">Delete</button>
            ` : ''}
          </div>
        `).join('')}
      </div>
      <div id="modal" class="modal"></div>
    `;
    if (role === 'Recruiter') {
      document.getElementById('freelancing-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('freelancing-title').value;
        const description = document.getElementById('freelancing-description').value;
        const skills = document.getElementById('freelancing-skills').value;
        const questions = Array.from(document.querySelectorAll('.question-input'))
          .map(input => input.value)
          .filter(q => q.trim() !== '');
        await postFreelancing(title, description, skills, questions);
        fetchFreelancing().then(renderFreelancingPage);
      });
    }
    addApplyButtonListeners();
    if (role === 'Recruiter') {
      addEditDeleteButtonListeners('freelancing');
    }
  });
}

// Add question field dynamically
function addQuestionField(type) {
  const container = document.getElementById('questions-container');
  const questionCount = container.querySelectorAll('.question-input').length;
  if (questionCount >= 10) {
    alert('Maximum 10 questions allowed');
    return;
  }
  const questionDiv = document.createElement('div');
  questionDiv.innerHTML = `
    <input type="text" class="question-input" placeholder="Question ${questionCount + 1}" style="margin-top: 10px;">
  `;
  container.appendChild(questionDiv);
}

// Add apply button listeners
function addApplyButtonListeners() {
  document.querySelectorAll('.apply-btn').forEach(button => {
    button.addEventListener('click', async () => {
      const id = button.dataset.id;
      const type = button.dataset.type;
      const items = type === 'job' ? await fetchJobs() : await fetchFreelancing();
      const item = items.find(i => i.id === id);
      if (!item) return;

      if (type === 'job' && item.questions.length > 0) {
        renderTestModal(item, type);
      } else {
        renderApplicationForm(item, type);
      }
    });
  });
}

// Render test modal for job applications
function renderTestModal(item, type) {
  const modal = document.getElementById('modal');
  modal.innerHTML = `
    <div class="modal-content">
      <h2>Test for ${item.title}</h2>
      <form id="test-form">
        ${item.questions.map((q, index) => `
          <div class="test-question">
            <p><strong>Question ${index + 1}:</strong> ${q}</p>
            <input type="text" id="answer-${index}" placeholder="Your answer" required>
          </div>
        `).join('')}
        <button type="submit">Submit Test</button>
        <button type="button" onclick="closeModal()">Cancel</button>
      </form>
    </div>
  `;
  modal.style.display = 'block';
  document.getElementById('test-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const answers = item.questions.map((_, index) => document.getElementById(`answer-${index}`).value);
    if (answers.every(a => a.trim() !== '')) {
      closeModal();
      renderApplicationForm(item, type);
    } else {
      alert('Please answer all questions');
    }
  });
}

// Render application form with pre-filled data
function renderApplicationForm(item, type) {
  const modal = document.getElementById('modal');
  modal.innerHTML = `
    <div class="modal-content">
      <h2>Apply for ${item.title}</h2>
      <form id="application-form">
        <input type="text" id="app-name" placeholder="Name" value="${userInfo?.name || ''}" required>
        <input type="date" id="app-dob" placeholder="Date of Birth" value="${userInfo?.dob || ''}" required>
        <input type="email" id="app-email" placeholder="Email" value="${userInfo?.email || ''}" required>
        <input type="text" id="app-skills" placeholder="Skills (e.g., React, Java)" required>
        <input type="tel" id="app-phone" placeholder="Phone Number" required>
        <button type="submit">Submit Application</button>
        <button type="button" onclick="closeModal()">Cancel</button>
      </form>
    </div>
  `;
  modal.style.display = 'block';
  document.getElementById('application-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('app-name').value;
    const dob = document.getElementById('app-dob').value;
    const skills = document.getElementById('app-skills').value;
    const email = document.getElementById('app-email').value;
    const phone = document.getElementById('app-phone').value;
    try {
      const res = await fetch(`http://localhost:5000/${type}/apply/${item.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, dob, skills, email, phone })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        closeModal();
        type === 'job' ? renderJobsPage() : renderFreelancingPage();
      } else {
        throw new Error(data.error || 'Application failed');
      }
    } catch (error) {
      alert('Error: ' + error.message);
    }
  });
}

// Close modal
function closeModal() {
  const modal = document.getElementById('modal');
  modal.style.display = 'none';
  modal.innerHTML = '';
}

// Add edit/delete button listeners
function addEditDeleteButtonListeners(type) {
  document.querySelectorAll(`.edit-btn[data-type="${type}"]`).forEach(button => {
    button.addEventListener('click', async () => {
      const id = button.dataset.id;
      const items = type === 'job' ? await fetchJobs() : await fetchFreelancing();
      const item = items.find(i => i.id === id);
      renderEditForm(item, type);
    });
  });
  document.querySelectorAll(`.delete-btn[data-type="${type}"]`).forEach(button => {
    button.addEventListener('click', async () => {
      if (confirm('Are you sure you want to delete this opportunity?')) {
        const id = button.dataset.id;
        try {
          const res = await fetch(`http://localhost:5000/${type}/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          if (res.ok) {
            alert(data.message);
            type === 'job' ? renderJobsPage() : renderFreelancingPage();
          } else {
            throw new Error(data.error || 'Failed to delete');
          }
        } catch (error) {
          alert('Error: ' + error.message);
        }
      }
    });
  });
}

// Render edit form
function renderEditForm(item, type) {
  const modal = document.getElementById('modal');
  modal.innerHTML = `
    <div class="modal-content">
      <h2>Edit ${item.title}</h2>
      <form id="edit-form">
        <input type="text" id="edit-title" placeholder="Title" value="${item.title}" required>
        <textarea id="edit-description" placeholder="Description" required>${item.description}</textarea>
        <input type="text" id="edit-${type === 'job' ? 'requirements' : 'skills'}" placeholder="${type === 'job' ? 'Requirements' : 'Skills'}" value="${type === 'job' ? item.requirements : item.skills}" required>
        <div id="edit-questions-container">
          <h3>Edit Questions (Max 10)</h3>
          ${item.questions.map((q, index) => `
            <input type="text" class="question-input" value="${q}" style="margin-top: 10px;">
          `).join('')}
          <button type="button" onclick="addQuestionField('edit')">Add Question</button>
        </div>
        <button type="submit">Update</button>
        <button type="button" onclick="closeModal()">Cancel</button>
      </form>
    </div>
  `;
  modal.style.display = 'block';
  document.getElementById('edit-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('edit-title').value;
    const description = document.getElementById('edit-description').value;
    const field = document.getElementById(`edit-${type === 'job' ? 'requirements' : 'skills'}`).value;
    const questions = Array.from(document.querySelectorAll('.question-input'))
      .map(input => input.value)
      .filter(q => q.trim() !== '');
    try {
      const res = await fetch(`http://localhost:5000/${type}/${item.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          description,
          [type === 'job' ? 'requirements' : 'skills']: field,
          questions
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        closeModal();
        type === 'job' ? renderJobsPage() : renderFreelancingPage();
      } else {
        throw new Error(data.error || 'Failed to update');
      }
    } catch (error) {
      alert('Error: ' + error.message);
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
        throw new Error(data.error || 'Unknown error');
      }
      token = data.token;
      role = data.role;
      isLoggedIn = true;
      localStorage.setItem('token', token);
      localStorage.setItem('role', role);
      localStorage.setItem('email', email);
      localStorage.setItem('userId', data.id);
      await fetchUserInfo();
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
      throw new Error(errorData.error || 'Access denied');
    }
    return await res.json();
  } catch (error) {
    console.error('Fetch jobs error:', error);
    return [];
  }
}

async function postJob(title, description, requirements, questions) {
  try {
    const res = await fetch('http://localhost:5000/jobs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ title, description, requirements, questions })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to post job');
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
      throw new Error(errorData.error || 'Access denied');
    }
    return await res.json();
  } catch (error) {
    console.error('Fetch freelancing error:', error);
    return [];
  }
}

async function postFreelancing(title, description, skills, questions) {
  try {
    const res = await fetch('http://localhost:5000/freelancing', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ title, description, skills, questions })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to post freelancing opportunity');
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
  userInfo = null;
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  localStorage.removeItem('email');
  localStorage.removeItem('userId');
  renderHeader();
  window.location.hash = '#/';
}

// Handle route changes
function handleRouteChange() {
    const path = window.location.pathname;
    const hash = window.location.hash || '#/';
    const route = hash.split('#')[1];

    // Skip hash routing for standalone .html pages
    if (path.endsWith('.html') && !path.includes('index.html')) {
        renderHeader(); // Still render the header for consistency
        renderFooter(); // Still render the footer
        return; // Don’t call renderContent
    }

    renderHeader();
    renderContent(route);
    renderFooter();
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  token = localStorage.getItem('token');
  role = localStorage.getItem('role');
  if (token && role) {
    isLoggedIn = true;
    await fetchUserInfo();
  }
  renderHeader();
  renderFooter();
  handleRouteChange();
  window.addEventListener('hashchange', handleRouteChange);
});

// Render Startup page
function renderStartupPage() {
    fetchStartup().then(startups => {
      mainContent.innerHTML = `
        <div class="page-header">
          <i class="fas fa-lightbulb"></i>
          <h1>Startup Ideas</h1>
          <p>Share and explore innovative startup ideas!</p>
        </div>
        <div class="form-container">
          <h2>Post a Startup Idea</h2>
          <form id="startup-form">
            <input type="text" id="startup-name" placeholder="Your Name" required>
            <input type="text" id="startup-mail" placeholder="Your Email" required>
            <input type="text" id="startup-topic" placeholder="Topic Name" required>
            <textarea id="startup-description" placeholder="Brief Description" required></textarea>
            <button type="submit">Post Idea</button>
          </form>
        </div>
        <div>
          ${startups.length === 0 ? '<p class="text-center">No startup ideas yet.</p>' : startups.map(startup => `
            <div class="startup-card">
              <h2>${startup.name}</h2>
              <p><strong>Topic:</strong> ${startup.topicName}</p>
              <p>${startup.briefDescription}</p>
              <p><strong>Posted:</strong> ${new Date(startup.postedDate).toLocaleString()}</p>
              ${startup.posterId === localStorage.getItem('userId') ? `
                <button class="btn edit-btn" data-id="${startup.id}">Edit</button>
                <button class="btn delete-btn" data-id="${startup.id}">Delete</button>
              ` : ''}
            </div>
          `).join('')}
        </div>
        <div id="modal" class="modal"></div>
      `;
      document.getElementById('startup-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('startup-name').value;
        const startupmail = document.getElementById('startup-mail').value;
        const topicName = document.getElementById('startup-topic').value;
        const briefDescription = document.getElementById('startup-description').value;
        await postStartup(name, topicName, briefDescription);
        renderStartupPage();
      });
      addStartupButtonListeners(); // Fixed this line
    });
  }
  
  // Fetch startup ideas
  async function fetchStartup() {
    try {
      const res = await fetch('http://localhost:5000/startup', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Access denied');
      }
      return await res.json();
    } catch (error) {
      console.error('Fetch startup error:', error);
      return [];
    }
  }
  
  // Post a startup idea
  async function postStartup(name, topicName, briefDescription) {
    try {
      const res = await fetch('http://localhost:5000/startup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, topicName, briefDescription })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to post startup idea');
      }
      alert(data.message);
    } catch (error) {
      console.error('Post startup error:', error);
      alert('Error: ' + error.message);
    }
  }
  
  // Add edit button listeners for startup
  function addStartupButtonListeners() {
    document.querySelectorAll('.edit-btn').forEach(button => {
      button.addEventListener('click', async () => {
        const id = button.dataset.id;
        const startups = await fetchStartup();
        const startup = startups.find(s => s.id === id);
        renderStartupEditForm(startup);
      });
    });
    document.querySelectorAll('.delete-btn').forEach(button => {
      button.addEventListener('click', async () => {
        if (confirm('Are you sure you want to delete this startup idea?')) {
          const id = button.dataset.id;
          try {
            const res = await fetch(`http://localhost:5000/startup/${id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (!res.ok) {
              throw new Error(data.error || 'Failed to delete');
            }
            alert(data.message);
            renderStartupPage();
          } catch (error) {
            alert('Error: ' + error.message);
          }
        }
      });
    });
  }
  
  // Render edit form for startup
  function renderStartupEditForm(startup) {
    const modal = document.getElementById('modal');
    modal.innerHTML = `
      <div class="modal-content">
        <h2>Edit ${startup.name}</h2>
        <form id="edit-startup-form">
          <input type="text" id="edit-name" placeholder="Startup Name" value="${startup.name}" required>
          <input type="text" id="edit-topic" placeholder="Topic Name" value="${startup.topicName}" required>
          <textarea id="edit-description" placeholder="Brief Description" required>${startup.briefDescription}</textarea>
          <button type="submit">Update</button>
          <button type="button" onclick="closeModal()">Cancel</button>
        </form>
      </div>
    `;
    modal.style.display = 'block';
    document.getElementById('edit-startup-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('edit-name').value;
      const topicName = document.getElementById('edit-topic').value;
      const briefDescription = document.getElementById('edit-description').value;
      try {
        const res = await fetch(`http://localhost:5000/startup/${startup.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ name, topicName, briefDescription })
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to update');
        }
        alert(data.message);
        closeModal();
        renderStartupPage();
      } catch (error) {
        alert('Error: ' + error.message);
      }
    });
  }