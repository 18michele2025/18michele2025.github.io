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

/* -------------------------------
        INIZIALIZZAZIONE EMAILJS
--------------------------------*/
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
let stream = null;
let mediaRecorder = null;
let audioChunks = [];
let audioURL = "";
let uploadedURL = "";
let seconds = 0;
let timerInterval = null;
let audioCtx = null;
let analyser = null;
let rafId = null;

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
    }, 1000);
}

function stopTimer(){
    clearInterval(timerInterval);
}

function resetRecordingState(){
    if(rafId) cancelAnimationFrame(rafId);
    if(audioCtx) audioCtx.close().catch(()=>{audioCtx=null});
    if(stream) stream.getTracks().forEach(t => t.stop());
    if(audioURL) try{ URL.revokeObjectURL(audioURL); }catch(e){}
    audioChunks = [];
    audioURL = '';
    uploadedURL = '';
    player.src = '';
    player.style.display = 'none';
    sendBtn.disabled = true;
    stopBtn.disabled = true;
    startBtn.disabled = false;
    startBtn.textContent = '🎙️ Riregistra';
    statusEl.textContent = 'Pronto';
    timerEl.textContent = '00:00';
    resetCanvas();
}

function drawWave(){
    if(!analyser) return;
    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    function draw(){
        rafId = requestAnimationFrame(draw);
        analyser.getByteTimeDomainData(dataArray);
        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.fillStyle = '#f7fff9';
        ctx.fillRect(0,0,w,h);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#0b5b42';
        ctx.beginPath();
        const slice = w / bufferLength;
        let x=0;
        for(let i=0;i<bufferLen
