// blencad portfolio 3D Background Engine
const totalFrames = 180;
const images = [];
let loadedCount = 0;
let currentFrame = 1;
let targetFrame = 1;

// Elements
const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');
const loader = document.getElementById('loader');
const progressBar = document.getElementById('progress-bar');
const progressPercent = document.getElementById('progress-percent');
const container = document.querySelector('.scroll-container');
const sections = document.querySelectorAll('.scroll-section');
const navItems = document.querySelectorAll('.nav-item');
const scrollBtn = document.getElementById('scroll-btn');

// Start preloading images immediately
function preloadImages() {
  for (let i = 1; i <= totalFrames; i++) {
    const img = new Image();
    const frameNum = String(i).padStart(4, '0');
    img.src = `assets/frames/${frameNum}.png`;
    
    img.onload = () => {
      loadedCount++;
      handleProgress(loadedCount);
    };
    
    img.onerror = () => {
      console.warn(`Failed to load frame ${frameNum}. Retrying...`);
      loadedCount++; // Progress to avoid getting stuck
      handleProgress(loadedCount);
    };
    
    images.push(img);
  }
}

// Update loading screen percentage and progress bar
function handleProgress(count) {
  const percent = Math.round((count / totalFrames) * 100);
  progressBar.style.width = `${percent}%`;
  progressPercent.textContent = `${percent}%`;
  
  if (count === totalFrames) {
    setTimeout(() => {
      // Fade out loader
      loader.classList.add('fade-out');
      // Initialize app state
      initApp();
    }, 600); // Visual delay for smooth transition
  }
}

// Draw a single image to cover the full screen canvas (maintain aspect ratio)
function drawFrame(img) {
  if (!img) return;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  const canvasAspect = canvas.width / canvas.height;
  const imgAspect = img.naturalWidth / img.naturalHeight;
  
  let drawWidth, drawHeight, drawX, drawY;
  
  if (canvasAspect > imgAspect) {
    // Canvas is wider than image aspect ratio
    drawWidth = canvas.width;
    drawHeight = canvas.width / imgAspect;
    drawX = 0;
    drawY = (canvas.height - drawHeight) / 2;
  } else {
    // Canvas is taller than image aspect ratio
    drawWidth = canvas.height * imgAspect;
    drawHeight = canvas.height;
    drawX = (canvas.width - drawWidth) / 2;
    drawY = 0;
  }
  
  ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
}

// Eased Rendering Loop
function renderLoop() {
  const diff = targetFrame - currentFrame;
  
  // If the current frame hasn't reached target frame, update it
  if (Math.abs(diff) > 0.005) {
    currentFrame += diff * 0.12; // Easing speed (inertia factor)
    
    // Bounds check
    if (currentFrame < 1) currentFrame = 1;
    if (currentFrame > totalFrames) currentFrame = totalFrames;
    
    const frameIndex = Math.round(currentFrame) - 1;
    const img = images[frameIndex];
    if (img && img.complete) {
      drawFrame(img);
    }
  } else {
    // Snap to exact target if difference is negligible
    currentFrame = targetFrame;
    const frameIndex = Math.round(currentFrame) - 1;
    const img = images[frameIndex];
    if (img && img.complete) {
      drawFrame(img);
    }
  }
  
  requestAnimationFrame(renderLoop);
}

// Load section card contents from separate JSON file
function loadSectionContent() {
  fetch('content.json')
    .then(response => {
      if (!response.ok) throw new Error('Network response was not OK');
      return response.json();
    })
    .then(data => {
      sections.forEach((sec, idx) => {
        const info = sec.querySelector('.section-info');
        const item = data[idx];
        if (info && item) {
          const labelEl = info.querySelector('.label');
          const titleEl = info.querySelector('h2');
          const descEl = info.querySelector('p');
          if (labelEl) labelEl.textContent = item.stage;
          if (titleEl) titleEl.textContent = item.title;
          if (descEl) descEl.textContent = item.description;
        }
      });
    })
    .catch(err => {
      console.warn('Could not load separate content.json, using fallback markup content.', err);
    });
}

// Initialize active states, canvas size, and render loop
function initApp() {
  loadSectionContent();
  resizeCanvas();
  
  // Trigger initial scroll calculation to set active state and frame 1
  handleScroll();
  
  // Make the first section text fade in
  sections[0].classList.add('active-section');
  
  // Start the animation loop
  requestAnimationFrame(renderLoop);
}

// Resize Canvas
function resizeCanvas() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  // Re-draw current frame immediately on resize
  const frameIndex = Math.round(currentFrame) - 1;
  const img = images[frameIndex];
  if (img) {
    drawFrame(img);
  }
}

