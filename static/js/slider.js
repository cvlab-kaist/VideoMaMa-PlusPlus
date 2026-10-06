/* ==========================================================================
   VideoMaMa++ — drag-divider video comparison
   --------------------------------------------------------------------------
   Two <video> elements stacked in a box. The front one is clipped to the right
   of the divider, so dragging sweeps between them. Dependency-free.

   The divider is a real <input type="range"> laid over the stage at zero
   opacity: that gives pointer drag, tap-to-jump, touch and full keyboard
   support without reimplementing any of it.
   ========================================================================== */

(function () {
  "use strict";

  const V = window.VMPP;

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

  /* ---------------------------------------------------------------------- */

  class VideoSlider {
    /**
     * @param {HTMLElement} root  empty container to build into
     * @param {object} opts  { start: 0-100, onReady: fn }
     */
    constructor(root, opts = {}) {
      this.root = root;
      this.opts = opts;
      this.pos = opts.start != null ? opts.start : 50;
      this.wantPlaying = true;
      this.build();
    }

    build() {
      const r = this.root;
      r.classList.add("vslider");

      this.back = mkVideo();
      this.front = mkVideo();

      this.frontWrap = el("div", { class: "vs-front" }, [this.front]);
      this.tagL = el("span", { class: "vs-tag vs-tag-l" });
      this.tagR = el("span", { class: "vs-tag vs-tag-r" });

      this.handle = el("div", { class: "vs-handle", "aria-hidden": "true" }, [
        el("span", { class: "vs-grip", html: "&#10096;&nbsp;&#10097;" }),
      ]);

      this.range = el("input", {
        type: "range",
        min: "0",
        max: "100",
        step: "0.1",
        class: "vs-range",
        "aria-label": "Drag to compare",
      });
      this.range.value = String(this.pos);

      this.overlay = el("div", { class: "vs-play" }, [el("div", { class: "vs-disc", html: "&#9654;" })]);

      r.appendChild(this.back);
      r.appendChild(this.frontWrap);
      r.appendChild(this.tagL);
      r.appendChild(this.tagR);
      r.appendChild(this.handle);
      r.appendChild(this.overlay);
      r.appendChild(this.range);

      this.setPos(this.pos);

      this.range.addEventListener("input", () => this.setPos(parseFloat(this.range.value)));

      // Tap (not drag) toggles playback. The range swallows clicks, so watch
      // for a pointer that went down and up without travelling.
      let downX = null;
      this.range.addEventListener("pointerdown", (e) => { downX = e.clientX; });
      this.range.addEventListener("pointerup", (e) => {
        if (downX !== null && Math.abs(e.clientX - downX) < 4) this.toggle();
        downX = null;
      });

      // Keep the two players locked together.
      this.back.addEventListener("timeupdate", () => this.sync());
      this.back.addEventListener("play", () => this.paint(false));
      this.back.addEventListener("pause", () => this.paint(true));
      this.back.addEventListener("loadedmetadata", () => this.applyAspect());
    }

    setPos(p) {
      this.pos = Math.max(0, Math.min(100, p));
      this.root.style.setProperty("--vs-pos", this.pos + "%");
    }

    applyAspect() {
      const v = this.back;
      if (v.videoWidth && v.videoHeight) {
        this.root.style.setProperty("--vs-ar", String(v.videoWidth / v.videoHeight));
      }
    }

    /**
     * @param {{src:string,label:string,ours?:boolean}} left   shown left of the divider
     * @param {{src:string,label:string,ours?:boolean}} right  shown right of the divider
     */
    load(left, right) {
      this.back.src = left.src;
      this.front.src = right.src;
      this.tagL.textContent = left.label;
      this.tagR.textContent = right.label;
      this.tagL.classList.toggle("is-ours", Boolean(left.ours));
      this.tagR.classList.toggle("is-ours", Boolean(right.ours));

      this.ready().then(() => {
        this.applyAspect();
        if (this.wantPlaying) this.play();
        if (this.opts.onReady) this.opts.onReady(this);
      });
    }

    ready() {
      return Promise.allSettled(
        [this.back, this.front].map(
          (v) =>
            new Promise((res) => {
              if (v.readyState >= 2) return res();
              v.addEventListener("loadeddata", res, { once: true });
              v.addEventListener("error", res, { once: true });
            })
        )
      );
    }

    sync() {
      const a = this.back, b = this.front;
      if (Number.isFinite(b.duration) && Math.abs(b.currentTime - a.currentTime) > 0.15) {
        try { b.currentTime = a.currentTime; } catch (_) {}
      }
      if (this.opts.onTime) this.opts.onTime(a);
    }

    paint(paused) {
      this.root.classList.toggle("paused", paused);
      if (this.opts.onPlayState) this.opts.onPlayState(paused);
    }

    play() {
      this.wantPlaying = true;
      this.back.play().catch(() => {});
      this.front.play().catch(() => {});
      this.paint(false);
    }
    pause() {
      this.wantPlaying = false;
      this.back.pause();
      this.front.pause();
      this.paint(true);
    }
    toggle() { this.back.paused ? this.play() : this.pause(); }
    restart() {
      for (const v of [this.back, this.front]) { try { v.currentTime = 0; } catch (_) {} }
      this.play();
    }
    seekTo(t) {
      for (const v of [this.back, this.front]) { try { v.currentTime = t; } catch (_) {} }
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Hero teaser: input RGB  vs  our greenscreen                             */
  /* ---------------------------------------------------------------------- */

  function initTeaser() {
    const host = document.getElementById("teaserSlider");
    if (!host) return;
    const clip = host.dataset.clip || V.CLIPS[0];
    const s = new VideoSlider(host, { start: 45 });
    s.load(
      { src: V.inputPath(clip, "rgb"), label: "Input" },
      { src: V.methodPath(clip, V.OURS.id, "pred_greenscreen"), label: "VideoMaMa++", ours: true }
    );
  }

  /* ---------------------------------------------------------------------- */
  /* Main section: ours vs a chosen baseline                                 */
  /* ---------------------------------------------------------------------- */

  function initMain() {
    const host = document.getElementById("sliderStage");
    if (!host) return;

    const prevBtn = document.getElementById("scPrev");
    const nextBtn = document.getElementById("scNext");
    const dotsHost = document.getElementById("scDots");
    const baseSel = document.getElementById("scBaseline");
    const kindWrap = document.getElementById("scKind");
    const playBtn = document.getElementById("scPlay");
    const restartBtn = document.getElementById("scRestart");
    const seek = document.getElementById("scSeek");

    const state = {
      idx: 0,
      baseline: "MatAnyone2",
      kind: "pred_greenscreen",
    };

    const slider = new VideoSlider(host, {
      start: 50,
      onTime: (v) => {
        seek.value =
          Number.isFinite(v.duration) && v.duration > 0
            ? Math.round((v.currentTime / v.duration) * 1000)
            : 0;
      },
      onPlayState: (paused) => { playBtn.textContent = paused ? "Play" : "Pause"; },
    });

    // Baseline dropdown: the input video, then every competing method
    baseSel.appendChild(el("option", { value: "__rgb__", text: "Input video (RGB)" }));
    for (const m of V.BASELINES) {
      baseSel.appendChild(el("option", { value: m.id, text: m.label }));
    }
    baseSel.value = state.baseline;

    const clip = () => V.CLIPS[state.idx];

    function leftSide() {
      if (state.baseline === "__rgb__") {
        return { src: V.inputPath(clip(), "rgb"), label: "Input video" };
      }
      const m = V.byId(state.baseline);
      return { src: V.methodPath(clip(), m.id, state.kind), label: m.label };
    }

    const dots = V.buildDots(dotsHost, V.CLIPS.length, (i) => goTo(i));

    function refresh(dir) {
      dots.set(state.idx);
      if (dir !== undefined) V.slideIn(host, dir);
      slider.load(leftSide(), {
        src: V.methodPath(clip(), V.OURS.id, state.kind),
        label: "VideoMaMa++",
        ours: true,
      });
    }

    function goTo(i, dir) {
      if (i === state.idx) return;
      const d = dir !== undefined ? dir : i > state.idx ? 1 : -1;
      state.idx = (i + V.CLIPS.length) % V.CLIPS.length;
      refresh(d);
    }

    function step(d) {
      goTo((state.idx + d + V.CLIPS.length) % V.CLIPS.length, d);
    }

    prevBtn.addEventListener("click", () => step(-1));
    nextBtn.addEventListener("click", () => step(1));

    // Arrow keys move between clips while the dot strip has focus.
    dotsHost.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); dotsHost.querySelector(".dot.on")?.focus(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); step(1); dotsHost.querySelector(".dot.on")?.focus(); }
    });
    baseSel.addEventListener("change", () => { state.baseline = baseSel.value; refresh(); });

    kindWrap.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-kind]");
      if (!btn) return;
      state.kind = btn.dataset.kind;
      kindWrap.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b === btn));
      refresh();
    });

    playBtn.addEventListener("click", () => slider.toggle());
    restartBtn.addEventListener("click", () => slider.restart());
    seek.addEventListener("input", () => {
      const d = slider.back.duration;
      if (!Number.isFinite(d)) return;
      slider.seekTo((parseInt(seek.value, 10) / 1000) * d);
    });

    refresh();
  }

  window.addEventListener("DOMContentLoaded", () => {
    initTeaser();
    initMain();
  });
})();
