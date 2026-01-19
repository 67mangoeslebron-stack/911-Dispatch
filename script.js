// script.js - V144 GEOGRAPHIC ENGINE

const SCENARIOS = [
    { type: "DOMESTIC", priority: "P2", addr: "6892 PARKVIEW PL", intro: "He's throwing things at me!", details: "6892 Parkview. Husband is intoxicated.", mapX: 0.35, mapY: 0.25 },
    { type: "MEDICAL", priority: "P1", addr: "EDGEWATER APTS", intro: "Unconscious female.", details: "Edgewater Apts, Bldg 5. Overdose suspected.", mapX: 0.82, mapY: 0.65 },
    { type: "FIRE", priority: "P1", addr: "3762 CLEVEMONT WAY", intro: "Structure fire, visible flames.", details: "3762 Clevemont Way. Kitchen fire.", mapX: 0.15, mapY: 0.55 },
    { type: "ALARM", priority: "P3", addr: "MAZE BANK", intro: "Silent hold-up alarm.", details: "Maze Bank Downtown. Zone 4 Vault.", mapX: 0.55, mapY: 0.45, isRobotic: true }
];

let currentCall = null;
let selectedUnits = [];
let mapTarget = null;
let micActive = false;
let voices = [];
const synth = window.speechSynthesis;
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// --- VOICE ---
function loadVoices() { voices = synth.getVoices(); }
loadVoices();
if (speechSynthesis.onvoiceschanged !== undefined) speechSynthesis.onvoiceschanged = loadVoices;

function speak(text, type = 'caller') {
    if (synth.speaking) synth.cancel();
    const ut = new SpeechSynthesisUtterance(text);
    ut.rate = type === 'dispatcher' ? 1.1 : 1.0;
    if(type === 'dispatcher') playTone();
    synth.speak(ut);
}

function playTone() {
    // Professional "Beep" instead of static
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.frequency.value = 800;
    gain.gain.value = 0.05;
    osc.start(); osc.stop(audioCtx.currentTime + 0.1);
}

// --- LOGIC ---
function nextCall() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    currentCall = SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];
    mapTarget = null; selectedUnits = [];
    document.getElementById('log').innerHTML = '<div class="msg sys">-- NEW SESSION STARTED --</div>';
    document.getElementById('sys-status').innerText = "INCOMING 911";
    document.getElementById('sys-status').style.color = "#d32f2f";
    
    document.getElementById('c-type').innerText = currentCall.type;
    document.getElementById('c-pri').innerText = currentCall.priority;
    document.getElementById('c-addr').innerText = "VERIFYING...";
    
    speak("911, emergency.", 'dispatcher');
    addMsg('disp', "911, emergency.");
    
    setTimeout(() => {
        addMsg('caller', currentCall.intro);
        speak(currentCall.intro);
        document.getElementById('c-addr').innerText = "TRACING...";
    }, 1500);
}

function verifyAddress() {
    if(!currentCall) return;
    document.getElementById('c-addr').innerText = currentCall.addr;
    mapTarget = {x: currentCall.mapX, y: currentCall.mapY};
    checkReady();
}

function toggleUnit(id) {
    const el = document.getElementById(id);
    if(selectedUnits.includes(id)) {
        selectedUnits = selectedUnits.filter(u=>u!==id);
        el.classList.remove('selected');
    } else {
        selectedUnits.push(id);
        el.classList.add('selected');
    }
    checkReady();
}

function checkReady() {
    if(mapTarget && selectedUnits.length > 0) document.getElementById('disp-btn').disabled = false;
}

function dispatch() {
    addMsg('radio', `Dispatch to units: Respond Code 3 to ${currentCall.addr}.`);
    speak("Units respond Code 3.", 'dispatcher');
    document.getElementById('disp-btn').disabled = true;
    document.getElementById('sys-status').innerText = "UNIT EN ROUTE";
    document.getElementById('sys-status').style.color = "#4a90e2";
}