// Calculate target frame and active states based on scroll position
function handleScroll() {
  const scrollTop = container.scrollTop;
  const height = container.clientHeight;
  const maxScroll = container.scrollHeight - height;
  
  if (maxScroll <= 0) return;
  
  const scrollFraction = scrollTop / maxScroll;
  
  // Piecewise linear mapping to align sections exactly:
  // Section 0 (scrollTop = 0)      -> Frame 1
  // Section 1 (scrollTop = height)    -> Frame 60
  // Section 2 (scrollTop = 2*height)  -> Frame 120
  // Section 3 (scrollTop = 3*height)  -> Frame 180
  const sectionIndexContinuous = scrollTop / height;
  const sectionIndex = Math.floor(sectionIndexContinuous);
  const sectionProgress = sectionIndexContinuous - sectionIndex;
  
  let tempTarget = 1;
  if (sectionIndex === 0) {
    tempTarget = 1 + sectionProgress * 59; // 1 to 60
  } else if (sectionIndex === 1) {
    tempTarget = 60 + sectionProgress * 60; // 60 to 120
  } else if (sectionIndex === 2) {
    tempTarget = 120 + sectionProgress * 60; // 120 to 180
  } else {
    tempTarget = 180;
  }
  
  targetFrame = Math.max(1, Math.min(totalFrames, tempTarget));
  
  // Determine currently active snapped section index
  const activeIndex = Math.round(sectionIndexContinuous);
  
  // Update section active classes (triggers info-card fade-in transition)
  sections.forEach((sec, idx) => {
    if (idx === activeIndex) {
      sec.classList.add('active-section');
    } else {
      sec.classList.remove('active-section');
    }
  });
  
  // Update header navigation active states
  navItems.forEach((item, idx) => {
    if (idx === activeIndex) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
  
  // Update Scroll Button direction and text
  if (activeIndex === 3) {
    scrollBtn.classList.add('up-mode');
    scrollBtn.querySelector('.btn-text').textContent = 'TOP';
    scrollBtn.setAttribute('aria-label', 'Volver al inicio');
  } else {
    scrollBtn.classList.remove('up-mode');
    scrollBtn.querySelector('.btn-text').textContent = 'SCROLL';
    scrollBtn.setAttribute('aria-label', 'Siguiente etapa');
  }
}

// Event Listeners
window.addEventListener('resize', resizeCanvas);
container.addEventListener('scroll', handleScroll);

// Header Navigation clicks
navItems.forEach((item) => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    const index = parseInt(item.getAttribute('data-index'), 10);
    const height = container.clientHeight;
    container.scrollTo({
      top: index * height,
      behavior: 'smooth'
    });
  });
});

// Scroll Button click navigation
scrollBtn.addEventListener('click', () => {
  const scrollTop = container.scrollTop;
  const height = container.clientHeight;
  const currentSection = Math.round(scrollTop / height);
  
  let nextSection;
  if (currentSection >= 3) {
    nextSection = 0; // Reset to top section
  } else {
    nextSection = currentSection + 1; // Advance to next section
  }
  
  container.scrollTo({
    top: nextSection * height,
    behavior: 'smooth'
  });
});

// Start Preloading
preloadImages();

// // Halftone Pattern Generator - Vanilla JavaScript
// Enhanced for BlenCAD Studio Portfolio with 3D Perspective Projection
class HalftonePattern {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.animationId = null;
    this.startTime = Date.now();
    
    // Default settings with 3D camera configurations
    this.settings = {
      density: 35,
      size: 35,
      intensity: 65,
      speed: 0.1,
      dotShape: 'circle', // 'circle', 'square', 'triangle', 'diamond'
      animationEffect: 'wave', // 'wave', 'pulse', 'spiral'
      backgroundColor: '#060606',
      foregroundColor: '#ffffff',
      isAnimated: true,
      mouseInteractive: true,
      mouseInteractionRadius: 150,
      morphing: false,
      camera: {
        x: 0.409787,
        y: 0.192789,
        z: 0.072479,
        rx: 85.946,
        ry: 0.000,
        rz: 88.670,
        fov: 50
      },
      grid: {
        sizeX: 1.0,
        sizeY: 1.0,
        step: 0.025
      },
      ...options
    };
    
    this.mouse = { x: -2000, y: -2000, active: false };
    
    // Camera database for each frame (Pos X, Y, Z | Rot X, Y, Z)
    this.cameraFrames = {};
    const defaultCam = {
      x: 0.409787,
      y: 0.192789,
      z: 0.072479,
      rx: 85.946,
      ry: 0.000,
      rz: 88.670,
      fov: 50
    };
    
