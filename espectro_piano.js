/**
 * espectro_piano.js (v5 - Corrección Definitiva de Descarga de Partituras y Audio)
 * Copyright (C) 2026 AMLC_70 - Licencia GNU GPLv3
 * Mapeo del Espectro Visible (390 nm - 780 nm) a Escala Hexatónica
 * Renderizado visual y síntesis de audio mediante ABCJS.synth
 */

const SPECTRUM_MAP = [
    { name: 'Rojo',    hueRange: [345, 360], hueAlt: [0, 15],   noteTreble: 'C',  noteBass: 'C,',  chord: '"C+"',  hex: '#dc2626', nm: '622-780 nm' },
    { name: 'Naranja', hueRange: [15, 42],   hueAlt: null,      noteTreble: 'D',  noteBass: 'D,',  chord: '"D7"',  hex: '#ea580c', nm: '597-622 nm' },
    { name: 'Amarillo',hueRange: [42, 70],   hueAlt: null,      noteTreble: 'E',  noteBass: 'E,',  chord: '"E+"',  hex: '#ca8a04', nm: '577-597 nm' },
    { name: 'Verde',   hueRange: [70, 165],  hueAlt: null,      noteTreble: '^F', noteBass: '^F,', chord: '"F#7"', hex: '#16a34a', nm: '492-577 nm' },
    { name: 'Azul',    hueRange: [165, 255], hueAlt: null,      noteTreble: '^G', noteBass: '^G,', chord: '"G#+"', hex: '#2563eb', nm: '455-492 nm' },
    { name: 'Violeta', hueRange: [255, 345], hueAlt: null,      noteTreble: '^A', noteBass: '^A,', chord: '"Bb7"', hex: '#7e22ce', nm: '390-455 nm' }
];

const GENRE_PROFILES = {
    'Clásico':       { meter: '4/4', unit: '1/8', tempo: '110', pattern: 'arpeggio' },
    'Barroco':       { meter: '4/4', unit: '1/16',tempo: '96',  pattern: 'counterpoint' },
    'Romanticismo':  { meter: '3/4', unit: '1/8', tempo: '88',  pattern: 'expressive' },
    'Impresionismo': { meter: '4/4', unit: '1/8', tempo: '80',  pattern: 'whole-tone-wash' },
    'Jazz':          { meter: '4/4', unit: '1/8', tempo: '132', pattern: 'swing' },
    'Blues':         { meter: '12/8',unit: '1/8', tempo: '92',  pattern: 'shuffle' },
    'Ragtime':       { meter: '2/4', unit: '1/16',tempo: '100', pattern: 'stride' },
    'Tango':         { meter: '4/4', unit: '1/8', tempo: '116', pattern: 'marcato' },
    'Vals':          { meter: '3/4', unit: '1/4', tempo: '140', pattern: 'waltz' },
    'Flamenco':      { meter: '3/4', unit: '1/8', tempo: '125', pattern: 'rasgueado' },
    'Bossa Nova':    { meter: '2/4', unit: '1/16',tempo: '115', pattern: 'syncopated' },
    'Salsa':         { meter: '4/4', unit: '1/8', tempo: '165', pattern: 'montuno' },
    'Bolero':        { meter: '4/4', unit: '1/8', tempo: '84',  pattern: 'arpeggio' },
    'Son Cubano':    { meter: '4/4', unit: '1/8', tempo: '135', pattern: 'tumbao' },
    'Merengue':      { meter: '2/4', unit: '1/8', tempo: '150', pattern: 'march' },
    'Cumbia':        { meter: '2/4', unit: '1/8', tempo: '105', pattern: 'binary' },
    'Polka':         { meter: '2/4', unit: '1/8', tempo: '130', pattern: 'stride' },
    'Minueto':       { meter: '3/4', unit: '1/8', tempo: '108', pattern: 'waltz' },
    'Góspel':        { meter: '4/4', unit: '1/8', tempo: '112', pattern: 'chords' },
    'Minimalismo':   { meter: '4/4', unit: '1/8', tempo: '120', pattern: 'ostinato' }
};

let currentAbcString = '';
let loadedImage = null;
let currentSamples = [];
let activeSampleIndex = -1;
let synthControl = null;
let currentVisualObj = null;

