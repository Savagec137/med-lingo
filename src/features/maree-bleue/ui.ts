/**
 * Interface en DOM par-dessus le canvas : menu des niveaux, HUD, pause, fin.
 */

import { LEVELS, type LevelDef } from "./levels";
import { THEMES } from "./world";

const ICON = {
  castle: `<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M3 21V9h2V5h2v4h2V5h2v4h2V5h2v4h2V5h2v4h2v12h-7v-5a2 2 0 0 0-4 0v5z"/></svg>`,
  heart: `<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.8 4.5c2.1 0 3.6 1.2 5.2 3 1.6-1.8 3.1-3 5.2-3 3.8 0 5.9 3.9 4.4 7.3C19.5 16.4 12 21 12 21z"/></svg>`,
  pause: `<svg viewBox="0 0 24 24" width="22" height="22"><rect x="6" y="5" width="4" height="14" rx="1.2" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1.2" fill="currentColor"/></svg>`,
  soundOn: `<svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`,
  soundOff: `<svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M7 10V8a5 5 0 0 1 10 0v2h1a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1zm2 0h6V8a3 3 0 0 0-6 0z"/></svg>`,
  star: `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/></svg>`,
  close: `<svg viewBox="0 0 24 24" width="20" height="20"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>`,
  sword: `<svg viewBox="0 0 24 24" width="28" height="28"><path fill="currentColor" d="M19.5 2.5l2 2-9.8 9.8 1.4 1.4-1.4 1.4-1.7-1.7-3.2 3.2.7.7-1.4 1.4-3.5-3.5 1.4-1.4.7.7 3.2-3.2-1.7-1.7 1.4-1.4 1.4 1.4z"/></svg>`,
};

