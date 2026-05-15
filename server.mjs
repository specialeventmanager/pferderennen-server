
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
          !name.toLowerCase().includes("nr") &&
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
    res.status(500).json({ error: "Starter Fehler" });
  }
});



// ================= ✅ ERGEBNISSE (FINAL FIX) =================
app.get("/api/results/:raceId", async (req, res) => {
  try {
    const url = `https://www.deutscher-galopp.de/gr/renntage/rennen.php?id=${req.params.raceId}&d=20260514&s=S`;

    const html = await fetch(url).then(r => r.text());
    const $ = cheerio.load(html);

    let winner = "";
    let placed = [];
    let winOdds = 0;
    let placeOdds = 0;

    // ✅ ROBUST: Header unabhängig von Groß-/Kleinschreibung finden
    let header = $("h3").filter((i, el) => {
      return $(el).text().toLowerCase().includes("ergebnis");
    });

    // ✅ Tabelle danach holen
    let table = header.next().is("table")
      ? header.next()
      : header.nextAll("table").first();

    // ✅ Fallback falls keine Tabelle existiert (Rennen noch läuft)
    if (!table || table.length === 0) {
      console.log("⚠️ Kein Ergebnis vorhanden (Rennen läuft evtl.)");
      return res.json({});
    }

    // ✅ NUR diese Tabelle parsen
    table.find("tr").each((_, row) => {

      const cells = $(row).find("td");
      if (cells.length < 3) return;

      const pos = cells.eq(0).text().trim();
      const horse = cells.eq(1).text().trim();

      if (!horse) return;

      // ✅ Sieger
      if (pos === "1.") {
        winner = horse;

        // 👉 ganze Zeile analysieren (flexibel!)
        const text = $(row).text().replace(",", ".");
        const nums = text.match(/\d+\.\d+/g) || [];

        if (nums.length >= 2) {
          winOdds = parseFloat(nums[nums.length - 2]) || 0;
          placeOdds = parseFloat(nums[nums.length - 1]) || 0;
        }
      }

      // ✅ Platzierte
      if (pos === "2." || pos === "3.") {
        placed.push(horse);
      }

    });

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
    res.status(500).json({ error: "Result Fehler" });
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
