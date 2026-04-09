import express from "express";
import bodyParser from "body-parser";
import session from "express-session";
import passport from "passport";
import dotenv from "dotenv";
import multer from "multer";
import path from "path";
import { createServer } from "http";
import { Server } from "socket.io";
import bcrypt from "bcrypt";

// Import our new modular files
import pool from "./config/db.js";
import configurePassport from "./config/password.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const saltRounds = 10;

app.set("view engine", "ejs");

// Set views directory to correctly find partials and pages
app.set('views', path.join(process.cwd(), 'views'));

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET || "super_secret_court_key",
    resave: false,
    saveUninitialized: false,
  })
);

// Initialize Passport from our config file
configurePassport();
app.use(passport.initialize());
app.use(passport.session());

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (req.originalUrl.includes("tournaments")) {
      cb(null, "public/assets/tournaments/");
    } else if (req.originalUrl.includes("add-player")) {
      cb(null, "public/assets/players/");
    } else {
      cb(null, "public/assets/");
    }
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname); // Added timestamp to prevent overwriting
  }
});
const upload = multer({ storage });


/* =========================
   GLOBAL MIDDLEWARE
========================= */
app.use(async (req, res, next) => {
  res.locals.user = req.user;
  try {
    const [matches] = await pool.query(`
      SELECT * FROM tournament_matches
      ORDER BY 
        CASE 
          WHEN status = 'LIVE' THEN 1
          WHEN match_date = CURRENT_DATE THEN 2
          WHEN match_date > CURRENT_DATE THEN 3
          ELSE 4
        END,
        match_date ASC
      LIMIT 4
    `);
    res.locals.matches = matches; // Removed .rows
  } catch (err) {
    console.log("MATCH LOAD ERROR:", err);
    res.locals.matches = [];
  }
  next();
});

/* =========================
   ROUTES
========================= */
app.get("/", async (req, res) => {
  res.render("pages/index"); // Adjusted to match your specific layout
});

app.get("/login", (req, res) => {
  res.render("pages/login");
});

app.get("/register", (req, res) => {
  res.render("pages/register");
});



/* =========================
   ORGANIZER COMMAND CENTER
========================= */
app.get("/manage-tournaments", async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");

  try {
    let myTournaments = [];

    if (req.user.is_admin) {
      // 👑 GLOBAL ADMIN: Fetch EVERY tournament in the database
      const [allTourneys] = await pool.query("SELECT * FROM tournaments ORDER BY start_date DESC");
      myTournaments = allTourneys;
    } else {
      // 👤 REGULAR USER: Fetch ONLY tournaments they created
      const [userTourneys] = await pool.query(
        "SELECT * FROM tournaments WHERE created_by = ? ORDER BY start_date DESC",
        [req.user.id]
      );
      myTournaments = userTourneys;
    }

    res.render("pages/manage-tournaments", { // Use whatever your organizer EJS file is named
      user: req.user,
      myTournaments
    });

  } catch (err) {
    console.error("ORGANIZER DASHBOARD ERROR:", err);
    res.redirect("/");
  }
});

/* =========================
   ADMIN TOURNAMENT HUB (CREATOR ONLY)
========================= */
app.get("/manage-tournaments/:id", async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");
  const { id } = req.params;

  try {
    const [tourn] = await pool.query("SELECT * FROM tournaments WHERE id=?", [id]);
    if (tourn.length === 0) return res.redirect("/admin");

    // SECURITY LOCK: Only creator or global admin can view this page
    if (tourn[0].created_by !== req.user.id && !req.user.is_admin) {
      return res.status(403).send("Unauthorized action.");
    }

    const [teams] = await pool.query("SELECT * FROM tournament_teams WHERE tournament_id=?", [id]);
    const [matches] = await pool.query("SELECT * FROM tournament_matches WHERE tournament_id=? ORDER BY id ASC", [id]);
    const [users] = await pool.query("SELECT id, team FROM users WHERE team IS NOT NULL AND team != 'ADMIN'");
    const [leaderboard] = await pool.query("SELECT * FROM tournament_teams WHERE tournament_id=? ORDER BY points DESC, wins DESC", [id]);

    res.render("pages/manage-tournament-detail", {
      user: req.user, tournament: tourn[0], teams, matches, users, leaderboard, isRegistered: false
    });
  } catch (err) {
    console.error("ADMIN TOURNAMENT HUB ERROR:", err);
    res.redirect("/admin");
  }
});

/* =========================
   EDIT TOURNAMENT SETTINGS (CREATOR ONLY)
========================= */
app.post("/tournaments/:id/edit", async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");
  const { id } = req.params;
  const { name, location, start_date, end_date, max_teams, image } = req.body;

  try {
    const [tourn] = await pool.query("SELECT created_by FROM tournaments WHERE id=?", [id]);
    if (tourn[0].created_by !== req.user.id && !req.user.is_admin) {
      return res.status(403).send("Unauthorized action.");
    }

    await pool.query(
      "UPDATE tournaments SET name=?, location=?, start_date=?, end_date=?, max_teams=?, image=? WHERE id=?",
      [name, location, start_date, end_date, max_teams, image, id]
    );

    res.redirect(`/manage-tournaments/${id}`);
  } catch (err) {
    console.error("EDIT TOURNAMENT ERROR:", err);
    res.redirect(`/manage-tournaments/${id}`);
  }
});

