
import express from "express";
import cors from "cors";
import * as cheerio from "cheerio";

const app = express();

app.use(cors());
app.use(express.json());

// ✅ RAM Speicher (für Tipps)
let savedData = {
  tips: {},
  banker: {}
};

// ================= STARTERS =================
app.get("/api/starters/:raceId", async (req, res) => {
  try {
    const url = `https://www.deutscher-galopp.de/gr/renntage/rennen.php?id=${req.params.raceId}&d=20260514&s=S`;

    const html = await fetch(url).then(r => r.text());
    const $ = cheerio.load(html);

    const starters = [];

    // ✅ robust: alle Pferdelinks sammeln
    $("a[href*='/pferde/']").each((_, el) => {
      const name = $(el).text().trim();
      if (name && !starters.includes(name)) {
        starters.push(name);
      }
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

// ================= RACES (FIXED) =================
app.get("/api/races", async (req, res) => {
  try {
    const url = "https://www.deutscher-galopp.de/gr/renntage/37578537/?d=20260514";

    const html = await fetch(url).then(r => r.text());
    const $ = cheerio.load(html);

    const races = [];

    // ✅ nur echte Renn-Links
    $("a[href*='rennen.php?id=']").each((_, el) => {
      const href = $(el).attr("href") || "";
      const text = $(el).text().trim();

      const match = href.match(/id=(\d+)/);

      if (match && text.startsWith("Rennen")) {
        races.push({
          id: match[1],
          name: text
        });
      }
    });

    // ✅ richtige Reihenfolge (Rennen 1–8)
    races.sort((a, b) => {
      const aNr = parseInt(a.name.replace(/\D/g, ""));
      const bNr = parseInt(b.name.replace(/\D/g, ""));
      return aNr - bNr;
    });

    console.log("✅ Rennen:", races.length);

    res.json(races.slice(0, 8));

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Fehler Rennen laden" });
  }
});

// ================= SAVE =================
app.post("/api/saveTips", (req, res) => {
  try {
    savedData = req.body;
    console.log("💾 Tipps gespeichert");
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
``
