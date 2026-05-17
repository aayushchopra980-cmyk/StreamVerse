const express = require("express");
const cors = require("cors");
const crypto = require("crypto");

const app = express();

app.use(cors());
app.use(express.json());

const categories = [
  { id: 1, name: "Sci-Fi", description: "Futuristic and space storytelling." },
  { id: 2, name: "Action", description: "High-energy thrillers with fast-paced stakes." },
  { id: 3, name: "Drama", description: "Character-driven stories with emotional depth." },
  { id: 4, name: "Comedy", description: "Laugh-out-loud moments and witty humor." },
  { id: 5, name: "Thriller", description: "Edge-of-your-seat suspense and mystery." },
  { id: 6, name: "Horror", description: "Dark, scary tales that keep you on edge." },
  { id: 7, name: "Romance", description: "Love stories with heart and warmth." },
  { id: 8, name: "Documentary", description: "Real-world stories and eye-opening facts." },
  { id: 9, name: "Fantasy", description: "Magic, myth, and epic adventure." },
  { id: 10, name: "Mystery", description: "Unravel secrets and hidden clues." },
  { id: 11, name: "Adventure", description: "Journey-based stories with big thrills." },
  { id: 12, name: "Animation", description: "Animated worlds full of fun and wonder." },
  { id: 13, name: "Crime", description: "Heists, investigations, and gritty drama." },
  { id: 14, name: "Family", description: "Stories for every age with warm values." },
  { id: 15, name: "Musical", description: "Songs and dance woven into story." },
  { id: 16, name: "Western", description: "Frontier action and lawless landscapes." },
  { id: 17, name: "Biography", description: "True-life portraits of fascinating people." },
  { id: 18, name: "Sports", description: "Games, competition, and comeback stories." },
  { id: 19, name: "History", description: "Epic tales from the past." },
  { id: 20, name: "Series", description: "Binge-worthy episodic storytelling." }
];

const sampleVideos = [
  "https://www.w3schools.com/html/mov_bbb.mp4",
  "https://www.w3schools.com/html/movie.mp4",
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/river.mp4",
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/forest.mp4",
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/earth.mp4",
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/sea.mp4",
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/snow.mp4",
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/mountain.mp4",
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/boat.mp4"
];

const movies = [];
const users = [];
const sessions = new Map();
const guestAllowedIds = new Set([1,2,3,4,5,6,7,8,9,10]);

function hashPassword(password){
  return crypto.createHash("sha256").update(password).digest("hex");
}

function createSession(user){
  const token = crypto.randomBytes(32).toString("hex");
  const session = {
    token,
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000
  };
  sessions.set(token, session);
  return session;
}

function getSession(req){
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if(!token){
    return null;
  }
  const session = sessions.get(token);
  if(!session){
    return null;
  }
  if(session.expiresAt < Date.now()){
    sessions.delete(token);
    return null;
  }
  return session;
}

function sanitizeUser(user){
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };
}

categories.forEach((category, categoryIndex) => {
  for (let i = 1; i <= 10; i++) {
    const id = categoryIndex * 10 + i;
    const titleBase = `${category.name} ${i < 10 ? `0${i}` : i}`;
    const description = `Experience ${category.description.toLowerCase()} with Title ${i} from the ${category.name} collection.`;
    const year = 2016 + ((id % 10) + 1);
    const rating = (7 + ((id % 30) * 0.1)).toFixed(1);
    const video = sampleVideos[(categoryIndex * 10 + i - 1) % sampleVideos.length];
    const isTrending = (id % 7 === 0) || category.name === "Series";

    movies.push({
      id,
      title: titleBase,
      description,
      genre: category.name,
      category: category.name,
      year,
      rating,
      thumbnail: `https://picsum.photos/300/200?${id}`,
      video,
      isTrending
    });
  }
});

app.post("/auth/signup", (req, res) => {
  const { name, email, password } = req.body || {};
  if(!name || !email || !password){
    return res.status(400).json({ error: "Name, email, and password are required." });
  }

  const normalizedEmail = email.toLowerCase().trim();
  if(users.some(u => u.email === normalizedEmail)){
    return res.status(409).json({ error: "Email already exists." });
  }

  const user = {
    id: users.length + 1,
    name: name.trim(),
    email: normalizedEmail,
    passwordHash: hashPassword(password),
    role: "member"
  };
  users.push(user);

  const session = createSession(user);
  res.json({ user: sanitizeUser(user), token: session.token });
});

app.post("/auth/login", (req, res) => {
  const { email, password } = req.body || {};
  if(!email || !password){
    return res.status(400).json({ error: "Email and password are required." });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = users.find(u => u.email === normalizedEmail);
  if(!user || user.passwordHash !== hashPassword(password)){
    return res.status(401).json({ error: "Invalid credentials." });
  }

  const session = createSession(user);
  res.json({ user: sanitizeUser(user), token: session.token });
});

app.post("/auth/guest", (req, res) => {
  const guestUser = {
    id: 0,
    name: "Guest",
    email: "",
    role: "guest"
  };
  const session = createSession(guestUser);
  res.json({ user: sanitizeUser(guestUser), token: session.token });
});

app.get("/auth/me", (req, res) => {
  const session = getSession(req);
  if(!session){
    return res.status(401).json({ error: "Invalid or expired session." });
  }
  res.json({ user: sanitizeUser(session) });
});

app.get("/categories", (req, res) => {
  res.json(categories);
});

app.get("/movies", (req, res) => {
  const search = req.query.search ? req.query.search.toLowerCase() : "";
  const category = req.query.category ? req.query.category.trim().toLowerCase() : "";
  const session = getSession(req);
  const role = session ? session.role : "guest";

  let filtered = movies;
  if(category){
    if(category === "trending"){
      filtered = filtered.filter(movie => movie.isTrending);
    } else {
      filtered = filtered.filter(movie => movie.category.toLowerCase() === category);
    }
  }

  if(search){
    filtered = filtered.filter(movie => {
      const text = `${movie.title} ${movie.description} ${movie.genre} ${movie.category}`.toLowerCase();
      return text.includes(search);
    });
  }

  const results = filtered.map(movie => {
    const allowed = role === "member" || guestAllowedIds.has(movie.id) || movie.isTrending;
    return {
      ...movie,
      video: allowed ? movie.video : null,
      locked: !allowed
    };
  });

  res.json(results);
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});