/* =========================
   EDIT MATCH DATE (CREATOR ONLY)
========================= */
app.post("/matches/:id/edit-date", async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");
  const { id } = req.params;
  const { match_date } = req.body;

  try {
    const [matchCheck] = await pool.query(`
      SELECT m.tournament_id, t.created_by 
      FROM tournament_matches m
      JOIN tournaments t ON m.tournament_id = t.id
      WHERE m.id = ?
    `, [id]);

    if (matchCheck.length === 0) return res.redirect("/admin");
    if (matchCheck[0].created_by !== req.user.id && !req.user.is_admin) return res.status(403).send("Unauthorized");

    await pool.query("UPDATE tournament_matches SET match_date=? WHERE id=?", [match_date || null, id]);
    res.redirect(`/manage-tournaments/${matchCheck[0].tournament_id}`);
  } catch (err) {
    console.error("EDIT MATCH DATE ERROR:", err);
    res.redirect("/admin");
  }
});

/* =========================
   LIVE SCORER PANEL (CREATOR ONLY)
========================= */
app.get("/score-match/:matchId", async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");
  const { matchId } = req.params;

  try {
    // 1. Find the tournament this match belongs to
    const [targetMatch] = await pool.query(`
      SELECT m.tournament_id, t.created_by 
      FROM tournament_matches m
      JOIN tournaments t ON m.tournament_id = t.id
      WHERE m.id = ?
    `, [matchId]);

    if (targetMatch.length === 0) return res.redirect("/admin");
    if (targetMatch[0].created_by !== req.user.id && !req.user.is_admin) return res.status(403).send("Unauthorized");

    const tournamentId = targetMatch[0].tournament_id;

    // 2. Fetch all matches for this tournament to populate the dropdowns
    const [matches] = await pool.query("SELECT * FROM tournament_matches WHERE tournament_id=? ORDER BY id ASC", [tournamentId]);

    // 3. Render the live score page, passing the specific Match ID that was clicked
    res.render("pages/live-score", {
      matches,
      selectedMatchId: matchId
    });
  } catch (err) {
    console.error("LIVE SCORE ERROR:", err);
    res.redirect("/admin");
  }
});

/* =========================
   SET MATCH TO LIVE (CREATOR ONLY)
========================= */
app.post("/matches/:id/set-live", async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");
  const { id } = req.params;

  try {
    const [matchCheck] = await pool.query(`
      SELECT m.tournament_id, t.created_by 
      FROM tournament_matches m
      JOIN tournaments t ON m.tournament_id = t.id
      WHERE m.id = ?
    `, [id]);

    if (matchCheck.length === 0) return res.redirect("/admin");
    if (matchCheck[0].created_by !== req.user.id && !req.user.is_admin) {
      return res.status(403).send("Unauthorized");
    }

    // Flip the status to LIVE
    await pool.query("UPDATE tournament_matches SET status='LIVE' WHERE id=?", [id]);
    
    res.redirect(`/manage-tournaments/${matchCheck[0].tournament_id}`);
  } catch (err) {
    console.error("SET LIVE ERROR:", err);
    res.redirect("/admin");
  }
});







/* =========================
   AUTH POST ROUTES
========================= */
app.post("/register", async (req, res) => {
  const { name, email, team, password, admin_code } = req.body;

  try {
    // 1. Prevent Duplicate Emails
    const [checkEmail] = await pool.query("SELECT * FROM users WHERE email=?", [email]);
    if (checkEmail.length > 0) return res.send("Email already in use. Please log in.");

    // 2. Prevent Team Hijacking
    const [checkTeam] = await pool.query("SELECT * FROM users WHERE LOWER(team)=LOWER(?)", [team]);
    if (checkTeam.length > 0) return res.send("That Team name is already claimed! Please choose another.");

    // 3. The Secret Admin Upgrade
    const isAdmin = (admin_code === process.env.ADMIN_SECRET) ? true : false;

    // 4. Secure & Insert
    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      "INSERT INTO users(name, email, team, password, is_admin) VALUES(?, ?, ?, ?, ?)",
      [name, email, team, hash, isAdmin]
    );

    const [newUser] = await pool.query("SELECT * FROM users WHERE id=?", [result.insertId]);

    // 5. Login & Redirect based on role
    req.login(newUser[0], (err) => {
      if (err) console.log(err);
      return res.redirect("/team-dashboard");
    });

  } catch (err) {
    console.log("REGISTRATION ERROR:", err);
    res.status(500).send("Server Error during registration.");
  }
});

app.post("/login", passport.authenticate("local", {
  failureRedirect: "/login"
}), (req, res) => {
  // ROLE-BASED REDIRECT
  if (req.user.is_admin) {
    return res.redirect("/team-dashboard");
  } else {
    return res.redirect("/team-dashboard");
  }
});

app.get("/logout", (req, res) => {
  req.logout(() => res.redirect("/"));
});

