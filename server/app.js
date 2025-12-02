require("dotenv").config();
const express = require("express");

const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");   // ← AGREGADO

const app = express();
app.use(cors());
app.use(bodyParser.json());

// -------------------------------
// SERVIR LA CARPETA CLIENT  ← AGREGADO
// -------------------------------
app.use(express.static(path.join(__dirname, "..", "client")));
// Ahora podés abrir http://127.0.0.1:3000/cliente.html
// -------------------------------


// ===============================
// VARIABLES DESDE .env
// ===============================
const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
const redirectUri = process.env.REDIRECT_URI;
const PORT = process.env.PORT || 3000;

// ===============================
// TOKENS EN MEMORIA
// ===============================
let accessToken = null;
let refreshToken = null;

// ===============================
// LOGIN - REDIRECCIÓN A SPOTIFY
// ===============================
app.get("/login", (req, res) => {
  const scopes = [
    "user-read-playback-state",
    "user-modify-playback-state",
    "playlist-read-private",
    "playlist-modify-private",
    "playlist-modify-public",
    "streaming"
  ];

  const authUrl =
    "https://accounts.spotify.com/authorize" +
    "?response_type=code" +
    "&client_id=" + clientId +
    "&scope=" + encodeURIComponent(scopes.join(" ")) +
    "&redirect_uri=" + encodeURIComponent(redirectUri);

  res.redirect(authUrl);
});

// ===============================
// CALLBACK - SPOTIFY DEVUELVE EL "code"
// ===============================
app.get("/callback", async (req, res) => {
  const code = req.query.code;

  const params = new URLSearchParams();
  params.append("grant_type", "authorization_code");
  params.append("code", code);
  params.append("redirect_uri", redirectUri);
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);

  const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params
  });

  const data = await tokenResponse.json();

  if (data.error) {
    console.log("ERROR TOKEN:", data);
    return res.send("Error obteniendo token.");
  }

  accessToken = data.access_token;
  refreshToken = data.refresh_token;

  console.log("TOKEN OBTENIDO:", accessToken);

  res.send("Autenticación exitosa. Ya podés usar /api/search");
});

// ===============================
// FUNCION PARA REFRESCAR TOKEN
// ===============================
async function refreshAccessToken() {
  const params = new URLSearchParams();
  params.append("grant_type", "refresh_token");
  params.append("refresh_token", refreshToken);
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);

  const result = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params
  });

  const data = await result.json();

  if (data.access_token) {
    accessToken = data.access_token;
    console.log("Nuevo access token:", accessToken);
  }
}

// ===============================
// MIDDLEWARE PARA ASEGURAR TOKEN
// ===============================
async function ensureAuth(req, res, next) {
  if (!accessToken) {
    return res.status(401).json({ error: "No autenticado. Ir a /login" });
  }

  next();
}

// ===============================
// BUSCAR TEMAS
// ===============================
app.get("/api/search", ensureAuth, async (req, res) => {
  const q = req.query.q;
  if (!q) return res.json([]);

  let response = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=10`,
    {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );

  // Si expira token → refrescar
  if (response.status === 401) {
    await refreshAccessToken();

    response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=10`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );
  }

  const data = await response.json();
  res.json(data.tracks.items || []);
});

// ===============================
// LISTAR DISPOSITIVOS ACTIVOS
// ===============================
app.get("/api/devices", ensureAuth, async (req, res) => {
  try {
    const response = await fetch("https://api.spotify.com/v1/me/player/devices", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const data = await response.json();
    res.json(data); // Devuelve todos los dispositivos y cuál está activo
  } catch (err) {
    res.status(500).json({ error: "Error al obtener dispositivos", details: err.message });
  }
});

// ===============================
// AGREGAR TEMA A LA COLA (versión final)
// ===============================
app.post("/api/add", ensureAuth, async (req, res) => {
  const { trackUri } = req.body;

  if (!trackUri) return res.status(400).json({ error: "Falta trackUri" });

  try {
    const response = await fetch(
      "https://api.spotify.com/v1/me/player/queue?uri=" + encodeURIComponent(trackUri),
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    if (response.ok) { // cualquier status 2xx
      return res.json({ success: true });
    } else {
      const text = await response.text();
      return res.status(500).json({ error: "No se pudo agregar el tema", details: text });
    }
  } catch (err) {
    return res.status(500).json({ error: "Error al agregar tema", details: err.message });
  }
});



// ===============================
// INICIAR SERVIDOR
// ===============================
app.listen(PORT, () => {
  console.log("Servidor corriendo en https://jukebox-qblp.onrender.com:" + PORT);
});

