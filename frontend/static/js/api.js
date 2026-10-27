// Centralized API Client & Sound Engine with Calming Ambient Music Synthesizer
const API_BASE = "";

class ApiClient {
  constructor() {
    this.token = localStorage.getItem("ipfha_token") || null;
    this.user = JSON.parse(localStorage.getItem("ipfha_user") || "null");
  }

  setAuth(token, user) {
    this.token = token;
    this.user = user;
    localStorage.setItem("ipfha_token", token);
    localStorage.setItem("ipfha_user", JSON.stringify(user));
  }

  clearAuth() {
    this.token = null;
    this.user = null;
    localStorage.removeItem("ipfha_token");
    localStorage.removeItem("ipfha_user");
  }

  async request(endpoint, options = {}) {
    const headers = options.headers || {};
    const token = this.token || localStorage.getItem("ipfha_token");
    if (token) {
      this.token = token;
      headers["Authorization"] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData) && options.body && typeof options.body === "object") {
      headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(options.body);
    }

    options.headers = headers;
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, options);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401 && !endpoint.includes("/auth/login") && !endpoint.includes("/auth/register")) {
          if (this.token || localStorage.getItem("ipfha_token")) {
            this.clearAuth();
            if (window.location.hash === "#auth") {
              try { history.replaceState(null, "", window.location.pathname); } catch (e) {}
            }
            window.location.reload();
          }
        }
        throw new Error(data.detail || data.error || "An error occurred");
      }
      return data;
    } catch (err) {
      console.error(`API Error on ${endpoint}:`, err);
      throw err;
    }
  }

  get(endpoint) {
    return this.request(endpoint, { method: "GET" });
  }

  post(endpoint, body) {
    return this.request(endpoint, { method: "POST", body });
  }

  delete(endpoint) {
    return this.request(endpoint, { method: "DELETE" });
  }
}

export const api = new ApiClient();

// Toast Notifications
export function showToast(message, type = "info") {
  const host = document.getElementById("toastHost");
  if (!host) return;

  const toast = document.createElement("div");
  toast.className = "toast";
  
  let icon = "fa-circle-info";
  if (type === "success") icon = "fa-circle-check";
  if (type === "warning") icon = "fa-triangle-exclamation";
  if (type === "error") icon = "fa-circle-xmark";

  toast.innerHTML = `<i class="fa-solid ${icon}"></i><span>${message}</span>`;
  host.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Web Audio API Synthesizer with Calming Ambient Music Engine
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.musicNodes = [];
    this.musicInterval = null;
    this.isMusicPlaying = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
  }

  playClick() {
    try {
      this.playBeep(650, 0.06);
    } catch (e) {}
  }

  playBeep(freq = 880, duration = 0.15) {
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {}
  }

  playVictory() {
    try {
      this.init();
      if (!this.ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        setTimeout(() => this.playBeep(freq, 0.22), idx * 120);
      });
    } catch (e) {}
  }

  // Calming Ambient Harmonic Music Synthesizer (Zero asset dependency)
  startCalmingMusic() {
    try {
      this.init();
      if (!this.ctx || this.isMusicPlaying) return;
      this.isMusicPlaying = true;

      const chords = [
        [220.0, 329.63, 392.0, 493.88],  // A min 9
        [174.61, 261.63, 329.63, 392.0], // F maj 7
        [196.0, 293.66, 349.23, 440.0],  // G sus 2
        [164.81, 246.94, 329.63, 392.0]  // E min 7
      ];

      let chordIdx = 0;

      const playChord = () => {
        if (!this.isMusicPlaying || !this.ctx) return;
        const freqs = chords[chordIdx % chords.length];
        chordIdx++;

        const now = this.ctx.currentTime;
        freqs.forEach(freq => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const filter = this.ctx.createBiquadFilter();

          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, now);

          filter.type = "lowpass";
          filter.frequency.setValueAtTime(450, now);

          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(0.04, now + 2.0);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 6.0);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start(now);
          osc.stop(now + 6.2);
        });
      };

      playChord();
      this.musicInterval = setInterval(playChord, 5800);
    } catch (e) {
      console.warn("Could not start ambient music:", e);
    }
  }

  stopCalmingMusic() {
    this.isMusicPlaying = false;
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }
}

export const sound = new SoundEngine();
