/* ==========================================================================
   VideoMaMa++ — shared clip/method inventory
   --------------------------------------------------------------------------
   Consumed by pair.js, slider.js and comparison.js. Regenerate the CLIPS list with
   `python3 tools/regenerate.py` after adding or removing clips.

   On-disk layout:
     videos/<clip>/rgb.mp4
     videos/<clip>/mask.mp4
     videos/<clip>/<Method>/pred_alpha.mp4
     videos/<clip>/<Method>/pred_greenscreen.mp4
   ========================================================================== */

window.VMPP = (function () {
  const VIDEO_ROOT = "videos";

  const OURS = {
    id: "VideoMaMa++",
    label: "VideoMaMa++",
    short: "Ours",
    badge: "Ours",
    isOurs: true,
    defaultOn: true,
  };

  const BASELINES = [
    { id: "VideoMaMa",     label: "VideoMaMa",         short: "VideoMaMa",    badge: "Baseline", defaultOn: true },
    { id: "MatAnyone2",    label: "MatAnyone-v2",      short: "MatAnyone-v2", badge: "Baseline", defaultOn: true },
    { id: "MatAnyone",     label: "MatAnyone",         short: "MatAnyone",    badge: "Baseline", defaultOn: false },
    { id: "MaGGIe",        label: "MaGGIe",            short: "MaGGIe",       badge: "Baseline", defaultOn: false },
    { id: "MGM_inthewild", label: "MGM (in-the-wild)", short: "MGM",          badge: "Baseline", defaultOn: false },
  ];

  const METHODS = [OURS, ...BASELINES];

  /* ---- regenerate.py rewrites the block below ---- */
  const DATA = {
    "clips": [
      "0_f8229280",
      "1_12620635_2160_3840_60fps",
      "2_12297614_1080_1920_24fps",
      "2_5928006-uhd_3840_2160_25fps",
      "3_13098362_3840_2160_30fps",
      "5_5274907-uhd_4096_2160_25fps",
      "12106373-uhd_2160_3840_60fps",
      "2794235-hd_1920_1080_24fps",
      "7667636-uhd_2160_3840_30fps"
    ],
    "availability": null
  };
  /* ---- end generated block ---- */

  // Clip order shared by every viewer (dot 1, dot 2, ...). Clips listed here
  // come first, in this order; any other clip in DATA follows in DATA order.
  const ORDER = [
    "1_12620635_2160_3840_60fps",
    "5_5274907-uhd_4096_2160_25fps",
    "0_f8229280",
    "2_12297614_1080_1920_24fps",
    "3_13098362_3840_2160_30fps",
    "2_5928006-uhd_3840_2160_25fps",
    "7667636-uhd_2160_3840_30fps",
    "12106373-uhd_2160_3840_60fps",
    "2794235-hd_1920_1080_24fps",
  ];

  const CLIPS = [
    ...ORDER.filter((c) => DATA.clips.includes(c)),
    ...DATA.clips.filter((c) => !ORDER.includes(c)),
  ];

  // Encode each segment so method folders containing "+" resolve on any host.
  const vpath = (...segs) => [VIDEO_ROOT, ...segs].map(encodeURIComponent).join("/");

  const methodPath = (clip, methodId, kind) => vpath(clip, methodId, kind + ".mp4");
  const inputPath = (clip, kind) => vpath(clip, kind + ".mp4");

  const hasResult = (clip, methodId) =>
    DATA.availability ? Boolean(DATA.availability[clip] && DATA.availability[clip][methodId]) : true;

  // "3_13098362_3840_2160_30fps" -> "13098362_3840_2160_30fps"
  const clipLabel = (clip) => clip.replace(/^\d+_/, "");

  const byId = (id) => METHODS.find((m) => m.id === id) || null;

  /**
   * Carousel-style dot pagination. Dots are position-only — they never print a
   * clip name, so the source footage stays unidentified.
   *
   * @param {HTMLElement} host   container to fill with dot buttons
   * @param {number} count       how many dots
   * @param {(i:number)=>void} onPick  called with the clicked index
   * @returns {{set:(i:number)=>void}}
   */
  function buildDots(host, count, onPick) {
    host.innerHTML = "";
    host.setAttribute("role", "tablist");
    const dots = [];
    for (let i = 0; i < count; i++) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "dot";
      b.setAttribute("role", "tab");
      b.setAttribute("aria-label", `Clip ${i + 1} of ${count}`);
      b.addEventListener("click", () => onPick(i));
      host.appendChild(b);
      dots.push(b);
    }
    return {
      set(idx) {
        dots.forEach((b, i) => {
          const on = i === idx;
          b.classList.toggle("on", on);
          b.setAttribute("aria-selected", on ? "true" : "false");
          b.tabIndex = on ? 0 : -1;
        });
      },
    };
  }

  /** Direction-aware slide, replayed from the start on every call. */
  function slideIn(node, dir) {
    node.classList.remove("slide-next", "slide-prev");
    void node.offsetWidth; // force reflow so the animation restarts
    node.classList.add(dir >= 0 ? "slide-next" : "slide-prev");
  }

  return { VIDEO_ROOT, OURS, BASELINES, METHODS, CLIPS, vpath, methodPath, inputPath,
           hasResult, clipLabel, byId, buildDots, slideIn };
})();
