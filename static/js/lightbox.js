/* ==========================================================================
   VideoMaMa++ — figure zoom viewer
   --------------------------------------------------------------------------
   Click any .paper-fig to see it enlarged, fitted to the window. Click again
   anywhere (or press Esc, or the close button) to return to the page exactly
   where it was. Dependency-free.
   ========================================================================== */

(function () {
  "use strict";

  function init() {
    const figs = document.querySelectorAll("img.paper-fig");
    if (!figs.length) return;

    const img = document.createElement("img");
    img.className = "lb-img";
    img.alt = "";

    const close = document.createElement("button");
    close.type = "button";
    close.className = "lb-close";
    close.setAttribute("aria-label", "Close");
    close.innerHTML = "&times;";

    const hint = document.createElement("p");
    hint.className = "lb-hint";
    hint.textContent = "Click anywhere or press Esc to go back";

    const box = document.createElement("div");
    box.className = "lightbox";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", "Figure viewer");
    box.hidden = true;
    box.append(img, close, hint);
    document.body.appendChild(box);

    let opener = null;

    function open(fig) {
      opener = fig;
      img.src = fig.currentSrc || fig.src;
      img.alt = fig.alt;
      box.hidden = false;
      document.documentElement.classList.add("lb-open");
      close.focus({ preventScroll: true });
    }

    function shut() {
      box.hidden = true;
      document.documentElement.classList.remove("lb-open");
      // Return focus without scrolling, so the page stays where it was.
      if (opener) opener.focus({ preventScroll: true });
    }

    // Any click inside the viewer (image, backdrop or close button) goes back.
    box.addEventListener("click", shut);
    document.addEventListener("keydown", (e) => {
      if (!box.hidden && e.key === "Escape") shut();
    });

    figs.forEach((fig) => {
      fig.tabIndex = 0;
      fig.setAttribute("role", "button");
      fig.setAttribute("aria-label", (fig.alt || "Figure") + " — open zoomed view");
      fig.addEventListener("click", () => open(fig));
      fig.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(fig); }
      });
    });
  }

  window.addEventListener("DOMContentLoaded", init);
})();
