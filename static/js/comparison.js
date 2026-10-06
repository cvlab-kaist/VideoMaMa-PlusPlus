/* ==========================================================================
   VideoMaMa++ — all-methods grid comparison
   --------------------------------------------------------------------------
   Every visible method side by side on one synchronized timeline. Clip and
   method inventory comes from static/js/data.js (window.VMPP).
   ========================================================================== */

(function () {
  "use strict";

  const V = window.VMPP;

  const state = {
    idx: 0,
    visible: new Set(V.METHODS.filter((m) => m.defaultOn).map((m) => m.id)),
    master: null,
    wantPlaying: true,
  };

  const $ = (sel) => document.querySelector(sel);

  function el(tag, attrs = {}, kids = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") node.className = v;
      else if (k === "html") node.innerHTML = v;
      else if (k === "text") node.textContent = v;
      else node.setAttribute(k, v);
    }
    for (const kid of kids) node.appendChild(kid);
    return node;
  }

  /* ---------- tiles ------------------------------------------------------- */

  function makeTile({ src, title, badge, isOurs }) {
    const tile = el("div", { class: "tile" + (isOurs ? " is-ours" : "") });
    const head = el("div", { class: "tile-head" }, [el("span", { text: title })]);
    if (badge) head.appendChild(el("span", { class: "badge", text: badge }));
    tile.appendChild(head);

    const wrap = el("div", { class: "vid paused" });
    if (src) {
      const v = el("video", { class: "cmp-video", playsinline: "", muted: "", loop: "", preload: "metadata" });
      v.muted = true;
      v.playsInline = true;
      v.src = src;
      wrap.appendChild(v);
      wrap.appendChild(el("div", { class: "overlay" }, [el("div", { class: "disc", html: "&#9654;" })]));
      wrap.addEventListener("click", togglePlay);
    } else {
      wrap.appendChild(el("div", { class: "na", text: "Not available" }));
    }
    tile.appendChild(wrap);
    return tile;
  }

  function buildInputs() {
    const clip = V.CLIPS[state.idx];
    const grid = $("#inputGrid");
    grid.innerHTML = "";
    grid.appendChild(makeTile({ src: V.inputPath(clip, "rgb"), title: "Input video", badge: "RGB" }));
    grid.appendChild(makeTile({ src: V.inputPath(clip, "mask"), title: "Input mask", badge: "Guidance" }));
  }

  function buildMethodRows() {
    const clip = V.CLIPS[state.idx];
    const shown = V.METHODS.filter((m) => state.visible.has(m.id));
    const cols = Math.max(1, shown.length);

    for (const [gridId, kind] of [["#alphaGrid", "pred_alpha"], ["#greenGrid", "pred_greenscreen"]]) {
      const grid = $(gridId);
      grid.innerHTML = "";
      grid.style.setProperty("--cols", String(cols));
      for (const m of shown) {
        grid.appendChild(
          makeTile({
            src: V.hasResult(clip, m.id) ? V.methodPath(clip, m.id, kind) : null,
            title: m.label,
            badge: m.badge,
            isOurs: m.isOurs,
          })
        );
      }
    }
  }

  function buildToggles() {
    const host = $("#methodToggles");
    host.innerHTML = "";
    for (const m of V.METHODS) {
      const on = state.visible.has(m.id);
      const label = el("label", { class: (on ? "on" : "") + (m.isOurs ? " is-ours" : "") });
      const cb = el("input", { type: "checkbox" });
      cb.checked = on;
      cb.addEventListener("change", () => {
        if (cb.checked) state.visible.add(m.id);
        else state.visible.delete(m.id);
        label.classList.toggle("on", cb.checked);
        buildMethodRows();
        attachMaster();
        whenReady().then(() => state.wantPlaying && playAll());
      });
      label.appendChild(cb);
      label.appendChild(document.createTextNode(m.label));
      host.appendChild(label);
    }
  }

  /* ---------- playback ---------------------------------------------------- */

  const allVideos = () => Array.from(document.querySelectorAll(".cmp-video"));

  function whenReady() {
    return Promise.allSettled(
      allVideos().map(
        (v) =>
          new Promise((res) => {
            if (v.readyState >= 2) return res();
            v.addEventListener("loadeddata", res, { once: true });
            v.addEventListener("error", res, { once: true });
          })
      )
    );
  }

  const onMasterPlay = () => setPaused(false);
  const onMasterPause = () => setPaused(true);

  function attachMaster() {
    const next = allVideos()[0] || null;

    // Toggling methods rebuilds only the method rows, so the master (the input
    // RGB player, first in the DOM) usually survives. Re-binding it every time
    // would stack duplicate listeners, so detach the old one first and bail if
    // nothing changed.
    if (state.master === next) return;
    if (state.master) {
      state.master.removeEventListener("timeupdate", onMasterTime);
      state.master.removeEventListener("play", onMasterPlay);
      state.master.removeEventListener("pause", onMasterPause);
    }

    state.master = next;
    if (!state.master) return;
    const m = state.master;
    m.addEventListener("timeupdate", onMasterTime);
    m.addEventListener("play", onMasterPlay);
    m.addEventListener("pause", onMasterPause);

    const onMeta = () => {
      updateTime();
      if (m.videoWidth && m.videoHeight) {
        document.documentElement.style.setProperty("--video-ar", String(m.videoWidth / m.videoHeight));
      }
    };
    if (m.readyState >= 1) onMeta();
    else m.addEventListener("loadedmetadata", onMeta, { once: true });
  }

  function onMasterTime() {
    const m = state.master;
    if (!m) return;
    for (const v of allVideos()) {
      if (v === m) continue;
      if (Number.isFinite(v.duration) && Math.abs(v.currentTime - m.currentTime) > 0.15) {
        try { v.currentTime = m.currentTime; } catch (_) {}
      }
    }
    updateTime();
  }

  function updateTime() {
    const m = state.master;
    $("#seekBar").value =
      m && Number.isFinite(m.duration) && m.duration > 0
        ? Math.round((m.currentTime / m.duration) * 1000)
        : 0;
  }

  function setPaused(paused) {
    document.querySelectorAll(".vid").forEach((w) => {
      if (w.querySelector("video")) w.classList.toggle("paused", paused);
    });
    $("#playBtn").textContent = paused ? "Play" : "Pause";
  }

  function playAll() {
    state.wantPlaying = true;
    for (const v of allVideos()) v.play().catch(() => {});
    setPaused(false);
  }
  function pauseAll() {
    state.wantPlaying = false;
    for (const v of allVideos()) v.pause();
    setPaused(true);
  }
  const isPlaying = () => state.master && !state.master.paused;
  function togglePlay() { isPlaying() ? pauseAll() : playAll(); }
  function restartAll() {
    for (const v of allVideos()) { try { v.currentTime = 0; } catch (_) {} }
    playAll();
  }

  /* ---------- clip switching ---------------------------------------------- */

  let dots = null;

  function loadClip(i, dir) {
    const prev = state.idx;
    state.idx = (i + V.CLIPS.length) % V.CLIPS.length;
    if (dots) dots.set(state.idx);
    if (dir !== undefined && state.idx !== prev) {
      for (const g of [$("#inputGrid"), $("#alphaGrid"), $("#greenGrid")]) V.slideIn(g, dir);
    }

    buildInputs();
    buildMethodRows();
    attachMaster();
    whenReady().then(() => state.wantPlaying && playAll());
  }

  /* ---------- theme ------------------------------------------------------- */

  function initTheme() {
    const btn = $("#themeToggle");
    if (!btn) return;
    let stored = null;
    try { stored = localStorage.getItem("vmpp-theme"); } catch (_) {}
    if (stored === "dark" || stored === "light") document.documentElement.setAttribute("data-theme", stored);

    const isDark = () =>
      document.documentElement.getAttribute("data-theme") === "dark" ||
      (!document.documentElement.hasAttribute("data-theme") &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);

    const paint = () => {
      btn.textContent = isDark() ? "☀" : "☾";
      btn.setAttribute("aria-label", isDark() ? "Switch to light theme" : "Switch to dark theme");
    };
    paint();

    btn.addEventListener("click", () => {
      const next = isDark() ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("vmpp-theme", next); } catch (_) {}
      paint();
    });
  }

  /* ---------- wiring ------------------------------------------------------ */

  window.addEventListener("DOMContentLoaded", () => {
    initTheme();

    // Each BibTeX block has its own Copy button, which copies its own <pre>.
    document.querySelectorAll(".bibtex-wrap").forEach((wrap) => {
      const copyBtn = wrap.querySelector(".copy-btn");
      const block = wrap.querySelector("pre.bibtex");
      if (!copyBtn || !block) return;
      copyBtn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(block.textContent.trim());
          copyBtn.textContent = "Copied";
        } catch (_) {
          copyBtn.textContent = "Press ⌘C";
        }
        setTimeout(() => (copyBtn.textContent = "Copy"), 1600);
      });
    });

    if (!$("#alphaGrid")) return; // grid section not on this page

    buildToggles();
    dots = V.buildDots($("#gridDots"), V.CLIPS.length, (i) => {
      if (i !== state.idx) loadClip(i, i > state.idx ? 1 : -1);
    });
    loadClip(0);

    $("#prevBtn").addEventListener("click", () => loadClip(state.idx - 1, -1));
    $("#nextBtn").addEventListener("click", () => loadClip(state.idx + 1, 1));
    $("#playBtn").addEventListener("click", togglePlay);
    $("#restartBtn").addEventListener("click", restartAll);

    $("#seekBar").addEventListener("input", (e) => {
      const m = state.master;
      if (!m || !Number.isFinite(m.duration)) return;
      const t = (parseInt(e.target.value, 10) / 1000) * m.duration;
      for (const v of allVideos()) { try { v.currentTime = t; } catch (_) {} }
      updateTime();
    });

    document.addEventListener("keydown", (e) => {
      const tag = e.target.tagName;
      if (tag === "SELECT" || tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.code === "Space") { e.preventDefault(); togglePlay(); }
      else if (e.code === "ArrowLeft") loadClip(state.idx - 1, -1);
      else if (e.code === "ArrowRight") loadClip(state.idx + 1, 1);
      else if (e.key === "r" || e.key === "R") restartAll();
    });
  });
})();
