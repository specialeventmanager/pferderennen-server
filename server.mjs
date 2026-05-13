
import express from "express";
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import cors from "cors";

const app = express();

// ✅ Middleware
app.use(cors());
app.use(express.json());

// ✅ Speicher (statt Datei → stabil auf Render)
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

    $("table tr").each((_, row) => {
      const cells = $(row).find("td");
      if (cells.length > 1) {
        const name = cells.eq(1).text().trim();
        if (name && name !== "-") starters.push(name);
      }
    });

    res.json({ raceId: req.params.raceId, starters });

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