/* =========================
   TEAM DASHBOARD
========================= */
app.get("/team-dashboard", async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");

  try {
    const [players] = await pool.query("SELECT * FROM players WHERE LOWER(team)=LOWER(?)", [req.user.team]);
    const [tournaments] = await pool.query("SELECT * FROM tournaments ORDER BY start_date ASC");
    const [registered] = await pool.query("SELECT tournament_id FROM tournament_teams WHERE LOWER(team_name)=LOWER(?)", [req.user.team]);

    res.render("pages/team-dashboard", { // Use whatever your team EJS file is named
      user: req.user,
      players,
      tournaments,
      registered
    });

  } catch (err) {
    console.error("TEAM DASHBOARD ERROR:", err);
    res.redirect("/");
  }
});

app.post("/assign-position", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
  const { playerId, position } = req.body;

  try {
    await pool.query("UPDATE players SET position=? WHERE id=? AND LOWER(team)=LOWER(?)", [position, playerId, req.user.team]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

app.get("/add-player", (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");
  res.render("pages/add-player");
});

app.post("/add-player", upload.single("image"), async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");
  if (!req.file) return res.send("Image upload failed");

  const { name, role, position } = req.body;
  const team = req.user.team;
  const image = "/assets/players/" + req.file.filename;

  try {
    await pool.query(
      "INSERT INTO players (name,role,team,image,position) VALUES (?,?,?,?,?)",
      [name, role, team, image, position]
    );
    res.redirect("/team-dashboard");
  } catch (err) {
    console.log(err);
  }
});

app.post("/remove-player/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM players WHERE id=? AND team=?", [req.params.id, req.user.team]);
    res.redirect("/team-dashboard");
  } catch (err) {
    console.log(err);
  }
});

/* =========================
   LIVE ROUTES
========================= */
app.get("/live", async (req, res) => {
  try {
    let [result] = await pool.query("SELECT id FROM tournament_matches WHERE status='LIVE' LIMIT 1");
    if (result.length > 0) return res.redirect(`/live/${result[0].id}`);

    [result] = await pool.query("SELECT id FROM tournament_matches WHERE match_date = CURRENT_DATE LIMIT 1");
    if (result.length > 0) return res.redirect(`/live/${result[0].id}`);

    [result] = await pool.query("SELECT id FROM tournament_matches ORDER BY id ASC LIMIT 1");
    if (result.length > 0) return res.redirect(`/live/${result[0].id}`);

    res.send("No matches available");
  } catch (err) {
    console.log(err);
    res.send("Error loading live page");
  }
});

app.get("/live/:matchId", async (req, res) => {
  const matchId = req.params.matchId;
  try {
    const [matchResult] = await pool.query("SELECT * FROM tournament_matches WHERE id=?", [matchId]);
    if (matchResult.length === 0) return res.send("Match not found");
    const match = matchResult[0];

    const [teamAPlayers] = await pool.query("SELECT * FROM players WHERE LOWER(team)=LOWER(?)", [match.teama]);
    const [teamBPlayers] = await pool.query("SELECT * FROM players WHERE LOWER(team)=LOWER(?)", [match.teamb]);

    res.render("pages/live", {
      matchId,
      match,
      teamAPlayers,
      teamBPlayers
    });
  } catch (err) {
    console.log("LIVE PAGE ERROR:", err);
    res.send("Error loading live page");
  }
});

app.get("/api/match/:id/players", async (req, res) => {
  const matchId = req.params.id;
  try {
    const [matchResult] = await pool.query("SELECT * FROM tournament_matches WHERE id=?", [matchId]);
    if (matchResult.length === 0) return res.json([]);
    const match = matchResult[0];

    const [players] = await pool.query(
      "SELECT id, name, position, team FROM players WHERE LOWER(team) = LOWER(?) OR LOWER(team) = LOWER(?) ORDER BY team, id ASC",
      [match.teama, match.teamb]
    );
    res.json(players);
  } catch (err) {
    res.json([]);
  }
});

/* =========================
   TOURNAMENTS
========================= */
app.get("/tournaments/create", (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");
  res.render("pages/create-tournament", { user: req.user });
});

app.get("/tournaments", async (req, res) => {
  try {
    const [tournaments] = await pool.query("SELECT * FROM tournaments ORDER BY start_date ASC");
    res.render("pages/tournaments", { tournaments, user: req.user });
  } catch (err) {
    console.log(err);
  }
});

app.get("/tournaments/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [tournament] = await pool.query("SELECT * FROM tournaments WHERE id=?", [id]);
    const [teams] = await pool.query("SELECT * FROM tournament_teams WHERE tournament_id=? ORDER BY registered_at ASC", [id]);
    const [leaderboard] = await pool.query("SELECT * FROM tournament_teams WHERE tournament_id=? ORDER BY points DESC, wins DESC", [id]);

    let matches = [];
    if (teams.length > 0) {
      [matches] = await pool.query("SELECT * FROM tournament_matches WHERE tournament_id=? ORDER BY match_date ASC", [id]);
    }

    const [users] = await pool.query("SELECT id, team FROM users ORDER BY team ASC");

    let isRegistered = false;
    if (req.isAuthenticated()) {
      const [check] = await pool.query("SELECT * FROM tournament_teams WHERE tournament_id=? AND LOWER(team_name)=LOWER(?)", [id, req.user.team]);
      isRegistered = check.length > 0;
    }

    res.render("pages/tournament-detail", {
      tournament: tournament[0],
      teams,
      matches,
      isRegistered,
      user: req.user,
      users,
      leaderboard
    });
  } catch (err) {
    console.log(err);
  }
});


