# Video-Optimierung für Scroll-Animationen

## Das Problem verstehen

Video-Scroll-Animationen zeigen das Video frame-by-frame basierend auf der Scroll-Position. Je mehr Frames dein Video hat, desto smoother wird die Animation.

**Beispiel:**
- Video mit 24 FPS × 10 Sekunden = **240 Frames** → ruckelig
- Video mit 60 FPS × 10 Sekunden = **600 Frames** → smooth
- Video mit 120 FPS × 10 Sekunden = **1200 Frames** → ultra-smooth (wie Apple)

## Optimale Video-Spezifikationen

### Für beste Scroll-Performance:

```
Framerate:      60-120 FPS (je höher, desto smoother)
Dauer:          8-15 Sekunden
Auflösung:      1920x1080 (Full HD) oder 2560x1440 (2K)
Codec:          H.264 (beste Kompatibilität)
Bitrate:        8-15 Mbps
Dateigröße:     < 20 MB (für schnelles Laden)
Format:         MP4
```

## Video mit FFmpeg optimieren

### 1. FFmpeg installieren

**macOS:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install ffmpeg
```

**Windows:**
Download von https://ffmpeg.org/download.html

### 2. Video analysieren

```bash
# Video-Eigenschaften anzeigen
ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate,duration,nb_frames,width,height -of default=noprint_wrappers=1 dein-video.mp4
```

### 3. Video auf 60 FPS konvertieren

```bash
# Basis-Konvertierung auf 60 FPS
ffmpeg -i input.mp4 -r 60 -c:v libx264 -preset slow -crf 23 output-60fps.mp4
```

**Parameter erklärt:**
- `-r 60` = 60 Frames pro Sekunde
- `-c:v libx264` = H.264 codec
- `-preset slow` = Bessere Qualität (langsamer zu rendern)
- `-crf 23` = Qualität (18 = sehr hoch, 28 = niedrig)

### 4. Video auf 120 FPS konvertieren (Apple-Style)

```bash
# Ultra-smooth 120 FPS
ffmpeg -i input.mp4 -r 120 -c:v libx264 -preset slow -crf 23 output-120fps.mp4
```

### 5. Video mit Frame-Interpolation (smooth)

Für noch smoothere Übergänge zwischen Frames:

```bash
# Motion Interpolation für flüssigere Bewegung
ffmpeg -i input.mp4 -filter:v "minterpolate='fps=120:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1'" -c:v libx264 -crf 23 output-interpolated.mp4
```

### 6. Video komprimieren (Dateigröße reduzieren)

```bash
# Komprimieren ohne zu viel Qualitätsverlust
ffmpeg -i input.mp4 -vcodec libx264 -crf 28 -preset slow -vf scale=1920:1080 output-compressed.mp4
```

## Komplettes Optimierungs-Rezept

Für das **perfekte Scroll-Video**:

```bash
# 1. Auf 60 FPS konvertieren + interpolieren + komprimieren
ffmpeg -i Videohero.mp4 \
  -filter:v "minterpolate='fps=60:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1',scale=1920:1080" \
  -c:v libx264 \
  -preset slow \
  -crf 23 \
  -movflags +faststart \
  Videohero-optimized.mp4

# 2. Für ultra-smooth (120 FPS)
ffmpeg -i Videohero.mp4 \
  -filter:v "minterpolate='fps=120:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1',scale=1920:1080" \
  -c:v libx264 \
  -preset slow \
  -crf 23 \
  -movflags +faststart \
  Videohero-ultrasmooth.mp4
```

**Parameter erklärt:**
- `minterpolate` = Erstellt zusätzliche Frames zwischen existierenden Frames
- `fps=60` oder `fps=120` = Ziel-Framerate
- `scale=1920:1080` = Auf Full HD skalieren
- `-movflags +faststart` = Optimiert für Web-Streaming

## Video-Qualität vs. Dateigröße

| CRF Wert | Qualität | Typische Größe (10s @ 60fps) |
|----------|----------|------------------------------|
| 18       | Sehr hoch | ~30 MB |
| 23       | Hoch (empfohlen) | ~15 MB |
| 28       | Mittel | ~8 MB |
| 32       | Niedrig | ~5 MB |

## Alternative: Video in After Effects erstellen

Wenn du Adobe After Effects hast:

1. **Projekt-Einstellungen:**
   - Frame Rate: 60 oder 120 fps
   - Duration: 10-15 Sekunden
   - Resolution: 1920x1080

2. **Export-Einstellungen:**
   - Format: H.264
   - Frame Rate: 60 oder 120 fps
   - Bitrate: 10-15 Mbps
   - Profile: High

## Video-Länge für Scroll-Höhe

Die Scroll-Höhe in der Komponente sollte zur Video-Länge passen:

```tsx
// Längeres Video = mehr Scroll-Höhe
<VideoScrollAnimation
  videoSrc="/Videohero.mp4"
  height="400vh"  // 4x Viewport-Höhe
/>
```

**Empfehlungen:**
- 5-8 Sekunden Video → `height="300vh"`
- 10-15 Sekunden Video → `height="400vh"` bis `height="500vh"`
- 20+ Sekunden Video → `height="600vh"`

## Testen

Nach der Optimierung:

1. Ersetze das alte Video:
   ```bash
   # Backup erstellen
   mv public/Videohero.mp4 public/Videohero-old.mp4

   # Neues Video kopieren
   cp Videohero-optimized.mp4 public/Videohero.mp4
   ```

2. Server neustarten und testen:
   ```bash
   npm run dev
   ```

3. Öffne `http://localhost:5000/video-demo`

## Quick-Checks

**Ist mein Video optimiert?**

```bash
# Frame-Count checken
ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of default=nokey=1:noprint_wrappers=1 Videohero.mp4

# FPS checken
ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate -of default=noprint_wrappers=1:nokey=1 Videohero.mp4
```

**Ziel:**
- Mindestens 600 Frames (bei 60 FPS × 10s)
- Frame rate: 60/1 oder 120/1

## Troubleshooting

**Problem:** Video sieht nach Optimierung verschwommen aus
**Lösung:** CRF-Wert senken (z.B. von 28 auf 23 oder 18)

**Problem:** Datei zu groß
**Lösung:** CRF-Wert erhöhen (z.B. von 23 auf 28) oder Auflösung reduzieren

**Problem:** Optimierung dauert sehr lange
**Lösung:** `-preset fast` statt `-preset slow` verwenden

**Problem:** Video ruckelt immer noch
**Lösung:** Auf 120 FPS erhöhen oder längeres Video verwenden (mehr Frames)

## Empfohlene Online-Tools

Wenn du FFmpeg nicht installieren kannst:

1. **CloudConvert** (https://cloudconvert.com)
   - Video hochladen
   - Ziel: MP4
   - Optionen: 60 FPS, H.264

2. **HandBrake** (https://handbrake.fr)
   - Kostenlose GUI für Video-Konvertierung
   - Frame Rate: 60 FPS (constant)
   - Quality: RF 23

## Apple-Style Reference

Apple verwendet typischerweise:
- 120 FPS Videos
- 15-20 Sekunden Länge
- Professionelle 3D-Animationen
- Sehr hohe Bitrate (20+ Mbps)

Für Web-Projekte ist 60 FPS meist ausreichend und ein guter Kompromiss zwischen Qualität und Dateigröße.
