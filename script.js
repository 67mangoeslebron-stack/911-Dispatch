// script.js - V146 SECTOR 4 REALISM

// --- SCENARIO DATABASE ---
const SCENARIOS = [
    { type: "DISORDERLY", priority: "P3", addr: "TACO BELL", intro: "Customer refusing to leave, yelling at staff.", details: "Taco Bell on Broadway. Male subject, agitated.", mapX: 0.25, mapY: 0.4, isSMS: false },
    { type: "MEDICAL", priority: "P1", addr: "WALGREENS", intro: "Elderly male fell, head injury.", details: "Walgreens parking lot. Bleeding heavily.", mapX: 0.6, mapY: 0.15, isSMS: false },
    { type: "ALARM", priority: "P2", addr: "SHELL GAS", intro: "Silent hold-up alarm triggered.", details: "Shell Station at the intersection. No answer on callback.", mapX: 0.4, mapY: 0.3, isSMS: false },
    { type: "DOMESTIC", priority: "P1", addr: "EDGEWATER APTS", intro: "Fighting heard in unit 4B.", details: "Edgewater Complex. Screaming and throwing objects.", mapX: 0.1, mapY: 0.15, isSMS: false },
    { type: "SUSPICIOUS", priority: "P3", addr: "JACK IN THE BOX", intro: "Person looking into cars.", details: "Jack in the Box drive-thru area. Wearing black hoodie.", mapX: 0.5, mapY: 0.5, isSMS: false },
    // SMS CALLS
    { type: "TEXT-911", priority: "P2", addr: "NORTHSIDE HIGH", intro: "Im hiding in the bathroom. Someone is here.", details: "SMS RECEIVED: Northside High School. Intruder reported.", mapX: 0.8, mapY: 0.8, isSMS: true },
    { type: "TEXT-911", priority: "P1", addr: "RESIDENTIAL", intro: "cant talk. husband has a knife.", details: "SMS RECEIVED: 4402 Oak Street. DV with weapon.", mapX: 0.3, mapY: 0.7, isSMS: true }
];

let currentCall = null;
let selectedUnits = [];
let mapTarget = null;
let gameActive = false;
let shiftCalls = 0;
let micActive = false;
const synth = window.speechSynthesis;
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// --- CLOCK SYSTEM ---
let timeH = Math.floor(Math.random() * 12) + 6; // Random start time
let timeM = Math.floor(Math.random() * 59);
setInterval(() => {
    if(!gameActive) return;
    timeM++;
    if(timeM > 59) { timeM = 0; timeH++; }
    if(timeH > 23) timeH = 0;
    const pad = (n) => n < 10 ? '0'+n : n;
    document.getElementById('clock-display').innerText = `${pad(timeH)}:${pad(timeM)}`;
}, 1000);

// --- GAME STATE ---
function startGame() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    document.getElementById('start-screen').classList.add('hidden');
    gameActive = true;
    addLog("sys", "SHIFT STARTED. USER: DISPATCH_01");
    addLog("sys", "SECTOR 4 MAP LOADED.");
}

function endShift() {
    gameActive = false;
    document.getElementById('end-screen').classList.remove('hidden');
    document.getElementById('total-calls').innerText = shiftCalls;
}

// --- CALL LOGIC ---
function triggerCall() {
    if(!gameActive) return;
    currentCall = SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];
    
    // Ringtone
    const osc = audioCtx.createOscillator();
    osc.frequency.setValueAtTime(440, audioCtx.currentTime);
    osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1);
    osc.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + 0.5);

    document.getElementById('call-modal').style.display = 'block';
    // If SMS, change header
    if(currentCall.isSMS) {
        document.querySelector('.module-header').innerText = "INCOMING TEXT-911";
    } else {
        document.querySelector('.module-header').innerText = "INCOMING VOICE CALL";
    }
}

function acceptCall() {
    document.getElementById('call-modal').style.display = 'none';
    shiftCalls++;
    
    document.getElementById('c-type').innerText = currentCall.type;
    document.getElementById('c-pri').innerText = currentCall.priority;
    document.getElementById('c-addr').innerText = "VERIFYING...";
    document.getElementById('disp-btn').disabled = true;
    selectedUnits = [];
    document.querySelectorAll('.u-btn').forEach(b => b.classList.remove('selected'));

    if(currentCall.isSMS) {
        addLog("sys", "** DIRECT 911 SMS CONNECTED **");
        setTimeout(() => {
            addLog("sms", `MSG: ${currentCall.intro}`);
            document.getElementById('c-addr').innerText = currentCall.addr;
            mapTarget = { x: currentCall.mapX, y: currentCall.mapY };
        }, 1500);
    } else {
        addLog("sys", "VOICE LINE CONNECTED");
        speak("911, what is the location of your emergency?");
        setTimeout(() => {
            addLog("caller", currentCall.intro);
            speak(currentCall.intro);
            document.getElementById('c-addr').innerText = currentCall.addr;
            mapTarget = { x: currentCall.mapX, y: currentCall.mapY };
        }, 2000);
    }
}