// Register team for tournament (General User)
app.post("/tournaments/:id/register", async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");
  const { id } = req.params;

  try {
    // Check if the team is already registered
    const [check] = await pool.query(
      "SELECT * FROM tournament_teams WHERE tournament_id=? AND LOWER(team_name)=LOWER(?)",
      [id, req.user.team]
    );

    if (check.length === 0) {
      await pool.query(
        "INSERT INTO tournament_teams (tournament_id, team_name) VALUES (?, ?)",
        [id, req.user.team]
      );
    }
    res.redirect(`/tournaments/${id}`);
  } catch (err) {
    console.log(err);
    res.redirect(`/tournaments/${id}`);
  }
});


app.get("/news", (req, res) => {
  const news = [{
    _id: "1", title: "Final Match Announced", date: "March 18, 2026", author: "Admin",
    description: "The final match will be held this Sunday...", image: "/assets/news/match.jpg"
  }];
  res.render("pages/news", { news });
});


/* =========================
   GENERATE FIXTURES (THE MASTER ENGINE)
========================= */
app.post("/admin/generate-fixtures/:tournamentId", async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");

  const { tournamentId } = req.params;
  const { type } = req.body;

  try {
    // 1. SECURITY LOCK: Verify Ownership
    const [tournamentCheck] = await pool.query("SELECT created_by FROM tournaments WHERE id=?", [tournamentId]);
    if (tournamentCheck.length === 0) return res.redirect("/tournaments");

    if (tournamentCheck[0].created_by !== req.user.id && !req.user.is_admin) {
      return res.status(403).send("Unauthorized: You do not own this tournament.");
    }

    // 2. Fetch the current roster of teams
    const [teamList] = await pool.query("SELECT * FROM tournament_teams WHERE tournament_id=?", [tournamentId]);

    // 3. WIPE THE SLATE CLEAN: Delete old fixtures to prevent duplicates
    await pool.query("DELETE FROM tournament_matches WHERE tournament_id=?", [tournamentId]);


    // 🟠 4. GENERATE: ROUND ROBIN
    if (type === "round") {
      for (let i = 0; i < teamList.length; i++) {
        for (let j = i + 1; j < teamList.length; j++) {
          await pool.query(
            `INSERT INTO tournament_matches (tournament_id, teama, teamb, status, round) VALUES (?, ?, ?, 'UPCOMING', 'GROUP STAGE')`,
            [tournamentId, teamList[i].team_name, teamList[j].team_name]
          );
        }
      }
    }

    // 🔴 5. GENERATE: KNOCKOUT (Power-of-2)
    else if (type === "knockout") {
      if (teamList.length < 2) return res.redirect(`/tournaments/${tournamentId}`);

      const shuffled = teamList.sort(() => 0.5 - Math.random());
      const totalTeams = shuffled.length;

      let P = 1;
      while (P < totalTeams) P *= 2;
      const byesCount = P - totalTeams;

      const byePositions = [];
      let topStart = 0; let topEnd = (P / 2) - 1;
      let bottomStart = P / 2; let bottomEnd = P - 1;

      while (byePositions.length < P) {
        if (bottomEnd >= bottomStart) byePositions.push(bottomEnd--);
        if (topStart <= topEnd) byePositions.push(topStart++);
        if (bottomStart <= bottomEnd) byePositions.push(bottomStart++);
        if (topEnd >= topStart) byePositions.push(topEnd--);
      }

      const bracketSlots = new Array(P).fill(null);
      for (let i = 0; i < byesCount; i++) bracketSlots[byePositions[i]] = 'BYE';

      let teamIndex = 0;
      for (let i = 0; i < P; i++) {
        if (bracketSlots[i] === null) bracketSlots[i] = shuffled[teamIndex++].team_name;
      }

      for (let i = 0; i < P; i += 2) {
        const teamA = bracketSlots[i];
        const teamB = bracketSlots[i + 1];

        if (teamA === 'BYE' || teamB === 'BYE') {
          const actualTeam = teamA === 'BYE' ? teamB : teamA;
          await pool.query(
            `INSERT INTO tournament_matches (tournament_id, teama, teamb, status, round) VALUES (?, ?, 'BYE', 'UPCOMING', 'ROUND 1')`,
            [tournamentId, actualTeam]
          );
        } else {
          await pool.query(
            `INSERT INTO tournament_matches (tournament_id, teama, teamb, status, round) VALUES (?, ?, ?, 'UPCOMING', 'ROUND 1')`,
            [tournamentId, teamA, teamB]
          );
        }
      }

      let nextRoundMatches = P / 4;
      while (nextRoundMatches >= 1) {
        let roundName = "NEXT ROUND";
        if (nextRoundMatches === 4) roundName = "QUARTER FINAL";
        else if (nextRoundMatches === 2) roundName = "SEMI FINAL";
        else if (nextRoundMatches === 1) roundName = "FINAL";

        for (let i = 0; i < nextRoundMatches; i++) {
          await pool.query(
            `INSERT INTO tournament_matches (tournament_id, teama, teamb, status, round) VALUES (?, 'TBD', 'TBD', 'UPCOMING', ?)`,
            [tournamentId, roundName]
          );
        }
        nextRoundMatches /= 2;
      }
    }

    // 🟢 6. GENERATE: HYBRID (Groups into Knockout)
    else if (type === "hybrid") {
      const groupsCount = parseInt(req.body.group_count) || 2;
      const advancingCount = parseInt(req.body.advancing_count) || 2;

      if (teamList.length < groupsCount) return res.redirect(`/tournaments/${tournamentId}`);

      const shuffled = teamList.sort(() => 0.5 - Math.random());
      const groups = Array.from({ length: groupsCount }, () => []);

      shuffled.forEach((team, index) => {
        groups[index % groupsCount].push(team.team_name);
      });

      for (let g = 0; g < groupsCount; g++) {
        const groupLetter = String.fromCharCode(65 + g);
        const groupTeams = groups[g];
        for (let i = 0; i < groupTeams.length; i++) {
          for (let j = i + 1; j < groupTeams.length; j++) {
            await pool.query(
              `INSERT INTO tournament_matches (tournament_id, teama, teamb, status, round) VALUES (?, ?, ?, 'UPCOMING', 'GROUP ${groupLetter} STAGE')`,
              [tournamentId, groupTeams[i], groupTeams[j]]
            );
          }
        }
      }

      const totalKnockoutTeams = groupsCount * advancingCount;
      let P = 1;
      while (P < totalKnockoutTeams) P *= 2;
      let nextRoundMatches = P / 2;

      while (nextRoundMatches >= 1) {
        let roundName = "KNOCKOUT ROUND";
        if (nextRoundMatches === 4) roundName = "QUARTER FINAL";
        else if (nextRoundMatches === 2) roundName = "SEMI FINAL";
        else if (nextRoundMatches === 1) roundName = "FINAL";

        for (let i = 0; i < nextRoundMatches; i++) {
          await pool.query(
            `INSERT INTO tournament_matches (tournament_id, teama, teamb, status, round) VALUES (?, 'TBD', 'TBD', 'UPCOMING', ?)`,
            [tournamentId, roundName]
          );
        }
        nextRoundMatches /= 2;
      }
    }

    // 🟣 7. GENERATE: CUSTOM (Blank Canvas)
    else if (type === "custom") {
      // Create a single completely blank match card for the organizer to start with.
      await pool.query(
        `INSERT INTO tournament_matches (tournament_id, teama, teamb, status, round) VALUES (?,'TBD','TBD','UPCOMING','CUSTOM MATCH')`,
        [tournamentId]
      );
    }

    res.redirect(`/tournaments/${tournamentId}`);
  } catch (err) {
    console.error("GENERATE FIXTURES ERROR:", err);
    res.redirect(`/tournaments/${tournamentId}`);
  }
});

