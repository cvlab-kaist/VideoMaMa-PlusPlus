/* ==========================================================================
   VideoMaMa++ — hero pair: VideoMaMa vs VideoMaMa++
   --------------------------------------------------------------------------
   Input, VideoMaMa and VideoMaMa++ on one timeline.
   Dependency-free.
   ========================================================================== */

(function () {
  "use strict";

  const V = window.VMPP;

  const INPUT = { id: "__rgb__", label: "Input video", badge: "RGB", input: true };
  const LEFT = { id: "VideoMaMa", label: "VideoMaMa", badge: "Chunk-wise baseline" };
  const RIGHT = { id: "VideoMaMa++", label: "VideoMaMa++", badge: "Ours", ours: true };

  // Resync a follower once it drifts further than this from the master.
  const DRIFT = 0.15;

  function el(tag, attrs = {}, kids = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") node.className = v;
      else if (k === "text") node.textContent = v;
      else if (k === "html") node.innerHTML = v;
      else node.setAttribute(k, v);
    }
    for (const kid of kids) node.appendChild(kid);
    return node;
  }

  function mkVideo() {
    const v = el("video", { playsinline: "", muted: "", loop: "", preload: "metadata" });
    v.muted = true;
    v.playsInline = true;
    return v;
  }

  function init() {
    const host = document.getElementById("heroPair");
    if (!host) return;

    const dotsHost = document.getElementById("hpDots");
    const prevBtn = document.getElementById("hpPrev");
    const nextBtn = document.getElementById("hpNext");
    const kindWrap = document.getElementById("hpKind");
    const playBtn = document.getElementById("hpPlay");
    const restartBtn = document.getElementById("hpRestart");
    const seek = document.getElementById("hpSeek");

    const clips = V.CLIPS;
    const state = { idx: 0, kind: "pred_alpha" };

    // --- players -----------------------------------------------------------
    const sides = [INPUT, LEFT, RIGHT].map((m) => {
      const video = mkVideo();
      const tile = el("figure", { class: "hp-tile" + (m.ours ? " is-ours" : "") + (m.input ? " is-input" : "") }, [
        el("figcaption", { class: "hp-cap" }, [
          el("span", { class: "hp-name", text: m.label }),
          el("span", { class: "hp-badge", text: m.badge }),
        ]),
        el("div", { class: "hp-vid" }, [video, el("div", { class: "hp-play" }, [el("div", { class: "hp-disc", html: "&#9654;" })])]),
      ]);
      tile.querySelector(".hp-vid").addEventListener("click", () => toggle());
      host.appendChild(tile);
      return { method: m, video, tile };
    });

    // The input video drives the timeline; the two mattes follow it.
    const master = sides[0].video;

    function seekAll(t) {
      for (const s of sides) { try { s.video.currentTime = t; } catch (_) {} }
    }

    function paint(paused) {
      playBtn.textContent = paused ? "Play" : "Pause";
      for (const s of sides) s.tile.classList.toggle("paused", paused);
    }

    function play() {
      for (const s of sides) s.video.play().catch(() => {});
      paint(false);
    }
    function pause() {
      for (const s of sides) s.video.pause();
      paint(true);
    }
    function toggle() { master.paused ? play() : pause(); }

    // Size the row to this clip's shape (see .hp-stage in style.css).
    master.addEventListener("loadedmetadata", () => {
      if (master.videoWidth && master.videoHeight) {
        host.style.setProperty("--ar", (master.videoWidth / master.videoHeight).toFixed(4));
      }
    });
    master.addEventListener("play", () => paint(false));
    master.addEventListener("pause", () => paint(true));
    master.addEventListener("timeupdate", () => {
      const d = master.duration;
      for (const s of sides.slice(1)) {
        if (Number.isFinite(s.video.duration) && Math.abs(s.video.currentTime - master.currentTime) > DRIFT) {
          try { s.video.currentTime = master.currentTime; } catch (_) {}
        }
      }
      if (Number.isFinite(d) && d > 0) seek.value = Math.round((master.currentTime / d) * 1000);
    });

    // --- clip loading ------------------------------------------------------
    const clip = () => clips[state.idx];

    function refresh(dir) {
      dots.set(state.idx);
      if (dir !== undefined) V.slideIn(host, dir);
      for (const s of sides) {
        s.video.src = s.method.input
          ? V.inputPath(clip(), "rgb")
          : V.methodPath(clip(), s.method.id, state.kind);
        s.video.load();
      }
      Promise.allSettled(
        sides.map((s) => new Promise((res) => {
          if (s.video.readyState >= 2) return res();
          s.video.addEventListener("loadeddata", res, { once: true });
          s.video.addEventListener("error", res, { once: true });
        }))
      ).then(() => play());
    }

    const dots = V.buildDots(dotsHost, clips.length, (i) => goTo(i));

    function goTo(i, dir) {
      if (i === state.idx) return;
      const d = dir !== undefined ? dir : i > state.idx ? 1 : -1;
      state.idx = (i + clips.length) % clips.length;
      refresh(d);
    }
    function step(d) { goTo((state.idx + d + clips.length) % clips.length, d); }

    prevBtn.addEventListener("click", () => step(-1));
    nextBtn.addEventListener("click", () => step(1));
    dotsHost.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); dotsHost.querySelector(".dot.on")?.focus(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); step(1); dotsHost.querySelector(".dot.on")?.focus(); }
    });

    kindWrap.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-kind]");
      if (!btn) return;
      state.kind = btn.dataset.kind;
      kindWrap.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b === btn));
      refresh();
    });

    playBtn.addEventListener("click", () => toggle());
    restartBtn.addEventListener("click", () => {
      seekAll(0);
      play();
    });
    seek.addEventListener("input", () => {
      const d = master.duration;
      if (!Number.isFinite(d)) return;
      seekAll((parseInt(seek.value, 10) / 1000) * d);
    });

    refresh();
  }

  window.addEventListener("DOMContentLoaded", init);
})();
