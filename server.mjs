
import express from "express";
import cors from "cors";
import * as cheerio from "cheerio";

const app = express();

app.use(cors());
app.use(express.json());

let savedData = { tips: {}, banker: {} };

// ================= RENNEN =================
app.get("/api/races", (req, res) => {
  res.json([
    { name: "Rennen 1", id: "1364737" },
    { name: "Rennen 2", id: "1367145" },
    { name: "Rennen 3", id: "1364741" },
    { name: "Rennen 4", id: "1364742" },
    { name: "Rennen 5", id: "1363252" },
    { name: "Rennen 6", id: "1364740" },
    { name: "Rennen 7", id: "1364744" },
    { name: "Rennen 8", id: "1364743" }
  ]);
});


// ================= ✅ STARTER (FIXED!) =================
app.get("/api/starters/:raceId", async (req, res) => {
  try {
    const url = `https://www.deutscher-galopp.de/gr/renntage/rennen.php?id=${req.params.raceId}&d=20260514&s=S`;

    const html = await fetch(url).then(r => r.text());
    const $ = cheerio.load(html);

    const starters = [];

    // ✅ NUR erste Tabelle verwenden
    const table = $("table").first();

    table.find("tr").each((_, row) => {
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

    res.json({ starters });

  } catch (err) {
    console.error("Starter Fehler:", err);
    res.json({ starters: [] });
  }
});


// ================= ERGEBNISSE =================
app.get("/api/results/:raceId", async (req, res) => {
  try {

    const url = `https://www.deutscher-galopp.de/gr/renntage/rennen.php?id=${req.params.raceId}&d=20260514&s=S`;

    const html = await fetch(url).then(r => r.text());
    const $ = cheerio.load(html);

    let winner = "";
    let placed = [];
    let winOdds = 0;
    let placeOdds = [];

    let resultTable = null;

    // ✅ richtige Tabelle (Ergebnis)
    $("table").each((_, tbl) => {
      const firstCell = $(tbl).find("tr td").first().text().trim();
      if (firstCell === "1.") {
        resultTable = $(tbl);
      }
    });

    if (!resultTable) return res.json({});

    // ✅ Platzierungen
    resultTable.find("tr").each((_, row) => {
      const cells = $(row).find("td");

      if (cells.length < 2) return;

      const pos = cells.eq(0).text().trim();
      const horse = cells.eq(1).text().trim();

      if (!horse) return;

      if (pos === "1.") winner = horse;

      if (["1.","2.","3.","4.","5.","6."].includes(pos)) {
        placed.push(horse);
      }
    });

    // ✅ Text vorbereiten
    const text = $.text().replace(/,/g, ".");

    // ✅ Siegquote
    const siegMatch = text.match(/Siegwette\s+([\d.]+)/i);
    if (siegMatch) {
      winOdds = parseFloat(siegMatch[1]);
    }

    // ✅ Platzquoten (FINAL)
    const platzBlock = text.match(/Platzwette\s+([^\n]+)/i);

    if (platzBlock) {
      const values = platzBlock[1].split("/");

      for (let v of values) {

        v = v.trim();

        // ✅ erst Zahl nehmen
        const num = v.match(/[\d.]+/);
        if (num) {
          const val = parseFloat(num[0]);
          if (!isNaN(val)) {
            placeOdds.push(val);
          }
        }

        // ✅ dann STOP
        if (v.includes("-")) break;
      }
    }

    console.log("✅ FINAL:", {
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
    console.error(e);
    res.json({});
  }
});


// ================= TIPPS =================
app.post("/api/saveTips", (req, res) => {
  savedData = req.body;
  res.json({ status: "ok" });
});

app.get("/api/loadTips", (req, res) => {
  res.json(savedData);
});


// ================= SERVER START =================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server läuft auf Port", PORT);
});
