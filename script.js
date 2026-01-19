// --- SCENARIO DATABASE ---
const SCENARIOS = [
    { type: "DOMESTIC DISTURBANCE", priority: "HIGH", addr: "6892 PARKVIEW PL", intro: "He's screaming at me and throwing things! Please help!", details: "My husband, he's drunk. We are at 6892 Parkview Place. He has a knife!", mapX: 0.2, mapY: 0.3 },
    { type: "MEDICAL EMERGENCY", priority: "MED", addr: "EDGEWATER APTS BLDG 5", intro: "My roommate isn't waking up... I think she took something.", details: "Edgewater Apartment Complex, Building 5, Room 8. Please hurry!", mapX: 0.8, mapY: 0.2 },
    { type: "STRUCTURE FIRE", priority: "CRITICAL", addr: "3762 CLEVEMONT WAY", intro: "My kitchen is on fire! The curtains caught fire!", details: "3762 Clevemont Way! Everyone is out but the dog is inside!", mapX: 0.5, mapY: 0.6 },
    { type: "SUSPICIOUS PERSON", priority: "LOW", addr: "3339 AUTUMN LAKE LN", intro: "There is a man looking into car windows on my street.", details: "3339 Autumn Lake Lane. He's wearing a black hoodie and carrying a bag.", mapX: 0.3, mapY: 0.8 },
    { type: "SILENT ALARM", priority: "HIGH", addr: "1505 MAZE BANK", intro: "Automated Message: Silent Panic Alarm triggered. Zone 4 Vault.", details: "1505 Maze Bank. Multiple sensors tripped. No contact with tellers.", mapX: 0.6, mapY: 0.4, isRobotic: true }
];

let currentCall = null;
let selectedUnits = [];
let mapTarget = null;
let micActive = false;
let voices = [];
const synth = window.speechSynthesis;
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// --- VOICE LOGIC ---
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
        playRadioBurst((text.split(' ').length / 2.5) * 1000);
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
    createNoise(0.15, 0.2); 
    setTimeout(() => createNoise(durationMs / 1000, 0.05), 150); 
    setTimeout(() => createNoise(0.15, 0.2), durationMs + 150);
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

// --- GAMEPLAY ---
function nextCall() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    currentCall = SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];
    mapTarget = null; selectedUnits = [];
    document.getElementById('inp-addr').value = "";
    document.getElementById('disp-btn').disabled = true;
    document.querySelectorAll('.u-btn').forEach(b => b.classList.remove('selected'));
    
    document.getElementById('call-type').innerText = currentCall.type;
    document.getElementById('call-priority').innerText = currentCall.priority;
    document.getElementById('call-addr').innerText = "PENDING VERIFICATION";
    document.getElementById('call-caller').innerText = "CONNECTING...";
    
    addMsg('disp', "911, what is your emergency?");
    speak("911, what is your emergency?", 'dispatcher');

    setTimeout(() => {
        addMsg('caller', currentCall.intro);
        speak(currentCall.intro, currentCall.isRobotic ? 'robot' : 'caller');
        document.getElementById('call-caller').innerText = currentCall.isRobotic ? "AUTOMATED SYSTEM" : "UNKNOWN";
    }, 3500);
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
        addMsg('sys', "ADDRESS INVALID. ASK CALLER AGAIN.");
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
        document.getElementById('disp-btn').disabled = false;
        document.getElementById('disp-btn').style.background = "var(--green)";
    }
}

function dispatch() {
    const unitString = selectedUnits.join(", ");
    const msg = `Dispatching ${unitString} to ${currentCall.addr}. Code 3.`;
    addMsg('radio', msg);
    speak(msg, 'dispatcher');
    document.getElementById('disp-btn').disabled = true;
    document.getElementById('disp-btn').innerText = "UNITS EN ROUTE";
    document.getElementById('disp-btn').style.background = "#4b5563";
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

// --- MAP RENDERER ---
const canvas = document.getElementById('map-canvas');
const ctx = canvas.getContext('2d');

function drawMap() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    const w = canvas.width; const h = canvas.height;

    ctx.fillStyle = "#1e293b"; ctx.fillRect(0, 0, w, h);

    // River
    ctx.strokeStyle = "#3b82f6"; ctx.lineWidth = 40; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(w*0.8, 0); ctx.bezierCurveTo(w*0.8, h*0.5, w*0.2, h*0.5, w*0.2, h); ctx.stroke();

    // Highway
    ctx.strokeStyle = "#f97316"; ctx.lineWidth = 15;
    ctx.beginPath(); ctx.moveTo(0, h*0.3); ctx.lineTo(w, h*0.5); ctx.stroke();
    ctx.strokeStyle = "#c2410c"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, h*0.3 - 8); ctx.lineTo(w, h*0.5 - 8);
    ctx.moveTo(0, h*0.3 + 8); ctx.lineTo(w, h*0.5 + 8); ctx.stroke();

    // Streets
    ctx.strokeStyle = "#475569"; ctx.lineWidth = 6;
    for(let x=20; x<w; x+=80) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke(); }
    for(let y=20; y<h; y+=80) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }

    if (mapTarget) {
        const tx = mapTarget.x * w; const ty = mapTarget.y * h;
        ctx.strokeStyle = `rgba(239, 68, 68, ${Math.abs(Math.sin(Date.now()/300))})`;
        ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(tx, ty, 30, 0, Math.PI*2); ctx.stroke();
        ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx-10, ty-25); ctx.lineTo(tx+10, ty-25); ctx.fill();
        ctx.beginPath(); ctx.arc(tx, ty-25, 10, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "white"; ctx.font = "bold 14px Segoe UI"; ctx.fillText("INCIDENT", tx + 15, ty - 10);
    }
    requestAnimationFrame(drawMap);
}
drawMap();
