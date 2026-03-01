import express from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("estate.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT CHECK(role IN ('admin', 'agent')) DEFAULT 'agent',
    name TEXT
  );

  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    source TEXT,
    interest_type TEXT CHECK(interest_type IN ('Sale', 'Rent', 'Lease')),
    budget_min INTEGER,
    budget_max INTEGER,
    preferred_location TEXT,
    property_type TEXT,
    status TEXT DEFAULT 'New',
    assigned_agent_id INTEGER,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(assigned_agent_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS properties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id_code TEXT UNIQUE,
    project_name TEXT,
    location TEXT,
    category TEXT CHECK(category IN ('Sale', 'Rent', 'Lease')),
    property_type TEXT,
    bhk INTEGER,
    sqft INTEGER,
    facing TEXT,
    floor INTEGER,
    furnishing TEXT,
    price INTEGER,
    rent_amount INTEGER,
    lease_terms TEXT,
    status TEXT DEFAULT 'Available',
    owner_name TEXT,
    owner_phone TEXT,
    description TEXT,
    image_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER,
    type TEXT,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(lead_id) REFERENCES leads(id)
  );
`);

// Seed Admin User if not exists
const adminExists = db.prepare("SELECT * FROM users WHERE username = ?").get("admin");
if (!adminExists) {
  db.prepare("INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)").run("admin", "admin123", "admin", "System Admin");
}

// Seed Properties if empty
const propertyCount = db.prepare("SELECT COUNT(*) as count FROM properties").get().count;
if (propertyCount === 0) {
  const seedProperties = [
    {
      code: 'PROP-001',
      project: 'Emerald Heights',
      location: 'Whitefield, Bangalore',
      category: 'Sale',
      type: 'Apartment',
      bhk: 3,
      sqft: 1850,
      facing: 'East',
      floor: 12,
      furnishing: 'Semi-furnished',
      price: 18500000,
      status: 'Available',
      owner: 'John Doe',
      image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80'
    },
    {
      code: 'PROP-002',
      project: 'Skyline Residency',
      location: 'Indiranagar, Bangalore',
      category: 'Rent',
      type: 'Apartment',
      bhk: 2,
      sqft: 1200,
      facing: 'North',
      floor: 4,
      furnishing: 'Fully-furnished',
      price: 0,
      rent: 45000,
      status: 'Available',
      owner: 'Jane Smith',
      image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80'
    },
    {
      code: 'PROP-003',
      project: 'Oakwood Villas',
      location: 'Sarjapur, Bangalore',
      category: 'Sale',
      type: 'Villa',
      bhk: 4,
      sqft: 3200,
      facing: 'East',
      floor: 0,
      furnishing: 'Unfurnished',
      price: 42000000,
      status: 'Available',
      owner: 'Robert Brown',
      image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80'
    },
    {
      code: 'PROP-004',
      project: 'Prestige Tech Park',
      location: 'Marathahalli, Bangalore',
      category: 'Lease',
      type: 'Commercial',
      bhk: 0,
      sqft: 5000,
      facing: 'West',
      floor: 2,
      furnishing: 'Warm Shell',
      price: 0,
      rent: 350000,
      status: 'Available',
      owner: 'Corp Assets Ltd',
      image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80'
    }
  ];

  const insertProp = db.prepare(`
    INSERT INTO properties (property_id_code, project_name, location, category, property_type, bhk, sqft, facing, floor, furnishing, price, rent_amount, status, owner_name, image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  seedProperties.forEach(p => {
    insertProp.run(p.code, p.project, p.location, p.category, p.type, p.bhk, p.sqft, p.facing, p.floor, p.furnishing, p.price, p.rent || 0, p.status, p.owner, p.image);
  });
}

