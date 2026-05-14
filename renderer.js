const path = require("path");
const isPackaged = __dirname.includes("app.asar");

function assetPath(filename, fileUrl = false) {
  const p = isPackaged
    ? path.join(process.resourcesPath, filename)
    : path.join(__dirname, filename);

  if (fileUrl) {
    return "file:///" + p.replace(/\\/g, "/");
  }
  return p;
}

console.log("isPackaged:", isPackaged);
console.log("assetPath test:", assetPath("caticon.gif"));

const supabase = require("./supabase");
const { ipcRenderer, shell } = require("electron");

const displayNote = document.getElementById("displayNote");
const noteInput = document.getElementById("noteInput");
const saveBtn = document.getElementById("saveBtn");
const spotifyLoginBtn = document.getElementById("spotifyLogin");
const typingIndicator = document.getElementById("typingIndicator");
const spotifyCard = document.getElementById("spotifyCard");
const spotifyArtwork = document.getElementById("spotifyArtwork");
const spotifySong = document.getElementById("spotifySong");
const spotifyArtist = document.getElementById("spotifyArtist");
const spotifyFill = document.getElementById("spotifyProgressFill");
const myStatusDot = document.getElementById("myStatusDot");
const partnerStatusDot = document.getElementById("partnerStatusDot");
const partnerSpotify = document.getElementById("partnerSpotify");
document.getElementById("pet").src = assetPath("caticon.gif", true);

const style = document.createElement("style");
style.textContent = `@font-face {
    font-family: "PixelifySans";
    src: url("${assetPath("PixelifySans-VariableFont_wght.ttf", true)}");
}`;
document.head.appendChild(style);

const clickSound = new Audio(assetPath("pop_sound.mp3", true));
const petClickSound = new Audio(assetPath("meow.mp3", true));
const receiveSound = new Audio(assetPath("receive.mp3", true));

const clientId = "93dd46a5d86d49d0bb69c4dfce6dad04";
const redirectUri = "http://127.0.0.1:3000/";
const scopes = "user-read-currently-playing user-read-playback-state";

// =====================
// NAMES + IDS
// =====================
const MY_ID = "min";
const PARTNER_ID = "louisa";
const MY_NAME = "min";
const PARTNER_NAME = "louisa";

// const MY_ID = "louisa";
// const PARTNER_ID = "min";
// const MY_NAME = "louisa";
// const PARTNER_NAME = "min";

// =====================
// SOUNDS
// =====================
receiveSound.volume = 0.6;
let lastReceiveTime = 0;

// =====================
// FLOATING HEARTS
// =====================
const canvas = document.getElementById("heartsCanvas");
const ctx = canvas.getContext("2d");
let hearts = [];

function resizeCanvas() {
  const box = document.getElementById("noteBox");
  canvas.width = box.offsetWidth;
  canvas.height = box.offsetHeight;
}

function spawnHeart() {
  const colors = [
    "217, 180, 74", // yellow
    "95, 163, 106", // green
    "122, 46, 58", // red
  ];
  hearts.push({
    x: Math.random() * canvas.width,
    y: canvas.height + 10,
    size: Math.floor(Math.random() * 3 + 2) * 2,
    speed: Math.random() * 0.3 + 0.2,
    opacity: Math.random() * 0.4 + 0.3,
    drift: (Math.random() - 0.5) * 0.3,
    color: colors[Math.floor(Math.random() * colors.length)],
  });
}

function drawPixelHeart(x, y, size, opacity, color) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = `rgb(${color})`;
  const s = size;
  const grid = [
    [0, 1, 1, 0, 1, 1, 0],
    [1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1],
    [0, 1, 1, 1, 1, 1, 0],
    [0, 0, 1, 1, 1, 0, 0],
    [0, 0, 0, 1, 0, 0, 0],
  ];
  grid.forEach((row, ri) => {
    row.forEach((cell, ci) => {
      if (cell)
        ctx.fillRect(
          Math.round(x + (ci - 3) * s),
          Math.round(y + ri * s),
          s,
          s,
        );
    });
  });
  ctx.restore();
}

