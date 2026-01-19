// script.js - V142 LOGIC

// --- SCENARIOS ---
const SCENARIOS = [
    { 
        type: "DOMESTIC DISTURBANCE", priority: "HIGH",
        addr: "6892 PARKVIEW PL", 
        intro: "He's screaming at me and throwing things! Please help!", 
        details: "My husband, he's drunk. We are at 6892 Parkview Place. He has a knife!", 
        mapX: 0.25, mapY: 0.35 // Near Parkview
    },
    { 
        type: "MEDICAL EMERGENCY", priority: "MED",
        addr: "EDGEWATER APTS BLDG 5", 
        intro: "My roommate isn't waking up... I think she took something.", 
        details: "Edgewater Apartment Complex, Building 5, Room 8. Please hurry!", 
        mapX: 0.75, mapY: 0.25 // Residential Zone
    },
    { 
        type: "STRUCTURE FIRE", priority: "CRITICAL",
        addr: "3762 CLEVEMONT WAY", 
        intro: "My kitchen is on fire! The curtains caught fire!", 
        details: "3762 Clevemont Way! Everyone is out but the dog is inside!", 
        mapX: 0.55, mapY: 0.65 
    },
    { 
        type: "SUSPICIOUS PERSON", priority: "LOW",
        addr: "3339 AUTUMN LAKE LN", 
        intro: "There is a man looking into car windows on my street.", 
        details: "3339 Autumn Lake Lane. He's wearing a black hoodie and carrying a bag.", 
        mapX: 0.35, mapY: 0.85 
    },
    { 
        type: "SILENT ALARM", priority: "EXTREME",
        addr: "1505 MAZE BANK", 
        intro: "Automated Message: Silent Panic Alarm triggered. Zone 4 Vault.", 
        details: "1505 Maze Bank. Multiple sensors tripped. No contact with tellers.", 
        mapX: 0.65, mapY: 0.45, // Near Maze Bank
        isRobotic: true 
    }
];

let currentCall = null;
let selectedUnits = [];
let mapTarget = null;
let micActive = false;
let voices = [];
const synth = window.speechSynthesis;
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// --- AUDIO SYSTEM ---
function loadVoices() { voices = synth.getVoices(); }
loadVoices();
if (speechSynthesis.onvoiceschanged !== undefined) speechSynthesis.onvoiceschanged = loadVoices;

function getBestVoice(type) {
    if (!voices.length) return null;
    if (type === 'robot') return voices.find(v => v.name.includes("Desktop")) || voices[0];
    const natural = ["Google US English", "Microsoft Zira", "Samantha"];
    for (let name of natural) {
        const found = voices.find(v => v.name.includes(name));
        if (found) return found;
    }
    return voices[0];
}

function speak(text, type = 'caller') {
    if (synth.speaking) synth.cancel();
    const ut = new SpeechSynthesisUtterance(text);
    
    if (type === 'dispatcher') {
        ut.pitch = 0.7; ut.rate = 1.2; ut.volume = 1.0;
        const duration = (text.split(' ').length / 2.5) * 1000; 
        playRadioBurst(duration);
    } else if (type === 'robot') {
        ut.pitch = 0.5; ut.rate = 0.9;
        ut.voice = getBestVoice('robot');
    } else {
        ut.pitch = 1.1; ut.rate = 1.0;
        ut.voice = getBestVoice('normal');
    }
    synth.speak(ut);
}

function playRadioBurst(durationMs) {
    createNoise(0.1, 0.2); 
    setTimeout(() => createNoise(durationMs / 1000, 0.05), 100); 
    setTimeout(() => createNoise(0.1, 0.2), durationMs + 100);
}

function createNoise(duration, vol) {
    const bufSz = audioCtx.sampleRate * duration;
    const buf = audioCtx.createBuffer(1, bufSz, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSz; i++) data[i] = Math.random() * 2 - 1;
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    const gain = audioCtx.createGain();
    gain.gain.value = vol;
    src.connect(gain); gain.connect(audioCtx.destination);
    src.start();
}

// --- LOGIC ---
function nextCall() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    // CLEAR LOG
    document.getElementById('log').innerHTML = '<div class="msg sys">ESTABLISHING CONNECTION...</div>';
    
    currentCall = SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];
    mapTarget = null;
    selectedUnits = [];
    document.getElementById('inp-addr').value = "";
    const dispBtn = document.getElementById('disp-btn');
    dispBtn.disabled = true;
    dispBtn.innerText = "INITIATE DISPATCH";
    dispBtn.style.background = "#222";
    dispBtn.style.color = "#cc0000";
    dispBtn.style.borderColor = "#cc0000";
    
    document.querySelectorAll('.u-btn').forEach(b => b.classList.remove('selected'));
    
    document.getElementById('call-type').innerText = currentCall.type;
    document.getElementById('call-priority').innerText = currentCall.priority;
    document.getElementById('call-addr').innerText = "PENDING TRACE...";
    document.getElementById('call-caller').innerText = "UNKNOWN";

    addMsg('disp', "911, what is your emergency?");
    speak("911, what is your emergency?", 'dispatcher');

    setTimeout(() => {
        addMsg('caller', currentCall.intro);
        const voiceType = currentCall.isRobotic ? 'robot' : 'caller';
        speak(currentCall.intro, voiceType);
        document.getElementById('call-caller').innerText = currentCall.isRobotic ? "AUTO-ALERT" : "CITIZEN";
    }, 3000);
}

