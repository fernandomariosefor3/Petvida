import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";

const db = new Database("petvida.db");

// Initialize Database Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT UNIQUE,
    password TEXT
  );

  CREATE TABLE IF NOT EXISTS pets (
    id TEXT PRIMARY KEY,
    userId TEXT,
    name TEXT,
    species TEXT,
    breed TEXT,
    weight TEXT,
    age TEXT,
    FOREIGN KEY(userId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS health_records (
    id TEXT PRIMARY KEY,
    petId TEXT,
    type TEXT,
    description TEXT,
    date TEXT,
    FOREIGN KEY(petId) REFERENCES pets(id)
  );

  CREATE TABLE IF NOT EXISTS vaccines (
    id TEXT PRIMARY KEY,
    petId TEXT,
    name TEXT,
    date TEXT,
    status TEXT,
    FOREIGN KEY(petId) REFERENCES pets(id)
  );

  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    userId TEXT,
    petId TEXT,
    type TEXT,
    description TEXT,
    date TEXT,
    time TEXT,
    FOREIGN KEY(userId) REFERENCES users(id),
    FOREIGN KEY(petId) REFERENCES pets(id)
  );
`);

async function startServer() {
  const app = express();
  app.use(express.json());

  // API Routes
  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ? AND password = ?").get(email, password);
    if (user) res.json(user);
    else res.status(401).json({ error: "Credenciais inválidas" });
  });

  app.post("/api/auth/register", (req, res) => {
    const { id, name, email, password } = req.body;
    try {
      db.prepare("INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)").run(id, name, email, password);
      res.json({ id, name, email });
    } catch (e) {
      res.status(400).json({ error: "E-mail já cadastrado" });
    }
  });

  app.get("/api/pets/:userId", (req, res) => {
    const pets = db.prepare("SELECT * FROM pets WHERE userId = ?").all(req.params.userId);
    const petsWithDetails = pets.map((pet: any) => ({
      ...pet,
      healthRecords: db.prepare("SELECT * FROM health_records WHERE petId = ?").all(pet.id),
      vaccines: db.prepare("SELECT * FROM vaccines WHERE petId = ?").all(pet.id)
    }));
    res.json(petsWithDetails);
  });

  app.post("/api/pets", (req, res) => {
    const { id, userId, name, species, breed, weight, age } = req.body;
    db.prepare("INSERT INTO pets (id, userId, name, species, breed, weight, age) VALUES (?, ?, ?, ?, ?, ?, ?)").run(id, userId, name, species, breed, weight, age);
    res.json({ success: true });
  });

  app.get("/api/events/:userId", (req, res) => {
    const events = db.prepare("SELECT * FROM events WHERE userId = ?").all(req.params.userId);
    res.json(events);
  });

  app.post("/api/events", (req, res) => {
    const { id, userId, petId, type, description, date, time } = req.body;
    db.prepare("INSERT INTO events (id, userId, petId, type, description, date, time) VALUES (?, ?, ?, ?, ?, ?, ?)").run(id, userId, petId, type, description, date, time);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(3000, "0.0.0.0", () => {
    console.log("Server running on http://localhost:3000");
  });
}

startServer();
