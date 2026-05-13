
import express from "express";
import cors from "cors";
import * as cheerio from "cheerio";

const app = express();

// ✅ Middleware
app.use(cors());
app.use(express.json());

// ✅ RAM Speicher (für Multiplayer)
let savedData = {
  tips: {},
  banker: {}
};

// ================= STARTERS =================
app.get("/api/starters/:raceId", async (req, res) => {
  try {
    const url = `https://www.deutscher-galopp.de/gr/renntage/rennen.php?id=${req.params.raceId}&d=20260514&s=S`;

    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);

    const starters = [];

    // ✅ robust via Link zur Pferdeseite
    $("tr").each((_, row) => {
      const horse = $(row).find("a[href*='/pferde/']").text().trim();
      if (horse) starters.push(horse);
    });

    res.json({
      raceId: req.params.raceId,
      starters
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Fehler beim Laden der Starter" });
  }
});

// ================= RESULTS =================
app.get("/api/results/:raceId", async (req, res) => {
  try {
    const url = `https://www.deutscher-galopp.de/gr/renntage/rennen.php?id=${req.params.raceId}&d=20260514&s=S`;

    const html = await fetch(url).then(r => r.text());
    const $ = cheerio.load(html);

    let winner = "";
    let placed = [];
    let winOdds = 0;
    let placeOdds = 0;

    $("tr").each((_, row) => {
      const cells = $(row).find("td");
      const pos = cells.eq(0).text().trim();

      if (pos === "1.") {
        winner = cells.find("a[href*='/pferde/']").text().trim();
        winOdds = parseFloat(cells.eq(10).text().replace(",", ".")) || 0;
      }

      if (pos === "2." || pos === "3.") {
        const name = cells.find("a[href*='/pferde/']").text().trim();
        if (name) placed.push(name);
      }

      if (["1.", "2.", "3."].includes(pos)) {
        const pq = parseFloat(cells.eq(11).text().replace(",", ".")) || 0;
        if (pq) placeOdds = pq;
      }
    });

    res.json({
      raceId: req.params.raceId,
      winner,
      placed,
      winOdds,
      placeOdds
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Fehler Ergebnisse laden" });
  }
});

// ================= RACES (WICHTIG FIX!) =================
app.get("/api/races", async (req, res) => {
  try {
    const url = "https://www.deutscher-galopp.de/gr/renntage/37578537/?d=20260514";

    const html = await fetch(url).then(r => r.text());
    const $ = cheerio.load(html);

    const races = [];

    $("a").each((_, el) => {
      const href = $(el).attr("href") || "";

      if (href.includes("rennen.php?id=")) {

        const match = href.match(/id=(\d+)/);
        const name = $(el).text().trim();

        // ✅ nur echte Rennen filtern
        if (match && name && name.toLowerCase().includes("rennen")) {
          races.push({
            id: match[1],
            name: name
          });
        }
      }
    });

    console.log("✅ Rennen gefunden:", races.length);

    res.json(races);

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Fehler Rennen laden" });
  }
});

// ================= SAVE =================
app.post("/api/saveTips", (req, res) => {
  try {
    savedData = req.body;
    console.log("💾 gespeicherte Tipps");
    res.json({ status: "ok" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Speichern fehlgeschlagen" });
  }
});

// ================= LOAD =================
app.get("/api/loadTips", (req, res) => {
  res.json(savedData);
});

// ================= START =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ Server läuft auf Port ${PORT}`);
});