function animateHearts() {
  resizeCanvas();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  hearts.forEach((h) => {
    h.y -= h.speed;
    h.x += h.drift;
    h.opacity -= 0.0008;
  });

  hearts = hearts.filter((h) => h.opacity > 0 && h.y > -20);

  hearts.forEach((h) => drawPixelHeart(h.x, h.y, h.size, h.opacity, h.color));

  requestAnimationFrame(animateHearts);
}

setInterval(spawnHeart, 1200);
animateHearts();

// =====================
// BACKGROUND SPARKLES
// =====================
const bgCanvas = document.getElementById("bgCanvas");
const bgCtx = bgCanvas.getContext("2d");
let particles = [];

function resizeBgCanvas() {
  const win = document.querySelector(".window");
  const w = win.offsetWidth;
  const h = win.offsetHeight - 32;
  bgCanvas.width = w;
  bgCanvas.height = h;
  bgCanvas.style.width = w + "px";
  bgCanvas.style.height = h + "px";
}

function spawnParticle() {
  const w = bgCanvas.width || 340;
  const h = bgCanvas.height || 400;
  particles.push({
    x: Math.random() * w,
    y: Math.random() * h,
    size: Math.floor(Math.random() * 3 + 1),
    opacity: 0,
    maxOp: Math.random() * 0.5 + 0.2,
    phase: "in",
    speed: Math.random() * 0.006 + 0.004,
    isHeart: false,
    drift: (Math.random() - 0.5) * 0.6,
    floatY: (Math.random() - 0.5) * 0.4,
  });
}

function drawSparkle(x, y, size, opacity) {
  bgCtx.fillStyle = `rgba(170, 170, 170, ${opacity})`;
  bgCtx.fillRect(Math.round(x), Math.round(y), size, size);
  bgCtx.fillRect(Math.round(x - size), Math.round(y), size, size);
  bgCtx.fillRect(Math.round(x + size), Math.round(y), size, size);
  bgCtx.fillRect(Math.round(x), Math.round(y - size), size, size);
  bgCtx.fillRect(Math.round(x), Math.round(y + size), size, size);
}

function drawBgHeart(x, y, size, opacity) {
  bgCtx.fillStyle = `rgba(170, 170, 170, ${opacity})`;
  const grid = [
    [0, 1, 0, 1, 0],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [0, 1, 1, 1, 0],
    [0, 0, 1, 0, 0],
  ];
  grid.forEach((row, ri) => {
    row.forEach((cell, ci) => {
      if (cell)
        bgCtx.fillRect(
          Math.round(x + (ci - 2) * size),
          Math.round(y + ri * size),
          size,
          size,
        );
    });
  });
}

resizeBgCanvas();
function animateBg() {
  bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);

  particles.forEach((p) => {
    if (p.phase === "in") {
      p.opacity += p.speed;
      if (p.opacity >= p.maxOp) p.phase = "out";
    } else {
      p.opacity -= p.speed * 0.5;
    }
    p.x += p.drift;
    p.y += p.floatY;

    // clamp to canvas bounds
    if (p.x < 0 || p.x > bgCanvas.width) p.drift *= -1;
    if (p.y < 0 || p.y > bgCanvas.height) p.floatY *= -1;

    if (p.isHeart) {
      drawBgHeart(p.x, p.y, p.size, p.opacity);
    } else {
      drawSparkle(p.x, p.y, p.size, p.opacity);
    }
  });

  particles = particles.filter((p) => p.opacity > 0);
  requestAnimationFrame(animateBg);
}

for (let i = 0; i < 12; i++) spawnParticle();
setInterval(spawnParticle, 140);
animateBg();