app.post("/tournaments/create", upload.single("image"), async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");

  const { name, location, start_date, end_date, max_teams } = req.body;
  const imagePath = req.file ? "/assets/tournaments/" + req.file.filename : "/assets/tournaments/default.png";

  try {
    await pool.query(
      `INSERT INTO tournaments (name, location, start_date, end_date, max_teams, status, image, created_by) VALUES (?,?,?,?,?,'UPCOMING',?,?)`,
      [name, location, start_date, end_date, max_teams, imagePath, req.user.id]
    );
    res.redirect("/tournaments");
  } catch (err) {
    console.log("CREATE TOURNAMENT ERROR:", err);
    res.redirect("/tournaments");
  }
});

/* =========================
   DELETE TOURNAMENT (CREATOR ONLY)
========================= */
app.post("/tournaments/:id/delete", async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");
  const { id } = req.params;

  try {
    const [result] = await pool.query("SELECT created_by FROM tournaments WHERE id=?", [id]);
    if (result.length === 0) return res.redirect("/tournaments");

    // SECURITY LOCK: Only creator (or a global admin) can delete
    if (result[0].created_by !== req.user.id && !req.user.is_admin) {
      return res.status(403).send("Unauthorized: You do not own this tournament.");
    }

    await pool.query("DELETE FROM tournament_teams WHERE tournament_id=?", [id]);
    await pool.query("DELETE FROM tournament_matches WHERE tournament_id=?", [id]);
    await pool.query("DELETE FROM tournaments WHERE id=?", [id]);

    res.redirect("/manage-tournaments");
  } catch (err) {
    console.log("DELETE TOURNAMENT ERROR:", err);
    res.redirect("/tournaments");
  }
});

