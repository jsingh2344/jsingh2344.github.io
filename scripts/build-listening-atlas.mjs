import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(root, "Data", "Spotify Extended Streaming History");
const outputPath = path.join(root, "assets", "data", "listening-atlas.json");
const scriptOutputPath = path.join(
  root,
  "assets",
  "data",
  "listening-atlas-data.js",
);
const minimumPlayMs = 30_000;
const instrumentalArtistNames = new Set([
  "Andrew Prahlow",
  "Brian Eno",
  "C418",
  "Claude Debussy",
  "Daniel Olsén",
  "Dizaro",
  "Epic Mountain",
  "fingerspit",
  "Hans Zimmer",
  "Hildur Guðnadóttir",
  "Hobie",
  "Howard Shore",
  "John Williams",
  "Jonny Greenwood",
  "LAKEY INSPIRED",
  "Ludwig Göransson",
  "Michael Giacchino",
  "Nature Therapy",
  "Nicholas Britell",
  "Rodrigo y Gabriela",
  "Rone",
  "Stephen Rennicks",
  "Trent Reznor and Atticus Ross",
  "walk.",
]);

const locationChapters = [
  {
    id: "dc",
    start: "2019-01-01",
    end: "2022-05-19",
    place: "Washington, D.C.",
  },
  {
    id: "teton-22",
    start: "2022-05-20",
    end: "2022-08-20",
    place: "Grand Teton",
  },
  {
    id: "pgh-23",
    start: "2022-08-21",
    end: "2023-05-19",
    place: "Pittsburgh",
  },
  {
    id: "teton-23",
    start: "2023-05-20",
    end: "2023-08-20",
    place: "Grand Teton",
  },
  {
    id: "pgh-24",
    start: "2023-08-21",
    end: "2024-05-19",
    place: "Pittsburgh",
  },
  {
    id: "teton-24",
    start: "2024-05-20",
    end: "2024-08-20",
    place: "Grand Teton",
  },
  {
    id: "pgh-25",
    start: "2024-08-21",
    end: "2025-05-09",
    place: "Pittsburgh",
  },
  {
    id: "peru-25",
    start: "2025-05-10",
    end: "2025-05-31",
    place: "Peru",
  },
  {
    id: "teton-25",
    start: "2025-06-01",
    end: "2025-08-15",
    place: "Grand Teton",
  },
  {
    id: "pgh-26",
    start: "2025-08-16",
    end: "2026-05-05",
    place: "Pittsburgh",
  },
  {
    id: "peru-26",
    start: "2026-05-06",
    end: "2026-05-31",
    place: "Peru",
  },
  {
    id: "boston-26",
    start: "2026-06-01",
    end: "2026-12-31",
    place: "Boston",
  },
];

const audioFiles = fs
  .readdirSync(sourceDir)
  .filter((name) => /^Streaming_History_Audio_.*\.json$/.test(name))
  .sort();

if (!audioFiles.length) {
  throw new Error(`No extended audio history found in ${sourceDir}`);
}

const plays = [];
for (const filename of audioFiles) {
  const rows = JSON.parse(fs.readFileSync(path.join(sourceDir, filename), "utf8"));
  for (const row of rows) {
    if (
      !row.spotify_track_uri ||
      !row.master_metadata_track_name ||
      !row.master_metadata_album_artist_name ||
      Number(row.ms_played) < minimumPlayMs
    ) {
      continue;
    }

    plays.push({
      ts: row.ts,
      date: row.ts.slice(0, 10),
      month: row.ts.slice(0, 7),
      year: row.ts.slice(0, 4),
      artist: row.master_metadata_album_artist_name.trim(),
      track: row.master_metadata_track_name.trim(),
      album: row.master_metadata_album_album_name?.trim() || "",
      uri: row.spotify_track_uri,
      ms: Number(row.ms_played),
    });
  }
}

plays.sort((a, b) => a.ts.localeCompare(b.ts));

const monthlyArtistMs = new Map();
const monthlyAlbumMs = new Map();
const monthlyTrackMs = new Map();
for (const play of plays) {
  const artistKey = `${play.month}\u0000${play.artist}`;
  const albumKey = `${play.month}\u0000${play.artist}\u0000${play.album}`;
  const trackKey = `${play.month}\u0000${play.artist}\u0000${play.track}`;
  monthlyArtistMs.set(artistKey, (monthlyArtistMs.get(artistKey) || 0) + play.ms);
  monthlyAlbumMs.set(albumKey, (monthlyAlbumMs.get(albumKey) || 0) + play.ms);
  monthlyTrackMs.set(trackKey, (monthlyTrackMs.get(trackKey) || 0) + play.ms);
}

const sum = (items, selector = (value) => value) =>
  items.reduce((total, item) => total + selector(item), 0);

const round = (value, places = 1) => {
  const power = 10 ** places;
  return Math.round(value * power) / power;
};