function verifyAddress() {
    const input = document.getElementById('inp-addr').value.toUpperCase();
    if (!currentCall) return;
    const correct = currentCall.addr.toUpperCase();
    
    if (input.length > 3 && (correct.includes(input) || input.includes(correct.split(' ')[0]))) {
        addMsg('sys', `LOCATION LOCKED: ${currentCall.addr}`);
        document.getElementById('call-addr').innerText = currentCall.addr;
        mapTarget = { x: currentCall.mapX, y: currentCall.mapY };
        checkReady();
    } else {
        addMsg('sys', "INVALID ADDRESS. RETRY.");
    }
}

function toggleUnit(id) {
    const el = document.getElementById(id);
    if (selectedUnits.includes(id)) {
        selectedUnits = selectedUnits.filter(u => u !== id);
        el.classList.remove('selected');
    } else {
        selectedUnits.push(id);
        el.classList.add('selected');
    }
    checkReady();
}

function checkReady() {
    if (mapTarget && selectedUnits.length > 0) {
        const dispBtn = document.getElementById('disp-btn');
        dispBtn.disabled = false;
        dispBtn.innerText = "TRANSMIT ORDER";
        dispBtn.style.background = "#cc0000";
        dispBtn.style.color = "black";
    }
}

function dispatch() {
    const unitString = selectedUnits.join(", ");
    const msg = `Dispatch to ${unitString}: Respond to ${currentCall.addr}. Code 3.`;
    addMsg('radio', msg);
    speak(msg, 'dispatcher');
    
    const dispBtn = document.getElementById('disp-btn');
    dispBtn.disabled = true;
    dispBtn.innerText = "UNITS EN ROUTE";
    dispBtn.style.background = "#000";
    dispBtn.style.color = "#555";
    dispBtn.style.borderColor = "#333";
}

function addMsg(type, text) {
    const log = document.getElementById('log');
    const div = document.createElement('div');
    div.className = `msg ${type}`;
    div.innerText = text;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
}

// --- MIC ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
recognition.continuous = true;
recognition.interimResults = false;
recognition.onresult = (e) => {
    const text = e.results[e.results.length - 1][0].transcript;
    addMsg('disp', text);
    processVoice(text);
};

function toggleMic() {
    if (!micActive) {
        try { recognition.start(); } catch(e){}
        micActive = true;
        document.getElementById('mic-toggle').classList.add('active');
    } else {
        recognition.stop();
        micActive = false;
        document.getElementById('mic-toggle').classList.remove('active');
    }
}

function processVoice(text) {
    if (!currentCall) return;
    const lower = text.toLowerCase();
    if (lower.includes("where") || lower.includes("address") || lower.includes("location")) {
        setTimeout(() => {
            const resp = currentCall.details;
            addMsg('caller', resp);
            speak(resp, currentCall.isRobotic ? 'robot' : 'caller');
        }, 1000);
    }
}

// --- MAP RENDERER (V142) ---
const canvas = document.getElementById('map-canvas');
const ctx = canvas.getContext('2d');

function drawMap() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    const w = canvas.width; const h = canvas.height;

    ctx.fillStyle = "#050505"; ctx.fillRect(0, 0, w, h);

    // 1. ZONES
    ctx.fillStyle = "#0a1a0a"; // Parkview Park
    ctx.fillRect(w*0.1, h*0.1, w*0.3, h*0.3);
    
    // River
    ctx.strokeStyle = "#0a1a2a"; ctx.lineWidth = 50; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(w*0.9, 0); ctx.lineTo(w*0.5, h); ctx.stroke();

    // 2. ROADS
    ctx.strokeStyle = "#d97706"; ctx.lineWidth = 12; // Highway
    ctx.beginPath(); ctx.moveTo(0, h*0.4); ctx.lineTo(w, h*0.6); ctx.stroke();
    
    ctx.strokeStyle = "#333"; ctx.lineWidth = 4; // Grid
    for(let x=20; x<w; x+=60) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke(); }
    for(let y=20; y<h; y+=60) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }

    // 3. LANDMARKS
    drawLandmark(w*0.2, h*0.3, "#1e3a8a", "PD HQ");
    drawLandmark(w*0.8, h*0.2, "#7f1d1d", "HOSP");
    drawLandmark(w*0.6, h*0.5, "#713f12", "MAZE");
    drawLandmark(w*0.7, h*0.8, "#374151", "APTS");

    // 4. INCIDENT
    if (mapTarget) {
        const tx = mapTarget.x * w; const ty = mapTarget.y * h;
        ctx.strokeStyle = `rgba(220, 38, 38, ${Math.abs(Math.sin(Date.now()/200))})`;
        ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(tx, ty, 25, 0, Math.PI*2); ctx.stroke();
        ctx.fillStyle = "#dc2626"; ctx.beginPath(); ctx.arc(tx, ty, 8, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.font = "bold 12px Consolas"; ctx.fillText("CRITICAL", tx+15, ty+4);
    }
    
    // Timer
    const time = new Date();
    document.getElementById('timer').innerText = time.toLocaleTimeString();

    requestAnimationFrame(drawMap);
}

function drawLandmark(x, y, color, label) {
    ctx.fillStyle = color;
    ctx.fillRect(x-15, y-15, 30, 30);
    ctx.strokeStyle = "#fff"; ctx.lineWidth=1;
    ctx.strokeRect(x-15, y-15, 30, 30);
    ctx.fillStyle = "#aaa"; ctx.font = "10px Consolas"; ctx.fillText(label, x-12, y-20);
}
drawMap();