const CSS = `
.mb-root{position:absolute;inset:0;overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;
  font-family:"Nunito","Arial Rounded MT Bold","Trebuchet MS",system-ui,sans-serif;color:#fff;background:#0b1430;-webkit-tap-highlight-color:transparent}
.mb-root canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.mb-layer{position:absolute;inset:0;pointer-events:none}
.mb-layer>*{pointer-events:auto}
.mb-hidden{display:none!important}
.mb-btn{appearance:none;border:0;cursor:pointer;font:inherit;color:inherit;display:inline-flex;align-items:center;justify-content:center;gap:8px}
.mb-icon{width:46px;height:46px;border-radius:14px;background:rgba(12,22,58,.55);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);
  box-shadow:inset 0 0 0 2px rgba(255,255,255,.18),0 4px 10px rgba(0,0,0,.25)}
.mb-icon:active{transform:scale(.94)}
.mb-hud{position:absolute;inset:0;pointer-events:none}
.mb-top{position:absolute;left:0;right:0;top:0;padding:calc(env(safe-area-inset-top,0px) + 12px) 12px 0;display:flex;gap:10px;align-items:flex-start}
.mb-top .mb-icon{pointer-events:auto;flex:none}
.mb-bars{flex:1;display:flex;flex-direction:column;gap:6px;min-width:0}
.mb-bar{position:relative;height:24px;border-radius:12px;background:rgba(8,14,40,.6);box-shadow:inset 0 0 0 2px rgba(255,255,255,.2);overflow:hidden}
.mb-bar .mb-fill{position:absolute;inset:3px;border-radius:9px;transform-origin:left center;transition:transform .15s linear}
.mb-bar.red .mb-fill{background:linear-gradient(180deg,#ff6b6b,#d81b33)}
.mb-bar.blue{height:18px}
.mb-bar.blue .mb-fill{background:linear-gradient(180deg,#7cc4ff,#2f6bff)}
.mb-bar .mb-txt{position:absolute;inset:0;display:flex;align-items:center;gap:6px;padding:0 10px;font-weight:900;font-size:13px;letter-spacing:.3px;text-shadow:0 1px 2px rgba(0,0,0,.6)}
.mb-bar.blue .mb-txt{font-size:11px}
.mb-bar.flash{animation:mbShake .25s}
@keyframes mbShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-3px)}75%{transform:translateX(3px)}}
.mb-counts{position:absolute;top:calc(env(safe-area-inset-top,0px) + 70px);left:68px;display:flex;gap:6px}
.mb-pill{font-weight:900;font-size:12px;padding:3px 9px;border-radius:999px;background:rgba(8,14,40,.55);display:flex;align-items:center;gap:5px}
.mb-pill i{width:9px;height:9px;border-radius:50%;display:inline-block}
.mb-pill.blue i{background:#4b8bff;box-shadow:0 0 6px #4b8bff}
.mb-pill.red i{background:#ff4d4d;box-shadow:0 0 6px #ff4d4d}
.mb-champion{position:absolute;right:14px;bottom:calc(env(safe-area-inset-bottom,0px) + 18px);width:84px;height:84px;border-radius:50%;
  pointer-events:auto;background:radial-gradient(circle at 50% 35%,#4b7dff,#1d3aa8);box-shadow:0 6px 16px rgba(0,0,0,.35),inset 0 0 0 3px rgba(255,255,255,.25);
  display:flex;flex-direction:column;align-items:center;justify-content:center;font-weight:900;font-size:10px;letter-spacing:.6px;color:#dbe8ff;opacity:.75}
.mb-champion svg.mb-ring{position:absolute;inset:-5px;width:94px;height:94px;transform:rotate(-90deg)}
.mb-champion.ready{opacity:1;color:#fff;background:radial-gradient(circle at 50% 35%,#ffd75a,#f08a12);animation:mbPulse 1s infinite}
@keyframes mbPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
.mb-hint{position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 34px);transform:translateX(-50%);padding:10px 16px;border-radius:999px;
  background:rgba(8,14,40,.6);font-weight:800;font-size:14px;white-space:nowrap;pointer-events:none;animation:mbBob 1.4s ease-in-out infinite}
@keyframes mbBob{0%,100%{transform:translate(-50%,0)}50%{transform:translate(-50%,-6px)}}
.mb-banner{position:absolute;left:0;right:0;top:34%;text-align:center;pointer-events:none;animation:mbBanner 2.6s ease forwards}
.mb-banner .mb-k{font-size:15px;font-weight:900;letter-spacing:3px;opacity:.9}
.mb-banner .mb-n{font-size:clamp(30px,9vw,52px);font-weight:900;line-height:1.05;text-shadow:0 4px 0 rgba(0,0,0,.25),0 0 24px rgba(0,0,0,.35);padding:0 16px}
.mb-banner .mb-t{margin-top:8px;font-size:15px;font-weight:800;opacity:.95;padding:0 24px}
@keyframes mbBanner{0%{opacity:0;transform:scale(.8)}12%{opacity:1;transform:scale(1.04)}20%{transform:scale(1)}80%{opacity:1}100%{opacity:0}}
.mb-menu{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;overflow-y:auto;-webkit-overflow-scrolling:touch;touch-action:pan-y;
  padding:calc(env(safe-area-inset-top,0px) + 28px) 16px calc(env(safe-area-inset-bottom,0px) + 24px);
  background:linear-gradient(180deg,rgba(6,12,38,.82),rgba(6,12,38,.35) 40%,rgba(6,12,38,.85))}
.mb-logo{display:flex;flex-direction:column;align-items:center;line-height:.9;margin-top:6px}
.mb-logo span{font-size:clamp(44px,14vw,76px);font-weight:900;letter-spacing:1px;text-shadow:0 6px 0 #1a3a9c,0 10px 24px rgba(0,0,0,.45)}
.mb-logo span:first-child{color:#bfe0ff}
.mb-logo span:last-child{background:linear-gradient(180deg,#9fd0ff,#2f6bff);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 6px 0 #0f2366)}
.mb-sub{margin:12px 0 18px;font-weight:800;opacity:.9;text-align:center}
.mb-levels{width:100%;max-width:440px;display:flex;flex-direction:column;gap:12px}
.mb-card{position:relative;width:100%;text-align:left;border-radius:20px;padding:14px 14px 14px 76px;min-height:86px;color:#fff;
  box-shadow:0 6px 0 rgba(0,0,0,.25),0 10px 24px rgba(0,0,0,.25),inset 0 0 0 2px rgba(255,255,255,.22)}
.mb-card:active{transform:translateY(2px)}
.mb-card .mb-num{position:absolute;left:14px;top:50%;transform:translateY(-50%);width:50px;height:50px;border-radius:15px;background:rgba(255,255,255,.22);
  display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:900;text-shadow:0 2px 0 rgba(0,0,0,.25)}
.mb-card .mb-name{font-size:18px;font-weight:900;text-shadow:0 2px 0 rgba(0,0,0,.2)}
.mb-card .mb-tag{font-size:12.5px;font-weight:700;opacity:.92;margin-top:2px}
.mb-stars{display:flex;gap:3px;margin-top:6px}
.mb-stars svg{width:18px;height:18px;color:rgba(0,0,0,.25)}
.mb-stars svg.on{color:#ffd23f;filter:drop-shadow(0 1px 0 rgba(0,0,0,.3))}
.mb-card.locked{filter:grayscale(.85) brightness(.7)}
.mb-card.locked .mb-num{color:#fff}
.mb-foot{margin-top:18px;display:flex;gap:10px;align-items:center}
.mb-exit{padding:0 16px;width:auto}
.mb-modal{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(5,10,30,.55);padding:16px;pointer-events:auto}
.mb-panel{width:100%;max-width:360px;border-radius:26px;padding:22px 18px 18px;text-align:center;background:linear-gradient(180deg,#2a55e0,#1a2f8f);
  box-shadow:0 8px 0 #0f1d5c,0 18px 40px rgba(0,0,0,.4),inset 0 0 0 3px rgba(255,255,255,.2);animation:mbPop .35s cubic-bezier(.2,1.5,.4,1)}
.mb-panel.lose{background:linear-gradient(180deg,#d8414f,#8d1626);box-shadow:0 8px 0 #5a0d18,0 18px 40px rgba(0,0,0,.4),inset 0 0 0 3px rgba(255,255,255,.2)}
@keyframes mbPop{0%{transform:scale(.6);opacity:0}100%{transform:scale(1);opacity:1}}
.mb-panel h2{margin:0;font-size:34px;font-weight:900;text-shadow:0 3px 0 rgba(0,0,0,.25)}
.mb-panel p{margin:6px 0 0;font-weight:800;opacity:.92}
.mb-bigstars{display:flex;justify-content:center;gap:6px;margin:14px 0 6px}
.mb-bigstars svg{width:58px;height:58px;color:rgba(0,0,0,.25)}
.mb-bigstars svg:nth-child(2){width:70px;height:70px;margin-top:-10px}
.mb-bigstars svg.on{color:#ffd23f;filter:drop-shadow(0 3px 0 rgba(0,0,0,.3));animation:mbStar .5s cubic-bezier(.2,1.6,.4,1) both}
.mb-bigstars svg.on:nth-child(2){animation-delay:.18s}.mb-bigstars svg.on:nth-child(3){animation-delay:.36s}
@keyframes mbStar{0%{transform:scale(0) rotate(-40deg)}100%{transform:scale(1) rotate(0)}}
.mb-stats{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:14px 0}
.mb-stat{background:rgba(0,0,0,.18);border-radius:14px;padding:8px 6px}
.mb-stat b{display:block;font-size:20px;font-weight:900}
.mb-stat span{font-size:11px;font-weight:800;opacity:.85;text-transform:uppercase;letter-spacing:.5px}
.mb-actions{display:flex;flex-direction:column;gap:10px;margin-top:6px}
.mb-cta{height:54px;border-radius:16px;font-size:18px;font-weight:900;background:linear-gradient(180deg,#ffd75a,#f5a20f);color:#5a2c00;box-shadow:0 5px 0 #b86a00}
.mb-cta:active{transform:translateY(3px);box-shadow:0 2px 0 #b86a00}
.mb-sec{height:46px;border-radius:14px;font-size:15px;font-weight:900;background:rgba(255,255,255,.16);box-shadow:inset 0 0 0 2px rgba(255,255,255,.25)}
.mb-sec:active{transform:translateY(2px)}
.mb-float{position:absolute;font-weight:900;font-size:18px;pointer-events:none;text-shadow:0 2px 0 rgba(0,0,0,.4);animation:mbFloat .9s ease-out forwards;white-space:nowrap}
@keyframes mbFloat{0%{opacity:0;transform:translate(-50%,0) scale(.6)}15%{opacity:1;transform:translate(-50%,-8px) scale(1.15)}100%{opacity:0;transform:translate(-50%,-48px) scale(1)}}
.mb-vignette{position:absolute;inset:0;pointer-events:none;box-shadow:inset 0 0 90px 20px rgba(255,30,40,.0);transition:box-shadow .2s}
.mb-vignette.hit{box-shadow:inset 0 0 90px 30px rgba(255,30,40,.55)}
@media (prefers-reduced-motion:reduce){.mb-hint,.mb-champion.ready,.mb-bigstars svg.on,.mb-panel{animation:none!important}}
@media (min-width:700px){.mb-counts{left:80px}.mb-top{padding-left:20px;padding-right:20px}}
`;

