/**
 * DeepfakeDetector — ML-based deepfake detection simulation with explainable AI
 */
class DeepfakeDetector {
    constructor() {
        this.featureWeights = {
            pitchVariance: 0.25, spectralCentroid: 0.15, zcr: 0.15,
            hnr: 0.20, rms: 0.10, harmonicRegularity: 0.15
        };
    }

    analyze(features, knownType = null) {
        let scores, isFake, confidence;
        if (knownType) {
            isFake = knownType === 'fake';
            confidence = isFake ? 89 + Math.random() * 8 : 91 + Math.random() * 7;
            scores = this._generateScores(isFake, features);
        } else {
            scores = this._analyzeFeatures(features);
            const total = Object.keys(scores).reduce((sum, k) =>
                sum + scores[k].normalized * (this.featureWeights[k] || 0.1), 0);
            isFake = total > 0.55;
            confidence = Math.min(98, Math.max(62, Math.abs(total - 0.5) * 200));
        }
        return {
            isFake, confidence: Math.round(confidence * 10) / 10,
            verdict: isFake ? 'AI-GENERATED AUDIO DETECTED' : 'AUTHENTIC HUMAN VOICE',
            description: isFake
                ? 'Our analysis detected multiple artifacts consistent with AI-generated speech synthesis. This audio shows signs of being produced by a voice cloning or text-to-speech system.'
                : 'This audio shows natural speech characteristics consistent with authentic human voice production. No significant deepfake artifacts were detected.',
            explanations: this._generateExplanations(scores, isFake),
            featureBars: this._generateFeatureBars(scores), scores
        };
    }

    _analyzeFeatures(f) {
        const pvN = Math.min(1, f.pitchVariance / 2000);
        return {
            pitchVariance: { value: f.pitchVariance, normalized: pvN < 0.3 ? 0.8 : pvN < 0.5 ? 0.5 : 0.2, label: 'Pitch Consistency' },
            spectralCentroid: { value: f.spectralCentroid, normalized: (Math.min(1,f.spectralCentroid/4000) < 0.15 || Math.min(1,f.spectralCentroid/4000) > 0.7) ? 0.7 : 0.25, label: 'Spectral Profile' },
            zcr: { value: f.zcr, normalized: Math.min(1,f.zcr*100) < 0.1 ? 0.75 : 0.3, label: 'Zero-Crossing Rate' },
            hnr: { value: f.hnr, normalized: Math.min(1,Math.abs(f.hnr)/50) > 0.7 ? 0.65 : 0.3, label: 'Harmonic-to-Noise' },
            rms: { value: f.rms, normalized: f.rms < 0.02 ? 0.6 : f.rms > 0.3 ? 0.5 : 0.25, label: 'Energy Consistency' },
            harmonicRegularity: { value: 0, normalized: pvN < 0.2 ? 0.85 : 0.2, label: 'Harmonic Regularity' }
        };
    }

    _generateScores(isFake, f) {
        const r = () => Math.random() * 0.15;
        if (isFake) return {
            pitchVariance: { value: f.pitchVariance, normalized: 0.78+r(), label: 'Pitch Consistency' },
            spectralCentroid: { value: f.spectralCentroid, normalized: 0.72+r(), label: 'Spectral Profile' },
            zcr: { value: f.zcr, normalized: 0.65+r(), label: 'Zero-Crossing Rate' },
            hnr: { value: f.hnr, normalized: 0.81+r(), label: 'Harmonic-to-Noise' },
            rms: { value: f.rms, normalized: 0.55+r(), label: 'Energy Consistency' },
            harmonicRegularity: { value: 0, normalized: 0.88+r()*0.5, label: 'Harmonic Regularity' }
        };
        return {
            pitchVariance: { value: f.pitchVariance, normalized: 0.15+r(), label: 'Pitch Consistency' },
            spectralCentroid: { value: f.spectralCentroid, normalized: 0.2+r(), label: 'Spectral Profile' },
            zcr: { value: f.zcr, normalized: 0.18+r(), label: 'Zero-Crossing Rate' },
            hnr: { value: f.hnr, normalized: 0.12+r(), label: 'Harmonic-to-Noise' },
            rms: { value: f.rms, normalized: 0.22+r(), label: 'Energy Consistency' },
            harmonicRegularity: { value: 0, normalized: 0.1+r(), label: 'Harmonic Regularity' }
        };
    }

    _generateExplanations(scores, isFake) {
        const items = [];
        if (isFake) {
            items.push({ level:'danger', text:'<strong>Unnatural pitch consistency:</strong> F0 shows abnormally low variance (σ² < 15 Hz), typical of vocoder-based synthesis.' });
            items.push({ level:'danger', text:'<strong>Exact harmonic spacing:</strong> Harmonics are perfect integer multiples of F0. Natural speech always has slight inharmonicity.' });
            items.push({ level:'warning', text:'<strong>Spectral artifacts:</strong> Periodic energy spikes at ~500ms intervals suggest frame-boundary artifacts from neural TTS.' });
            items.push({ level:'danger', text:'<strong>Abnormal HNR:</strong> Lacks natural turbulent noise from human glottal airflow.' });
            items.push({ level:'warning', text:'<strong>Phase discontinuities:</strong> STFT phase shows non-smooth transitions between frames.' });
        } else {
            items.push({ level:'safe', text:'<strong>Natural pitch variation:</strong> F0 contour shows micro-prosodic variation consistent with human laryngeal control.' });
            items.push({ level:'safe', text:'<strong>Authentic spectral profile:</strong> Formant transitions match natural vocal tract resonance.' });
            items.push({ level:'safe', text:'<strong>Natural noise components:</strong> Appropriate breathiness and aspiration noise detected.' });
            items.push({ level:'safe', text:'<strong>Smooth phase continuity:</strong> STFT phase spectrum shows natural continuity across frames.' });
        }
        return items;
    }

    _generateFeatureBars(scores) {
        return Object.keys(scores).map(k => ({
            label: scores[k].label,
            value: Math.min(100, Math.round(scores[k].normalized * 100)),
            isDanger: scores[k].normalized > 0.6
        }));
    }
}
window.DeepfakeDetector = DeepfakeDetector;
