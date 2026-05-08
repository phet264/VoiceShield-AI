/**
 * AudioAnalyzer — Web Audio API wrapper for waveform, spectrogram, and feature extraction
 */
class AudioAnalyzer {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.source = null;
        this.audioBuffer = null;
        this.rawData = null;
    }

    async init() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }

    async loadFile(file) {
        await this.init();
        const arrayBuffer = await file.arrayBuffer();
        this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        this.rawData = this.audioBuffer.getChannelData(0);
        return {
            duration: this.audioBuffer.duration,
            sampleRate: this.audioBuffer.sampleRate,
            channels: this.audioBuffer.numberOfChannels
        };
    }

    async generateSyntheticAudio(type) {
        await this.init();
        const sr = 22050;
        const duration = 3;
        const length = sr * duration;
        this.audioBuffer = this.audioContext.createBuffer(1, length, sr);
        const data = this.audioBuffer.getChannelData(0);

        if (type === 'real') {
            // Simulate natural human speech patterns with vibrato and noise
            for (let i = 0; i < length; i++) {
                const t = i / sr;
                const f0 = 150 + 20 * Math.sin(2 * Math.PI * 5 * t); // natural vibrato
                const envelope = Math.sin(Math.PI * t / duration);
                const formant1 = Math.sin(2 * Math.PI * f0 * t);
                const formant2 = 0.5 * Math.sin(2 * Math.PI * f0 * 2.3 * t);
                const formant3 = 0.25 * Math.sin(2 * Math.PI * f0 * 3.1 * t);
                const noise = (Math.random() - 0.5) * 0.08;
                const breathPause = (Math.sin(2 * Math.PI * 0.8 * t) > 0.3) ? 1 : 0.05;
                data[i] = envelope * breathPause * (formant1 + formant2 + formant3 + noise) * 0.3;
            }
        } else {
            // Simulate AI-generated: too perfect, periodic artifacts
            for (let i = 0; i < length; i++) {
                const t = i / sr;
                const f0 = 160; // unnaturally constant pitch
                const envelope = 0.8 + 0.2 * Math.sin(2 * Math.PI * 0.5 * t);
                const formant1 = Math.sin(2 * Math.PI * f0 * t);
                const formant2 = 0.6 * Math.sin(2 * Math.PI * f0 * 2 * t); // exact harmonics
                const formant3 = 0.4 * Math.sin(2 * Math.PI * f0 * 3 * t);
                // Periodic glitch every ~0.5s (vocoder artifact)
                const glitch = (i % Math.floor(sr * 0.5) < 50) ? 0.3 * Math.sin(2 * Math.PI * 800 * t) : 0;
                data[i] = envelope * (formant1 + formant2 + formant3 + glitch) * 0.3;
            }
        }
        this.rawData = data;
        return {
            duration: this.audioBuffer.duration,
            sampleRate: this.audioBuffer.sampleRate,
            channels: 1
        };
    }

    playAudio() {
        if (!this.audioBuffer || !this.audioContext) return;
        if (this.source) { try { this.source.stop(); } catch(e) {} }
        this.source = this.audioContext.createBufferSource();
        this.source.buffer = this.audioBuffer;
        this.source.connect(this.audioContext.destination);
        this.source.start(0);
    }

    getWaveformData(points = 600) {
        if (!this.rawData) return [];
        const step = Math.floor(this.rawData.length / points);
        const result = [];
        for (let i = 0; i < points; i++) {
            let min = 1, max = -1;
            for (let j = 0; j < step; j++) {
                const val = this.rawData[i * step + j] || 0;
                if (val < min) min = val;
                if (val > max) max = val;
            }
            result.push({ min, max });
        }
        return result;
    }

    getSpectrogramData(fftSize = 256, hopSize = 128) {
        if (!this.rawData) return [];
        const frames = [];
        const windowFn = (n, N) => 0.5 * (1 - Math.cos(2 * Math.PI * n / (N - 1))); // Hann
        for (let offset = 0; offset + fftSize < this.rawData.length; offset += hopSize) {
            const frame = new Float32Array(fftSize);
            for (let i = 0; i < fftSize; i++) {
                frame[i] = (this.rawData[offset + i] || 0) * windowFn(i, fftSize);
            }
            const magnitudes = this._fftMagnitude(frame);
            frames.push(magnitudes);
            if (frames.length > 200) break; // cap for performance
        }
        return frames;
    }

    getMFCCData(numCoeffs = 13) {
        // Simplified MFCC-like features from spectrogram
        const spec = this.getSpectrogramData(512, 256);
        if (spec.length === 0) return [];
        const mfccs = [];
        for (const frame of spec) {
            const coeffs = [];
            const numBins = frame.length;
            for (let k = 0; k < numCoeffs; k++) {
                let sum = 0;
                for (let n = 0; n < numBins; n++) {
                    sum += Math.log(Math.max(frame[n], 1e-10)) * Math.cos(Math.PI * k * (n + 0.5) / numBins);
                }
                coeffs.push(sum / numBins);
            }
            mfccs.push(coeffs);
        }
        return mfccs;
    }

    getPitchContour(frameSize = 2048, hopSize = 512) {
        if (!this.rawData) return [];
        const pitches = [];
        const sr = this.audioBuffer ? this.audioBuffer.sampleRate : 22050;
        for (let offset = 0; offset + frameSize < this.rawData.length; offset += hopSize) {
            const frame = this.rawData.slice(offset, offset + frameSize);
            const pitch = this._detectPitch(frame, sr);
            pitches.push(pitch);
            if (pitches.length > 300) break;
        }
        return pitches;
    }

    extractFeatures() {
        if (!this.rawData) return {};
        const sr = this.audioBuffer ? this.audioBuffer.sampleRate : 22050;
        const data = this.rawData;

        // RMS Energy
        let rmsSum = 0;
        for (let i = 0; i < data.length; i++) rmsSum += data[i] * data[i];
        const rms = Math.sqrt(rmsSum / data.length);

        // Zero Crossing Rate
        let zcr = 0;
        for (let i = 1; i < data.length; i++) {
            if ((data[i] >= 0 && data[i-1] < 0) || (data[i] < 0 && data[i-1] >= 0)) zcr++;
        }
        zcr /= data.length;

        // Spectral centroid (approximate)
        const spec = this._fftMagnitude(data.slice(0, Math.min(4096, data.length)));
        let weightedSum = 0, totalMag = 0;
        for (let i = 0; i < spec.length; i++) {
            weightedSum += i * spec[i];
            totalMag += spec[i];
        }
        const spectralCentroid = totalMag > 0 ? (weightedSum / totalMag) * (sr / 2 / spec.length) : 0;

        // Pitch variance
        const pitches = this.getPitchContour().filter(p => p > 0);
        const meanPitch = pitches.length > 0 ? pitches.reduce((a,b) => a+b, 0) / pitches.length : 0;
        const pitchVar = pitches.length > 0 ? pitches.reduce((a,b) => a + (b - meanPitch)**2, 0) / pitches.length : 0;

        // Harmonic-to-noise ratio (simplified)
        const hnr = rms > 0 ? 20 * Math.log10(rms / (zcr + 0.001)) : 0;

        return { rms, zcr, spectralCentroid, meanPitch, pitchVariance: pitchVar, hnr };
    }

    _fftMagnitude(frame) {
        const N = frame.length;
        const magnitudes = new Float32Array(N / 2);
        for (let k = 0; k < N / 2; k++) {
            let re = 0, im = 0;
            for (let n = 0; n < N; n++) {
                const angle = -2 * Math.PI * k * n / N;
                re += frame[n] * Math.cos(angle);
                im += frame[n] * Math.sin(angle);
            }
            magnitudes[k] = Math.sqrt(re * re + im * im) / N;
        }
        return magnitudes;
    }

    _detectPitch(frame, sr) {
        // Autocorrelation pitch detection
        const minPeriod = Math.floor(sr / 500); // max 500Hz
        const maxPeriod = Math.floor(sr / 60);  // min 60Hz
        let bestCorr = 0, bestPeriod = 0;
        for (let lag = minPeriod; lag < Math.min(maxPeriod, frame.length / 2); lag++) {
            let corr = 0;
            for (let i = 0; i < frame.length - lag; i++) {
                corr += frame[i] * frame[i + lag];
            }
            if (corr > bestCorr) {
                bestCorr = corr;
                bestPeriod = lag;
            }
        }
        return bestPeriod > 0 ? sr / bestPeriod : 0;
    }
}

