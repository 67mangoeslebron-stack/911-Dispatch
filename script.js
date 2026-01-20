const MAP_CONFIG = {
    orangeRoad: "#fb8c00", // Bright Orange
    sideRoad: "#ffffff",
    landCom: "#b0bec5",
    landGov: "#78909c",
    landRes: "#cfd8dc"
};

const LANDMARKS = [
    { name: "Parkview Police Department", type: "gov", x: 0.5, y: 0.5, w: 0.12, h: 0.08 },
    { name: "Parkview Fire Department 15", type: "gov", x: 0.8, y: 0.5, w: 0.1, h: 0.07 },
    { name: "Northside Parkview Jail", type: "gov", x: 0.5, y: 0.1, w: 0.14, h: 0.12 },
    { name: "Wells Fargo Bank", type: "com", x: 0.2, y: 0.4, w: 0.07, h: 0.05 },
    { name: "Walmart", type: "com", x: 0.1, y: 0.15, w: 0.18, h: 0.12 },
    { name: "Walgreens", type: "com", x: 0.7, y: 0.2, w: 0.08, h: 0.06 },
    { name: "CVS Pharmacy", type: "com", x: 0.7, y: 0.3, w: 0.08, h: 0.06 },
    { name: "McDonalds", type: "com", x: 0.35, y: 0.7, w: 0.06, h: 0.05 },
    { name: "Taco Bell", type: "com", x: 0.45, y: 0.7, w: 0.06, h: 0.05 },
    { name: "Edgewater Apartments", type: "res", x: 0.15, y: 0.75, w: 0.18, h: 0.15 }
];

let state = {
    incident: null,
    units: {
        'PD1': { name: 'PD-1', x: 0.5, y: 0.5, status: 'AVAIL', loc: 'PARKVIEW PD', base: {x:0.5,y:0.5} },
        'PD2': { name: 'PD-2', x: 0.51, y: 0.5, status: 'AVAIL', loc: 'PARKVIEW PD', base: {x:0.5,y:0.5} },
        'ENG15': { name: 'ENG-15', x: 0.8, y: 0.5, status: 'AVAIL', loc: 'STATION 15', base: {x:0.8,y:0.5} },
        'AIR1': { name: 'AIR-1', x: 0.5, y: 0.1, status: 'AVAIL', loc: 'JAIL ROOF', base: {x:0.5,y:0.1} }
    }
};

function startSystem() {
    document.getElementById('login-screen').classList.add('hidden');
    renderUnitHub();
    setupVoice();
    setInterval(updateClock, 1000);
    requestAnimationFrame(gameLoop);
}

// RENDER DISPATCH HUB LIST
function renderUnitHub() {
    const list = document.getElementById('unit-list');
    list.innerHTML = "";
    for (let id in state.units) {
        const u = state.units[id];
        const statClass = u.status === 'AVAIL' ? 's-avail' : (u.status === 'ENROUTE' ? 's-enroute' : 's-busy');
        list.innerHTML += `
            <div class="u-entry" id="row-${id}">
                <span class="u-badge"><b>${u.name}</b></span>
                <span class="u-loc-text" style="font-size:10px; color:#666">${u.loc}</span>
                <span class="status-pill ${statClass}">${u.status}</span>
            </div>
        `;
    }
}

// MAP RENDERER
const canvas = document.getElementById('cad-map');
const ctx = canvas.getContext('2d');