// Referencias al DOM
const imageInput = document.getElementById('imageInput');
const imagePreview = document.getElementById('imagePreview');
const musicForm = document.getElementById('musicForm');
const downloadBtn = document.getElementById('downloadBtn');
const downloadScoreBtn = document.getElementById('downloadScoreBtn');
const downloadScorePngBtn = document.getElementById('downloadScorePngBtn');
const downloadWavBtn = document.getElementById('downloadWavBtn');
const visualCanvas = document.getElementById('visualCanvas');
const ctxVisual = visualCanvas.getContext('2d');

// Vista previa de imagen al seleccionar archivo
imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        loadedImage = new Image();
        loadedImage.onload = () => {
            imagePreview.src = event.target.result;
            imagePreview.style.display = 'block';
        };
        loadedImage.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

// Envío del formulario y procesamiento
musicForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!loadedImage) {
        alert('Por favor, selecciona una imagen primero.');
        return;
    }

    const description = document.getElementById('imageDesc').value.trim();
    const genre = document.getElementById('genreSelect').value;

    // 1. Extraer secuencia de colores dominante por bloques de la imagen
    currentSamples = sampleImageSpectrum(loadedImage, 32);
    activeSampleIndex = -1;

    // 2. Dibujar visualización inicial en Canvas
    renderSpectrumVisualization(currentSamples, -1);

    // 3. Construir el archivo ABC para Piano de Cola
    currentAbcString = generateGrandPianoABC(currentSamples, description, genre);

    // 4. Mostrar código y renderizar partitura con abcjs
    document.getElementById('abcOutput').textContent = currentAbcString;
    const renderResults = ABCJS.renderAbc('paper', currentAbcString, {
        responsive: 'resize',
        staffwidth: 850,
        add_classes: true
    });
    
    if (renderResults && renderResults.length > 0) {
        currentVisualObj = renderResults[0];
    }

    // 5. Inicializar Sintetizador de Piano de Cola (WebAudio + SoundFont)
    await initGrandPianoSynthesizer(currentVisualObj);
});

/**
 * Inicializa el motor de audio sintetizado de abcjs con cursor sincronizado
 */
async function initGrandPianoSynthesizer(visualObj) {
    const audioContainer = document.getElementById('audioControls');
    audioContainer.innerHTML = '';

    if (!ABCJS.synth.supportsAudio()) {
        audioContainer.innerHTML = '<span style="color:#ef4444;">Tu navegador no soporta WebAudio API.</span>';
        return;
    }

    const cursorControl = {
        onStart: function() {
            activeSampleIndex = 0;
            renderSpectrumVisualization(currentSamples, activeSampleIndex);
        },
        onEvent: function(ev) {
            document.querySelectorAll('#paper .abcjs-highlight').forEach(el => {
                el.classList.remove('abcjs-highlight');
            });

            if (ev && ev.elements) {
                ev.elements.forEach(group => {
                    group.forEach(el => el.classList.add('abcjs-highlight'));
                });
            }

            activeSampleIndex = (activeSampleIndex + 1) % currentSamples.length;
            renderSpectrumVisualization(currentSamples, activeSampleIndex);
        },
        onFinished: function() {
            document.querySelectorAll('#paper .abcjs-highlight').forEach(el => {
                el.classList.remove('abcjs-highlight');
            });
            activeSampleIndex = -1;
            renderSpectrumVisualization(currentSamples, -1);
        }
    };

    synthControl = new ABCJS.synth.SynthController();
    synthControl.load('#audioControls', cursorControl, {
        displayLoop: true,
        displayRestart: true,
        displayPlay: true,
        displayProgress: true,
        displayWarp: true
    });

    const createSynth = new ABCJS.synth.CreateSynth();
    try {
        await createSynth.init({ visualObj: visualObj });
        await synthControl.setTune(visualObj, false, {
            program: 0,
            chordsOff: false
        });
    } catch (err) {
        console.error('Error iniciando sintetizador:', err);
        audioContainer.innerHTML = `<span style="color:#ef4444;">Error cargando sintetizador de piano: ${err.message}</span>`;
    }
}

// 1. Descargar archivo fuente .abc
downloadBtn.addEventListener('click', () => {
    if (!currentAbcString) {
        alert('Primero debes generar la partitura.');
        return;
    }
    const blob = new Blob([currentAbcString], { type: 'text/plain;charset=utf-8' });
    triggerDownload(blob, 'composicion_espectral_piano.abc');
});

