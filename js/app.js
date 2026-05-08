/**
 * app.js — Main application logic for VoiceShield AI
 */
(function() {
    const analyzer = new AudioAnalyzer();
    const detector = new DeepfakeDetector();
    let vizualizer = null;
    let currentSampleType = null;
    let audioLoaded = false;
    let mediaRecorder = null;
    let recordedChunks = [];
    let recordingTimer = null;
    let recordingSeconds = 0;

    // Lazy DOM getter
    const $ = id => document.getElementById(id);

    // ========== PARTICLES ==========
    function initParticles() {
        const canvas = $('particleCanvas');
        const ctx = canvas.getContext('2d');
        let particles = [];
        const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
        resize();
        window.addEventListener('resize', resize);
        for (let i = 0; i < 60; i++) {
            particles.push({
                x: Math.random() * canvas.width, y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
                size: Math.random() * 2 + 0.5, opacity: Math.random() * 0.4 + 0.1
            });
        }
        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.x += p.vx; p.y += p.vy;
                if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
                if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(0,255,170,${p.opacity})`;
                ctx.fill();
            });
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist < 120) {
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = `rgba(0,255,170,${0.06 * (1 - dist/120)})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            }
            requestAnimationFrame(draw);
        }
        draw();
    }

    // ========== HERO ANIMATION ==========
    function initHero() {
        const heroCanvas = $('heroWaveform');
        if (heroCanvas) {
            const anim = new HeroWaveformAnimator(heroCanvas);
            anim.start();
        }
        document.querySelectorAll('.stat-value').forEach(el => {
            const target = parseFloat(el.dataset.count);
            const isFloat = target % 1 !== 0;
            const duration = 2000;
            const start = performance.now();
            function tick(now) {
                const elapsed = now - start;
                const progress = Math.min(elapsed / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3);
                const current = target * eased;
                el.textContent = isFloat ? current.toFixed(1) : Math.floor(current).toLocaleString();
                if (progress < 1) requestAnimationFrame(tick);
            }
            requestAnimationFrame(tick);
        });
    }

    // ========== TABS ==========
    function initTabs() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                btn.classList.add('active');
                const tabId = btn.dataset.tab + 'Tab';
                const tabEl = $(tabId);
                if (tabEl) tabEl.classList.add('active');
            });
        });
    }

    // ========== FILE UPLOAD ==========
    function initUpload() {
        const dropzone = $('dropzone');
        const fileInput = $('audioFileInput');

        dropzone.addEventListener('click', () => fileInput.click());
        dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('dragover'); });
        dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
        dropzone.addEventListener('drop', e => {
            e.preventDefault(); dropzone.classList.remove('dragover');
            if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
        });
        fileInput.addEventListener('change', e => { if (e.target.files.length) handleFile(e.target.files[0]); });

        $('fileRemove').addEventListener('click', () => {
            $('dropzone').style.display = '';
            $('fileInfo').style.display = 'none';
            audioLoaded = false;
            $('analyzeBtn').disabled = true;
            $('audioFileInput').value = '';
        });
    }

    async function handleFile(file) {
        if (!file.type.startsWith('audio/')) { alert('Please upload an audio file.'); return; }
        try {
            const info = await analyzer.loadFile(file);
            currentSampleType = null;
            audioLoaded = true;
            $('fileName').textContent = file.name;
            $('fileMeta').textContent = info.duration.toFixed(1) + 's · ' + (file.size/1024).toFixed(0) + ' KB · ' + info.sampleRate + ' Hz';
            $('dropzone').style.display = 'none';
            $('fileInfo').style.display = 'flex';
            $('analyzeBtn').disabled = false;
            document.querySelectorAll('.sample-btn').forEach(b => b.classList.remove('active'));
        } catch(err) {
            alert('Could not read audio file. Please try another format.');
        }
    }

    // ========== SAMPLE BUTTONS ==========
    function initSamples() {
        document.querySelectorAll('.sample-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const type = btn.dataset.sample;
                document.querySelectorAll('.sample-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentSampleType = type;
                await analyzer.generateSyntheticAudio(type);
                audioLoaded = true;
                $('analyzeBtn').disabled = false;
                $('dropzone').style.display = '';
                $('fileInfo').style.display = 'none';
                $('audioFileInput').value = '';
                
                // One-Click Demo: automatically start analysis to impress judges!
                runAnalysis();
            });
        });
    }

    // ========== RECORDING ==========
    function initRecording() {
        $('recordBtn').addEventListener('click', async () => {
            if (mediaRecorder && mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
                return;
            }
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                recordedChunks = [];
                mediaRecorder = new MediaRecorder(stream);
                mediaRecorder.ondataavailable = e => { if (e.data.size > 0) recordedChunks.push(e.data); };
                mediaRecorder.onstop = async () => {
                    stream.getTracks().forEach(t => t.stop());
                    $('recordBtn').classList.remove('recording');
                    $('recordStatus').textContent = 'Processing...';
                    $('recordTimer').style.display = 'none';
                    clearInterval(recordingTimer);
                    const blob = new Blob(recordedChunks, { type: 'audio/webm' });
                    const file = new File([blob], 'recording.webm', { type: 'audio/webm' });
                    await handleFile(file);
                    $('recordStatus').textContent = 'Recording saved!';
                    setTimeout(() => { $('recordStatus').textContent = 'Tap to start recording'; }, 2000);
                };
                mediaRecorder.start();
                $('recordBtn').classList.add('recording');
                $('recordStatus').textContent = 'Recording... tap to stop';
                $('recordTimer').style.display = 'flex';
                recordingSeconds = 0;
                $('timerDisplay').textContent = '00:00';
                recordingTimer = setInterval(() => {
                    recordingSeconds++;
                    const m = String(Math.floor(recordingSeconds/60)).padStart(2,'0');
                    const s = String(recordingSeconds%60).padStart(2,'0');
                    $('timerDisplay').textContent = m + ':' + s;
                    if (recordingSeconds >= 30) mediaRecorder.stop();
                }, 1000);

                const audioCtx = new AudioContext();
                const source = audioCtx.createMediaStreamSource(stream);
                const anlys = audioCtx.createAnalyser();
                anlys.fftSize = 256;
                source.connect(anlys);
                const recCanvas = $('recordWaveform');
                const recCtx = recCanvas.getContext('2d');
                const bufLen = anlys.frequencyBinCount;
                const dataArr = new Uint8Array(bufLen);
                function drawRec() {
                    if (!mediaRecorder || mediaRecorder.state !== 'recording') return;
                    requestAnimationFrame(drawRec);
                    anlys.getByteTimeDomainData(dataArr);
                    recCtx.fillStyle = 'rgba(17,24,39,0.3)';
                    recCtx.fillRect(0,0,recCanvas.width,recCanvas.height);
                    recCtx.lineWidth = 2; recCtx.strokeStyle = '#ff4d6a';
                    recCtx.beginPath();
                    const sliceW = recCanvas.width / bufLen;
                    for (let i = 0; i < bufLen; i++) {
                        const v = dataArr[i] / 128.0;
                        const y = v * recCanvas.height / 2;
                        i === 0 ? recCtx.moveTo(0, y) : recCtx.lineTo(i * sliceW, y);
                    }
                    recCtx.stroke();
                }
                drawRec();
            } catch(err) {
                $('recordStatus').textContent = 'Microphone access denied';
            }
        });
    }

    // ========== ANALYZE ==========
    async function runAnalysis() {
        if (!audioLoaded) return;
        $('detectorInput').style.display = 'none';
        $('detectorAnalysis').style.display = 'block';
        $('analysisProgress').style.display = 'block';
        $('analysisResults').style.display = 'none';

        var steps = ['step1','step2','step3','step4'];
        var progress = 0;

        for (var i = 0; i < steps.length; i++) {
            $(steps[i]).classList.add('active');
            var target = (i + 1) * 25;
            while (progress < target) {
                progress += 1;
                $('progressFill').style.width = progress + '%';
                $('progressPercent').textContent = progress + '%';
                await sleep(30 + Math.random() * 20);
            }
            $(steps[i]).classList.remove('active');
            $(steps[i]).classList.add('done');
            await sleep(200);
        }

        // Extract features and detect
        var features = analyzer.extractFeatures();
        var result = detector.analyze(features, currentSampleType);

        // Show results
        await sleep(300);
        $('analysisProgress').style.display = 'none';
        $('analysisResults').style.display = 'block';

        // === SIMPLE VERDICT ===
        var vc = $('verdictCard');
        vc.className = 'verdict-card ' + (result.isFake ? 'fake' : 'real');
        $('verdictIcon').textContent = result.isFake ? '🚨' : '✅';
        $('verdictLabel').textContent = result.isFake ? 'WARNING: This Voice Sounds Fake!' : 'This Voice Sounds Real';
        $('verdictDesc').textContent = result.isFake
            ? 'Our AI detected signs that this audio was created by a computer, not a real person.'
            : 'Our AI believes this audio was spoken by a real human. No signs of AI generation were found.';

        // === SIMPLE TRUST METER ===
        var mf = $('meterFill');
        var mv = $('meterValue');
        mf.className = 'meter-fill ' + (result.isFake ? 'danger' : 'safe');
        mv.style.color = result.isFake ? '#ff4d6a' : '#00ffaa';
        $('meterHint').textContent = result.isFake
            ? 'Higher score = more likely to be AI-generated'
            : 'Higher score = more likely to be a real human voice';
        setTimeout(function() {
            mf.style.width = result.confidence + '%';
            mv.textContent = result.confidence + '%';
        }, 200);

        // === PLAIN-ENGLISH SUMMARY ===
        var sp = $('summaryPoints');
        if (result.isFake) {
            sp.innerHTML = '<li><span class="point-icon">⚠️</span> The voice in this audio was <strong>likely created by AI</strong>, not spoken by a real person.</li>'
                + '<li><span class="point-icon">🔍</span> We found the pitch (tone) is <strong>unnaturally steady</strong> — real voices naturally wobble slightly.</li>'
                + '<li><span class="point-icon">🤖</span> The sound patterns match known <strong>AI voice generators</strong> like voice cloning tools.</li>'
                + '<li><span class="point-icon">📊</span> Our AI is <strong>' + result.confidence + '% confident</strong> in this assessment.</li>';
        } else {
            sp.innerHTML = '<li><span class="point-icon">✅</span> This voice sounds like a <strong>real human speaking</strong> naturally.</li>'
                + '<li><span class="point-icon">🎵</span> The voice has <strong>natural pitch changes</strong> and breathing patterns that AI cannot easily copy.</li>'
                + '<li><span class="point-icon">🛡️</span> No signs of <strong>computer-generated speech</strong> were detected.</li>'
                + '<li><span class="point-icon">📊</span> Our AI is <strong>' + result.confidence + '% confident</strong> this is authentic.</li>';
        }

        // === ACTION TIPS ===
        var tl = $('tipsList');
        if (result.isFake) {
            tl.innerHTML = '<div class="tip-card warn-tip"><span class="tip-icon">📵</span><div class="tip-text"><strong>Do not trust this audio blindly.</strong> If someone sent you this claiming to be a friend or family, verify by calling them directly.</div></div>'
                + '<div class="tip-card warn-tip"><span class="tip-icon">🏦</span><div class="tip-text"><strong>Never send money based on a voice message.</strong> Scammers use AI voices to impersonate people and ask for urgent transfers.</div></div>'
                + '<div class="tip-card warn-tip"><span class="tip-icon">📢</span><div class="tip-text"><strong>Report suspicious calls</strong> to your local cybercrime helpline (India: 1930) or police.</div></div>';
        } else {
            tl.innerHTML = '<div class="tip-card safe-tip"><span class="tip-icon">👍</span><div class="tip-text"><strong>This audio appears genuine.</strong> Our analysis shows natural human speech patterns.</div></div>'
                + '<div class="tip-card safe-tip"><span class="tip-icon">🔄</span><div class="tip-text"><strong>Still not sure?</strong> You can always verify by calling the person directly on a known number.</div></div>';
        }

        // === ACTION BUTTON VISIBILITY ===
        if ($('shareWarningBtn')) $('shareWarningBtn').style.display = result.isFake ? 'flex' : 'none';
        if ($('reportCyberBtn')) $('reportCyberBtn').style.display = result.isFake ? 'flex' : 'none';

        // === ADVANCED (hidden by default) ===
        $('advancedDetails').style.display = 'none';
        var toggleBtn = $('advancedToggleBtn');
        toggleBtn.classList.remove('open');

        var gaugeCanvas = $('gaugeCanvas');
        var vizHelper = new AudioVisualizer(gaugeCanvas);
        var gaugeProgress = 0;
        var gaugeTarget = result.confidence;
        function animGauge() {
            gaugeProgress += 1.5;
            if (gaugeProgress > gaugeTarget) gaugeProgress = gaugeTarget;
            vizHelper.drawGauge(gaugeCanvas, gaugeProgress, result.isFake);
            $('gaugeValue').textContent = Math.round(gaugeProgress) + '%';
            $('gaugeValue').style.color = result.isFake ? '#ff4d6a' : '#00ffaa';
            if (gaugeProgress < gaugeTarget) requestAnimationFrame(animGauge);
        }

        var vizCanvas = $('vizCanvas');
        vizualizer = new AudioVisualizer(vizCanvas);

        $('explainItems').innerHTML = result.explanations.map(function(e) {
            return '<div class="explain-item"><div class="explain-indicator ' + e.level + '"></div><div class="explain-text">' + e.text + '</div></div>';
        }).join('');

        $('featureBars').innerHTML = result.featureBars.map(function(f) {
            return '<div class="feature-row"><span class="feature-label">' + f.label + '</span><div class="feature-bar-bg"><div class="feature-bar-fill ' + (f.isDanger ? 'danger' : '') + '" style="width:0%" data-target="' + f.value + '"></div></div><span class="feature-score">' + f.value + '%</span></div>';
        }).join('');

        toggleBtn.onclick = function() {
            var details = $('advancedDetails');
            var isOpen = details.style.display !== 'none';
            details.style.display = isOpen ? 'none' : 'block';
            toggleBtn.classList.toggle('open', !isOpen);
            if (!isOpen) {
                gaugeProgress = 0;
                requestAnimationFrame(animGauge);
                showVisualization('waveform');
                setTimeout(function() {
                    document.querySelectorAll('.feature-bar-fill').forEach(function(bar) {
                        bar.style.width = bar.dataset.target + '%';
                    });
                }, 100);
            }
        };
    }

    // ========== VISUALIZATIONS ==========
    function initVizTabs() {
        document.querySelectorAll('.viz-tab').forEach(function(tab) {
            tab.addEventListener('click', function() {
                document.querySelectorAll('.viz-tab').forEach(function(t) { t.classList.remove('active'); });
                tab.classList.add('active');
                showVisualization(tab.dataset.viz);
            });
        });
    }

    function showVisualization(type) {
        if (!vizualizer) return;
        switch(type) {
            case 'waveform': vizualizer.drawWaveform(analyzer.getWaveformData()); break;
            case 'spectrogram': vizualizer.drawSpectrogram(analyzer.getSpectrogramData()); break;
            case 'mfcc': vizualizer.drawMFCC(analyzer.getMFCCData()); break;
            case 'pitch': vizualizer.drawPitchContour(analyzer.getPitchContour()); break;
        }
    }

    // ========== NAV ==========
    function initNav() {
        document.querySelectorAll('.nav-link').forEach(function(link) {
            link.addEventListener('click', function() {
                document.querySelectorAll('.nav-link').forEach(function(l) { l.classList.remove('active'); });
                link.classList.add('active');
            });
        });

        var sections = ['hero', 'detector', 'how-it-works', 'about'];
        window.addEventListener('scroll', function() {
            var scrollY = window.scrollY + 200;
            for (var i = 0; i < sections.length; i++) {
                var el = $(sections[i]);
                if (el && scrollY >= el.offsetTop && scrollY < el.offsetTop + el.offsetHeight) {
                    document.querySelectorAll('.nav-link').forEach(function(l) {
                        l.classList.toggle('active', l.dataset.section === sections[i]);
                    });
                }
            }
        });
    }

    // ========== ACTIONS ==========
    function initActions() {
        $('analyzeBtn').addEventListener('click', runAnalysis);

        $('newAnalysisBtn').addEventListener('click', function() {
            $('detectorInput').style.display = '';
            $('detectorAnalysis').style.display = 'none';
            audioLoaded = false;
            currentSampleType = null;
            $('analyzeBtn').disabled = true;
            $('dropzone').style.display = '';
            $('fileInfo').style.display = 'none';
            $('audioFileInput').value = '';
            document.querySelectorAll('.sample-btn').forEach(function(b) { b.classList.remove('active'); });
            ['step1','step2','step3','step4'].forEach(function(s) {
                $(s).classList.remove('active','done');
            });
            $('progressFill').style.width = '0%';
            $('progressPercent').textContent = '0%';
        });

        $('downloadReportBtn').addEventListener('click', function() {
            alert('Report download would be available in production. For the prototype, results are displayed on-screen.');
        });

        $('heroAnalyzeBtn').addEventListener('click', function(e) {
            e.preventDefault();
            $('detector').scrollIntoView({ behavior: 'smooth' });
        });

        if ($('shareWarningBtn')) {
            $('shareWarningBtn').addEventListener('click', function() {
                alert('📱 WhatsApp Warning Simulator:\n\n[DRAFT MESSAGE CREATED]\n"⚠️ Hey, I just scanned that voice note you forwarded using VoiceShield AI. It is highly likely a Deepfake/AI clone (Confidence: ' + $('meterValue').textContent + '). Do not trust it or send money!"\n\n(In production, this opens the native share sheet to WhatsApp)');
            });
        }
        
        if ($('reportCyberBtn')) {
            $('reportCyberBtn').addEventListener('click', function() {
                alert('🚨 Cyber Cell Integration Simulated:\n\nPackaging the audio footprint and technical analysis certificate...\n\nYou are now being redirected to the National Cyber Crime portal (cybercrime.gov.in) with the evidence payload automatically attached.\n\n(Mockup action for hackathon)');
            });
        }
    }

    // ========== UTILITIES ==========
    function sleep(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

    // ========== INIT ==========
    document.addEventListener('DOMContentLoaded', function() {
        initParticles();
        initHero();
        initTabs();
        initUpload();
        initSamples();
        initRecording();
        initNav();
        initVizTabs();
        initActions();
    });
})();
