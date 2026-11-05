/* Agent Flight Deck — app shell: tabs, hash routing, theme toggle. */
(function (AFD) {
  "use strict";
  const { h } = AFD.ui;

  const VIEWS = [
    { id: "recorder", label: "Flight Recorder", mod: () => AFD.recorder },
    { id: "loadsheet", label: "Load Sheet", mod: () => AFD.loadsheet },
  ];

  function boot() {
    const tabs = document.getElementById("tabs");
    const main = document.getElementById("main");
    const mounted = new Set();
    const panes = {};
    const buttons = {};

    for (const v of VIEWS) {
      panes[v.id] = h("section.view", { id: "view-" + v.id, role: "tabpanel", "aria-labelledby": "tab-" + v.id, hidden: true });
      main.appendChild(panes[v.id]);
      buttons[v.id] = h("button.tab", { type: "button", role: "tab", id: "tab-" + v.id, "aria-controls": "view-" + v.id, "aria-selected": "false", onclick: () => go(v.id) }, h("i.tab-dot"), v.label);
      tabs.appendChild(buttons[v.id]);
    }

    function show(id) {
      if (!panes[id]) id = VIEWS[0].id;
      for (const v of VIEWS) {
        const on = v.id === id;
        panes[v.id].hidden = !on;
        buttons[v.id].setAttribute("aria-selected", String(on));
        if (!on && mounted.has(v.id) && v.mod().onHide) v.mod().onHide();
      }
      const v = VIEWS.find((x) => x.id === id);
      if (!mounted.has(id)) {
        mounted.add(id);
        try {
          v.mod().mount(panes[id]);
        } catch (err) {
          panes[id].appendChild(h("div.notice.err", "This view failed to start: " + (err && err.message ? err.message : err)));
          console.error(err);
        }
      } else if (v.mod().onShow) v.mod().onShow();
      document.title = v.label === "Flight Recorder" ? "Agent Flight Deck" : "Agent Flight Deck · " + v.label;
      AFD.ui.setPref("tab", id);
    }

    function go(id) {
      if (location.hash !== "#" + id) location.hash = id;
      else show(id);
    }

    window.addEventListener("hashchange", () => show(location.hash.slice(1)));
    const start = location.hash.slice(1) || AFD.ui.pref("tab", VIEWS[0].id);
    show(start);

    // theme toggle: follows the system until the viewer picks one
    const themeBtn = document.getElementById("theme");
    const applyTheme = (t) => {
      if (t) document.documentElement.setAttribute("data-theme", t);
      else document.documentElement.removeAttribute("data-theme");
      const dark = t ? t === "dark" : window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      themeBtn.innerHTML = AFD.ui.ICONS[dark ? "sun" : "moon"];
      themeBtn.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
    };
    let theme = AFD.ui.pref("theme", null);
    applyTheme(theme);
    themeBtn.addEventListener("click", () => {
      const dark = document.documentElement.getAttribute("data-theme") ? document.documentElement.getAttribute("data-theme") === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
      theme = dark ? "light" : "dark";
      AFD.ui.setPref("theme", theme);
      applyTheme(theme);
    });

    // dropping a file anywhere on the page should never navigate away from the app
    window.addEventListener("dragover", (e) => e.preventDefault());
    window.addEventListener("drop", (e) => e.preventDefault());
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(globalThis.AFD = globalThis.AFD || {});