// 2. Descargar Partitura Vectorial en alta calidad (.svg)
downloadScoreBtn.addEventListener('click', () => {
    const svgElement = document.querySelector('#paper svg');
    if (!svgElement) {
        alert('Primero genera la partitura para poder descargarla.');
        return;
    }

    const clonedSvg = svgElement.cloneNode(true);
    clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clonedSvg.style.backgroundColor = '#ffffff';

    const serializer = new XMLSerializer();
    const svgString = '<?xml version="1.0" encoding="UTF-8"?>\n' + serializer.serializeToString(clonedSvg);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    triggerDownload(blob, 'partitura_espectral_piano.svg');
});

// 3. Descargar Partitura rasterizada en imagen (.png) con fondo blanco limpio
downloadScorePngBtn.addEventListener('click', () => {
    const svgElement = document.querySelector('#paper svg');
    if (!svgElement) {
        alert('Primero genera la partitura para poder descargarla.');
        return;
    }

    const clonedSvg = svgElement.cloneNode(true);
    clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clonedSvg.querySelectorAll('.abcjs-highlight').forEach(el => el.classList.remove('abcjs-highlight'));

    const bbox = svgElement.getBoundingClientRect();
    const scale = 2;
    const width = Math.max(bbox.width, 850);
    const height = Math.max(bbox.height, 250);

    clonedSvg.setAttribute('width', width);
    clonedSvg.setAttribute('height', height);

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(clonedSvg);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width * scale;
        canvas.height = height * scale;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0, width, height);

        URL.revokeObjectURL(url);
        canvas.toBlob((pngBlob) => {
            triggerDownload(pngBlob, 'partitura_espectral_piano.png');
        }, 'image/png');
    };
    img.src = url;
});

// 4. Descargar Audio Sintetizado en formato MIDI (.mid)
downloadWavBtn.addEventListener('click', () => {
    if (!currentAbcString) {
        alert('Primero genera la obra musical.');
        return;
    }

    try {
        const midiBuffer = ABCJS.synth.getMidiFile(currentAbcString, { midiOutputType: 'binary' });
        const midiBlob = new Blob([midiBuffer], { type: 'audio/midi' });
        triggerDownload(midiBlob, 'composicion_espectral_piano.mid');
    } catch (e) {
        console.error('Error generando archivo MIDI:', e);
        alert('No se pudo generar el archivo MIDI en este navegador.');
    }
});

function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function sampleImageSpectrum(img, totalSamples) {
    const offCanvas = document.createElement('canvas');
    const cols = 8;
    const rows = Math.ceil(totalSamples / cols);
    offCanvas.width = cols;
    offCanvas.height = rows;

    const ctx = offCanvas.getContext('2d');
    ctx.drawImage(img, 0, 0, cols, rows);
    const imgData = ctx.getImageData(0, 0, cols, rows).data;

    const results = [];
    const counts = { Rojo: 0, Naranja: 0, Amarillo: 0, Verde: 0, Azul: 0, Violeta: 0 };

    for (let i = 0; i < imgData.length; i += 4) {
        const r = imgData[i];
        const g = imgData[i + 1];
        const b = imgData[i + 2];

        const { h, l } = rgbToHsl(r, g, b);
        const band = mapHueToSpectrumBand(h);
        counts[band.name]++;

        const octaveShift = l > 0.65 ? "'" : (l < 0.30 ? "," : "");
        results.push({
            band,
            luminance: l,
            octaveShift,
            rgb: `rgb(${r},${g},${b})`
        });
    }

    const summary = Object.entries(counts)
        .map(([k, v]) => `${k}: ${v}`)
        .join(' | ');
    document.getElementById('statsInfo').textContent = `Distribución espectral (32 muestras): ${summary}`;

    return results;
}

function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h *= 60;
    }
    return { h, s, l };
}

function mapHueToSpectrumBand(hue) {
    for (const band of SPECTRUM_MAP) {
        if (hue >= band.hueRange[0] && hue <= band.hueRange[1]) {
            return band;
        }
        if (band.hueAlt && hue >= band.hueAlt[0] && hue <= band.hueAlt[1]) {
            return band;
        }
    }
    return SPECTRUM_MAP[0];
}