export interface UiCallbacks {
  onPlay(levelIndex: number): void;
  onPause(): void;
  onResume(): void;
  onRestart(): void;
  onMenu(): void;
  onNext(): void;
  onChampion(): void;
  onToggleSound(): void;
  onExit?: () => void;
}

export interface Progress {
  unlocked: number;
  stars: Record<number, number>;
}

function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls = "",
  html = "",
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (html) el.innerHTML = html;
  return el;
}

function starsHtml(n: number) {
  return [0, 1, 2]
    .map((i) => ICON.star.replace("<svg", `<svg class="${i < n ? "on" : ""}"`))
    .join("");
}

function fmt(n: number) {
  return Math.max(0, Math.round(n)).toLocaleString("fr-FR");
}

export class GameUi {
  readonly root: HTMLDivElement;
  private readonly layer: HTMLDivElement;
  private readonly hud: HTMLDivElement;
  private readonly menu: HTMLDivElement;
  private readonly levelsBox: HTMLDivElement;
  private readonly baseFill: HTMLDivElement;
  private readonly baseTxt: HTMLSpanElement;
  private readonly baseBar: HTMLDivElement;
  private readonly hpFill: HTMLDivElement;
  private readonly hpTxt: HTMLSpanElement;
  private readonly hpBar: HTMLDivElement;
  private readonly blueCount: HTMLSpanElement;
  private readonly redCount: HTMLSpanElement;
  private readonly champ: HTMLButtonElement;
  private readonly champRing: SVGCircleElement;
  private readonly hint: HTMLDivElement;
  private readonly vignette: HTMLDivElement;
  private readonly soundBtns: HTMLButtonElement[] = [];
  private modal: HTMLDivElement | null = null;
  private banner: HTMLDivElement | null = null;
  private readonly cb: UiCallbacks;
  private lastBase = -1;
  private lastHp = -1;

