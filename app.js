/* Victoria Royal Investment: menu, film hero, series index and motion.
   Hero and series need no library. Everything else uses GSAP + ScrollTrigger + SplitText + Lenis when they
   loaded; without them, or with reduced motion, the page stays static. */
(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const range = (p, a, b) => clamp((p - a) / (b - a));
  const ease = t => 1 - Math.pow(1 - t, 3);

  $$("[data-year]").forEach(el => (el.textContent = new Date().getFullYear()));

  // ---------- Menu ----------
  const toggle = $(".nav-toggle"), list = $("#nav-list");
  toggle?.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", open);
    list.classList.toggle("open", open);
    document.body.style.overflow = open ? "hidden" : "";
  });

  // ---------- Header: solid after the first screen, hides while scrolling down ----------
  const header = $(".site-header");
  let lastY = 0;
  const onHeader = () => {
    const y = scrollY;
    const hero = $(".film");
    const solidAt = hero ? hero.offsetHeight - 90 : 40;
    header.classList.toggle("is-solid", y > solidAt);
    header.classList.toggle("is-hidden", y > lastY && y > 300 && !list.classList.contains("open") && (!hero || y > solidAt));
    lastY = y;
  };
  addEventListener("scroll", onHeader, { passive: true });
  onHeader();

  // ---------- Compare sliders (render vs built) ----------
  $$("[data-compare]").forEach(c => {
    const input = $("input", c);
    const set = () => c.style.setProperty("--pos", input.value + "%");
    input.addEventListener("input", set);
    set();
  });

  // ---------- Videos play only while visible ----------
  const vio = new IntersectionObserver(es => es.forEach(e => {
    const v = e.target;
    if (e.isIntersecting && !reduce) { v.preload = "auto"; v.play().catch(() => {}); } else v.pause();
  }), { threshold: .25 });
  $$("video[data-autoplay]").forEach(v => vio.observe(v));

  // ---------- 1. Film hero: captions + progress ticks follow the cuts; the frame drifts as you leave ----------
  const film = $("[data-film]");
  if (film) {
    const video = $("video", film), media = $(".film-media", film), copy = $(".film-copy", film);
    const caps = $$(".fcap", film), ticks = $$(".film-ticks i", film);
    const at = caps.map(c => +c.dataset.at);
    const tick = () => {
      const t = video.currentTime, d = video.duration || 20;
      let i = at.length - 1;
      while (i > 0 && t < at[i] + .4) i--;
      caps.forEach((c, k) => c.classList.toggle("on", k === i));
      ticks.forEach((el, k) => {
        const end = k + 1 < at.length ? at[k + 1] + .4 : d;
        el.style.setProperty("--p", k < i ? 1 : k > i ? 0 : clamp((t - at[k]) / (end - at[k])));
      });
      requestAnimationFrame(tick);
    };
    caps[0]?.classList.add("on");
    if (!reduce) requestAnimationFrame(tick); else video.pause();
    const drift = () => {
      const p = clamp(scrollY / film.offsetHeight);
      media.style.transform = `translateY(${p * 30}%) scale(${1 + p * .12})`;
      copy.style.opacity = 1 - p * 1.6;
      copy.style.marginTop = `${-p * 120}px`;
      if (p >= 1) video.pause(); else if (video.paused && !reduce) video.play().catch(() => {});
    };
    if (!reduce) { addEventListener("scroll", drift, { passive: true }); drift(); }
  }

  // ---------- 4. Series index: the frame shows whichever building you point at (or scroll past, on phones) ----------
  const sx = $("[data-series]");
  if (sx) {
    const imgs = $$(".sx-img", sx), rows = $$(".sx-list li", sx), num = $("[data-sx-num]", sx);
    const set = i => {
      imgs.forEach((im, k) => im.classList.toggle("on", k === i));
      rows.forEach((li, k) => li.classList.toggle("on", k === i));
      num.textContent = $("b", rows[i]).textContent;
    };
    rows.forEach((li, i) => {
      $("a", li).addEventListener("mouseenter", () => set(i));
      $("a", li).addEventListener("focus", () => set(i));
    });
    if (!matchMedia("(hover: hover)").matches) {
      const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && set(rows.indexOf(e.target))),
        { rootMargin: "-45% 0px -45% 0px" });
      rows.forEach(li => io.observe(li));
    }
  }

  // ---------- Project pages: blueprint lines draw, the render fills in, then the page photo shows ----------
  $$(".pdraw").forEach(d => {
    if (reduce) return d.classList.add("done");
    let started = false;
    const go = () => {
      if (started) return;
      started = true;
      d.classList.add("go");
      setTimeout(() => d.classList.add("done"), 4400);
    };
    Promise.all($$("img", d).map(i => i.decode().catch(() => {}))).then(go);
    setTimeout(() => { if (!started) { started = true; d.classList.add("done"); } }, 2500);
  });

  // ---------- GSAP layer ----------
  const ready = () => window.gsap && window.ScrollTrigger;
  const start = () => {
    document.documentElement.classList.remove("motion-pending");
    if (reduce || !ready()) return;
    const { gsap, ScrollTrigger } = window;
    gsap.registerPlugin(ScrollTrigger);
    if (window.SplitText) gsap.registerPlugin(window.SplitText);

    if (window.Lenis) {
      const lenis = window.__lenis = new window.Lenis({ lerp: .1 });
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(t => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
      $$('a[href^="#"]').forEach(a => a.addEventListener("click", e => {
        const t = $(a.getAttribute("href"));
        if (t) { e.preventDefault(); lenis.scrollTo(t, { offset: -70 }); }
      }));
    }

    // headings: lines slide up
    $$(".h-split").forEach(h => {
      if (window.SplitText) {
        window.SplitText.create(h, {
          type: "lines", linesClass: "line", mask: "lines", autoSplit: true,
          onSplit: self => gsap.from(self.lines, {
            yPercent: 110, duration: 1.1, ease: "power4.out", stagger: .08,
            scrollTrigger: { trigger: h, start: "top 88%", once: true }
          })
        });
      } else {
        gsap.from(h, { y: 40, opacity: 0, duration: 1, scrollTrigger: { trigger: h, start: "top 88%", once: true } });
      }
    });

    // long statements light up word by word with the scroll
    $$("[data-scrub-words]").forEach(el => {
      el.innerHTML = el.textContent.trim().split(/\s+/).map(w => `<span class="w">${w}</span>`).join(" ");
      gsap.to($$(".w", el), {
        opacity: 1, stagger: .05, ease: "none",
        scrollTrigger: { trigger: el, start: "top 80%", end: "bottom 45%", scrub: true }
      });
    });

    // counters
    $$("[data-count]").forEach(el => {
      const end = +el.dataset.count, plain = "plain" in el.dataset, o = { v: plain ? end - 9 : 0 };
      gsap.to(o, {
        v: end, duration: 1.8, ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 90%", once: true },
        onUpdate: () => (el.textContent = Math.round(o.v))
      });
    });

    // sold bars fill in
    $$(".sold-fill").forEach(f => gsap.from(f, {
      scaleX: 0, duration: 1.4, ease: "power3.out", scrollTrigger: { trigger: f, start: "top 95%", once: true }
    }));

    // parallax images
    $$("[data-parallax]").forEach(img => gsap.fromTo(img, { yPercent: -6 }, {
      yPercent: 6, ease: "none",
      scrollTrigger: { trigger: img.closest("section") || img, start: "top bottom", end: "bottom top", scrub: true }
    }));

    // cards and blocks fade up
    $$(".life-grid figure, .pgrid .pcard, .team-grid figure, .offplan-card, .post-card, .office, .ipl-grid > div, .stats > div").forEach(el =>
      gsap.from(el, { y: 50, opacity: 0, duration: 1, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 92%", once: true } }));

    // horizontal runs on desktop: Selling now + galleries. Pin only once the cards sit whole in the middle of the screen
    ScrollTrigger.matchMedia({
      "(min-width: 801px)": () => {
        $$(".gallery").forEach(sec => {
          const track = $(".selling-track, .gallery-track", sec);
          if (!track) return;
          const dist = () => Math.max(0, track.scrollWidth - innerWidth);
          if (dist() < 40) return;
          gsap.to(track, {
            x: () => -dist(), ease: "none",
            scrollTrigger: { trigger: track, start: "center center", end: () => "+=" + dist(), pin: sec, scrub: .6, invalidateOnRefresh: true }
          });
        });
      }
    });

    // VICTORIA fly-through: the film plays inside the letters; scrolling dives through the first I
    const fly = $("[data-fly]");
    if (fly) {
      const v = $("video", fly), zoom = $(".fly-zoom", fly), ghost = $(".fly-ghost", fly);
      const line = $(".fly-line", fly), cut = $("mask text", fly);
      v.addEventListener("loadedmetadata", () => { v.currentTime = +v.dataset.start || 0; }, { once: true });
      vio.observe(v);
      let cx = 800, cy = 450, last = 0;
      const measure = () => {
        try { const b = cut.getExtentOfChar(1); cx = b.x + b.width / 2; cy = b.y + b.height * .58; } catch (err) {}
        set(last);
      };
      const set = p => {
        last = p;
        const t = range(p, .06, .82);
        const sc = Math.pow(140, t * t);
        const tr = `translate(${cx} ${cy}) scale(${sc}) translate(${-cx} ${-cy})`;
        zoom.setAttribute("transform", tr);
        ghost.setAttribute("transform", tr);
        ghost.style.opacity = 1 - range(p, .04, .2);
        line.style.opacity = .8 - range(p, 0, .1) * .8;
        zoom.style.opacity = 1 - range(p, .78, .86);
      };
      document.fonts?.ready.then(measure);
      measure();
      ScrollTrigger.create({ trigger: fly, start: "top top", end: "bottom bottom", onUpdate: self => set(self.progress) });
    }

    // Selling now: the projects stand on a ring that turns as you scroll, snapping to each card (desktop)
    ScrollTrigger.matchMedia({
      "(min-width: 801px)": () => {
        const sec = $(".selling[data-hpin]");
        if (!sec) return;
        const track = $(".selling-track", sec), cards = $$(".pcard", track), dots = $(".ring-dots", sec);
        const n = cards.length, step = 34;
        sec.classList.add("is-ring");
        dots.innerHTML = cards.map(() => "<i></i>").join("");
        const ticks = $$("i", dots);
        let R = 0;
        const layout = () => {
          const cw = Math.max(220, Math.min(innerWidth * .28, 380, (innerHeight - 420) / 1.3));
          sec.style.setProperty("--cw", cw + "px");
          R = (cw / 2 + 26) / Math.tan(step / 2 * Math.PI / 180);
          cards.forEach((c, i) => (c.style.transform = `rotateY(${i * step}deg) translateZ(${R}px)`));
        };
        const turn = p => {
          const rot = p * (n - 1) * step;
          track.style.transform = `translateZ(${-R}px) rotateY(${-rot}deg)`;
          cards.forEach((c, i) => {
            const d = Math.abs(i * step - rot);
            c.style.opacity = clamp(1.15 - d / 95);
            c.style.filter = `brightness(${1 - clamp(d / step) * .35})`;
            c.style.pointerEvents = d < step / 2 ? "auto" : "none";
          });
          const k = Math.round(p * (n - 1));
          ticks.forEach((t, i) => t.classList.toggle("on", i === k));
        };
        layout();
        turn(0);
        let st = null;
        st = ScrollTrigger.create({
          trigger: sec, start: "top top", end: () => "+=" + (n - 1) * innerHeight * .55, pin: true,
          scrub: .8, snap: { snapTo: 1 / (n - 1), duration: { min: .2, max: .6 }, ease: "power2.inOut" },
          onUpdate: self => turn(self.progress), onRefresh: () => { layout(); turn(st ? st.progress : 0); }
        });
        return () => {
          sec.classList.remove("is-ring");
          track.style.transform = "";
          cards.forEach(c => { c.style.transform = c.style.opacity = c.style.filter = c.style.pointerEvents = ""; });
        };
      }
    });

    // Victoria 27 exploded: the floors part, each with its label
    const ex = $("[data-explode]");
    if (ex) {
      const sl = $$(".ex-slice", ex), tags = $$(".ex-tag", ex), stage = $(".ex-stage", ex), mid = (sl.length - 1) / 2;
      const tl = gsap.timeline({ scrollTrigger: { trigger: ex, start: "top top", end: "bottom bottom", scrub: .7 } });
      tl.to(stage, { rotateX: 10, scale: .92, duration: .7, ease: "power2.inOut", transformPerspective: 1600 }, .05);
      sl.forEach((el, i) => tl.to(el, { y: () => (i - mid) * stage.offsetHeight * .1, duration: .7, ease: "power2.inOut" }, .05));
      tags.forEach((t, i) => tl.to(t, { opacity: 1, duration: .15 }, .4 + (sl.length - 1 - i) * .06));
      tl.to({}, { duration: .25 });
    }

    // AI clips played by the scroll (model to reality, day to night): the video follows the scrollbar
    $$("[data-scrub]").forEach(sec => {
      const v = $("video", sec), copy = $(".scrub-copy", sec);
      let target = 0, shown = -1;
      v.pause();
      const seek = () => {
        if (v.readyState >= 1 && !v.seeking && Math.abs(target - shown) > .01) v.currentTime = shown = target;
      };
      v.addEventListener("seeked", seek);
      v.addEventListener("loadedmetadata", seek);
      copy.style.opacity = 0;
      ScrollTrigger.create({
        trigger: sec, start: "top top", end: "bottom bottom",
        onUpdate: self => {
          target = range(self.progress, .05, .9) * ((v.duration || 6) - .05);
          seek();
          copy.style.opacity = range(self.progress, .55, .75);
          copy.style.transform = `translateY(${(1 - range(self.progress, .55, .8)) * 30}px)`;
        }
      });
    });

    // Ending: V27 lines draw, then the render fills floor by floor
    const fin = $("[data-finale]");
    if (fin) {
      const art = $(".finale-art", fin);
      const paint = p => {
        const f = range(p, .45, .95) * 5, k = Math.floor(f);
        const fill = k >= 5 ? 0 : 100 - (k + ease(f - k)) * 20;
        art.style.setProperty("--draw", range(p, 0, .45) * 100 + "%");
        art.style.setProperty("--fill", fill + "%");
        art.style.setProperty("--lo", 1 - range(p, .85, 1) * .75);
      };
      paint(0);
      ScrollTrigger.create({ trigger: art, start: "top 85%", end: "bottom 30%", scrub: true, onUpdate: self => paint(self.progress) });
    }

    // services stack: earlier cards shrink back as the next one arrives
    const svcs = $$(".svc");
    svcs.forEach((s, i) => {
      if (i === svcs.length - 1) return;
      gsap.to(s, { scale: .94, opacity: .5, ease: "none",
        scrollTrigger: { trigger: svcs[i + 1], start: "top bottom", end: "top 20%", scrub: true } });
    });

    addEventListener("load", () => ScrollTrigger.refresh());
  };

  if (ready()) start();
  else addEventListener("DOMContentLoaded", () => setTimeout(start, 0));
})();
