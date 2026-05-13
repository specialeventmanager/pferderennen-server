
import express from "express";
import cors from "cors";
import * as cheerio from "cheerio";

const app = express();

app.use(cors());
app.use(express.json());

// ✅ Multiplayer Speicher (RAM)
let savedData = {
  tips: {},
  banker: {}
};




// ✅ RICHTIGE RENNEN MIT KORREKTER ID-ZUORDNUNG
app.get("/api/races", (req, res) => {

  const races = [
    { name: "Rennen 1", id: "1364737" },
    { name: "Rennen 2", id: "1364738" },
    { name: "Rennen 3", id: "1364739" },
    { name: "Rennen 4", id: "1364740" },
    { name: "Rennen 5", id: "1364741" },
    { name: "Rennen 6", id: "1364742" },
    { name: "Rennen 7", id: "1364743" },
    { name: "Rennen 8", id: "1364744" }
  ];

  console.log("✅ Rennen geliefert:", races);
  res.json(races);
});




// ✅ STARTER – KORREKT PRO RENNEN
app.get("/api/starters/:raceId", async (req, res) => {
  try {
    const url =
      `https://www.deutscher-galopp.de/gr/renntage/rennen.php?id=${req.params.raceId}&d=20260514&s=S`;

    const html = await fetch(url).then(r => r.text());
    const $ = cheerio.load(html);

    const starters = [];

    $("table tr").each((_, row) => {
      const cells = $(row).find("td");

      // ✅ nur echte Starter-Zeilen
      if (cells.length > 2) {
        const name = cells.eq(1).text().trim();

        if (
          name &&
          name !== "-" &&
          !name.toLowerCase().includes("nr") &&
          !name.toLowerCase().includes("nummer") &&
          !starters.includes(name)
        ) {
          starters.push(name);
        }
      }
    });

    console.log(`✅ Starter für ${req.params.raceId}:`, starters.length);

    res.json({
      raceId: req.params.raceId,
      starters
    });

  } catch (err) {
    console.error("❌ Starter Fehler:", err);
    res.status(500).json({ error: "Fehler beim Laden der Starter" });
  }
});




// ✅ ERGEBNISSE
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




// ✅ TIPPS SPEICHERN
app.post("/api/saveTips", (req, res) => {
  try {
    savedData = req.body;
    console.log("💾 Tipps gespeichert:", savedData);
    res.json({ status: "ok" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Speichern fehlgeschlagen" });
  }
});




// ✅ TIPPS LADEN
app.get("/api/loadTips", (req, res) => {
  res.json(savedData);
});




// ✅ SERVER START
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ Server läuft auf Port ${PORT}`);
});
