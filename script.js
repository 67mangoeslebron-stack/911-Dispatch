// CONFIGURATION
const MAP_WIDTH = 1200;
const MAP_HEIGHT = 800;
const MIN_CALL_TIME = 180; // 3 minutes in seconds (simulated)

// --- MAP DATA: LANDMARKS & ZONES ---
// Coordinates are 0.0 to 1.0 (Percentage of map)
const LANDMARKS = [
    { id: 'walmart', name: "WALMART SUPERCENTER", type: 'biz', x: 0.15, y: 0.2, w: 0.15, h: 0.1, color: '#224488' },
    { id: 'hosp', name: "MEMORIAL HOSPITAL", type: 'gov', x: 0.75, y: 0.1, w: 0.1, h: 0.15, color: '#882222' },
    { id: 'prison', name: "COUNTY CORRECTIONAL", type: 'gov', x: 0.8, y: 0.8, w: 0.15, h: 0.15, color: '#552200' },
    { id: 'stadium', name: "RIVER CATS FIELD", type: 'rec', x: 0.1, y: 0.6, w: 0.12, h: 0.12, color: '#225522' },
    { id: 'apts_n', name: "NORTHGATE APTS", type: 'res', x: 0.4, y: 0.15, w: 0.2, h: 0.1, color: '#333' },
    { id: 'apts_s', name: "OAKWOOD HOUSING", type: 'res', x: 0.4, y: 0.7, w: 0.2, h: 0.15, color: '#333' },
    { id: 'taco', name: "TACO BELL", type: 'biz', x: 0.35, y: 0.45, w: 0.04, h: 0.04, color: '#aa5500' },
    { id: 'shell', name: "SHELL STATION", type: 'biz', x: 0.6, y: 0.45, w: 0.04, h: 0.04, color: '#aa8800' }
];

// --- GAME STATE ---
let state = {
    active: false,
    call: null,
    units: {
        'PD1': { status: 'PATROL', x: 0.5, y: 0.5, target: null, speed: 0.0005 },
        'PD2': { status: 'PATROL', x: 0.4, y: 0.4, target: null, speed: 0.0005 },
        'MED1': { status: 'STATION', x: 0.76, y: 0.12, target: null, speed: 0.0004 } // Slower, starts at hospital
    },
    timer: 0
};

// --- INIT ---
function initSystem() {
    document.getElementById('boot-screen').classList.add('hidden');
    state.active = true;
    initVoice();
    initMap();
    gameLoop();
    log("sys", "SYSTEM ONLINE. AUDIO DRIVERS: UNSTABLE");
    log("sys", "PRESS [F9] TO TRIGGER SIMULATION CALL");
}

// --- VOICE RECOGNITION (WEB SPEECH API) ---
let recognition;
let isTransmitting = false;

function initVoice() {
    if (!('webkitSpeechRecognition' in window)) {
        alert("BROWSER NOT SUPPORTED. USE CHROME.");
        return;
    }
    recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = function() { 
        document.getElementById('mic-viz').classList.remove('hidden');
        document.getElementById('voice-command-text').innerText = "...";
    };
    
    recognition.onend = function() { 
        document.getElementById('mic-viz').classList.add('hidden');
        isTransmitting = false;
    };

    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript.toUpperCase();
        document.getElementById('voice-command-text').innerText = `"${transcript}"`;
        processVoiceCommand(transcript);
    };

    // Push to Talk Logic
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && !isTransmitting && state.active) {
            isTransmitting = true;
            try { recognition.start(); } catch(e){}
        }
    });
    
    document.addEventListener('keyup', (e) => {
        if (e.code === 'Space') {
            // We let recognition finish naturally or stop it
            // usually better to let it detect end of speech
        }
    });
}

function processVoiceCommand(cmd) {
    log("radio", `DISPATCH: "${cmd}"`);
    
    // PARSE KEYWORDS
    let targetUnit = null;
    if (cmd.includes("PD 1") || cmd.includes("UNIT 1") || cmd.includes("ONE")) targetUnit = "PD1";
    if (cmd.includes("PD 2") || cmd.includes("UNIT 2") || cmd.includes("TWO")) targetUnit = "PD2";
    if (cmd.includes("MED") || cmd.includes("AMBULANCE")) targetUnit = "MED1";

    if (!targetUnit) return;

    // ACTIONS
    if (cmd.includes("RESPOND") || cmd.includes("ENROUTE") || cmd.includes("GO")) {
        if (state.call) {
            dispatchUnit(targetUnit, state.call.loc);
        } else {
            log("sys", "ERROR: NO ACTIVE CALL");
        }
    } else if (cmd.includes("CLEAR") || cmd.includes("AVAILABLE")) {
        clearUnit(targetUnit);
    }
}

