/**
 * ==========================================================================
 * WindFlow - Atmospheric Flowing Wind Animation Engine
 * ==========================================================================
 * Creates high-performance 60 FPS flowing wind currents, breeze streamlines,
 * swirling vortices, and atmospheric wind particles contained within the
 * middle weather dashboard during search or location detection.
 * ==========================================================================
 */

const WindFlow = (() => {
  let canvas = null;
  let ctx = null;
  let overlay = null;
  let titleEl = null;
  let targetEl = null;
  let animId = null;
  let isActive = false;
  let opacity = 0;
  let targetOpacity = 0;

  // Flow Field State
  let streams = [];
  let particles = [];
  let swirls = [];
  let time = 0;
  let gustX = 0;
  let gustY = 0;
  let hasActiveGust = false;

  const STREAM_COUNT = 38;
  const PARTICLE_COUNT = 75;
  const SWIRL_COUNT = 3;

  /**
   * Initializes DOM elements and canvas context
   */
  function init() {
    overlay = document.getElementById('wind-flow-overlay');
    canvas = document.getElementById('wind-flow-canvas');
    titleEl = document.getElementById('wind-scan-title');
    targetEl = document.getElementById('wind-scan-target');

    if (!canvas) return;
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
  }

  /**
   * Calculates current dimensions of middle dashboard container
   */
  function getDimensions() {
    if (overlay && overlay.clientWidth && overlay.clientHeight) {
      return {
        w: overlay.clientWidth,
        h: overlay.clientHeight
      };
    }
    const dashboard = document.getElementById('weather-dashboard');
    if (dashboard && dashboard.clientWidth && dashboard.clientHeight) {
      return {
        w: dashboard.clientWidth,
        h: dashboard.clientHeight
      };
    }
    return {
      w: Math.min(window.innerWidth - 32, 1200),
      h: 520
    };
  }

  /**
   * Resizes canvas to middle container dimensions with HiDPI support
   */
  function resize() {
    if (!canvas || !ctx) return;
    const { w, h } = getDimensions();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /**
   * Generates a single aerodynamic wind streamline
   */
  function createStream(w, h, randomX = false) {
    const startX = randomX ? Math.random() * w : -150 - Math.random() * 200;
    const startY = 30 + Math.random() * (h - 60);
    const speed = 7 + Math.random() * 9;
    const length = 140 + Math.random() * 220;
    const amplitude = 12 + Math.random() * 28;
    const frequency = 0.008 + Math.random() * 0.012;
    const thickness = 1.2 + Math.random() * 1.8;
    const alpha = 0.35 + Math.random() * 0.55;
    const hasCurl = Math.random() < 0.28; // ~28% of streams curl into wind loops

    return {
      x: startX,
      y: startY,
      baseY: startY,
      speed: speed,
      length: length,
      amplitude: amplitude,
      frequency: frequency,
      thickness: thickness,
      alpha: alpha,
      hasCurl: hasCurl,
      curlProgress: 0,
      curlRadius: 18 + Math.random() * 26,
      curlCenterY: startY + (Math.random() < 0.5 ? -30 : 30),
      curlSpeed: 0.04 + Math.random() * 0.03
    };
  }

  /**
   * Generates a single wind particle / breeze fleck
   */
  function createParticle(w, h, randomX = false) {
    return {
      x: randomX ? Math.random() * w : -20 - Math.random() * 80,
      y: 20 + Math.random() * (h - 40),
      baseY: 20 + Math.random() * (h - 40),
      speed: 8 + Math.random() * 12,
      size: 1.5 + Math.random() * 2.2,
      trailLength: 12 + Math.random() * 24,
      freq: 0.01 + Math.random() * 0.02,
      amp: 8 + Math.random() * 18,
      alpha: 0.3 + Math.random() * 0.6
    };
  }

  /**
   * Generates a swirling wind eddy / atmospheric vortex
   */
  function createSwirl(w, h) {
    return {
      x: w * (0.2 + Math.random() * 0.6),
      y: h * (0.25 + Math.random() * 0.5),
      radius: 10,
      maxRadius: 45 + Math.random() * 40,
      rotSpeed: 0.06 + Math.random() * 0.04,
      angle: Math.random() * Math.PI * 2,
      alpha: 0.7,
      growthRate: 0.45 + Math.random() * 0.35
    };
  }

  /**
   * Starts the flowing wind animation
   * @param {string} message - Primary scanning status text
   * @param {string} target - Searched city or target coordinates
   * @param {{x: number, y: number} | null} origin - Coordinates of origin
   */
  function start(message = 'Measuring Wind & Atmospheric Signals...', target = 'WIND STREAM', origin = null) {
    if (!overlay || !ctx) init();
    if (!overlay || !ctx) return;

    if (titleEl) titleEl.textContent = message;
    if (targetEl) targetEl.textContent = target.toUpperCase();

    overlay.classList.remove('hidden');
    resize();

    const { w, h } = getDimensions();

    // Map origin relative to middle container for initial wind gust
    if (origin && typeof origin.x === 'number' && typeof origin.y === 'number') {
      const oRect = overlay.getBoundingClientRect();
      gustX = Math.max(20, Math.min(w - 20, origin.x - oRect.left));
      gustY = Math.max(20, Math.min(h - 20, origin.y - oRect.top));
      hasActiveGust = true;
    } else {
      gustX = w * 0.15;
      gustY = h * 0.5;
      hasActiveGust = false;
    }

    // Seed wind streamlines distributed across the middle dashboard
    streams = [];
    for (let i = 0; i < STREAM_COUNT; i++) {
      streams.push(createStream(w, h, true));
    }

    // Seed wind particles
    particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(createParticle(w, h, true));
    }

    // Seed wind vortex swirls
    swirls = [];
    for (let i = 0; i < SWIRL_COUNT; i++) {
      swirls.push(createSwirl(w, h));
    }

    isActive = true;
    targetOpacity = 1;
    opacity = 1;
    time = 0;

    if (!animId) {
      loop();
    }
  }

  /**
   * Smoothly stops the flowing wind animation
   */
  function stop() {
    targetOpacity = 0;
    setTimeout(() => {
      if (targetOpacity === 0) {
        isActive = false;
        if (overlay) overlay.classList.add('hidden');
        if (animId) {
          cancelAnimationFrame(animId);
          animId = null;
        }
        if (ctx && canvas) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    }, 450);
  }

  /**
   * Main 60 FPS animation loop
   */
  function loop() {
    if (!isActive && opacity <= 0.02) {
      if (animId) {
        cancelAnimationFrame(animId);
        animId = null;
      }
      return;
    }

    animId = requestAnimationFrame(loop);
    draw();
  }

  /**
   * Renders the flowing wind streamlines, air currents, and particles
   */
  function draw() {
    const { w, h } = getDimensions();
    ctx.clearRect(0, 0, w, h);

    // Smooth opacity fading
    opacity += (targetOpacity - opacity) * 0.16;
    if (overlay) overlay.style.opacity = opacity.toFixed(3);

    time += 0.035;

    // 1. Draw Aerodynamic Flowing Wind Streamlines
    for (let i = 0; i < streams.length; i++) {
      const s = streams[i];
      s.x += s.speed;

      // Reset stream when it flies off the right edge
      if (s.x - s.length > w + 100) {
        streams[i] = createStream(w, h, false);
        continue;
      }

      ctx.beginPath();
      const points = 18;
      let firstPoint = true;

      for (let p = 0; p <= points; p++) {
        const frac = p / points;
        const px = s.x - (1 - frac) * s.length;
        
        // Fluid undulating sine wave equation
        const wave = Math.sin(px * s.frequency + time * 3) * s.amplitude
                   + Math.cos(px * 0.005 + time) * (s.amplitude * 0.35);
        
        let py = s.baseY + wave;

        // Apply wind loop swirl if stream is a curling vortex stream
        if (s.hasCurl && frac > 0.45 && frac < 0.85) {
          const curlFactor = Math.sin(((frac - 0.45) / 0.4) * Math.PI);
          py += Math.cos(time * 5 + frac * 8) * (s.curlRadius * curlFactor);
        }

        if (firstPoint) {
          ctx.moveTo(px, py);
          firstPoint = false;
        } else {
          ctx.lineTo(px, py);
        }
      }

      // Wind current tapered stroke: bold solid black with soft fade
      ctx.strokeStyle = `rgba(0, 0, 0, ${(s.alpha * opacity).toFixed(3)})`;
      ctx.lineWidth = s.thickness;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }

    // 2. Draw Wind Dust / Air Particles Racing on Currents
    for (let j = 0; j < particles.length; j++) {
      const p = particles[j];
      p.x += p.speed;

      if (p.x > w + 50) {
        particles[j] = createParticle(w, h, false);
        continue;
      }

      const wave = Math.sin(p.x * p.freq + time * 4) * p.amp;
      const currentY = p.baseY + wave;

      // Draw particle speed streak
      ctx.beginPath();
      ctx.moveTo(p.x - p.trailLength, currentY);
      ctx.lineTo(p.x, currentY);
      ctx.strokeStyle = `rgba(0, 0, 0, ${(p.alpha * 0.8 * opacity).toFixed(3)})`;
      ctx.lineWidth = p.size;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Particle lead head
      ctx.beginPath();
      ctx.arc(p.x, currentY, p.size * 0.9, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 0, 0, ${(p.alpha * opacity).toFixed(3)})`;
      ctx.fill();
    }

    // 3. Draw Atmospheric Swirling Wind Eddies / Vortices
    for (let k = swirls.length - 1; k >= 0; k--) {
      const sw = swirls[k];
      sw.radius += sw.growthRate;
      sw.angle += sw.rotSpeed;
      sw.x += 1.8; // Drift gently across with main wind current
      
      const progress = sw.radius / sw.maxRadius;
      const currentAlpha = Math.max(0, (1 - progress) * sw.alpha * opacity);

      if (currentAlpha <= 0.02 || sw.radius >= sw.maxRadius || sw.x > w + 60) {
        swirls[k] = createSwirl(w, h);
        continue;
      }

      ctx.beginPath();
      const spiralTurns = 2.4;
      const spiralPoints = 28;
      
      for (let t = 0; t <= spiralPoints; t++) {
        const theta = sw.angle + (t / spiralPoints) * Math.PI * 2 * spiralTurns;
        const r = (t / spiralPoints) * sw.radius;
        const sx = sw.x + Math.cos(theta) * r;
        const sy = sw.y + Math.sin(theta) * r * 0.55; // Slightly flattened aerodynamic ellipse

        if (t === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }

      ctx.strokeStyle = `rgba(0, 0, 0, ${(currentAlpha * 0.75).toFixed(3)})`;
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }

    // 4. Draw Initial Search Origin Wind Burst Ripples if active
    if (hasActiveGust) {
      ctx.beginPath();
      const gustRadius = ((time * 70) % 200) + 10;
      const gustAlpha = Math.max(0, (1 - gustRadius / 200) * 0.6 * opacity);
      
      // Elliptical wind wave pushing rightward
      ctx.ellipse(gustX + gustRadius * 0.8, gustY, gustRadius * 1.4, gustRadius * 0.6, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 0, 0, ${gustAlpha.toFixed(3)})`;
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }
  }

  return {
    init,
    start,
    stop,
    resize
  };
})();

// Attach globally
if (typeof window !== 'undefined') {
  window.WindFlow = WindFlow;
}