function addMsg(type, text) {
    const d = document.createElement('div');
    d.className = `msg ${type}`;
    d.innerText = text;
    document.getElementById('log').appendChild(d);
}

// --- PROFESSIONAL MAP RENDERER ---
const canvas = document.getElementById('map-canvas');
const ctx = canvas.getContext('2d');

function drawMap() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    const w = canvas.width; const h = canvas.height;

    // 1. Base Layer
    ctx.fillStyle = "#18191d"; ctx.fillRect(0,0,w,h);

    // 2. River (Curved Geometry)
    ctx.strokeStyle = "#16212e"; ctx.lineWidth = 45; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(w*0.7, 0);
    ctx.bezierCurveTo(w*0.6, h*0.4, w*0.9, h*0.6, w*0.5, h);
    ctx.stroke();

    // 3. Secondary Streets (Grey Network)
    ctx.strokeStyle = "#2c2e33"; ctx.lineWidth = 3;
    // Draw semi-random street grid (Static for consistency)
    ctx.beginPath();
    // Vertical arterials
    ctx.moveTo(w*0.2, 0); ctx.lineTo(w*0.2, h);
    ctx.moveTo(w*0.4, 0); ctx.lineTo(w*0.4, h);
    ctx.moveTo(w*0.8, 0); ctx.lineTo(w*0.8, h);
    // Horizontal arterials
    ctx.moveTo(0, h*0.3); ctx.lineTo(w, h*0.3);
    ctx.moveTo(0, h*0.7); ctx.lineTo(w, h*0.7);
    // Diagonals
    ctx.moveTo(0, h*0.2); ctx.lineTo(w*0.3, h);
    ctx.stroke();

    // 4. Highway (Muted Orange - Curved)
    // Outer glow/stroke
    ctx.strokeStyle = "#a05a1a"; ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(0, h*0.55);
    ctx.bezierCurveTo(w*0.4, h*0.5, w*0.6, h*0.45, w, h*0.2);
    ctx.stroke();
    // Inner fill
    ctx.strokeStyle = "#c27c2e"; ctx.lineWidth = 10;
    ctx.stroke();

    // 5. Landmarks (Subtle Text)
    drawLabel(w*0.55, h*0.42, "MAZE BANK", "#aaa");
    drawLabel(w*0.22, h*0.28, "POLICE HQ", "#4a90e2");
    drawLabel(w*0.85, h*0.22, "GENERAL HOSP", "#d32f2f");

    // 6. Unit Markers (Blue Dots)
    drawUnit(w*0.22, h*0.3, "PD-1");
    drawUnit(w*0.45, h*0.52, "PD-5");
    drawUnit(w*0.82, h*0.24, "MD-1");

    // 7. Active Incident (Red Marker)
    if(mapTarget) {
        const tx = mapTarget.x * w; const ty = mapTarget.y * h;
        // Outer fade
        const grad = ctx.createRadialGradient(tx, ty, 5, tx, ty, 20);
        grad.addColorStop(0, "rgba(211, 47, 47, 0.5)");
        grad.addColorStop(1, "rgba(211, 47, 47, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(tx, ty, 20, 0, Math.PI*2); ctx.fill();
        
        // Solid center
        ctx.fillStyle = "#d32f2f"; 
        ctx.beginPath(); ctx.arc(tx, ty, 6, 0, Math.PI*2); ctx.fill();
        
        // Label
        ctx.fillStyle = "#fff"; ctx.font = "bold 11px Arial"; 
        ctx.fillText("INC-1", tx+10, ty+4);
    }

    requestAnimationFrame(drawMap);
}

function drawLabel(x, y, txt, col) {
    ctx.fillStyle = col; ctx.font = "600 10px Segoe UI"; ctx.fillText(txt, x, y);
}

function drawUnit(x, y, label) {
    ctx.fillStyle = "#4a90e2";
    ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "#888"; ctx.font = "9px Arial"; ctx.fillText(label, x+6, y+3);
}

drawMap();