/* =========================
   MANUALLY ADD TEAM (CREATOR ONLY)
========================= */
app.post("/tournaments/:id/add-team", async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");
  const { id } = req.params;
  const { team_id } = req.body;

  try {
    const [tournamentResult] = await pool.query("SELECT created_by FROM tournaments WHERE id=?", [id]);
    if (tournamentResult.length === 0) return res.redirect("/tournaments");

    // SECURITY LOCK
    if (tournamentResult[0].created_by !== req.user.id && !req.user.is_admin) {
      return res.status(403).send("Unauthorized: You do not own this tournament.");
    }

    const [teamData] = await pool.query("SELECT team FROM users WHERE id=?", [team_id]);
    if (teamData.length === 0) return res.redirect(`/tournaments/${id}`);

    const teamName = teamData[0].team;

    // Prevent duplicate entries
    const [check] = await pool.query("SELECT * FROM tournament_teams WHERE tournament_id=? AND LOWER(team_name)=LOWER(?)", [id, teamName]);
    if (check.length === 0) {
      await pool.query("INSERT INTO tournament_teams (tournament_id, team_name) VALUES (?,?)", [id, teamName]);
    }

    res.redirect(`/tournaments/${id}`);
  } catch (err) {
    console.log("ADD TEAM ERROR:", err);
    res.redirect(`/tournaments/${id}`);
  }
});

/* =========================
   REMOVE TEAM (CREATOR ONLY)
========================= */
app.post("/tournaments/:tid/remove-team/:teamId", async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");
  const { tid, teamId } = req.params;

  try {
    const [tournamentResult] = await pool.query("SELECT created_by FROM tournaments WHERE id=?", [tid]);
    if (tournamentResult.length === 0) return res.redirect("/tournaments");

    // SECURITY LOCK
    if (tournamentResult[0].created_by !== req.user.id && !req.user.is_admin) {
      return res.status(403).send("Unauthorized: You do not own this tournament.");
    }

    await pool.query("DELETE FROM tournament_teams WHERE id=? AND tournament_id=?", [teamId, tid]);

    // Optional: Also delete any matches this team was already scheduled for
    await pool.query("DELETE FROM tournament_matches WHERE tournament_id=? AND (teama=(SELECT team_name FROM tournament_teams WHERE id=?) OR teamb=(SELECT team_name FROM tournament_teams WHERE id=?))", [tid, teamId, teamId]);

    res.redirect(`/tournaments/${tid}`);
  } catch (err) {
    console.error("REMOVE TEAM ERROR:", err);
    res.redirect(`/tournaments/${tid}`);
  }
});

/* =========================
   UPDATE SCORE & RECALCULATE ENGINE 
========================= */
app.post("/matches/:id/result", async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");
  const { id } = req.params;
  const { scoreA, scoreB } = req.body;

  try {
    const [matchResult] = await pool.query(`
      SELECT m.*, t.created_by 
      FROM tournament_matches m
      JOIN tournaments t ON m.tournament_id = t.id
      WHERE m.id = ?
    `, [id]);

    if (matchResult.length === 0) return res.redirect("/tournaments");
    const currentMatch = matchResult[0];

    if (currentMatch.created_by !== req.user.id && !req.user.is_admin) {
      return res.status(403).send("Unauthorized action.");
    }

    // 1. Determine Match Winner & Loser
    let winner;
    if (parseInt(scoreA) > parseInt(scoreB)) {
      winner = currentMatch.teama;
    } else if (parseInt(scoreB) > parseInt(scoreA)) {
      winner = currentMatch.teamb;
    } else {
      winner = "DRAW";
    }

    // 2. Mark match as FINAL
    await pool.query(
      "UPDATE tournament_matches SET scorea=?, scoreb=?, status='FINAL', winner=? WHERE id=?",
      [scoreA, scoreB, winner, id]
    );

    // ==========================================
    // 📊 BULLETPROOF LEADERBOARD RECALCULATION
    // ==========================================

    // Step A: Wipe all current stats for this tournament back to 0
    await pool.query(
      "UPDATE tournament_teams SET matches_played=0, wins=0, losses=0, ties=0, points=0 WHERE tournament_id=?",
      [currentMatch.tournament_id]
    );

    // Step B: Fetch ALL finalized matches for this tournament
    const [completedMatches] = await pool.query(
      "SELECT teama, teamb, winner FROM tournament_matches WHERE tournament_id=? AND status='FINAL'",
      [currentMatch.tournament_id]
    );

    // Step C: Tally up the exact truth
    const teamStats = {};
    completedMatches.forEach(m => {
      if (!teamStats[m.teama]) teamStats[m.teama] = { mp: 0, w: 0, l: 0, t: 0, pts: 0 };
      if (!teamStats[m.teamb]) teamStats[m.teamb] = { mp: 0, w: 0, l: 0, t: 0, pts: 0 };

      teamStats[m.teama].mp++;
      teamStats[m.teamb].mp++;

      if (m.winner === "DRAW") {
        teamStats[m.teama].t++; teamStats[m.teama].pts += 1;
        teamStats[m.teamb].t++; teamStats[m.teamb].pts += 1;
      } else if (m.winner === m.teama) {
        teamStats[m.teama].w++; teamStats[m.teama].pts += 2;
        teamStats[m.teamb].l++;
      } else if (m.winner === m.teamb) {
        teamStats[m.teamb].w++; teamStats[m.teamb].pts += 2;
        teamStats[m.teama].l++;
      }
    });

    // Step D: Save the perfect tallies back to the database
    for (const [teamName, stats] of Object.entries(teamStats)) {
      if (teamName !== "BYE" && teamName !== "TBD") {
        await pool.query(
          "UPDATE tournament_teams SET matches_played=?, wins=?, losses=?, ties=?, points=? WHERE tournament_id=? AND team_name=?",
          [stats.mp, stats.w, stats.l, stats.t, stats.pts, currentMatch.tournament_id, teamName]
        );
      }
    }

    // ==========================================
    // 🚀 AUTO-ADVANCE LOGIC 
    // ==========================================
    if (!currentMatch.round.includes("STAGE") && currentMatch.round !== "CUSTOM MATCH" && winner !== "DRAW" && currentMatch.round !== "FINAL") {
      const [allMatches] = await pool.query("SELECT * FROM tournament_matches WHERE tournament_id=? ORDER BY id ASC", [currentMatch.tournament_id]);
      const uniqueRounds = [...new Set(allMatches.map(m => m.round))];
      const currentRoundIndex = uniqueRounds.indexOf(currentMatch.round);

      if (currentRoundIndex !== -1 && currentRoundIndex + 1 < uniqueRounds.length) {
        const nextRoundName = uniqueRounds[currentRoundIndex + 1];
        const currentRoundMatches = allMatches.filter(m => m.round === currentMatch.round);
        const nextRoundMatches = allMatches.filter(m => m.round === nextRoundName);

        const myIndexInRound = currentRoundMatches.findIndex(m => m.id === currentMatch.id);
        const targetNextMatchIndex = Math.floor(myIndexInRound / 2);
        const targetNextMatch = nextRoundMatches[targetNextMatchIndex];

        if (targetNextMatch) {
          if (myIndexInRound % 2 === 0) {
            await pool.query("UPDATE tournament_matches SET teama=? WHERE id=?", [winner, targetNextMatch.id]);
          } else {
            await pool.query("UPDATE tournament_matches SET teamb=? WHERE id=?", [winner, targetNextMatch.id]);
          }
        }
      }
    }

    res.redirect(`/tournaments/${currentMatch.tournament_id}`);
  } catch (err) {
    console.error("SCORE UPDATE ERROR:", err);
    res.redirect("/manage-tournaments");
  }
});


