const supabase = require("./supabase");
const { ipcRenderer, shell } = require("electron");

const displayNote      = document.getElementById("displayNote");
const noteInput        = document.getElementById("noteInput");
const saveBtn          = document.getElementById("saveBtn");
const spotifyLoginBtn  = document.getElementById("spotifyLogin");
const typingIndicator  = document.getElementById("typingIndicator");
const spotifyCard      = document.getElementById("spotifyCard");
const spotifyArtwork   = document.getElementById("spotifyArtwork");
const spotifySong      = document.getElementById("spotifySong");
const spotifyArtist    = document.getElementById("spotifyArtist");
const spotifyFill      = document.getElementById("spotifyProgressFill");
const myStatusDot      = document.getElementById("myStatusDot");
const partnerStatusDot = document.getElementById("partnerStatusDot");
const partnerSpotify   = document.getElementById("partnerSpotify");

const clickSound    = new Audio("pop_sound.mp3");
const petClickSound = new Audio("meow.mp3");
const receiveSound  = new Audio("receive.mp3");

const clientId    = "93dd46a5d86d49d0bb69c4dfce6dad04";
const redirectUri = "myapp://callback";
const scopes      = "user-read-currently-playing user-read-playback-state";

// =====================
// NAMES + IDS
// =====================
const MY_ID        = "min";
const PARTNER_ID   = "diana";
const MY_NAME      = "min";
const PARTNER_NAME = "diana";

// =====================
// SOUNDS
// =====================
receiveSound.volume = 0.6;
let lastReceiveTime = 0;

// =====================
// PKCE HELPERS
// =====================
function generateCodeVerifier() {
    const array = new Uint8Array(64);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array))
        .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function generateCodeChallenge(verifier) {
    const data   = new TextEncoder().encode(verifier);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
        .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

// =====================
// SPOTIFY LOGIN
// =====================
spotifyLoginBtn.addEventListener("click", async () => {
    const verifier  = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    localStorage.setItem("code_verifier", verifier);

    const authUrl =
        "https://accounts.spotify.com/authorize" +
        "?client_id="                 + clientId +
        "&response_type=code" +
        "&redirect_uri="              + encodeURIComponent(redirectUri) +
        "&scope="                     + encodeURIComponent(scopes) +
        "&code_challenge_method=S256" +
        "&code_challenge="            + challenge;

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
            grant_type:    "authorization_code",
            code,
            redirect_uri:  redirectUri,
            client_id:     clientId,
            code_verifier: verifier,
        }),
    });

    const data = await res.json();
    if (data.access_token) {
        localStorage.setItem("spotify_token",         data.access_token);
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
            grant_type:    "refresh_token",
            refresh_token: refreshToken,
            client_id:     clientId,
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
    .on("postgres_changes", { event: "*", schema: "public", table: "notes" }, (payload) => {
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
    })
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
    .on("postgres_changes", { event: "*", schema: "public", table: "status" }, (payload) => {
        const d = payload.new;
        if (d.user_id !== PARTNER_ID) return;

        if (d.status === "typing") {
            partnerStatusDot.className = "status-dot typing";
            typingIndicator.classList.remove("hidden");
        } else if (d.status === "online") {
            partnerStatusDot.className = "status-dot online";
            typingIndicator.classList.add("hidden");
        } else {
            partnerStatusDot.className = "status-dot";
            typingIndicator.classList.add("hidden");
        }
    })
    .subscribe();

// =====================
// TIME
// =====================
function updateTimes() {
    const now = new Date();

    document.getElementById("myTime").innerText = "UK " + new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit", minute: "2-digit", timeZone: "Europe/London",
    }).format(now);

    document.getElementById("partnerTime").innerText = "DE " + new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin",
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

    const res = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
        headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401) {
        await refreshAccessToken();
        return;
    }

    if (res.status === 204 || res.status > 400) return;

    const data = await res.json();
    if (!data || !data.item) return;

    const song    = data.item.name;
    const artist  = data.item.artists[0].name;
    const artwork = data.item.album.images[0]?.url ?? "";

    // Show your own song as plain text
document.getElementById("mySpotify").innerText = `you: ♫ ${song} - ${artist}`;


    // Push to Supabase including artwork so partner can show the card
    supabase.from("spotify_status").upsert({
        user_id:    MY_ID,
        song,
        artist,
        artwork,
        updated_at: new Date().toISOString(),
    });
}

// =====================
// SPOTIFY — show PARTNER's song as artwork card
// =====================
function updatePartnerCard(song, artist, artwork) {
    spotifyArtwork.src        = artwork ?? "";
    spotifySong.textContent   = song;
    spotifyArtist.textContent = artist;
    spotifyCard.classList.remove("hidden");
}

async function loadPartnerSpotify() {
    const { data } = await supabase
        .from("spotify_status")
        .select("*")
        .eq("user_id", PARTNER_ID)
        .maybeSingle();

    if (data) {
        updatePartnerCard(data.song, data.artist, data.artwork);
    } else {
        partnerSpotify.innerText = `waiting for ${PARTNER_NAME}...`;
    }
}

supabase
    .channel("spotify-live")
    .on("postgres_changes", { event: "*", schema: "public", table: "spotify_status" }, (payload) => {
        const d = payload.new;
        if (d.user_id !== PARTNER_ID) return;
        updatePartnerCard(d.song, d.artist, d.artwork);
    })
    .subscribe();

setInterval(updateSpotify, 10000);
silentReconnect();
loadPartnerSpotify();