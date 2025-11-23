/* -------------------------------
        CONFIGURAZIONE
--------------------------------*/

// EmailJS
const EMAILJS_PUBLIC_KEY = "2QBLDK86elrLCuW7B";
const EMAILJS_SERVICE_ID = "service_1iwt1ib";
const EMAILJS_TEMPLATE_ID = "template_0p26a4c";

// Cloudinary
const CLOUDINARY_CLOUD_NAME = "dcipeh2fg";
const CLOUDINARY_UPLOAD_PRESET = "18Michele";

emailjs.init(EMAILJS_PUBLIC_KEY);

/* -------------------------------
        ELEMENTI UI
--------------------------------*/
const startBtn = document.getElementById('start');
const stopBtn  = document.getElementById('stop');
const sendBtn  = document.getElementById('send');
const player   = document.getElementById('player');
const statusEl = document.getElementById('status');
const timerEl  = document.getElementById('timer');
const canvas   = document.getElementById('wave');
const ctx      = canvas.getContext('2d');

/* -------------------------------
        VARIABILI DI STATO
--------------------------------*/
let audioCtx, recorder, stream;
let audioBlob = null;
let uploadedURL = "";
let canSend = false;
let rafId = null;
let seconds = 0;
let timerInterval = null;

/* -------------------------------
        FUNZIONI AUSILIARIE
--------------------------------*/
function resetCanvas(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#f7fff9';
    ctx.fillRect(0,0,canvas.width,canvas.height);
}

function resizeCanvas(){
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.floor(rect.width * devicePixelRatio);
    canvas.height = Math.floor(rect.height * devicePixelRatio);
    ctx.scale(devicePixelRatio, devicePixelRatio);
    resetCanvas();
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function startTimer(){
    clearInterval(timerInterval);
    seconds = 0;
    timerInterval = setInterval(() => {
        seconds++;
        const m = String(Math.floor(seconds/60)).padStart(2,'0');
        const s = String(seconds % 60).padStart(2,'0');
        timerEl.textContent = `${m}:${s}`;
    },1000);
}

function stopTimer(){ clearInterval(timerInterval); }

function drawWaveDummy(){ resetCanvas(); }

/* -------------------------------
        BUTTON EVENTS
--------------------------------*/
startBtn.addEventListener('click', async () => {
    resetRecordingState();

    try{
        // Chiedi permesso microfono
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // Crea AudioContext e sorgente
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        await audioCtx.resume(); // importante su iOS

        const source = audioCtx.createMediaStreamSource(stream);

        // Inizializza Recorder.js
        recorder = new Recorder(source, { numChannels: 1 });
        recorder.record();

        // UI
        statusEl.textContent = '🎙️ Registrazione in corso...';
        startBtn.disabled = true;
        stopBtn.disabled = false;
        sendBtn.disabled = true;
        player.style.display = 'none';
        startTimer();

    }catch(err){
        console.error(err);
        statusEl.textContent = '❌ Permesso microfono negato o errore: ' + err.message;
    }
});

stopBtn.addEventListener('click', () => {
    if(!recorder) return;
    recorder.stop();
    stopBtn.disabled = true;
    stopTimer();
    statusEl.textContent = '⏳ Elaborazione audio...';

    recorder.exportWAV(async (blob) => {
        audioBlob = blob;
        if(blob.size === 0){
            statusEl.textContent = '❌ Registrazione vuota';
            return;
        }

        const url = URL.createObjectURL(blob);
        player.src = url;
        player.load(); // necessario su iPhone
        player.style.display = 'block';
        statusEl.textContent = '⏳ Upload su Cloudinary...';

        try{
            const formData = new FormData();
            formData.append('file', blob, 'messaggio.mp3');
            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

            const resp = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/raw/upload`,{
                method:'POST', body:formData
            });
            if(!resp.ok) throw new Error('Upload fallito');
            const data = await resp.json();
            uploadedURL = data.secure_url || data.url;
            statusEl.textContent = '✅ Caricato. Pronto per inviare.';
            sendBtn.disabled = false;
            canSend = true;
            startBtn.disabled = false;
            startBtn.textContent = '🎙️ Riregistra';
        }catch(err){
            console.error(err);
            statusEl.textContent = '❌ Errore upload';
            sendBtn.disabled = true;
            canSend = false;
        }finally{
            stream.getTracks().forEach(t=>t.stop());
            audioCtx.close().catch(()=>{audioCtx=null});
        }
    });
});

// INVIO EMAIL
sendBtn.addEventListener('click', async () => {
    if(!canSend){
        statusEl.textContent = '📌 Devi registrare prima di inviare';
        return;
    }
    statusEl.textContent = '📤 Invio email...';
    sendBtn.disabled = true;

    try{
        await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
            message:'Hai ricevuto un messaggio vocale!',
            audio_link: uploadedURL
        });

        statusEl.textContent = '✅ Email inviata!';
        canSend = false; // blocco invio multiplo

        // reset locale dopo invio
        audioBlob = null;
        uploadedURL = "";
        player.src = "";
        player.style.display = 'none';
        player.load();
        stopBtn.disabled = true;
        startBtn.disabled = false;
        startBtn.textContent = '🎙️ Riregistra';
        timerEl.textContent = '00:00';
        resetCanvas();

    }catch(err){
        console.error(err);
        statusEl.textContent = '❌ Errore invio';
        sendBtn.disabled = false;
    }
});

// reset pagina
function resetRecordingState(){
    if(recorder){ recorder.stop(); recorder.clear(); recorder = null; }
    if(audioCtx){ audioCtx.close().catch(()=>{}); audioCtx=null; }
    if(stream) stream.getTracks().forEach(t=>t.stop());
    audioBlob = null;
    uploadedURL = "";
    canSend = false;
    player.src="";
    player.style.display='none';
    player.load();
    startBtn.disabled = false;
    stopBtn.disabled = true;
    sendBtn.disabled = true;
    startBtn.textContent = '🎙️ Registra';
    timerEl.textContent='00:00';
    resetCanvas();
}
window.addEventListener('beforeunload', resetRecordingState);

