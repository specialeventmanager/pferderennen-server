
import express from "express";
import cors from "cors";
import * as cheerio from "cheerio";

const app = express();

// ================= BASIS =================
app.use(cors());
app.use(express.json());

// ✅ RAM Speicher
let savedData = {
  tips: {},
  banker: {}
};


// ================= RACES (DYNAMISCH + RICHTIG) =================
app.get("/api/races", async (req, res) => {
  try {
    const url = "https://www.deutscher-galopp.de/gr/renntage/37578537/?d=20260514";

    const html = await fetch(url).then(r => r.text());
    const $ = cheerio.load(html);

    const races = [];

    // ✅ NUR die Navigation oben auswählen (SEHR WICHTIG!)
    $(".rennlist a").each((_, el) => {
      const href = $(el).attr("href") || "";
      const text = $(el).text().trim();

      const match = href.match(/id=(\d+)/);

      if (match && text.match(/Rennen\\s*\\d+/)) {
        races.push({
          id: match[1],
          name: text
        });
      }
    });

    console.log("✅ Rennen:", races);

    res.json(races);

  } catch (e) {
    console.error("❌ races error:", e);
    res.status(500).json({ error: "Fehler Rennen laden" });
  }
});


// ================= STARTERS (ROBUST) =================
app.get("/api/starters/:raceId", async (req, res) => {
  try {
    const url =
      `https://www.deutscher-galopp.de/gr/renntage/rennen.php?id=${req.params.raceId}&d=20260514&s=S`;

    const html = await fetch(url).then(r => r.text());
    const $ = cheerio.load(html);

    const starters = [];

    $("table tr").each((_, row) => {
      const cells = $(row).find("td");

      if (cells.length > 2) {
        const name = cells.eq(1).text().trim();

        if (
          name &&
          name !== "-" &&
          name.length > 2 &&
          !name.toLowerCase().includes("nr") &&
          !name.toLowerCase().includes("gewicht") &&
          !name.toLowerCase().includes("trainer") &&
          !name.toLowerCase().includes("besitzer") &&
          !name.match(/^\\d+$/) &&
          !starters.includes(name)
        ) {
          starters.push(name);
        }
      }
    });

    console.log(`✅ Starter ${req.params.raceId}:`, starters);

    res.json({
      raceId: req.params.raceId,
      starters
    });

  } catch (err) {
    console.error("❌ Starter Fehler:", err);
    res.status(500).json({ error: "Fehler beim Laden der Starter" });
  }
});


// ================= RESULTS =================
app.get("/api/results/:raceId", async (req, res) => {
  try {
    const url =
      `https://www.deutscher-galopp.de/gr/renntage/rennen.php?id=${req.params.raceId}&d=20260514&s=S`;

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
        winOdds =
          parseFloat(cells.eq(10).text().replace(",", ".")) || 0;
      }

      if (pos === "2." || pos === "3.") {
        const name = cells.find("a[href*='/pferde/']").text().trim();
        if (name) placed.push(name);
      }

      if (["1.", "2.", "3."].includes(pos)) {
        const pq =
          parseFloat(cells.eq(11).text().replace(",", ".")) || 0;
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
    console.error("❌ Ergebnis Fehler:", e);
    res.status(500).json({ error: "Fehler Ergebnisse laden" });
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


// ================= SERVER START =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ Server läuft auf Port ${PORT}`);
});
