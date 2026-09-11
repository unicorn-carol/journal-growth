(() => {
  const app = document.getElementById("app");
  const mid = document.getElementById("mid");
  const auth = document.getElementById("auth");
  const avatar = document.getElementById("avatar");
  const avatarPop = document.getElementById("avatarPop");
  const popEnergy = document.getElementById("popEnergy");
  const popTopic = document.getElementById("popTopic");

  const viewMap = {
    diary: "view-diary",
    cognize: "view-cognize",
    emotion: "view-emotion",
    moments: "view-moments",
    import: "view-import",
    settings: "view-settings",
  };

  window.enterApp = function enterApp() {
    auth.classList.add("hidden");
    app.classList.remove("hidden");
    go("diary");
  };

  window.go = function go(name) {
    hidePops();
    const isDiary = name === "diary";
    app.classList.toggle("diary", isDiary);
    mid.style.display = isDiary ? "flex" : "none";

    document.querySelectorAll("#nav a").forEach((a) => {
      a.classList.toggle("active", a.dataset.view === name);
    });
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("on"));
    const el = document.getElementById(viewMap[name]);
    if (el) el.classList.add("on");
  };

  window.hidePops = function hidePops() {
    popEnergy.classList.add("hidden");
    popTopic.classList.add("hidden");
  };

  window.toggleAi = function toggleAi() {
    document.getElementById("aiBar").classList.toggle("hidden");
  };

  window.selectSlice = function selectSlice(text) {
    document.getElementById("sliceTitle").textContent = "切片 · " + text;
  };

  // nav
  document.querySelectorAll("#nav a").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      go(a.dataset.view);
    });
  });

  // avatar hover / click
  avatar.addEventListener("mouseenter", () => avatarPop.classList.add("show"));
  avatar.addEventListener("mouseleave", () => {
    setTimeout(() => {
      if (!avatarPop.matches(":hover") && !avatar.matches(":hover")) {
        avatarPop.classList.remove("show");
      }
    }, 120);
  });
  avatarPop.addEventListener("mouseenter", () => avatarPop.classList.add("show"));
  avatarPop.addEventListener("mouseleave", () => avatarPop.classList.remove("show"));
  avatar.addEventListener("click", () => go("settings"));

  // entry select
  document.querySelectorAll(".entry").forEach((entry) => {
    entry.addEventListener("click", () => {
      document.querySelectorAll(".entry").forEach((e) => e.classList.remove("active"));
      entry.classList.add("active");
      go("diary");
    });
  });

  // highlights
  document.getElementById("hlEnergy").addEventListener("click", (e) => {
    e.stopPropagation();
    popTopic.classList.add("hidden");
    popEnergy.classList.toggle("hidden");
  });
  document.getElementById("hlTopic").addEventListener("click", (e) => {
    e.stopPropagation();
    popEnergy.classList.add("hidden");
    popTopic.classList.toggle("hidden");
  });

  // rating buttons
  document.querySelectorAll(".rate-icons").forEach((group) => {
    const buttons = [...group.querySelectorAll("button")];
    buttons.forEach((btn, idx) => {
      btn.addEventListener("click", () => {
        buttons.forEach((b, i) => b.classList.toggle("on", i <= idx));
      });
    });
  });

  // topic chips
  document.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => chip.classList.toggle("on"));
  });

  // topic bar
  document.querySelectorAll("#topicBar button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#topicBar button").forEach((b) => b.classList.remove("on"));
      btn.classList.add("on");
    });
  });

  // segment buttons
  document.querySelectorAll(".seg").forEach((seg) => {
    seg.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        seg.querySelectorAll("button").forEach((b) => b.classList.remove("on"));
        btn.classList.add("on");
      });
    });
  });

  // quadrant cells
  document.querySelectorAll(".quad-cell").forEach((cell) => {
    cell.addEventListener("click", () => {
      document.querySelectorAll(".quad-cell").forEach((c) => c.classList.remove("active"));
      cell.classList.add("active");
      const zone = cell.dataset.zone;
      document.getElementById("zoneLabel").textContent = zone;
      document.getElementById("sliceTitle").textContent = "切片 · " + zone;
    });
  });

  // start in app (prototype review default)
  auth.classList.add("hidden");
  go("diary");
})();