// --- DISPATCH LOGIC ---
function toggleUnit(id) {
    const el = document.getElementById(id);
    if(selectedUnits.includes(id)) {
        selectedUnits = selectedUnits.filter(u=>u!==id);
        el.classList.remove('selected');
    } else {
        selectedUnits.push(id);
        el.classList.add('selected');
    }
    
    if(currentCall && selectedUnits.length > 0) {
        document.getElementById('disp-btn').disabled = false;
    }
}

function dispatch() {
    if(!currentCall) return;
    
    const unitNames = selectedUnits.join(" and ");
    const msg = `${unitNames}, please respond to ${currentCall.addr}.`;
    
    addLog("radio", `DISP: ${msg}`);
    speak(msg);
    
    document.getElementById('disp-btn').disabled = true;
    mapTarget = null;
    currentCall = null;
}

// --- AUDIO / COMMS ---
function speak(text) {
    const ut = new SpeechSynthesisUtterance(text);
    ut.rate = 1.1; 
    synth.speak(ut);
}

// --- MIC INPUT (Simple Visualization) ---
function toggleMic() {
    micActive = !micActive;
    const btn = document.getElementById('mic-btn');
    if(micActive) {
        btn.classList.add('active');
        addLog("sys", "MIC OPEN [TRANSMITTING]");
    } else {
        btn.classList.remove('active');
        addLog("sys", "MIC CLOSED");
    }
}

function addLog(type, text) {
    const d = document.createElement('div');
    d.className = `msg ${type}`;
    d.innerText = text;
    const log = document.getElementById('chat-log');
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
}

// --- SECTOR 4 MAP RENDERER ---
const canvas = document.getElementById('map-canvas');
const ctx = canvas.getContext('2d');

function drawMap() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    const w = canvas.width; const h = canvas.height;

    // 1. Base
    ctx.fillStyle = "#0d1117"; ctx.fillRect(0,0,w,h);

    // 2. High-Density Road Network
    ctx.lineCap = "round";

    // Interstate 5 (Curved Orange)
    ctx.strokeStyle = "#443322"; ctx.lineWidth = 45;
    ctx.beginPath(); ctx.moveTo(0, h*0.3); ctx.bezierCurveTo(w*0.5, h*0.3, w*0.5, h*0.9, w, h*0.9); ctx.stroke();
    ctx.strokeStyle = "#d27504"; ctx.lineWidth = 35; ctx.stroke();

    // Arterials (Grey)
    ctx.strokeStyle = "#30363d"; ctx.lineWidth = 14;
    // Broadway
    ctx.beginPath(); ctx.moveTo(w*0.3, 0); ctx.lineTo(w*0.3, h); ctx.stroke();
    // 4th Ave
    ctx.beginPath(); ctx.moveTo(0, h*0.6); ctx.lineTo(w, h*0.6); ctx.stroke();

    // Side Streets (Thin)
    ctx.lineWidth = 6;
    ctx.beginPath(); 
    // Grid fill
    for(let i=0; i<w; i+=80) { ctx.moveTo(i, 0); ctx.lineTo(i, h); }
    for(let i=0; i<h; i+=80) { ctx.moveTo(0, i); ctx.lineTo(w, i); }
    ctx.stroke();

    // 3. Real Businesses & Landmarks
    drawLandmark(w*0.25, h*0.4, "TACO BELL", "#ff6b6b");
    drawLandmark(w*0.6, h*0.15, "WALGREENS", "#ff4757");
    drawLandmark(w*0.4, h*0.3, "SHELL", "#ffa502");
    drawLandmark(w*0.1, h*0.15, "EDGEWATER", "#747d8c");
    drawLandmark(w*0.5, h*0.5, "JACK IN BOX", "#ff6b6b");
    drawLandmark(w*0.8, h*0.8, "NORTH HIGH", "#1e90ff");

    // 4. Incident Marker
    if(mapTarget) {
        const tx = mapTarget.x * w; const ty = mapTarget.y * h;
        // Pulse
        ctx.strokeStyle = `rgba(210, 168, 255, ${Math.abs(Math.sin(Date.now()/300))})`;
        ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(tx, ty, 25, 0, Math.PI*2); ctx.stroke();
        ctx.fillStyle = "#d2a8ff"; ctx.beginPath(); ctx.arc(tx, ty, 8, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.font = "bold 12px Arial"; ctx.fillText("INC-1", tx+12, ty+4);
    }
    
    // 5. Units (Static for now, implies movement)
    drawUnit(w*0.25, h*0.3, "PD-01");
    drawUnit(w*0.6, h*0.6, "MED-1");

    requestAnimationFrame(drawMap);
}

function drawLandmark(x, y, txt, col) {
    ctx.fillStyle = col; ctx.fillRect(x-10, y-10, 20, 20);
    ctx.fillStyle = "#8b949e"; ctx.font = "10px Arial"; ctx.fillText(txt, x-15, y-15);
}

function drawUnit(x, y, txt) {
    ctx.fillStyle = "#58a6ff"; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "#58a6ff"; ctx.font = "9px Arial"; ctx.fillText(txt, x+8, y+3);
}

drawMap();