// =====================
// PKCE HELPERS
// =====================
function generateCodeVerifier() {
  const array = new Uint8Array(64);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

async function generateCodeChallenge(verifier) {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

// =====================
// SPOTIFY LOGIN
// =====================
spotifyLoginBtn.addEventListener("click", async () => {
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  localStorage.setItem("code_verifier", verifier);

  const authUrl =
    "https://accounts.spotify.com/authorize" +
    "?client_id=" +
    clientId +
    "&response_type=code" +
    "&redirect_uri=" +
    encodeURIComponent(redirectUri) +
    "&scope=" +
    encodeURIComponent(scopes) +
    "&code_challenge_method=S256" +
    "&code_challenge=" +
    challenge;

  shell.openExternal(authUrl);
});

// =====================
// TOKEN EXCHANGE + REFRESH
// =====================
async function exchangeCodeForToken(code) {
  const verifier = localStorage.getItem("code_verifier");

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier: verifier,
    }),
  });

  const data = await res.json();
  if (data.access_token) {
    localStorage.setItem("spotify_token", data.access_token);
    localStorage.setItem("spotify_refresh_token", data.refresh_token);
    hideLoginButton();
  }
}

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem("spotify_refresh_token");
  if (!refreshToken) return;

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
    }),
  });

  const data = await res.json();
  if (data.access_token) {
    localStorage.setItem("spotify_token", data.access_token);
  }
}

// IPC — receive code from main.js after Spotify redirect
ipcRenderer.on("spotify-code", (event, code) => {
  exchangeCodeForToken(code);
});

// =====================
// HIDE LOGIN BUTTON
// =====================
function hideLoginButton() {
  spotifyLoginBtn.classList.add("hidden");
}

if (localStorage.getItem("spotify_token")) {
  hideLoginButton();
}

// =====================
// AUTO-RECONNECT ON STARTUP
// =====================
async function silentReconnect() {
  const token = localStorage.getItem("spotify_token");
  if (!token) return;

  const res = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 401) {
    await refreshAccessToken();
  }

  updateSpotify();
}

// =====================
// PET CLICK
// =====================
const pet = document.getElementById("pet");
pet.addEventListener("click", () => {
  petClickSound.currentTime = 0;
  petClickSound.play();
});

// =====================
// NOTES
// =====================
async function updateNote() {
  const content = noteInput.value;
  if (!content.trim()) return;

  await supabase.from("notes").upsert({ user_id: MY_ID, content });

  noteInput.value = "";
  clickSound.play();
  setMyStatus("online");
  animateNote(displayNote);
}

function animateNote(el) {
  el.classList.remove("note-fade-in");
  void el.offsetWidth;
  el.classList.add("note-fade-in");
}

saveBtn.addEventListener("click", updateNote);

async function loadPartnerNote() {
  const { data } = await supabase
    .from("notes")
    .select("*")
    .eq("user_id", PARTNER_ID)
    .maybeSingle();

  if (data) {
    displayNote.innerHTML = `
            <div>
                <div>${data.content}</div>
                <small>${new Date().toLocaleTimeString()}</small>
            </div>`;
    animateNote(displayNote);
  }
}

supabase
  .channel("notes-live")
  .on(
    "postgres_changes",
    { event: "*", schema: "public", table: "notes" },
    (payload) => {
      const newData = payload.new;
      if (newData.user_id !== PARTNER_ID) return;

      displayNote.innerHTML = `
            <div>
                <div>${newData.content}</div>
                <small>${new Date().toLocaleTimeString()}</small>
            </div>`;
      animateNote(displayNote);

      const now = Date.now();
      if (now - lastReceiveTime > 1000) {
        receiveSound.currentTime = 0;
        receiveSound.play();
        lastReceiveTime = now;
      }
    },
  )
  .subscribe();

loadPartnerNote();

// =====================
// ONLINE / TYPING STATUS
// =====================
let typingTimer = null;

async function setMyStatus(status) {
  await supabase.from("status").upsert({ user_id: MY_ID, status });
}

noteInput.addEventListener("input", () => {
  setMyStatus("typing");
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => setMyStatus("online"), 2000);
});

setMyStatus("online");
myStatusDot.className = "status-dot online";

supabase
  .channel("status-live")
  .on(
    "postgres_changes",
    { event: "*", schema: "public", table: "status" },
    (payload) => {
      const d = payload.new;
      if (d.user_id !== PARTNER_ID) return;

      if (d.status === "typing") {
        partnerStatusDot.className = "status-dot typing";
        typingIndicator.textContent = `${PARTNER_NAME} is typing...`;
        typingIndicator.classList.remove("hidden");
      } else if (d.status === "online") {
        partnerStatusDot.className = "status-dot online";
        typingIndicator.classList.add("hidden");
      } else {
        partnerStatusDot.className = "status-dot";
        typingIndicator.classList.add("hidden");
      }
    },
  )
  .subscribe();