// Canvas visualization helpers
class AudioVisualizer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawWaveform(data, color = '#00ffaa') {
        const { ctx, canvas } = this;
        const w = canvas.width, h = canvas.height;
        this.clear();
        const mid = h / 2;
        const barW = w / data.length;

        ctx.fillStyle = 'rgba(0,255,170,0.08)';
        ctx.fillRect(0, 0, w, h);

        for (let i = 0; i < data.length; i++) {
            const x = i * barW;
            const maxH = data[i].max * mid;
            const minH = data[i].min * mid;
            const gradient = ctx.createLinearGradient(0, mid + minH, 0, mid + maxH);
            gradient.addColorStop(0, 'rgba(0,255,170,0.2)');
            gradient.addColorStop(0.5, color);
            gradient.addColorStop(1, 'rgba(0,255,170,0.2)');
            ctx.fillStyle = gradient;
            ctx.fillRect(x, mid + minH, Math.max(barW - 0.5, 0.5), maxH - minH);
        }

        // Center line
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, mid);
        ctx.lineTo(w, mid);
        ctx.stroke();
    }

    drawSpectrogram(frames) {
        const { ctx, canvas } = this;
        const w = canvas.width, h = canvas.height;
        this.clear();
        if (frames.length === 0) return;

        const numBins = frames[0].length;
        const colW = w / frames.length;
        const rowH = h / numBins;

        // Find max for normalization
        let maxVal = 0;
        for (const f of frames) for (const v of f) if (v > maxVal) maxVal = v;
        if (maxVal === 0) maxVal = 1;

        for (let i = 0; i < frames.length; i++) {
            for (let j = 0; j < numBins; j++) {
                const val = frames[i][j] / maxVal;
                const hue = 160 - val * 160; // green to red
                const lightness = val * 60;
                ctx.fillStyle = `hsl(${hue}, 100%, ${lightness}%)`;
                ctx.fillRect(i * colW, h - (j + 1) * rowH, colW + 0.5, rowH + 0.5);
            }
        }
    }

    drawMFCC(mfccData) {
        const { ctx, canvas } = this;
        const w = canvas.width, h = canvas.height;
        this.clear();
        if (mfccData.length === 0) return;

        const numCoeffs = mfccData[0].length;
        const colW = w / mfccData.length;
        const rowH = h / numCoeffs;

        let minVal = Infinity, maxVal = -Infinity;
        for (const f of mfccData) for (const v of f) {
            if (v < minVal) minVal = v;
            if (v > maxVal) maxVal = v;
        }
        const range = maxVal - minVal || 1;

        for (let i = 0; i < mfccData.length; i++) {
            for (let j = 0; j < numCoeffs; j++) {
                const val = (mfccData[i][j] - minVal) / range;
                const r = Math.floor(val * 255);
                const b = Math.floor((1 - val) * 255);
                const g = Math.floor(val * 100);
                ctx.fillStyle = `rgb(${r},${g},${b})`;
                ctx.fillRect(i * colW, j * rowH, colW + 0.5, rowH + 0.5);
            }
        }
    }

    drawPitchContour(pitches, color = '#00c9ff') {
        const { ctx, canvas } = this;
        const w = canvas.width, h = canvas.height;
        this.clear();

        const valid = pitches.filter(p => p > 0);
        if (valid.length === 0) return;
        const maxPitch = Math.max(...valid) * 1.1;
        const minPitch = Math.min(...valid) * 0.9;
        const range = maxPitch - minPitch || 1;

        // Background grid
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++) {
            const y = (i / 4) * h;
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }

        // Pitch line
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        let started = false;
        for (let i = 0; i < pitches.length; i++) {
            const x = (i / pitches.length) * w;
            if (pitches[i] > 0) {
                const y = h - ((pitches[i] - minPitch) / range) * h;
                if (!started) { ctx.moveTo(x, y); started = true; }
                else ctx.lineTo(x, y);
            }
        }
        ctx.stroke();

        // Glow effect
        ctx.strokeStyle = 'rgba(0,201,255,0.2)';
        ctx.lineWidth = 6;
        ctx.beginPath();
        started = false;
        for (let i = 0; i < pitches.length; i++) {
            const x = (i / pitches.length) * w;
            if (pitches[i] > 0) {
                const y = h - ((pitches[i] - minPitch) / range) * h;
                if (!started) { ctx.moveTo(x, y); started = true; }
                else ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
    }

    drawGauge(canvas, value, isFake) {
        const ctx = canvas.getContext('2d');
        const w = canvas.width, h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        const cx = w / 2, cy = h - 10;
        const radius = 100;
        const startAngle = Math.PI;
        const endAngle = 2 * Math.PI;
        const valueAngle = startAngle + (value / 100) * Math.PI;

        // Background arc
        ctx.beginPath();
        ctx.arc(cx, cy, radius, startAngle, endAngle);
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 14;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Value arc
        const gradient = ctx.createLinearGradient(cx - radius, cy, cx + radius, cy);
        if (isFake) {
            gradient.addColorStop(0, '#ff4d6a');
            gradient.addColorStop(1, '#ff9a3c');
        } else {
            gradient.addColorStop(0, '#00ffaa');
            gradient.addColorStop(1, '#00c9ff');
        }
        ctx.beginPath();
        ctx.arc(cx, cy, radius, startAngle, valueAngle);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 14;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Glow
        ctx.beginPath();
        ctx.arc(cx, cy, radius, startAngle, valueAngle);
        ctx.strokeStyle = isFake ? 'rgba(255,77,106,0.15)' : 'rgba(0,255,170,0.15)';
        ctx.lineWidth = 28;
        ctx.stroke();
    }
}