/* =========================
   MANUALLY FINALIZE TOURNAMENT (CREATOR ONLY)
========================= */
app.post("/tournaments/:id/finalize", async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");
  const { id } = req.params;

  try {
    const [tournCheck] = await pool.query("SELECT created_by FROM tournaments WHERE id=?", [id]);
    if (tournCheck.length === 0) return res.redirect("/manage-tournaments");

    // SECURITY LOCK
    if (tournCheck[0].created_by !== req.user.id && !req.user.is_admin) {
      return res.status(403).send("Unauthorized action.");
    }

    const [allMatches] = await pool.query("SELECT * FROM tournament_matches WHERE tournament_id=? ORDER BY id ASC", [id]);
    const finalMatch = allMatches.find(m => m.round === "FINAL");

    let champ = null, ru = null, sru = null;

    if (finalMatch && finalMatch.status === "FINAL") {
      // 🏆 KNOCKOUT / HYBRID MATH
      champ = finalMatch.winner;
      ru = finalMatch.winner === finalMatch.teama ? finalMatch.teamb : finalMatch.teama;

      // Calculate 3rd place from Semi-Final losers
      const semiMatches = allMatches.filter(m => m.round === "SEMI FINAL" && m.status === "FINAL");
      if (semiMatches.length === 2) {
        const loser1 = semiMatches[0].winner === semiMatches[0].teama ? semiMatches[0].teamb : semiMatches[0].teama;
        const loser2 = semiMatches[1].winner === semiMatches[1].teama ? semiMatches[1].teamb : semiMatches[1].teama;

        const [stats] = await pool.query("SELECT team_name FROM tournament_teams WHERE tournament_id=? AND team_name IN (?, ?) ORDER BY points DESC, wins DESC LIMIT 1", [id, loser1, loser2]);
        if (stats.length > 0) sru = stats[0].team_name;
      }
    } else {
      // 🏆 ROUND ROBIN / LEAGUE MATH
      const [leaderboard] = await pool.query("SELECT team_name FROM tournament_teams WHERE tournament_id=? ORDER BY points DESC, wins DESC LIMIT 3", [id]);
      if (leaderboard.length > 0) champ = leaderboard[0].team_name;
      if (leaderboard.length > 1) ru = leaderboard[1].team_name;
      if (leaderboard.length > 2) sru = leaderboard[2].team_name;
    }

    // Lock it in!
    await pool.query("UPDATE tournaments SET status='COMPLETED', champion=?, runner_up=?, second_runner_up=? WHERE id=?", [champ, ru, sru, id]);

    res.redirect(`/manage-tournaments/${id}`);
  } catch (err) {
    console.error("FINALIZE ERROR:", err);
    res.redirect(`/manage-tournaments/${id}`);
  }
});