// --- UNIT LOGIC ---
function dispatchUnit(id, targetLoc) {
    const u = state.units[id];
    u.status = "ENROUTE";
    u.target = targetLoc; // {x, y}
    document.getElementById(`u-${id.toLowerCase()}`).classList.add('enroute');
    document.getElementById(`u-${id.toLowerCase()}`).querySelector('.u-stat').innerText = "ENROUTE";
    log("sys", `${id} ENROUTE TO CALL`);
}

function clearUnit(id) {
    const u = state.units[id];
    u.status = "PATROL";
    u.target = null;
    document.getElementById(`u-${id.toLowerCase()}`).classList.remove('enroute');
    document.getElementById(`u-${id.toLowerCase()}`).querySelector('.u-stat').innerText = "PATROL";
    log("sys", `${id} 10-8 (AVAILABLE)`);
}

function updateUnits() {
    for (let id in state.units) {
        let u = state.units[id];
        if (u.target) {
            // Simple movement logic (Real CAD units aren't perfect)
            let dx = u.target.x - u.x;
            let dy = u.target.y - u.y;
            let dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist > 0.005) {
                // Move towards target
                u.x += (dx / dist) * u.speed;
                u.y += (dy / dist) * u.speed;
            } else {
                // Arrived
                if (u.status === "ENROUTE") {
                    u.status = "ON SCENE";
                    document.getElementById(`u-${id.toLowerCase()}`).querySelector('.u-stat').innerText = "ON SCENE";
                    document.getElementById(`u-${id.toLowerCase()}`).classList.remove('enroute');
                    document.getElementById(`u-${id.toLowerCase()}`).classList.add('busy');
                    log("radio", `${id}: 10-23 On Scene.`);
                }
            }
        }
    }
}

// --- CALL GENERATION ---
const SCENARIOS = [
    { type: "SHOPLIFTING", loc: LANDMARKS[0], details: "Subject in custody. Walmart Loss Prevention.", sms: false },
    { type: "FIGHT", loc: LANDMARKS[6], details: "2 males fighting in parking lot. Taco Bell.", sms: false },
    { type: "MEDICAL", loc: LANDMARKS[5], details: "Chest pain. Oakwood Housing Apt 4B.", sms: false },
    { type: "PRISON RIOT", loc: LANDMARKS[2], details: "Correctional Officers request immediate backup.", sms: false },
    { type: "TEXT-911", loc: LANDMARKS[4], details: "SMS: 'bf has knife cant talk help'", sms: true }
];

function triggerCall() {
    if (state.call) return;
    const scenario = SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];
    
    // Map Location with slight offset (units don't park inside the building)
    const target = { 
        x: scenario.loc.x + (scenario.loc.w/2), 
        y: scenario.loc.y + (scenario.loc.h/2) 
    };
    
    state.call = { ...scenario, loc: target };

    const modal = document.getElementById('alert-modal');
    modal.classList.remove('hidden');
    document.getElementById('alert-type').innerText = scenario.sms ? "INCOMING SMS TEXT" : "INCOMING VOICE CALL";
}

function acceptCall() {
    document.getElementById('alert-modal').classList.add('hidden');
    document.getElementById('active-call-box').classList.remove('hidden');
    
    // Fill Data
    document.getElementById('c-source').innerText = state.call.sms ? "CELLULAR TXT" : "VOICE LANDLINE";
    document.getElementById('c-loc').innerText = state.call.loc.name;
    
    if (state.call.sms) {
        document.getElementById('sms-interface').classList.remove('hidden');
        document.getElementById('c-details').innerText = "SEE SMS LOG";
        addSms(state.call.details);
    } else {
        document.getElementById('sms-interface').classList.add('hidden');
        document.getElementById('c-details').innerText = "AUDIO CONNECTED...";
        // Simulate broken audio description
        setTimeout(() => {
            document.getElementById('c-details').innerText = state.call.details;
        }, 2000);
    }
}

