
import express from "express";
import cors from "cors";
import * as cheerio from "cheerio";

const app = express();

app.use(cors());
app.use(express.json());

// ================= SPEICHER =================
let savedData = {
  tips: {},
  banker: {}
};



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



// ================= STARTER =================
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
    res.json({
      raceId: req.params.raceId,
      starters: []
    });
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

    // ✅ richtige Tabelle: erste Zelle = "1."
    $("table").each((_, tbl) => {
      const firstCell = $(tbl).find("tr td").first().text().trim();

      if (firstCell === "1.") {
        resultTable = $(tbl);
      }
    });

    if (!resultTable) {
      console.log("❌ Keine Ergebnistabelle gefunden");
      return res.json({});
    }

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

    // ✅ Quotenblock sauber isolieren
    const fullText = $.text().replace(/,/g, ".");
    const quoteSection = fullText.split("Quoten zu")[1] || "";

    // ✅ Siegquote
    const siegMatch = quoteSection.match(/Siegwette[^:]*:\s*([\d.]+)/i);
    if (siegMatch) {
      winOdds = parseFloat(siegMatch[1]) || 0;
    }

    // ✅ Platzquoten korrekt (Stop bei "-")
    const platzMatch = quoteSection.match(/Platzwette[^:]*:\s*([0-9./\-]+)/i);

    if (platzMatch) {
      const parts = platzMatch[1].split("/");

      for (let p of parts) {
        p = p.trim();

        if (p === "-" || p === "") break;

        const val = parseFloat(p);

        if (!isNaN(val)) {
          placeOdds.push(val);
        }
      }
    }

    console.log("✅ FINAL Ergebnis:", {
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



// ================= START =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("✅ Server läuft auf Port", PORT);
});