// Hero waveform animation
class HeroWaveformAnimator {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.animId = null;
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = 200;
    }

    start() {
        const draw = (time) => {
            const { ctx, canvas } = this;
            const w = canvas.width, h = canvas.height;
            ctx.clearRect(0, 0, w, h);

            const mid = h / 2;
            const numBars = 80;
            const barW = w / numBars;
            const t = time * 0.001;

            for (let i = 0; i < numBars; i++) {
                const x = i * barW;
                const amp = (Math.sin(t * 2 + i * 0.15) * 0.4 + Math.sin(t * 3.7 + i * 0.08) * 0.3 + Math.sin(t * 1.3 + i * 0.25) * 0.2) * mid * 0.7;
                const gradient = ctx.createLinearGradient(0, mid - Math.abs(amp), 0, mid + Math.abs(amp));
                gradient.addColorStop(0, 'rgba(0,255,170,0.05)');
                gradient.addColorStop(0.5, 'rgba(0,255,170,0.6)');
                gradient.addColorStop(1, 'rgba(0,255,170,0.05)');
                ctx.fillStyle = gradient;
                ctx.fillRect(x + 1, mid - Math.abs(amp), barW - 2, Math.abs(amp) * 2);
            }
            this.animId = requestAnimationFrame(draw);
        };
        this.animId = requestAnimationFrame(draw);
    }

    stop() {
        if (this.animId) cancelAnimationFrame(this.animId);
    }
}

window.AudioAnalyzer = AudioAnalyzer;
window.AudioVisualizer = AudioVisualizer;
window.HeroWaveformAnimator = HeroWaveformAnimator;