    // Fill all 180 frames with the camera coordinates
    for (let i = 1; i <= 180; i++) {
      this.cameraFrames[i] = { ...defaultCam };
    }
    
    this.init();
  }
  
  init() {
    this.resizeCanvas();
    this.bindEvents();
    this.animate();
  }
  
  resizeCanvas() {
    if (!this.canvas) return;
    this.canvas.width = this.canvas.offsetWidth;
    this.canvas.height = this.canvas.offsetHeight;
  }
  
  bindEvents() {
    window.addEventListener('resize', () => this.resizeCanvas());
    
    if (this.settings.mouseInteractive) {
      window.addEventListener('mousemove', (e) => {
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = e.clientX - rect.left;
        this.mouse.y = e.clientY - rect.top;
        this.mouse.active = true;
      });
      
      window.addEventListener('mouseleave', () => {
        this.mouse.active = false;
        this.mouse.x = -2000;
        this.mouse.y = -2000;
      });
      
      window.addEventListener('mouseenter', () => {
        this.mouse.active = true;
      });
    }
  }
  
  // Optimized shape rendering directly on canvas (no translate/save/restore)
  drawShape(ctx, x, y, size, shape) {
    const half = size / 2;
    switch (shape) {
      case 'circle':
        ctx.beginPath();
        ctx.arc(x, y, half, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'square':
        ctx.fillRect(x - half, y - half, size, size);
        break;

      case 'triangle':
        ctx.beginPath();
        ctx.moveTo(x, y - half);
        ctx.lineTo(x - half, y + half);
        ctx.lineTo(x + half, y + half);
        ctx.closePath();
        ctx.fill();
        break;

      case 'diamond':
        ctx.beginPath();
        ctx.moveTo(x, y - half);
        ctx.lineTo(x + half, y);
        ctx.lineTo(x, y + half);
        ctx.lineTo(x - half, y);
        ctx.closePath();
        ctx.fill();
        break;
    }
  }
  
  draw() {
    const { canvas, ctx, settings } = this;
    if (!canvas || !ctx) return;
    
    const time = Date.now() - this.startTime;
    
    // Clear canvas
    ctx.fillStyle = settings.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Cache the accent color once per frame to avoid severe layout recalculation performance issues
    const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#bffd00';
    
    // Get current camera from scroll frame
    const frame = Math.max(1, Math.min(180, Math.round(currentFrame)));
    const cam = this.cameraFrames[frame] || this.settings.camera;
    const grid = settings.grid;
    
    // Precompute trigonometric values for camera inverse rotation
    const rxRad = cam.rx * Math.PI / 180;
    const ryRad = cam.ry * Math.PI / 180;
    const rzRad = cam.rz * Math.PI / 180;
    
    const cosZ = Math.cos(-rzRad);
    const sinZ = Math.sin(-rzRad);
    const cosY = Math.cos(-ryRad);
    const sinY = Math.sin(-ryRad);
    const cosX = Math.cos(-rxRad);
    const sinX = Math.sin(-rxRad);
    
    // Focal length and projection variables
    const f = (canvas.width / 2) / Math.tan((cam.fov * Math.PI / 180) / 2);
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Reference distance (camera to origin) for font/shape scaling
    const dRef = Math.sqrt(cam.x * cam.x + cam.y * cam.y + cam.z * cam.z);
    
    // Base dot size from configurations
    const dotSize = Math.max(1, settings.size * 0.3);
    const maxDistance = Math.sqrt(grid.sizeX * grid.sizeX + grid.sizeY * grid.sizeY);
    const spacingStep = grid.step;
    
    const points = [];
    const sizePad = settings.size * 2;
    
    // Precompute 45-degree rotation values for the grid layout to avoid parallel lines
    const gridRotRad = 45 * Math.PI / 180;
    const cosGridRot = Math.cos(gridRotRad);
    const sinGridRot = Math.sin(gridRotRad);
    
    for (let gx = -grid.sizeX; gx <= grid.sizeX; gx += spacingStep) {
      for (let gy = -grid.sizeY; gy <= grid.sizeY; gy += spacingStep) {
        // Rotate grid points by 45 degrees on the horizontal (Z = 0) plane
        const xw = gx * cosGridRot - gy * sinGridRot;
        const yw = gx * sinGridRot + gy * cosGridRot;
        const zw = 0; // Horizontal plane Z = 0
        
        // 1. Translate
        const dx = xw - cam.x;
        const dy = yw - cam.y;
        const dz = zw - cam.z;
        
        // 2. Rotate Z
        const x1 = dx * cosZ - dy * sinZ;
        const y1 = dx * sinZ + dy * cosZ;
        const z1 = dz;
        
        // 3. Rotate Y
        const x2 = x1 * cosY + z1 * sinY;
        const y2 = y1;
        const z2 = -x1 * sinY + z1 * cosY;
        
        // 4. Rotate X
        const x3 = x2;
        const y3 = y2 * cosX - z2 * sinX;
        const z3 = y2 * sinX + z2 * cosX;
        
        const depth = -z3;
        if (depth <= 0.005) continue; // Behind camera or plane clipping
        
        // Project to screen space
        const xs = centerX + f * (x3 / depth);
        const ys = centerY - f * (y3 / depth);
        
        // Clip off-screen points with small padding
        if (xs < -sizePad || xs > canvas.width + sizePad || ys < -sizePad || ys > canvas.height + sizePad) {
          continue;
        }
        
        points.push({ xw, yw, xs, ys, depth });
      }
    }
    
    // Painter's algorithm: sort points from back to front (largest depth first)
    points.sort((a, b) => b.depth - a.depth);
    
    // Draw all points
    for (const p of points) {
      const { xw, yw, xs, ys, depth } = p;
      
      // 3D perspective scale factor
      const scale = dRef / depth;
      
      // World space radial distance from origin (0, 0)
      const distance = Math.sqrt(xw * xw + yw * yw);
      
      // Halftone Gradient Factor (fade out far from world origin)
      const intensity = settings.intensity / 100;
      const gradientFactor = Math.max(0, 1 - (distance / maxDistance) * intensity);
      
      // Mouse interactive scale in screen space
      let mouseInfluence = 1;
      let isHovered = false;
      if (settings.mouseInteractive && this.mouse.active) {
        const mdx = xs - this.mouse.x;
        const mdy = ys - this.mouse.y;
        const dist = Math.sqrt(mdx * mdx + mdy * mdy);
        const rad = settings.mouseInteractionRadius;
        
        if (dist < rad) {
          const force = (rad - dist) / rad;
          mouseInfluence = 1 + force * 1.5;
          isHovered = true;
        }
      }
      
      // Animation factor based on 3D distance and time
      let animationFactor = 1;
      if (settings.isAnimated) {
        if (settings.animationEffect === 'pulse') {
          animationFactor = 0.5 + 0.5 * Math.sin(time * 0.003 * settings.speed);
        } else if (settings.animationEffect === 'spiral') {
          const angle = Math.atan2(yw, xw);
          animationFactor = 0.5 + 0.5 * Math.sin(time * 0.003 * settings.speed + distance * 10 + angle * 3);
        } else { // default 'wave'
          animationFactor = 0.5 + 0.5 * Math.sin(time * 0.003 * settings.speed + distance * 10);
        }
      }
      
      // Calculate final dot size in perspective
      const finalSize = dotSize * gradientFactor * animationFactor * mouseInfluence * scale;
      
      if (finalSize > 0.5) {
        if (isHovered) {
          ctx.fillStyle = accentColor;
        } else {
          ctx.fillStyle = settings.foregroundColor;
        }
        
        // Handle morphing if enabled: shape morphs based on depth / time
        let currentShape = settings.dotShape;
        if (settings.morphing) {
          const shapes = ['circle', 'square', 'triangle', 'diamond'];
          const morphIndex = Math.floor((time * 0.0005 + depth * 5) % shapes.length);
          currentShape = shapes[morphIndex];
        }
        
        this.drawShape(ctx, xs, ys, finalSize, currentShape);
      }
    }
  }
  
  animate() {
    this.draw();
    this.animationId = requestAnimationFrame(() => this.animate());
  }
  
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
  }
}

// Initialize Halftone Pattern on load
let halftonePattern;
window.addEventListener('DOMContentLoaded', () => {
  halftonePattern = new HalftonePattern('halftone-canvas', {
    backgroundColor: '#060606', // Theme dark background
    foregroundColor: '#ffffff', // Solid white characters
    density: 35,
    size: 35,
    intensity: 65,
    speed: 0.1,
    dotShape: 'circle',
    animationEffect: 'wave'
  });

  // Handle control button clicks
  const controlButtons = document.querySelectorAll('.pattern-controls button');
  controlButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const group = btn.closest('.controls-group');
      const type = group.getAttribute('data-type');
      const value = btn.getAttribute('data-value');
      
      // Update active state in UI
      group.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Update pattern settings
      if (type === 'effect') {
        halftonePattern.updateSettings({ animationEffect: value });
      } else if (type === 'shape') {
        halftonePattern.updateSettings({ dotShape: value });
      }
    });
  });
});
