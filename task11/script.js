// ===== Canvas Drawing App =====
// Features:
// - Mouse + touch drawing
// - Color & brush size controls
// - Undo (per stroke), Clear, Save as PNG
// - Canvas auto-resizes for device pixel ratio for crisp lines

// DOM elements
const canvas = document.getElementById('drawCanvas');
const ctx = canvas.getContext('2d');
const colorPicker = document.getElementById('colorPicker');
const brushSize = document.getElementById('brushSize');
const brushSizeLabel = document.getElementById('brushSizeLabel');
const clearBtn = document.getElementById('clearBtn');
const saveBtn = document.getElementById('saveBtn');
const undoBtn = document.getElementById('undoBtn');

// Drawing state
let drawing = false;
let currentStroke = null; // {color, size, points: [{x,y}, ...]}
let strokes = []; // array of strokes for undo/redo

// device pixel ratio for high-DPI
function fitCanvasToContainer() {
  // CSS size
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';
  // scale context so drawing coordinates map to CSS pixels
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // redraw existing strokes after resize
  redrawAll();
}

// convert client coords to canvas (CSS) coords
function getCanvasPoint(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: clientX - rect.left,
    y: clientY - rect.top
  };
}

// Start stroke
function beginStroke(x, y) {
  drawing = true;
  currentStroke = {
    color: colorPicker.value,
    size: parseInt(brushSize.value, 10),
    points: [{ x, y }]
  };
}

// Continue stroke (add point)
function addPointToStroke(x, y) {
  if (!drawing || !currentStroke) return;
  currentStroke.points.push({ x, y });
  // draw just the last segment for performance
  const pts = currentStroke.points;
  const len = pts.length;
  if (len >= 2) {
    drawSegment(pts[len - 2], pts[len - 1], currentStroke.color, currentStroke.size);
  } else {
    drawDot(x, y, currentStroke.color, currentStroke.size);
  }
}

// Finish stroke
function endStroke() {
  if (!drawing) return;
  drawing = false;
  if (currentStroke && currentStroke.points.length > 0) {
    strokes.push(currentStroke);
    currentStroke = null;
  }
}

// Draw utilities
function drawSegment(p1, p2, color, size) {
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = color;
  ctx.lineWidth = size;
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();
}

function drawDot(x, y, color, size) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, size / 2, 0, Math.PI * 2);
  ctx.fill();
}

// Redraw entire canvas from strokes array
function redrawAll() {
  // clear canvas (use CSS width/height scaled)
  const rect = canvas.getBoundingClientRect();
  ctx.clearRect(0, 0, rect.width, rect.height);

  for (const stroke of strokes) {
    const pts = stroke.points;
    if (pts.length === 1) {
      drawDot(pts[0].x, pts[0].y, stroke.color, stroke.size);
    } else {
      for (let i = 1; i < pts.length; i++) {
        drawSegment(pts[i - 1], pts[i], stroke.color, stroke.size);
      }
    }
  }
}

// Undo last stroke
function undoLast() {
  strokes.pop();
  redrawAll();
}

// Clear canvas entirely
function clearCanvas() {
  strokes = [];
  currentStroke = null;
  redrawAll();
}

// Save as PNG
function saveAsImage() {
  // To save crisp, convert canvas to a blob from actual pixel buffer (canvas.width/height)
  canvas.toBlob(function (blob) {
    if (!blob) {
      alert('Save failed (browser may not support canvas.toBlob).');
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `drawing_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, 'image/png');
}

// Event handlers — mouse
canvas.addEventListener('mousedown', (e) => {
  const p = getCanvasPoint(e.clientX, e.clientY);
  beginStroke(p.x, p.y);
});
window.addEventListener('mousemove', (e) => {
  if (!drawing) return;
  const p = getCanvasPoint(e.clientX, e.clientY);
  addPointToStroke(p.x, p.y);
});
window.addEventListener('mouseup', () => endStroke());

// Touch support
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const touch = e.changedTouches[0];
  const p = getCanvasPoint(touch.clientX, touch.clientY);
  beginStroke(p.x, p.y);
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  const touch = e.changedTouches[0];
  const p = getCanvasPoint(touch.clientX, touch.clientY);
  addPointToStroke(p.x, p.y);
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  endStroke();
}, { passive: false });

// controls
brushSize.addEventListener('input', () => {
  brushSizeLabel.textContent = brushSize.value;
});
clearBtn.addEventListener('click', () => {
  // simple confirm to avoid accidental clears
  if (confirm('Clear the canvas? This cannot be undone (you can use Undo for previous strokes).')) {
    clearCanvas();
  }
});
saveBtn.addEventListener('click', saveAsImage);
undoBtn.addEventListener('click', undoLast);

// Handle window resize to keep canvas crisp
let resizeTimeout = null;
function handleResize() {
  // debounce
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    fitCanvasToContainer();
  }, 120);
}
window.addEventListener('resize', handleResize);

// Initial setup: set canvas CSS height (already set in CSS), then fit to container
window.addEventListener('load', () => {
  fitCanvasToContainer();
});

// ===== Simple SVG Animation (JS-driven) =====
// We'll animate the movingGroup element horizontally and bounce left-right.
// Controls: play/pause and speed.

const svg = document.getElementById('demoSvg');
const movingGroup = document.getElementById('movingGroup');
const playSvg = document.getElementById('playSvg');
const pauseSvg = document.getElementById('pauseSvg');
const svgSpeed = document.getElementById('svgSpeed');
const svgSpeedLabel = document.getElementById('svgSpeedLabel');

let svgAnimReq = null;
let svgX = 50; // starting x
let svgDir = 1; // 1 -> right, -1 -> left
let svgMin = 30;
let svgMax = 770; // viewBox width 800 - keep margin
let svgVelocityBase = 100; // pixels per second at speed=1
let svgPlaying = true;

function updateSvgSpeedLabel() {
  svgSpeedLabel.textContent = parseFloat(svgSpeed.value).toFixed(1) + 'x';
}
svgSpeed.addEventListener('input', updateSvgSpeedLabel);

// animation loop using requestAnimationFrame for smooth motion
let lastTimestamp = null;
function svgAnimate(ts) {
  if (!lastTimestamp) lastTimestamp = ts;
  const dt = (ts - lastTimestamp) / 1000; // seconds
  lastTimestamp = ts;

  const speedFactor = parseFloat(svgSpeed.value);
  const velocity = svgVelocityBase * speedFactor; // px / sec
  svgX += svgDir * velocity * dt;

  // bounce
  if (svgX >= svgMax) {
    svgX = svgMax;
    svgDir = -1;
  } else if (svgX <= svgMin) {
    svgX = svgMin;
    svgDir = 1;
  }

  movingGroup.setAttribute('transform', `translate(${svgX - 50}, 0)`); // group initially at x=50

  if (svgPlaying) svgAnimReq = requestAnimationFrame(svgAnimate);
}

function startSvg() {
  if (svgPlaying) return;
  svgPlaying = true;
  lastTimestamp = null;
  svgAnimReq = requestAnimationFrame(svgAnimate);
}

function pauseSvgAnim() {
  svgPlaying = false;
  if (svgAnimReq) {
    cancelAnimationFrame(svgAnimReq);
    svgAnimReq = null;
  }
}

playSvg.addEventListener('click', startSvg);
pauseSvg.addEventListener('click', pauseSvgAnim);

// Start animation automatically
updateSvgSpeedLabel();
svgAnimReq = requestAnimationFrame(svgAnimate);
