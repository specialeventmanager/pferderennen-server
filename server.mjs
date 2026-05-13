
import express from "express";
import cors from "cors";
import * as cheerio from "cheerio";

const app = express();

app.use(cors());
app.use(express.json());

// ✅ Multiplayer Speicher
let savedData = {
  tips: {},
  banker: {}
};



// ================= ✅ RICHTIGE RENNEN =================
app.get("/api/races", (req, res) => {

  const races = [
    { name: "Rennen 1", id: "1364737" },
    { name: "Rennen 2", id: "1367145" },
    { name: "Rennen 3", id: "1364741" },
    { name: "Rennen 4", id: "1364742" },
    { name: "Rennen 5", id: "1363252" },
    { name: "Rennen 6", id: "1364740" },
    { name: "Rennen 7", id: "1364744" },
    { name: "Rennen 8", id: "1364743" }
  ];

  console.log("✅ Rennen korrekt gesetzt");
  res.json(races);
});



// ================= ✅ STARTER =================
app.get("/api/starters/:raceId", async (req, res) => {
  try {
    const url = `https://www.deutscher-galopp.de/gr/renntage/rennen.php?id=${req.params.raceId}&d=20260514&s=S`;

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
          !name.match(/^\d+$/) &&
          !name.toLowerCase().includes("nr") &&
          !starters.includes(name)
        ) {
          starters.push(name);
        }
      }
    });

    console.log(`✅ Starter ${req.params.raceId}:`, starters.length);

    res.json({
      raceId: req.params.raceId,
      starters
    });

  } catch (err) {
    console.error("❌ Starter Fehler:", err);
    res.status(500).json({ error: "Starter Fehler" });
  }
});



// ================= ✅ ERGEBNISSE =================
app.get("/api/results/:raceId", async (req, res) => {
  try {
    const url = `https://www.deutscher-galopp.de/gr/renntage/rennen.php?id=${req.params.raceId}&d=20260514&s=S`;

    const html = await fetch(url).then(r => r.text());
    const $ = cheerio.load(html);

    let winner = "";
    let placed = [];

    $("tr").each((_, row) => {
      const cells = $(row).find("td");
      const pos = cells.eq(0).text().trim();

      if (pos === "1.") {
        winner = cells.find("a[href*='/pferde/']").text().trim();
      }

      if (pos === "2." || pos === "3.") {
        const name = cells.find("a[href*='/pferde/']").text().trim();
        if (name) placed.push(name);
      }
    });

    res.json({
      raceId: req.params.raceId,
      winner,
      placed
    });

  } catch (e) {
    console.error("❌ Ergebnis Fehler:", e);
    res.status(500).json({ error: "Result Fehler" });
  }
});



// ================= ✅ SPEICHERN =================
app.post("/api/saveTips", (req, res) => {
  savedData = req.body;
  console.log("💾 Tipps gespeichert");
  res.json({ status: "ok" });
});



// ================= ✅ LADEN =================
app.get("/api/loadTips", (req, res) => {
  res.json(savedData);
});



// ================= ✅ SERVER START =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("✅ Server läuft auf Port", PORT);
});