// Seed Leads if empty
const leadCount = db.prepare("SELECT COUNT(*) as count FROM leads").get().count;
if (leadCount === 0) {
  const seedLeads = [
    { name: 'Amit Sharma', phone: '9876543210', email: 'amit@example.com', source: 'Website', type: 'Sale', min: 15000000, max: 20000000, loc: 'Whitefield', ptype: 'Apartment', status: 'New' },
    { name: 'Priya Singh', phone: '9876543211', email: 'priya@example.com', source: 'Referral', type: 'Rent', min: 40000, max: 50000, loc: 'Indiranagar', ptype: 'Apartment', status: 'Contacted' },
    { name: 'Vikram Malhotra', phone: '9876543212', email: 'vikram@example.com', source: 'Social Media', type: 'Sale', min: 35000000, max: 50000000, loc: 'Sarjapur', ptype: 'Villa', status: 'Follow-up' }
  ];

  const insertLead = db.prepare(`
    INSERT INTO leads (name, phone, email, source, interest_type, budget_min, budget_max, preferred_location, property_type, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  seedLeads.forEach(l => {
    insertLead.run(l.name, l.phone, l.email, l.source, l.type, l.min, l.max, l.loc, l.ptype, l.status);
  });
}

const app = express();
app.use(cors());
app.use(express.json());

// API Routes
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare("SELECT id, username, role, name FROM users WHERE username = ? AND password = ?").get(username, password);
  if (user) {
    res.json(user);
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
});

// Leads API
app.get("/api/leads", (req, res) => {
  try {
    const { q, status, type } = req.query;
    let query = "SELECT l.*, u.name as agent_name FROM leads l LEFT JOIN users u ON l.assigned_agent_id = u.id WHERE 1=1";
    const params: any[] = [];

    if (q) {
      query += " AND (l.name LIKE ? OR l.phone LIKE ? OR l.email LIKE ? OR l.preferred_location LIKE ?)";
      const search = `%${q}%`;
      params.push(search, search, search, search);
    }
    if (status) {
      query += " AND l.status = ?";
      params.push(status);
    }
    if (type) {
      query += " AND l.interest_type = ?";
      params.push(type);
    }

    query += " ORDER BY l.created_at DESC";
    const leads = db.prepare(query).all(...params);
    res.json(leads);
  } catch (error) {
    console.error("Error fetching leads:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/leads", (req, res) => {
  try {
    console.log("Creating lead:", req.body);
    const { name, phone, email, source, interest_type, budget_min, budget_max, preferred_location, property_type, status, assigned_agent_id, notes } = req.body;
    
    const result = db.prepare(`
      INSERT INTO leads (name, phone, email, source, interest_type, budget_min, budget_max, preferred_location, property_type, status, assigned_agent_id, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name, 
      phone, 
      email, 
      source, 
      interest_type, 
      budget_min ? parseInt(budget_min.toString()) : null, 
      budget_max ? parseInt(budget_max.toString()) : null, 
      preferred_location, 
      property_type, 
      status || 'New', 
      assigned_agent_id ? parseInt(assigned_agent_id.toString()) : null, 
      notes
    );
    
    db.prepare("INSERT INTO activities (lead_id, type, description) VALUES (?, ?, ?)").run(result.lastInsertRowid, "Creation", "Lead created in system");
    res.json({ id: result.lastInsertRowid });
  } catch (error) {
    console.error("Error creating lead:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Internal server error" });
  }
});

app.put("/api/leads/:id", (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Updating lead ${id}:`, req.body);
    const { name, phone, email, source, interest_type, budget_min, budget_max, preferred_location, property_type, status, assigned_agent_id, notes } = req.body;
    
    db.prepare(`
      UPDATE leads SET 
        name = ?, phone = ?, email = ?, source = ?, interest_type = ?, 
        budget_min = ?, budget_max = ?, preferred_location = ?, property_type = ?, 
        status = ?, assigned_agent_id = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name, 
      phone, 
      email, 
      source, 
      interest_type, 
      budget_min ? parseInt(budget_min.toString()) : null, 
      budget_max ? parseInt(budget_max.toString()) : null, 
      preferred_location, 
      property_type, 
      status, 
      assigned_agent_id ? parseInt(assigned_agent_id.toString()) : null, 
      notes, 
      id
    );
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating lead:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Internal server error" });
  }
});

app.delete("/api/leads/:id", (req, res) => {
  const { id } = req.params;
  db.prepare("DELETE FROM activities WHERE lead_id = ?").run(id);
  db.prepare("DELETE FROM leads WHERE id = ?").run(id);
  res.json({ success: true });
});