function addSms(msg) {
    const div = document.getElementById('sms-history');
    div.innerHTML += `<div>>> ${msg}</div>`;
}

// --- MAP RENDERER ---
const canvas = document.getElementById('map');
const ctx = canvas.getContext('2d');

function initMap() {
    // Resize
    canvas.width = canvas.parentElement.offsetWidth;
    canvas.height = canvas.parentElement.offsetHeight;
}

function drawMap() {
    const w = canvas.width;
    const h = canvas.height;
    
    // BG
    ctx.fillStyle = "#050505";
    ctx.fillRect(0,0,w,h);

    // 1. DRAW ZONES / LANDMARKS
    LANDMARKS.forEach(l => {
        ctx.fillStyle = l.color;
        // Dim them so they look like map layers, not cartoons
        ctx.globalAlpha = 0.3; 
        ctx.fillRect(l.x * w, l.y * h, l.w * w, l.h * h);
        
        // Stroke
        ctx.globalAlpha = 0.6;
        ctx.strokeStyle = l.color;
        ctx.lineWidth = 1;
        ctx.strokeRect(l.x * w, l.y * h, l.w * w, l.h * h);

        // Text Label
        ctx.fillStyle = "#fff";
        ctx.font = "10px Arial";
        ctx.fillText(l.name, l.x * w, (l.y * h) - 5);
    });
    ctx.globalAlpha = 1.0;

    // 2. DRAW ROADS (Procedural Grid + Highway)
    ctx.beginPath();
    ctx.strokeStyle = "#222";
    ctx.lineWidth = 2;
    // Simple Grid
    for(let i=0; i<w; i+=50) { ctx.moveTo(i,0); ctx.lineTo(i,h); }
    for(let i=0; i<h; i+=50) { ctx.moveTo(0,i); ctx.lineTo(w,i); }
    ctx.stroke();

    // MAIN HIGHWAY (Curved)
    ctx.beginPath();
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 20;
    ctx.moveTo(0, h*0.5);
    ctx.bezierCurveTo(w*0.4, h*0.4, w*0.6, h*0.6, w, h*0.5);
    ctx.stroke();
    // Yellow Center Line
    ctx.beginPath();
    ctx.strokeStyle = "#aa8800";
    ctx.lineWidth = 1;
    ctx.setLineDash([10, 10]);
    ctx.moveTo(0, h*0.5);
    ctx.bezierCurveTo(w*0.4, h*0.4, w*0.6, h*0.6, w, h*0.5);
    ctx.stroke();
    ctx.setLineDash([]);

    // 3. DRAW UNITS
    for (let id in state.units) {
        let u = state.units[id];
        let ux = u.x * w;
        let uy = u.y * h;

        // Unit Dot
        ctx.fillStyle = u.status === 'PATROL' ? '#00ff41' : '#ff3333';
        ctx.beginPath();
        ctx.arc(ux, uy, 4, 0, Math.PI*2);
        ctx.fill();

        // Label
        ctx.fillStyle = "#fff";
        ctx.font = "9px Courier New";
        ctx.fillText(id, ux + 6, uy + 3);
    }
    
    // 4. DRAW INCIDENT MARKER
    if (state.call) {
        let cx = state.call.loc.x * w;
        let cy = state.call.loc.y * h;
        
        // Ping Animation
        let pulse = (Date.now() % 1000) / 1000;
        ctx.beginPath();
        ctx.strokeStyle = `rgba(255, 50, 50, ${1 - pulse})`;
        ctx.lineWidth = 2;
        ctx.arc(cx, cy, 10 + (pulse * 20), 0, Math.PI*2);
        ctx.stroke();
    }
}

function gameLoop() {
    updateUnits();
    drawMap();
    requestAnimationFrame(gameLoop);
}

// Utils
function log(type, msg) {
    const d = document.createElement('div');
    d.className = `msg ${type}`;
    d.innerText = msg;
    const l = document.getElementById('game-log');
    l.appendChild(d);
    l.scrollTop = l.scrollHeight;
}

// --- KEYBIND FOR TESTING ---
window.addEventListener('keydown', (e) => {
    if(e.code === 'F9') triggerCall();
});
