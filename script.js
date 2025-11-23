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
const player   = document.getElementById('player'); // <audio controls>
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
        for(let i=0;i<bufferLength;i++){
            const v = dataArray[i]/128.0;
            const y = v * h/2;
            if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
            x += slice;
        }
        ctx.stroke();
    }
    draw();
}

/* -------------------------------
        EVENTI BUTTON
--------------------------------*/
startBtn.addEventListener('click', async () => {
    resetRecordingState();
    try{
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    }catch(err){
        statusEl.textContent = 'Permesso microfono negato';
        return;
    }

    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioCtx.createMediaStreamSource(stream);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    drawWave();

    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];
    mediaRecorder.ondataavailable = e => { if(e.data && e.data.size>0) audioChunks.push(e.data); };

    mediaRecorder.onstart = () => {
        statusEl.textContent = '🎙️ Registrazione in corso...';
        startBtn.disabled = true;
        stopBtn.disabled = false;
        sendBtn.disabled = true;
        player.style.display = 'none';
        startTimer();
    };
    mediaRecorder.start();
});

stopBtn.addEventListener('click', () => {
    if(mediaRecorder && mediaRecorder.state!=='inactive') mediaRecorder.stop();
    stopBtn.disabled = true;
    stopTimer();
    statusEl.textContent = '⏳ Elaborazione audio...';
});

// Gestione stop e upload Cloudinary
function attachStopHandler(){
    if(!mediaRecorder) return;
    mediaRecorder.onstop = async () => {
        if(rafId) cancelAnimationFrame(rafId);

        // WAV compatibile Safari/iPhone
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        audioURL = URL.createObjectURL(audioBlob);
        player.src = audioURL;
        player.style.display = 'block';
        statusEl.textContent = '⏳ Upload su Cloudinary...';

        try{
            // Upload a Cloudinary come "messaggio.mp3"
            const formData = new FormData();
            formData.append('file', audioBlob, 'messaggio.mp3'); 
            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

            const resp = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/raw/upload`,{
                method:'POST', body:formData
            });
            if(!resp.ok) throw new Error('Upload fallito');
            const data = await resp.json();
            uploadedURL = data.secure_url || data.url;
            statusEl.textContent = '✅ Caricato. Pronto per inviare.';
            sendBtn.disabled = false;
            startBtn.disabled = false;
            startBtn.textContent = '🎙️ Riregistra';
        }catch(err){
            console.error(err);
            statusEl.textContent = '❌ Errore upload';
            sendBtn.disabled = true;
            startBtn.disabled = false;
        } finally{
            if(stream) stream.getTracks().forEach(t=>t.stop());
            if(audioCtx && typeof audioCtx.close==='function') audioCtx.close().catch(()=>{audioCtx=null});
        }
    };
}
setInterval(attachStopHandler,400);

// Invia email con EmailJS
sendBtn.addEventListener('click', ()=>{
    if(!uploadedURL){ statusEl.textContent='Nessun file caricato.'; return; }
    statusEl.textContent='📤 Invio email...';
    sendBtn.disabled = true;

    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
        message:'Hai ricevuto un messaggio vocale!',
        audio_link: uploadedURL
    }).then(()=>{
        statusEl.textContent='✅ Email inviata!';
        sendBtn.disabled = false;
    }).catch(err=>{
        console.error(err);
        statusEl.textContent='❌ Errore invio';
        sendBtn.disabled = false;
    });
});

// Pulizia pagina
window.addEventListener('beforeunload', resetRecordingState);
resetCanvas();