/* =========================
   HARD RESET CURRENT SEASON (CREATOR ONLY)
========================= */
app.post("/tournaments/:id/reset", async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");
  const { id } = req.params;

  try {
    const [tournCheck] = await pool.query("SELECT created_by FROM tournaments WHERE id=?", [id]);
    if (tournCheck.length === 0) return res.redirect("/manage-tournaments");

    if (tournCheck[0].created_by !== req.user.id && !req.user.is_admin) {
      return res.status(403).send("Unauthorized action.");
    }

    // 1. Wipe all generated matches
    await pool.query("DELETE FROM tournament_matches WHERE tournament_id=?", [id]);

    // 2. Set all team standings back to pure zero
    await pool.query("UPDATE tournament_teams SET matches_played=0, wins=0, losses=0, ties=0, points=0 WHERE tournament_id=?", [id]);

    // 3. Strip the Champion and reset the status
    await pool.query("UPDATE tournaments SET status='ACTIVE', champion=NULL, runner_up=NULL, second_runner_up=NULL WHERE id=?", [id]);

    res.redirect(`/manage-tournaments/${id}`);
  } catch (err) {
    console.error("RESET ERROR:", err);
    res.redirect(`/manage-tournaments/${id}`);
  }
});


/* =========================
   EDIT MATCHUP / SWAP TBDs (CREATOR ONLY)
========================= */
app.post("/matches/:id/edit-teams", async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");
  const { id } = req.params;
  const { teamA, teamB } = req.body;

  try {
    const [matchResult] = await pool.query(`
      SELECT m.tournament_id, t.created_by 
      FROM tournament_matches m
      JOIN tournaments t ON m.tournament_id = t.id
      WHERE m.id = ?
    `, [id]);

    if (matchResult.length === 0) return res.redirect("/manage-tournaments");

    if (matchResult[0].created_by !== req.user.id && !req.user.is_admin) {
      return res.status(403).send("Unauthorized action.");
    }

    // Override the teams in this match
    await pool.query("UPDATE tournament_matches SET teama=?, teamb=? WHERE id=?", [teamA, teamB, id]);

    res.redirect(`/manage-tournaments/${matchResult[0].tournament_id}`);
  } catch (err) {
    console.error("EDIT MATCH ERROR:", err);
    res.redirect("/manage-tournaments");
  }
});















/* =========================
   GLOBAL STANDINGS & SCHEDULE
========================= */
app.get("/standings", async (req, res) => {
  try {
    // 1. Fetch all tournaments to build the top navigation tabs
    const [tournaments] = await pool.query("SELECT * FROM tournaments ORDER BY id DESC");

    // 2. Fetch ALL matches across the entire platform, joining the tournament name
    // (Your EJS explicitly looks for 'm.tournament_name')
    const [allMatches] = await pool.query(`
      SELECT m.*, t.name AS tournament_name 
      FROM tournament_matches m
      JOIN tournaments t ON m.tournament_id = t.id
      ORDER BY m.id ASC
    `);

    // 3. Group matches by their tournament_id into a dictionary object
    // (This feeds the "matchesByTournament[t.id]" logic in your EJS)
    const matchesByTournament = {};
    allMatches.forEach(match => {
      if (!matchesByTournament[match.tournament_id]) {
        matchesByTournament[match.tournament_id] = [];
      }
      matchesByTournament[match.tournament_id].push(match);
    });

    // 4. Calculate total matches for the header counter
    const totalMatches = allMatches.length;

    // 5. Render the page and inject the data!
    res.render("pages/standings", {
      user: req.user, // Crucial so your Navbar partial doesn't break
      tournaments,
      allMatches,
      matchesByTournament,
      totalMatches
    });

  } catch (err) {
    console.error("STANDINGS PAGE ERROR:", err);
    res.redirect("/");
  }
});

















/* =========================
   SOCKET.IO SCORING ENGINE
========================= */
const httpServer = createServer(app);
const io = new Server(httpServer);

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("update_score", async ({ matchId, scorea, scoreb }) => {
    try {
      // Fixed: Target tournament_matches table, not matches
      await pool.query("UPDATE tournament_matches SET scorea=?, scoreb=? WHERE id=?", [scorea, scoreb, matchId]);
      io.emit(`match_${matchId}`, { scorea, scoreb });
    } catch (err) {
      console.log(err);
    }
  });

  socket.on("new_event", ({ matchId, time, text, type }) => {
    io.emit(`event_${matchId}`, { time, text, type });
  });

  socket.on("update_clock", ({ matchId, time, quarter, running }) => {
    io.emit(`clock_${matchId}`, { time, quarter, running });
  });

  socket.on("update_player_stats", ({ matchId, playerId, points, fouls, assists, rebounds }) => {
    io.emit(`player_stats_${matchId}`, { playerId, points, fouls, assists, rebounds });
    console.log(`Player stats updated: match ${matchId} player ${playerId}`);
  });

  // Admin: Start/End Match
  socket.on("toggle_match", async ({ matchId, running }) => {
    await pool.query("UPDATE tournament_matches SET running=? WHERE id=?", [running, matchId]);
    io.emit(`match_status_${matchId}`, running);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

httpServer.listen(port, () => {
  console.log(`🏀 CourtCommand Server running on port ${port}`);
});