function renderSpectrumVisualization(samples, highlightIdx) {
    const w = visualCanvas.width;
    const h = visualCanvas.height;
    ctxVisual.clearRect(0, 0, w, h);

    const barWidth = w / samples.length;
    samples.forEach((sample, idx) => {
        const bandIndex = SPECTRUM_MAP.findIndex(b => b.name === sample.band.name);
        const isCurrent = idx === highlightIdx;
        const baseHeight = ((bandIndex + 1) / 6) * (h * 0.80);
        const barHeight = isCurrent ? Math.min(h * 0.95, baseHeight + 14) : baseHeight;
        const x = idx * barWidth;
        const y = h - barHeight;

        ctxVisual.fillStyle = isCurrent ? '#ffffff' : sample.band.hex;
        ctxVisual.fillRect(x + 1, y, barWidth - 2, barHeight);

        if (isCurrent) {
            ctxVisual.strokeStyle = sample.band.hex;
            ctxVisual.lineWidth = 2;
            ctxVisual.strokeRect(x, y - 2, barWidth, barHeight + 2);
        }
    });
}

function generateGrandPianoABC(samples, description, genre) {
    const profile = GENRE_PROFILES[genre] || GENRE_PROFILES['Clásico'];
    const cleanTitle = description.replace(/[\r\n]+/g, ' ').substring(0, 60) || 'Composición Espectral';

    let abc = `X:1
T:${cleanTitle}
C:Generador Espectral Hexatónico (${genre}) - AMLC_70
N:Descripción: ${description.replace(/[\r\n]+/g, ' ')}
M:${profile.meter}
L:${profile.unit}
Q:1/4=${profile.tempo}
%%staves {RH LH}
V:RH clef=treble name="Piano (MD)" snm="Pno."
V:LH clef=bass name="Piano (MI)" snm="Pno."
%%MIDI program 1 0
%%MIDI program 2 0
K:C
`;

    let rhMeasures = [];
    let lhMeasures = [];
    const notesPerMeasure = 4;

    for (let i = 0; i < samples.length; i += notesPerMeasure) {
        const chunk = samples.slice(i, i + notesPerMeasure);
        let rhBar = '';
        let lhBar = '';

        chunk.forEach((s, step) => {
            const trebleNote = `${s.band.noteTreble}${s.octaveShift}`;
            const bassNote = s.band.noteBass;

            if (profile.pattern === 'waltz' || profile.pattern === 'minueto') {
                if (step < 3) {
                    rhBar += `${s.band.chord}${trebleNote} `;
                    lhBar += step === 0 ? `${bassNote}2 ` : `[${bassNote}E,] `;
                }
            } else if (profile.pattern === 'montuno' || profile.pattern === 'tumbao' || profile.pattern === 'syncopated') {
                rhBar += step % 2 === 0 ? `${s.band.chord}${trebleNote}2 ` : `${trebleNote}' `;
                lhBar += step === 0 ? `${bassNote}2 ` : `${bassNote},2 `;
            } else if (profile.pattern === 'stride' || profile.pattern === 'march' || profile.pattern === 'binary') {
                rhBar += `${s.band.chord}${trebleNote}2 `;
                lhBar += step % 2 === 0 ? `${bassNote}2 ` : `[${bassNote}G,]2 `;
            } else if (profile.pattern === 'swing' || profile.pattern === 'shuffle') {
                rhBar += `${s.band.chord}${trebleNote}2 ${trebleNote} `;
                lhBar += `${bassNote}3 `;
            } else {
                rhBar += `${s.band.chord}${trebleNote}2 `;
                lhBar += step % 2 === 0 ? `[${bassNote}2E,2] ` : `${bassNote}2 `;
            }
        });

        rhMeasures.push(rhBar.trim());
        lhMeasures.push(lhBar.trim());
    }

    for (let m = 0; m < rhMeasures.length; m += 4) {
        const rhLine = rhMeasures.slice(m, m + 4).join(' | ') + (m + 4 >= rhMeasures.length ? ' |]' : ' |');
        const lhLine = lhMeasures.slice(m, m + 4).join(' | ') + (m + 4 >= rhMeasures.length ? ' |]' : ' |');

        abc += `[V:RH] ${rhLine}\n`;
        abc += `[V:LH] ${lhLine}\n`;
    }

    return abc;
}