function gameLoop() {
    canvas.width = canvas.parentElement.offsetWidth;
    canvas.height = canvas.parentElement.offsetHeight;
    const w = canvas.width; const h = canvas.height;

    ctx.fillStyle = "#eef1f3";
    ctx.fillRect(0,0,w,h);

    // DRAW ROADS
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 14;
    ctx.beginPath();
    // Grid roads
    for(let i=1; i<5; i++) {
        ctx.moveTo(w*(i/5), 0); ctx.lineTo(w*(i/5), h);
        ctx.moveTo(0, h*(i/5)); ctx.lineTo(w, h*(i/5));
    }
    ctx.stroke();

    // ORANGE MAIN ROAD
    ctx.strokeStyle = MAP_CONFIG.orangeRoad;
    ctx.lineWidth = 20;
    ctx.beginPath();
    ctx.moveTo(0, h*0.5);
    ctx.bezierCurveTo(w*0.3, h*0.48, w*0.7, h*0.52, w, h*0.5);
    ctx.stroke();

    // DRAW BUILDINGS
    LANDMARKS.forEach(l => {
        ctx.fillStyle = (l.type === 'gov') ? MAP_CONFIG.landGov : (l.type === 'com' ? MAP_CONFIG.landCom : MAP_CONFIG.landRes);
        ctx.fillRect(l.x*w, l.y*h, l.w*w, l.h*h);
        ctx.strokeStyle = "#999"; ctx.strokeRect(l.x*w, l.y*h, l.w*w, l.h*h);
        ctx.fillStyle = "#000"; ctx.font = "bold 10px Arial"; ctx.textAlign = "center";
        ctx.fillText(l.name, (l.x+l.w/2)*w, (l.y+l.h/2)*h + 4);
    });

    // UPDATE & DRAW UNITS
    for(let id in state.units) {
        let u = state.units[id];
        if(u.status === 'ENROUTE' && state.incident) {
            let tx = state.incident.target.x + 0.02;
            let ty = state.incident.target.y + 0.02;
            u.x += (tx - u.x) * 0.005;
            u.y += (ty - u.y) * 0.005;
            if(Math.abs(u.x - tx) < 0.01) { u.status = 'ON SCENE'; renderUnitHub(); }
        }
        ctx.fillStyle = (u.status === 'AVAIL') ? "#2ecc71" : "#e74c3c";
        ctx.beginPath(); ctx.arc(u.x*w, u.y*h, 6, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "#000"; ctx.fillText(u.name, u.x*w, u.y*h - 10);
    }

    if(state.incident) {
        ctx.strokeStyle = "red"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(state.incident.target.x*w + 20, state.incident.target.y*h + 20, 20 + Math.sin(Date.now()/200)*5, 0, Math.PI*2); ctx.stroke();
    }

    requestAnimationFrame(gameLoop);
}

// CHROMEBOOK FRIENDLY VOICE (Manual Trigger + Space)
function setupVoice() {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'en-US';
    
    window.onkeydown = (e) => { if(e.code === 'Space') { recognition.start(); document.getElementById('mic-indicator').classList.remove('hidden'); } };
    window.onkeyup = (e) => { if(e.code === 'Space') { recognition.stop(); document.getElementById('mic-indicator').classList.add('hidden'); } };

    recognition.onresult = (e) => {
        const cmd = e.results[0][0].transcript.toLowerCase();
        log("VOICE: " + cmd);
        handleDispatch(cmd);
    };
}

function handleDispatch(cmd) {
    let uId = cmd.includes("pd 1") ? "PD1" : (cmd.includes("pd 2") ? "PD2" : (cmd.includes("air") ? "AIR1" : (cmd.includes("fire") || cmd.includes("15") ? "ENG15" : null)));
    if(!uId) return;

    if(cmd.includes("respond") || cmd.includes("enroute")) {
        state.units[uId].status = "ENROUTE";
        state.units[uId].loc = state.incident ? state.incident.locName : "UNKNOWN";
    } else if (cmd.includes("clear") || cmd.includes("available")) {
        state.units[uId].status = "AVAIL";
        state.units[uId].loc = state.units[uId].name === 'AIR1' ? 'JAIL ROOF' : 'PATROL';
        state.units[uId].x = state.units[uId].base.x; state.units[uId].y = state.units[uId].base.y;
    }
    renderUnitHub();
}

// INCIDENT LOGIC
function triggerIncident() {
    const scenarios = [
        { type: "ASSAULT", loc: "Taco Bell", target: LANDMARKS[8] },
        { type: "MEDICAL", loc: "Walmart", target: LANDMARKS[4] },
        { type: "ROBBERY", loc: "Wells Fargo Bank", target: LANDMARKS[3] }
    ];
    const s = scenarios[Math.floor(Math.random()*scenarios.length)];
    state.incident = { type: s.type, locName: s.loc, target: s.target };
    document.getElementById('incoming-modal').classList.remove('hidden');
}

function acceptCall() {
    document.getElementById('incoming-modal').classList.add('hidden');
    document.getElementById('no-call').classList.add('hidden');
    document.getElementById('incident-card').classList.remove('hidden');
    document.getElementById('inc-type').innerText = state.incident.type;
    document.getElementById('inc-loc').innerText = state.incident.locName;
}

function log(m) {
    const l = document.getElementById('system-log');
    l.innerHTML += `<div>> ${m}</div>`;
    l.scrollTop = l.scrollHeight;
}

function updateClock() {
    const d = new Date();
    document.getElementById('clock').innerText = d.getHours().toString().padStart(2,'0') + ":" + d.getMinutes().toString().padStart(2,'0');
}