// =====================
// TIME
// =====================
function updateTimes() {
  const now = new Date();

  document.getElementById("myTime").innerText =
    "UK " +
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/London",
    }).format(now);

  document.getElementById("partnerTime").innerText =
    "DE " +
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Berlin",
    }).format(now);
}

setInterval(updateTimes, 1000);
updateTimes();

// =====================
// SPOTIFY — push YOUR song as plain text only
// =====================
async function updateSpotify() {
  const token = localStorage.getItem("spotify_token");
  if (!token) return;

  const res = await fetch(
    "https://api.spotify.com/v1/me/player/currently-playing",
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (res.status === 401) {
    await refreshAccessToken();
    return;
  }

  if (res.status === 204 || res.status > 400) return;

  const data = await res.json();
  if (!data || !data.item) return;

  const song = data.item.name;
  const artist = data.item.artists[0].name;
  const artwork = data.item.album.images[0]?.url ?? "";

  document.getElementById("mySpotify").innerText = `you: ♫ ${song} - ${artist}`;

  const { error, data: upsertData } = await supabase
    .from("spotify_status")
    .upsert({
      user_id: MY_ID,
      song,
      artist,
      artwork,
      progress_ms: data.progress_ms,
      duration_ms: data.item.duration_ms,
      updated_at: new Date().toISOString(),
    });
}

// =====================
// SPOTIFY — show PARTNER's song as artwork card
// =====================

function formatMs(ms) {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

function getDominantColor(imageUrl, callback) {
  const img = new Image();
  img.crossOrigin = "Anonymous";
  img.src = imageUrl;
  img.onload = () => {
    const c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    const cx = c.getContext("2d");
    cx.drawImage(img, 0, 0);

    const data = cx.getImageData(0, 0, c.width, c.height).data;
    let r = 0,
      g = 0,
      b = 0,
      count = 0;

    for (let i = 0; i < data.length; i += 16) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count++;
    }

    r = Math.round(r / count);
    g = Math.round(g / count);
    b = Math.round(b / count);

    callback(r, g, b);
  };
}

function updatePartnerCard(song, artist, artwork, progress_ms, duration_ms) {
  spotifyArtwork.src = artwork ?? "";
  spotifySong.textContent = song;
  spotifyArtist.textContent = artist;
  document.getElementById("spotifyListeningText").textContent =
    `${PARTNER_NAME} is listening to:`;
  document.getElementById("spotifyTimestamp").textContent =
    `${formatMs(progress_ms)} / ${formatMs(duration_ms)}`;
  spotifyCard.classList.remove("hidden");
  partnerSpotify.classList.add("hidden");

  const pct = duration_ms > 0 ? (progress_ms / duration_ms) * 100 : 0;
  spotifyFill.style.width = pct + "%";

  getDominantColor(artwork, (r, g, b) => {
    const color = `rgb(${r}, ${g}, ${b})`;
    document.getElementById("saveBtn").style.background = color;
    spotifyFill.style.background = color;
  });
}

async function loadPartnerSpotify() {
  const { data } = await supabase
    .from("spotify_status")
    .select("*")
    .eq("user_id", PARTNER_ID)
    .maybeSingle();

  if (data) {
    updatePartnerCard(
      data.song,
      data.artist,
      data.artwork,
      data.progress_ms,
      data.duration_ms,
    );
  } else {
    spotifyCard.classList.add("hidden");
    partnerSpotify.classList.remove("hidden");
    partnerSpotify.innerText = `waiting for ${PARTNER_NAME}...`;
  }
}

supabase
  .channel("spotify-live")
  .on(
    "postgres_changes",
    { event: "*", schema: "public", table: "spotify_status" },
    (payload) => {
      const d = payload.new;
      if (d.user_id !== PARTNER_ID) return;
      updatePartnerCard(
        d.song,
        d.artist,
        d.artwork,
        d.progress_ms,
        d.duration_ms,
      );
    },
  )
  .subscribe();

setInterval(updateSpotify, 5000);
silentReconnect();
loadPartnerSpotify();