// Properties API
app.get("/api/properties", (req, res) => {
  try {
    const { q, category, type, minPrice, maxPrice, bhk } = req.query;
    let query = "SELECT * FROM properties WHERE 1=1";
    const params: any[] = [];

    if (q) {
      query += " AND (project_name LIKE ? OR location LIKE ? OR property_id_code LIKE ?)";
      const search = `%${q}%`;
      params.push(search, search, search);
    }
    if (category) {
      query += " AND category = ?";
      params.push(category);
    }
    if (type) {
      query += " AND property_type = ?";
      params.push(type);
    }
    if (minPrice) {
      query += " AND price >= ?";
      params.push(minPrice);
    }
    if (maxPrice) {
      query += " AND price <= ?";
      params.push(maxPrice);
    }
    if (bhk) {
      query += " AND bhk = ?";
      params.push(bhk);
    }

    query += " ORDER BY created_at DESC";
    const properties = db.prepare(query).all(...params);
    res.json(properties);
  } catch (error) {
    console.error("Error fetching properties:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/properties", (req, res) => {
  try {
    console.log("Creating property:", req.body);
    const { project_name, location, category, property_type, bhk, sqft, facing, floor, furnishing, price, rent_amount, lease_terms, status, owner_name, owner_phone, description, image_url } = req.body;
    const idCode = `PROP-${Date.now().toString().slice(-6)}`;
    const result = db.prepare(`
      INSERT INTO properties (property_id_code, project_name, location, category, property_type, bhk, sqft, facing, floor, furnishing, price, rent_amount, lease_terms, status, owner_name, owner_phone, description, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      idCode, 
      project_name, 
      location, 
      category, 
      property_type, 
      bhk ? parseInt(bhk.toString()) : 0, 
      sqft ? parseInt(sqft.toString()) : 0, 
      facing, 
      floor ? parseInt(floor.toString()) : 0, 
      furnishing, 
      price ? parseInt(price.toString()) : 0, 
      rent_amount ? parseInt(rent_amount.toString()) : 0, 
      lease_terms, 
      status || 'Available', 
      owner_name, 
      owner_phone, 
      description, 
      image_url
    );
    res.json({ id: result.lastInsertRowid, code: idCode });
  } catch (error) {
    console.error("Error creating property:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Internal server error" });
  }
});

app.put("/api/properties/:id", (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Updating property ${id}:`, req.body);
    const { project_name, location, category, property_type, bhk, sqft, facing, floor, furnishing, price, rent_amount, lease_terms, status, owner_name, owner_phone, description, image_url } = req.body;
    db.prepare(`
      UPDATE properties SET 
        project_name = ?, location = ?, category = ?, property_type = ?, 
        bhk = ?, sqft = ?, facing = ?, floor = ?, furnishing = ?, 
        price = ?, rent_amount = ?, lease_terms = ?, status = ?, 
        owner_name = ?, owner_phone = ?, description = ?, image_url = ?
      WHERE id = ?
    `).run(
      project_name, 
      location, 
      category, 
      property_type, 
      bhk ? parseInt(bhk.toString()) : 0, 
      sqft ? parseInt(sqft.toString()) : 0, 
      facing, 
      floor ? parseInt(floor.toString()) : 0, 
      furnishing, 
      price ? parseInt(price.toString()) : 0, 
      rent_amount ? parseInt(rent_amount.toString()) : 0, 
      lease_terms, 
      status, 
      owner_name, 
      owner_phone, 
      description, 
      image_url, 
      id
    );
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating property:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Internal server error" });
  }
});

app.delete("/api/properties/:id", (req, res) => {
  try {
    const { id } = req.params;
    db.prepare("DELETE FROM properties WHERE id = ?").run(id);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting property:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Dashboard Stats
app.get("/api/stats", (req, res) => {
  try {
    const totalLeads = db.prepare("SELECT COUNT(*) as count FROM leads").get().count || 0;
    const activeLeads = db.prepare("SELECT COUNT(*) as count FROM leads WHERE status NOT IN ('Closed', 'Lost')").get().count || 0;
    const closedDeals = db.prepare("SELECT COUNT(*) as count FROM leads WHERE status = 'Closed'").get().count || 0;
    const availableProperties = db.prepare("SELECT COUNT(*) as count FROM properties WHERE status = 'Available'").get().count || 0;
    
    const recentLeads = db.prepare("SELECT * FROM leads ORDER BY created_at DESC LIMIT 5").all() || [];
    const statusDistribution = db.prepare("SELECT status as name, COUNT(*) as value FROM leads GROUP BY status").all() || [];
    
    res.json({
      totalLeads,
      activeLeads,
      closedDeals,
      availableProperties,
      recentLeads,
      statusDistribution
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ 
      totalLeads: 0, 
      activeLeads: 0, 
      closedDeals: 0, 
      availableProperties: 0, 
      recentLeads: [], 
      statusDistribution: [] 
    });
  }
});

// Global Search
app.get("/api/search", (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ leads: [], properties: [] });

    const search = `%${q}%`;
    const leads = db.prepare(`
      SELECT * FROM leads 
      WHERE name LIKE ? 
         OR phone LIKE ? 
         OR email LIKE ? 
         OR preferred_location LIKE ? 
         OR property_type LIKE ? 
         OR notes LIKE ?
         OR CAST(budget_min AS TEXT) LIKE ?
         OR CAST(budget_max AS TEXT) LIKE ?
         OR CAST(bhk AS TEXT) LIKE ?
    `).all(search, search, search, search, search, search, search, search, search);

    const properties = db.prepare(`
      SELECT * FROM properties 
      WHERE project_name LIKE ? 
         OR location LIKE ? 
         OR property_id_code LIKE ? 
         OR property_type LIKE ? 
         OR facing LIKE ? 
         OR category LIKE ?
         OR CAST(price AS TEXT) LIKE ?
         OR CAST(rent_amount AS TEXT) LIKE ?
         OR CAST(bhk AS TEXT) LIKE ?
         OR CAST(sqft AS TEXT) LIKE ?
    `).all(search, search, search, search, search, search, search, search, search, search);

    res.json({ leads, properties });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ leads: [], properties: [], error: "Search failed" });
  }
});

// Match Maker API
app.get("/api/matches", (req, res) => {
  try {
    const leads = db.prepare("SELECT * FROM leads WHERE status NOT IN ('Closed', 'Lost')").all();
    const inventory = db.prepare("SELECT * FROM properties WHERE status = 'Available'").all();

    const matches = leads.map(lead => {
      const leadMatches = inventory.map(prop => {
        let score = 0;
        const totalCriteria = 5;

        // 1. Category Match (Sale/Rent/Lease) - Critical
        if (lead.interest_type === prop.category) {
          score += 20;
        }

        // 2. Property Type Match
        if (lead.property_type && prop.property_type && 
            lead.property_type.toLowerCase() === prop.property_type.toLowerCase()) {
          score += 20;
        }

        // 3. BHK Match
        if (lead.bhk && prop.bhk && lead.bhk === prop.bhk) {
          score += 20;
        }

        // 4. Location Match
        if (lead.preferred_location && prop.location && 
            (prop.location.toLowerCase().includes(lead.preferred_location.toLowerCase()) || 
             lead.preferred_location.toLowerCase().includes(prop.location.toLowerCase()))) {
          score += 20;
        }

        // 5. Budget Match
        const price = prop.category === 'Sale' ? prop.price : prop.rent_amount;
        if (price > 0) {
          if (lead.budget_min && lead.budget_max) {
            if (price >= lead.budget_min && price <= lead.budget_max) {
              score += 20;
            } else if (price >= lead.budget_min * 0.8 && price <= lead.budget_max * 1.2) {
              score += 10; // Close budget
            }
          } else if (lead.budget_max && price <= lead.budget_max) {
            score += 20;
          } else if (lead.budget_min && price >= lead.budget_min) {
            score += 20;
          }
        }

        return {
          property: prop,
          score: score
        };
      })
      .filter(m => m.score >= 40) // Only show reasonable matches
      .sort((a, b) => b.score - a.score);

      return {
        lead,
        matches: leadMatches
      };
    }).filter(m => m.matches.length > 0);

    res.json(matches);
  } catch (error) {
    console.error("Match maker error:", error);
    res.status(500).json({ error: "Failed to generate matches" });
  }
});

// Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
