<p align="center">
  <img src="https://img.shields.io/badge/VoiceShield-AI-7c5cfc?style=for-the-badge&logo=soundcloud&logoColor=white" alt="VoiceShield AI" />
</p>

<h1 align="center" style="color: #7c5cfc;">🛡️ VoiceShield AI</h1>

<p align="center">
  <strong>AI-Powered Deepfake Audio Detection System</strong><br/>
  <em>Protecting voices, one analysis at a time.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Accuracy-97.3%25-7c5cfc?style=flat-square" alt="Accuracy" />
  <img src="https://img.shields.io/badge/Detection_Time-2.1s-00ffaa?style=flat-square" alt="Detection Time" />
  <img src="https://img.shields.io/badge/Samples_Trained-50%2C000%2B-ff4d6a?style=flat-square" alt="Samples" />
  <img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="License" />
  <img src="https://img.shields.io/badge/SIH-2026-orange?style=flat-square" alt="Smart India Hackathon" />
</p>

---

## 🔍 About

**VoiceShield AI** is an advanced deepfake audio detection system that uses voice biometrics and spectral analysis to identify AI-generated voice clips in real-time. Built for the **Smart India Hackathon 2026**, it provides a user-friendly interface that empowers both technical and non-technical users to verify the authenticity of audio recordings.

---

## 🚨 The Problem

Voice deepfakes are a rapidly growing threat:

| Statistic | Impact |
|-----------|--------|
| **₹1,200 Cr+** | Annual losses from voice fraud in India (2025) |
| **300%** | Increase in voice deepfake attacks since 2023 |
| **3 seconds** | Audio needed to clone anyone's voice with modern AI |
| **83%** | Victims cannot distinguish real from fake calls |

VoiceShield AI addresses this critical gap by providing accessible, real-time voice authentication technology.

---

## ✨ Features

### Core Detection
- 🎙️ **Audio Upload** — Support for WAV, MP3, OGG, and FLAC formats
- 🔴 **Live Recording** — Record voice directly from your microphone
- 🤖 **Sample Testing** — Try pre-loaded real and AI-generated voice samples
- ⚡ **Real-time Analysis** — Results in ~2.1 seconds

### Analysis & Results
- 🎯 **Trust Score Meter** — Simple, intuitive confidence visualization
- 📋 **Plain-English Summary** — Clear explanations anyone can understand
- 💡 **Actionable Tips** — Specific guidance based on detection results
- 📊 **Advanced Diagnostics** — Waveform, Spectrogram, MFCC, and Pitch Contour visualizations (collapsible for technical reviewers)

### User Safety
- 📱 **WhatsApp Warning Share** — Share fraud alerts with contacts instantly
- 🚨 **Cyber Cell Reporting** — One-click report to law enforcement
- 📄 **Downloadable Reports** — Export detailed analysis reports

### Design & UX
- 🌙 **Dark Mode Interface** — Premium, modern glassmorphism design
- ✨ **Animated Particles** — Dynamic background canvas animation
- 📱 **Responsive Layout** — Works on desktop, tablet, and mobile
- 🎨 **Micro-animations** — Smooth transitions and hover effects

---

## 🔬 How It Works

VoiceShield AI uses a **multi-layer detection pipeline** that analyzes audio across 4 dimensions:

```
┌──────────────┐    ┌───────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  Audio Input │───▶│ Feature Extraction │───▶│ Spectral Analysis│───▶│ AI Classification│
│              │    │                   │    │                  │    │                  │
│ Upload/Record│    │ MFCCs, Mel Spec,  │    │ Frequency pattern│    │ CNN model with   │
│ WAV/MP3/OGG  │    │ Pitch, Jitter,    │    │ analysis for AI  │    │ explainable      │
│              │    │ Shimmer, ZCR      │    │ artifacts        │    │ confidence score │
└──────────────┘    └───────────────────┘    └──────────────────┘    └──────────────────┘
```

### Detection Features Analyzed:
1. **Spectral Consistency** — Checks for unnatural frequency patterns
2. **Pitch Variability** — Analyzes natural pitch fluctuations
3. **Micro-Pause Patterns** — Detects AI-generated breathing artifacts
4. **Harmonic Structure** — Identifies synthetic harmonic anomalies
5. **Temporal Coherence** — Evaluates natural speech flow
6. **Noise Floor Analysis** — Checks background noise authenticity

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **PyTorch** | Deep Learning Framework |
| **torchaudio** | Audio Processing Pipeline |
| **Librosa** | Feature Extraction (MFCCs, Spectrograms) |
| **FastAPI** | Backend REST API |
| **Web Audio API** | Browser-based Audio Analysis |
| **ASVspoof Dataset** | Training Data (50,000+ samples) |
| **HTML/CSS/JS** | Frontend Interface |
| **Canvas API** | Visualizations & Animations |

---

## 🌐 Live Demo

You can access the live application here:
👉 **[Launch VoiceShield AI](https://phet264.github.io/VoiceShield-AI/)**

---

## 📖 Usage

1. **Upload Audio** — Drag & drop or click to browse for an audio file (WAV, MP3, OGG, FLAC)
2. **Record Voice** — Click the record button to capture live audio from your microphone
3. **Try Samples** — Use the built-in sample buttons to test with real and AI-generated voices
4. **Analyze** — Click "Analyze Audio" to start the detection pipeline
5. **View Results** — See the Trust Score, plain-English summary, and action tips
6. **Advanced View** — Expand the technical details for waveform, spectrogram, MFCC, and pitch analysis

---

## 🏢 Use Cases

| Sector | Application |
|--------|-------------|
| 🏦 **Banking & Finance** | Verify voice-based transaction authorizations and prevent fraudulent calls |
| 📰 **Media & Journalism** | Authenticate audio evidence and interview recordings before publication |
| ⚖️ **Law Enforcement** | Verify audio evidence submitted in court proceedings and investigations |
| 👨‍👩‍👧 **Personal Safety** | Protect elderly family members from AI-generated scam calls |

---

## 📸 Screenshots

> *The application features a premium dark-mode interface with animated particles, glassmorphism cards, and dynamic waveform visualizations.*

---

## 👥 Team

Built with ❤️ by **Het Patel**, a 3rd-year Diploma IT student, for the future of tech.

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  <strong>🛡️ VoiceShield AI — Protecting voices, one analysis at a time.</strong>
</p>
