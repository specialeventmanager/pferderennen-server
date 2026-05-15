
import express from "express";
import cors from "cors";
import * as cheerio from "cheerio";

const app = express();

// ================= BASIS =================
app.use(cors());
app.use(express.json());

// ✅ Multiplayer Speicher
let savedData = {
  tips: {},
  banker: {}
};



// ================= ✅ RENNEN =================
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
          !starters.includes(name)
        ) {
          starters.push(name);
        }
      }
    });

    res.json({
      raceId: req.params.raceId,
      starters
    });

  } catch (err) {
    console.error("❌ Starter Fehler:", err);
    res.json({ starters: [] }); // ✅ nie crashen
  }
});



// ================= ✅ ERGEBNISSE (FINAL & ROBUST) =================
app.get("/api/results/:raceId", async (req, res) => {
  try {
    const url = `https://www.deutscher-galopp.de/gr/renntage/rennen.php?id=${req.params.raceId}&d=20260514&s=S`;

    const html = await fetch(url).then(r => r.text());
    const $ = cheerio.load(html);

    let winner = "";
    let placed = [];
    let winOdds = 0;
    let placeOdds = 0;

    let resultTable = null;

    // ✅ 1. richtige Tabelle finden (enthält "1.")
    $("table").each((_, tbl) => {
      const tableText = $(tbl).text();

      if (
        tableText.includes("1.") &&
        tableText.includes("2.") &&
        tableText.includes("3.")
      ) {
        resultTable = $(tbl);
      }
    });

    // ✅ Falls keine Tabelle → Rennen noch nicht entschieden
    if (!resultTable) {
      console.log("⚠️ Keine Ergebnistabelle gefunden");
      return res.json({});
    }

    // ✅ 2. Platzierungen auslesen
    resultTable.find("tr").each((_, row) => {
      const cells = $(row).find("td");

      if (cells.length < 2) return;

      const pos = cells.eq(0).text().trim();
      const horse = cells.eq(1).text().trim();

      if (!horse) return;

      if (pos === "1.") winner = horse;
      if (pos === "2." || pos === "3.") placed.push(horse);
    });

    // ✅ 3. Quoten aus Textblock (robust!)
    const fullText = $.text().replace(/,/g, ".");

    if (fullText.toLowerCase().includes("quoten")) {

      const part = fullText.split("Quoten")[1] || "";
      const numbers = part.match(/\d+\.\d+/g) || [];

      if (numbers.length >= 2) {
        winOdds = parseFloat(numbers[0]) || 0;
        placeOdds = parseFloat(numbers[1]) || 0;
      }
    }

    console.log("✅ Ergebnis erkannt:", {
      winner,
      placed,
      winOdds,
      placeOdds
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
    res.json({}); // ✅ nie leer ohne response
  }
});



// ================= ✅ SPEICHERN =================
app.post("/api/saveTips", (req, res) => {
  savedData = req.body;
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