const groupBy = (items, selector) => {
  const groups = new Map();
  for (const item of items) {
    const key = selector(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return groups;
};

const spotifyUrl = (uri) => {
  const [, kind, id] = uri.split(":");
  return kind && id ? `https://open.spotify.com/${kind}/${id}` : "";
};

const rankedArtists = (items, limit = 8) =>
  [...groupBy(items, (item) => item.artist)]
    .map(([name, rows]) => ({
      name,
      hours: round(sum(rows, (row) => row.ms) / 3_600_000),
      plays: rows.length,
    }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, limit);

const rankedTracks = (items, limit = 6) =>
  [...groupBy(items, (item) => `${item.artist}\u0000${item.track}`)]
    .map(([, rows]) => ({
      name: rows[0].track,
      artist: rows[0].artist,
      album: rows[0].album,
      hours: round(sum(rows, (row) => row.ms) / 3_600_000),
      plays: rows.length,
      url: spotifyUrl(rows[0].uri),
    }))
    .sort((a, b) => b.hours - a.hours || b.plays - a.plays)
    .slice(0, limit);

const rankedAlbums = (items, limit = 8) =>
  [
    ...groupBy(
      items.filter((item) => item.album),
      (item) => `${item.artist}\u0000${item.album}`,
    ),
  ]
    .map(([, rows]) => ({
      name: rows[0].album,
      artist: rows[0].artist,
      hours: round(sum(rows, (row) => row.ms) / 3_600_000),
      plays: rows.length,
    }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, limit);

const summarize = (items) => ({
  hours: round(sum(items, (item) => item.ms) / 3_600_000),
  plays: items.length,
  artists: rankedArtists(items),
  tracks: rankedTracks(items),
});

const months = [...groupBy(plays, (item) => item.month)].map(([month, rows]) => ({
  month,
  hours: round(sum(rows, (row) => row.ms) / 3_600_000),
  artists: rankedArtists(rows, 14),
  albums: rankedAlbums(rows, 16),
  topTrack: rankedTracks(rows, 1)[0] || null,
}));

const years = [...groupBy(plays, (item) => item.year)].map(([year, rows]) => ({
  year,
  ...summarize(rows),
  uniqueArtists: new Set(rows.map((row) => row.artist)).size,
  uniqueTracks: new Set(rows.map((row) => `${row.artist}\u0000${row.track}`)).size,
  peakMonth: months
    .filter((month) => month.month.startsWith(year))
    .sort((a, b) => b.hours - a.hours)[0]?.month,
}));

const days = [...groupBy(plays, (item) => item.date)].map(([date, rows]) => ({
  date,
  minutes: Math.round(sum(rows, (row) => row.ms) / 60_000),
}));

const chapters = locationChapters
  .map((chapter) => {
    const rows = plays.filter(
      (item) => item.date >= chapter.start && item.date <= chapter.end,
    );
    return rows.length
      ? {
          id: chapter.id,
          start: chapter.start,
          end: chapter.end,
          place: chapter.place,
          ...summarize(rows),
        }
      : null;
  })
  .filter(Boolean);

const globalArtists = rankedArtists(plays, 30);
const globalArtistNames = new Set(globalArtists.map((artist) => artist.name));
const artistSeries = [...globalArtistNames].map((artist) => ({
  artist,
  values: months.map((month) =>
    round((monthlyArtistMs.get(`${month.month}\u0000${artist}`) || 0) / 3_600_000),
  ),
}));

const globalAlbums = rankedAlbums(plays, 30);
const globalAlbumKeys = new Set(
  globalAlbums.map((album) => `${album.artist}\u0000${album.name}`),
);
const albumSeries = [...globalAlbumKeys].map((key) => {
  const [artist, album] = key.split("\u0000");
  return {
    artist,
    album,
    values: months.map((month) =>
      round(
        (monthlyAlbumMs.get(`${month.month}\u0000${artist}\u0000${album}`) || 0) /
          3_600_000,
      ),
    ),
  };
});

const globalVocalTracks = rankedTracks(
  plays.filter((play) => !instrumentalArtistNames.has(play.artist)),
  30,
);
const vocalTrackSeries = globalVocalTracks.map((track) => ({
  artist: track.artist,
  track: track.name,
  url: track.url,
  values: months.map((month) =>
    round(
      (monthlyTrackMs.get(
        `${month.month}\u0000${track.artist}\u0000${track.name}`,
      ) || 0) / 3_600_000,
    ),
  ),
}));

const totalHours = sum(plays, (item) => item.ms) / 3_600_000;
const totalDays = days.length;
const output = {
  generatedAt: new Date().toISOString(),
  methodology: {
    minimumPlaySeconds: minimumPlayMs / 1000,
    locationNote:
      "Location chapters are approximate and based on the chronology documented across this portfolio.",
  },
  overview: {
    start: plays[0]?.date,
    end: plays.at(-1)?.date,
    hours: round(totalHours),
    plays: plays.length,
    days: totalDays,
    uniqueArtists: new Set(plays.map((item) => item.artist)).size,
    uniqueTracks: new Set(plays.map((item) => `${item.artist}\u0000${item.track}`)).size,
    equivalentDays: round(totalHours / 24),
  },
  globalArtists,
  globalAlbums,
  globalTracks: rankedTracks(plays, 20),
  globalVocalTracks,
  months,
  years,
  days,
  chapters,
  artistSeries,
  albumSeries,
  vocalTrackSeries,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
const serializedOutput = JSON.stringify(output);
fs.writeFileSync(outputPath, `${serializedOutput}\n`);
fs.writeFileSync(
  scriptOutputPath,
  `window.LISTENING_ATLAS_DATA=${serializedOutput};\n`,
);

console.log(
  `Built ${path.relative(root, outputPath)} and ${path.relative(root, scriptOutputPath)} from ${plays.length.toLocaleString()} qualified plays (${output.overview.start} → ${output.overview.end}).`,
);