  constructor(root: HTMLDivElement, cb: UiCallbacks) {
    this.root = root;
    this.cb = cb;
    const style = document.createElement("style");
    style.textContent = CSS;
    root.appendChild(style);
    this.layer = h("div", "mb-layer");
    root.appendChild(this.layer);

    // HUD
    this.hud = h("div", "mb-hud mb-hidden");
    this.vignette = h("div", "mb-vignette");
    this.hud.appendChild(this.vignette);
    const top = h("div", "mb-top");
    const pause = h("button", "mb-btn mb-icon", ICON.pause);
    pause.setAttribute("aria-label", "Pause");
    pause.addEventListener("pointerdown", (e) => e.stopPropagation());
    pause.addEventListener("click", () => cb.onPause());
    const bars = h("div", "mb-bars");
    this.baseBar = h("div", "mb-bar red");
    this.baseFill = h("div", "mb-fill");
    const baseTxt = h("div", "mb-txt", ICON.castle);
    this.baseTxt = h("span");
    baseTxt.appendChild(this.baseTxt);
    this.baseBar.append(this.baseFill, baseTxt);
    this.hpBar = h("div", "mb-bar blue");
    this.hpFill = h("div", "mb-fill");
    const hpTxt = h("div", "mb-txt", ICON.heart);
    this.hpTxt = h("span");
    hpTxt.appendChild(this.hpTxt);
    this.hpBar.append(this.hpFill, hpTxt);
    bars.append(this.baseBar, this.hpBar);
    const sound = this.makeSoundBtn();
    top.append(pause, bars, sound);
    this.hud.appendChild(top);
    const counts = h("div", "mb-counts");
    const bc = h("span", "mb-pill blue", "<i></i>");
    this.blueCount = h("span");
    bc.appendChild(this.blueCount);
    const rc = h("span", "mb-pill red", "<i></i>");
    this.redCount = h("span");
    rc.appendChild(this.redCount);
    counts.append(bc, rc);
    this.hud.appendChild(counts);
    this.champ = h("button", "mb-btn mb-champion");
    this.champ.innerHTML = `<svg class="mb-ring" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="7"/><circle class="mb-prog" cx="50" cy="50" r="46" fill="none" stroke="#ffd23f" stroke-width="7" stroke-linecap="round" stroke-dasharray="289" stroke-dashoffset="289"/></svg>${ICON.sword}<span>CHAMPION</span>`;
    this.champRing = this.champ.querySelector(".mb-prog") as SVGCircleElement;
    this.champ.setAttribute("aria-label", "Lancer le champion");
    this.champ.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      cb.onChampion();
    });
    this.hud.appendChild(this.champ);
    this.hint = h("div", "mb-hint", "Maintiens pour tirer · glisse pour viser");
    this.hud.appendChild(this.hint);
    this.layer.appendChild(this.hud);

    // Menu
    this.menu = h("div", "mb-menu mb-hidden");
    this.menu.appendChild(h("div", "mb-logo", "<span>MARÉE</span><span>BLEUE</span>"));
    this.menu.appendChild(
      h("p", "mb-sub", "Une foule. Des portes. Une forteresse à faire tomber."),
    );
    this.levelsBox = h("div", "mb-levels");
    this.menu.appendChild(this.levelsBox);
    const foot = h("div", "mb-foot");
    foot.appendChild(this.makeSoundBtn());
    if (cb.onExit) {
      const exit = h(
        "button",
        "mb-btn mb-icon mb-exit",
        `${ICON.close}<span style="font-weight:900">Quitter</span>`,
      );
      exit.addEventListener("click", () => cb.onExit?.());
      foot.appendChild(exit);
    }
    this.menu.appendChild(foot);
    this.layer.appendChild(this.menu);
  }

  private makeSoundBtn() {
    const b = h("button", "mb-btn mb-icon", ICON.soundOn);
    b.setAttribute("aria-label", "Son");
    b.addEventListener("pointerdown", (e) => e.stopPropagation());
    b.addEventListener("click", () => this.cb.onToggleSound());
    this.soundBtns.push(b);
    return b;
  }

  setMuted(m: boolean) {
    for (const b of this.soundBtns) b.innerHTML = m ? ICON.soundOff : ICON.soundOn;
  }

  showMenu(progress: Progress) {
    this.closeModal();
    this.hud.classList.add("mb-hidden");
    this.menu.classList.remove("mb-hidden");
    this.levelsBox.innerHTML = "";
    LEVELS.forEach((lvl, i) => {
      const theme = THEMES[lvl.theme];
      const locked = i + 1 > progress.unlocked;
      const card = h("button", `mb-btn mb-card${locked ? " locked" : ""}`);
      card.style.background = `linear-gradient(135deg, ${theme.menuGradient[0]}, ${theme.menuGradient[1]})`;
      card.innerHTML = `<div class="mb-num">${locked ? ICON.lock : lvl.id}</div>
        <div><div class="mb-name">${lvl.name}</div><div class="mb-tag">${lvl.tagline}</div>
        <div class="mb-stars">${starsHtml(progress.stars[lvl.id] ?? 0)}</div></div>`;
      card.addEventListener("click", () => {
        if (locked) {
          card.animate(
            [
              { transform: "translateX(-6px)" },
              { transform: "translateX(6px)" },
              { transform: "translateX(0)" },
            ],
            { duration: 220 },
          );
          return;
        }
        this.cb.onPlay(i);
      });
      this.levelsBox.appendChild(card);
    });
  }

  showHud(level: LevelDef) {
    this.closeModal();
    this.menu.classList.add("mb-hidden");
    this.hud.classList.remove("mb-hidden");
    this.hint.classList.remove("mb-hidden");
    this.lastBase = -1;
    this.lastHp = -1;
    this.showBanner(`NIVEAU ${level.id}`, level.name, level.tagline);
  }

  hideHint() {
    this.hint.classList.add("mb-hidden");
  }

  showBanner(kicker: string, name: string, tag: string) {
    this.banner?.remove();
    const b = h(
      "div",
      "mb-banner",
      `<div class="mb-k">${kicker}</div><div class="mb-n">${name}</div><div class="mb-t">${tag}</div>`,
    );
    this.hud.appendChild(b);
    this.banner = b;
    window.setTimeout(() => {
      if (this.banner === b) {
        b.remove();
        this.banner = null;
      }
    }, 2700);
  }

  update(s: {
    baseHp: number;
    baseMax: number;
    hp: number;
    hpMax: number;
    blue: number;
    red: number;
    charge: number;
    ready: boolean;
  }) {
    this.baseFill.style.transform = `scaleX(${Math.max(0, s.baseHp / s.baseMax)})`;
    this.baseTxt.textContent = fmt(s.baseHp);
    if (this.lastBase >= 0 && s.baseHp < this.lastBase) {
      this.baseBar.classList.remove("flash");
      void this.baseBar.offsetWidth;
      this.baseBar.classList.add("flash");
    }
    this.lastBase = s.baseHp;
    this.hpFill.style.transform = `scaleX(${Math.max(0, s.hp / s.hpMax)})`;
    this.hpTxt.textContent = `${Math.max(0, s.hp)} / ${s.hpMax}`;
    if (this.lastHp >= 0 && s.hp < this.lastHp) {
      this.hpBar.classList.remove("flash");
      void this.hpBar.offsetWidth;
      this.hpBar.classList.add("flash");
      this.vignette.classList.add("hit");
      window.setTimeout(() => this.vignette.classList.remove("hit"), 220);
    }
    this.lastHp = s.hp;
    this.blueCount.textContent = fmt(s.blue);
    this.redCount.textContent = fmt(s.red);
    this.champRing.style.strokeDashoffset = String(289 * (1 - s.charge));
    this.champ.classList.toggle("ready", s.ready);
  }

  floatText(x: number, y: number, text: string, color: string) {
    const el = h("div", "mb-float", text);
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.color = color;
    this.hud.appendChild(el);
    window.setTimeout(() => el.remove(), 950);
  }

  showPause() {
    this.openModal(
      `<div class="mb-panel"><h2>Pause</h2><p>La horde attend…</p><div class="mb-actions" style="margin-top:16px">
        <button class="mb-btn mb-cta" data-a="resume">Reprendre</button>
        <button class="mb-btn mb-sec" data-a="restart">Recommencer</button>
        <button class="mb-btn mb-sec" data-a="menu">Niveaux</button></div></div>`,
    );
  }

  showEnd(o: {
    won: boolean;
    stars: number;
    time: number;
    shots: number;
    kills: number;
    peak: number;
    hasNext: boolean;
    last: boolean;
  }) {
    const title = o.won ? (o.last ? "Triomphe !" : "Victoire !") : "Le rempart cède";
    const sub = o.won
      ? o.last
        ? "Les cinq forteresses sont tombées. La marée est souveraine."
        : "La forteresse s'effondre sous la marée bleue."
      : "La horde a percé. Vise mieux les portes !";
    const m = Math.floor(o.time / 60);
    const s = Math.floor(o.time % 60);
    const stats = `<div class="mb-stats">
      <div class="mb-stat"><b>${m}:${String(s).padStart(2, "0")}</b><span>Temps</span></div>
      <div class="mb-stat"><b>${fmt(o.peak)}</b><span>Foule max</span></div>
      <div class="mb-stat"><b>${fmt(o.shots)}</b><span>Tirs</span></div>
      <div class="mb-stat"><b>${fmt(o.kills)}</b><span>Pillards vaincus</span></div></div>`;
    const actions = o.won
      ? `${o.hasNext ? '<button class="mb-btn mb-cta" data-a="next">Niveau suivant</button>' : '<button class="mb-btn mb-cta" data-a="menu">Retour aux niveaux</button>'}
         <button class="mb-btn mb-sec" data-a="restart">Rejouer</button>${o.hasNext ? '<button class="mb-btn mb-sec" data-a="menu">Niveaux</button>' : ""}`
      : `<button class="mb-btn mb-cta" data-a="restart">Réessayer</button><button class="mb-btn mb-sec" data-a="menu">Niveaux</button>`;
    this.openModal(
      `<div class="mb-panel${o.won ? "" : " lose"}"><h2>${title}</h2><p>${sub}</p>
      ${o.won ? `<div class="mb-bigstars">${starsHtml(o.stars)}</div>` : ""}${stats}<div class="mb-actions">${actions}</div></div>`,
    );
  }

  private openModal(html: string) {
    this.closeModal();
    const m = h("div", "mb-modal", html);
    m.addEventListener("pointerdown", (e) => e.stopPropagation());
    m.querySelectorAll<HTMLButtonElement>("[data-a]").forEach((b) => {
      b.addEventListener("click", () => {
        const a = b.dataset.a;
        if (a === "resume") this.cb.onResume();
        else if (a === "restart") this.cb.onRestart();
        else if (a === "menu") this.cb.onMenu();
        else if (a === "next") this.cb.onNext();
      });
    });
    this.layer.appendChild(m);
    this.modal = m;
  }

  closeModal() {
    this.modal?.remove();
    this.modal = null;
  }

  dispose() {
    this.layer.remove();
  }
}
