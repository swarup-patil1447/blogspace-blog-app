const STORAGE_KEYS = { posts: "inkwell_posts_v1", users: "inkwell_users_v1", session: "inkwell_session_v1" };

function readStore(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}
function saveStore(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
function getPosts() { return readStore(STORAGE_KEYS.posts, []); }
function getSession() { return readStore(STORAGE_KEYS.session, null); }
function safeText(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char]));
}
function formatDate(dateValue) {
  const date = new Date(dateValue);
  return Number.isNaN(date.getTime()) ? "Recently" : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
function initials(title = "") {
  return title.trim().split(/\s+/).slice(0, 2).map(word => word[0] || "").join("").toUpperCase() || "i";
}
function setMessage(id, message, success = false) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = message;
  el.classList.toggle("success", success);
}
function updateNavigation() {
  const session = getSession();
  const login = document.getElementById("loginNav");
  const register = document.getElementById("registerNav");
  const logout = document.getElementById("logoutButton");
  if (session) {
    if (login) login.classList.add("hidden");
    if (register) register.classList.add("hidden");
    if (logout) logout.classList.remove("hidden");
  }
  if (logout) logout.addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEYS.session);
    window.location.href = "index.html";
  });
  const toggle = document.getElementById("menuToggle");
  const nav = document.getElementById("navLinks");
  if (toggle && nav) toggle.addEventListener("click", () => nav.classList.toggle("open"));
}
function renderHome() {
  const grid = document.getElementById("blogGrid");
  if (!grid) return;
  const posts = getPosts().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const empty = document.getElementById("emptyState");
  if (empty) empty.classList.toggle("hidden", posts.length > 0);
  grid.innerHTML = posts.map((post, index) => `
    <article class="blog-card">
      <div class="card-art art-${index % 4}">${safeText(initials(post.title))}</div>
      <div class="blog-card-content">
        <span class="category-tag">${safeText(post.category)}</span>
        <h3>${safeText(post.title)}</h3>
        <p>${safeText(post.excerpt)}</p>
        <div class="card-meta"><span>By ${safeText(post.author)}</span><span>${formatDate(post.createdAt)}</span></div>
      </div>
    </article>`).join("");
}
function renderDashboard() {
  const container = document.getElementById("dashboardPosts");
  if (!container) return;
  const posts = getPosts().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const session = getSession();
  const mine = session ? posts.filter(post => post.authorEmail === session.email) : [];
  document.getElementById("totalPosts").textContent = posts.length;
  document.getElementById("myPosts").textContent = mine.length;
  document.getElementById("latestActivity").textContent = posts.length ? formatDate(posts[0].createdAt) : "—";
  const welcome = document.getElementById("welcomeName");
  if (welcome && session) welcome.textContent = ` / Hello, ${session.name}`;
  document.getElementById("dashboardEmpty").classList.toggle("hidden", mine.length > 0);
  container.innerHTML = mine.map(post => `
    <article class="dashboard-post">
      <div><h3>${safeText(post.title)}</h3><p>${safeText(post.category)} · Published ${formatDate(post.createdAt)}</p></div>
      <div class="post-actions"><a class="text-link" href="index.html">View site</a><button class="delete-button" data-delete="${safeText(post.id)}">Delete</button></div>
    </article>`).join("");
  container.querySelectorAll("[data-delete]").forEach(button => button.addEventListener("click", () => {
    if (!confirm("Delete this story? This cannot be undone.")) return;
    saveStore(STORAGE_KEYS.posts, getPosts().filter(post => post.id !== button.dataset.delete));
    renderDashboard();
  }));
}
function setupRegister() {
  const form = document.getElementById("registerForm");
  if (!form) return;
  form.addEventListener("submit", event => {
    event.preventDefault();
    const name = document.getElementById("registerName").value.trim();
    const email = document.getElementById("registerEmail").value.trim().toLowerCase();
    const password = document.getElementById("registerPassword").value;
    const users = readStore(STORAGE_KEYS.users, []);
    if (users.some(user => user.email === email)) {
      setMessage("registerMessage", "An account with this email already exists.");
      return;
    }
    users.push({ name, email, password });
    saveStore(STORAGE_KEYS.users, users);
    saveStore(STORAGE_KEYS.session, { name, email });
    window.location.href = "dashboard.html";
  });
}
function setupLogin() {
  const form = document.getElementById("loginForm");
  if (!form) return;
  form.addEventListener("submit", event => {
    event.preventDefault();
    const email = document.getElementById("loginEmail").value.trim().toLowerCase();
    const password = document.getElementById("loginPassword").value;
    const user = readStore(STORAGE_KEYS.users, []).find(item => item.email === email && item.password === password);
    if (!user) {
      setMessage("loginMessage", "Email or password is incorrect. Check your details or register first.");
      return;
    }
    saveStore(STORAGE_KEYS.session, { name: user.name, email: user.email });
    window.location.href = "dashboard.html";
  });
}
function setupBlogForm() {
  const form = document.getElementById("blogForm");
  if (!form) return;
  const session = getSession();
  const authorInput = document.getElementById("blogAuthor");
  if (session && authorInput) authorInput.value = session.name;
  form.addEventListener("submit", event => {
    event.preventDefault();
    const title = document.getElementById("blogTitle").value.trim();
    const category = document.getElementById("blogCategory").value;
    const author = document.getElementById("blogAuthor").value.trim();
    const excerpt = document.getElementById("blogExcerpt").value.trim();
    const content = document.getElementById("blogContent").value.trim();
    if (content.length < 30) {
      setMessage("blogMessage", "Please write at least 30 characters in your story.");
      return;
    }
    const posts = getPosts();
    posts.push({
      id: (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()),
      title, category, author, excerpt, content,
      authorEmail: session ? session.email : "guest",
      createdAt: new Date().toISOString()
    });
    saveStore(STORAGE_KEYS.posts, posts);
    window.location.href = "dashboard.html";
  });
}
document.addEventListener("DOMContentLoaded", () => {
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
  updateNavigation();
  renderHome();
  renderDashboard();
  setupRegister();
  setupLogin();
  setupBlogForm();
});
