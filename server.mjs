
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



// ================= RACES (FINAL – stabil & korrekt) =================
app.get("/api/races", async (req, res) => {
  try {
    // 👉 bekannte ID-Range des Renntags
    const possibleIds = [
      "1364737","1364738","1364739","1364740",
      "1364741","1364742","1364743","1364744",
      "1364745","1364746","1364747"
    ];

    const races = [];

    for (let id of possibleIds) {

      const url = `https://www.deutscher-galopp.de/gr/renntage/rennen.php?id=${id}&d=20260514&s=S`;

      const html = await fetch(url).then(r => r.text());
      const $ = cheerio.load(html);

      // ✅ Prüfung: hat das Rennen echte Starter?
      const name = $("h1").text().trim();
      const hasStarter = $("table tr td").length > 8;

      if (hasStarter && name.toLowerCase().includes("rennen")) {

        // ✅ Rennnummer extrahieren
        const match = name.match(/Rennen\s*(\d+)/);

        if (match) {
          races.push({
            id: id,
            name: `Rennen ${match[1]}`,
            order: parseInt(match[1])
          });
        }
      }
    }

    // ✅ richtige Reihenfolge sicherstellen
    races.sort((a, b) => a.order - b.order);

    const final = races.map(r => ({
      id: r.id,
      name: r.name
    }));

    console.log("✅ Rennen final:", final);

    res.json(final);

  } catch (e) {
    console.error("❌ races error:", e);
    res.status(500).json({ error: "Fehler Rennen laden" });
  }
});




// ================= STARTERS =================
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
          !name.toLowerCase().includes("gewicht") &&
          !name.toLowerCase().includes("trainer") &&
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
    res.status(500).json({ error: "Fehler Starter" });
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
    console.error("❌ Ergebnis Fehler:", e);
    res.status(500).json({ error: "Fehler Ergebnisse" });
  }
});




// ================= SAVE =================
app.post("/api/saveTips", (req, res) => {
  savedData = req.body;
  console.log("💾 Tipps gespeichert");
  res.json({ status: "ok" });
});




// ================= LOAD =================
app.get("/api/loadTips", (req, res) => {
  res.json(savedData);
});




// ================= START =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("✅ Server läuft auf Port", PORT);
});
