
import express from "express";
import cors from "cors";
import * as cheerio from "cheerio";

const app = express();

app.use(cors());
app.use(express.json());

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

        if (name && name.length > 2 && !starters.includes(name)) {
          starters.push(name);
        }
      }
    });

    res.json({ starters });

  } catch (e) {
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

    $("table").each((_, tbl) => {
      const txt = $(tbl).text();
      if (txt.includes("1.") && txt.includes("2.")) {
        resultTable = $(tbl);
      }
    });

    if (!resultTable) return res.json({});

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

    // ✅ Quoten
    const text = $.text().replace(/,/g, ".");
    const part = text.split("Quoten")[1] || "";
    const numbers = part.match(/\d+\.\d+/g) || [];

    if (numbers.length > 0) {
      winOdds = parseFloat(numbers[0]);
      placeOdds = numbers.slice(1).map(n => parseFloat(n));
    }

    res.json({
      raceId: req.params.raceId,
      winner,
      placed,
      winOdds,
      placeOdds
    });

  } catch (e) {
    res.json({});
  }
});

// ================= TIPPS =================
app.post("/api/saveTips", (req, res) => {
  savedData = req.body;
  res.json({status:"ok"});
});

app.get("/api/loadTips", (req, res) => {
  res.json(savedData);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT);
