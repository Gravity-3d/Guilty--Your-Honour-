/**
 * NOIR PRO KIT v2.5.0
 * The definitive modular toolkit for detective noir gaming experiences.
 * Includes: Physics-based animations, Synthetic Audio, Narrative Processors, and Atmospheric FX.
 */

export const NoirProKit = (() => {

    // ==========================================
    // 1. CONSTANTS & CONFIGURATION
    // ==========================================
    const CONFIG = {
        DEFAULT_TYPE_SPEED: 25,
        PUNCTUATION_PAUSE: 400,
        MAX_SMOKE_PARTICLES: 40,
        AUDIO_SAMPLE_RATE: 44100,
        DEBUG_MODE: false
    };

    // ==========================================
    // 2. THE ANIMATION ENGINE (Ease & Motion)
    // ==========================================
    const Easing = {
        linear: t => t,
        inQuad: t => t * t,
        outQuad: t => t * (2 - t),
        inOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
        inCubic: t => t * t * t,
        outCubic: t => (--t) * t * t + 1,
        inOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
        inQuart: t => t * t * t * t,
        outQuart: t => 1 - (--t) * t * t * t,
        inOutQuart: t => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t,
        inExpo: t => t === 0 ? 0 : Math.pow(2, 10 * (t - 1)),
        outExpo: t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
        inBack: t => { const s = 1.70158; return t * t * ((s + 1) * t - s); },
        outBack: t => { const s = 1.70158; return (--t) * t * ((s + 1) * t + s) + 1; },
        outBounce: t => {
            if (t < (1 / 2.75)) return (7.5625 * t * t);
            if (t < (2 / 2.75)) return (7.5625 * (t -= (1.5 / 2.75)) * t + 0.75);
            if (t < (2.5 / 2.75)) return (7.5625 * (t -= (2.25 / 2.75)) * t + 0.9375);
            return (7.5625 * (t -= (2.625 / 2.75)) * t + 0.984375);
        }
    };

    class Animate {
        static to(target, duration, properties, easing = 'outQuad') {
            const start = performance.now();
            const initialState = {};
            const keys = Object.keys(properties);

            keys.forEach(key => {
                initialState[key] = parseFloat(target.style[key]) || 0;
            });

            return new Promise(resolve => {
                const step = (now) => {
                    const elapsed = now - start;
                    const progress = Math.min(elapsed / duration, 1);
                    const easedProgress = Easing[easing](progress);

                    keys.forEach(key => {
                        const startVal = initialState[key];
                        const endVal = properties[key];
                        const currentVal = startVal + (endVal - startVal) * easedProgress;
                        
                        if (key === 'opacity' || key === 'scale') {
                            target.style[key] = currentVal;
                        } else {
                            target.style[key] = `${currentVal}px`;
                        }
                    });

                    if (progress < 1) {
                        requestAnimationFrame(step);
                    } else {
                        resolve();
                    }
                };
                requestAnimationFrame(step);
            });
        }
    }

    // ==========================================
    // 3. SYNTHETIC NOIR SOUNDSCAPE
    // ==========================================
    const Synth = (() => {
        let ctx = null;

        const init = () => {
            if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
        };

        const createNoiseBuffer = () => {
            const bufferSize = 2 * ctx.sampleRate;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const output = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1;
            }
            return buffer;
        };

        return {
            playTypewriter: () => {
                init();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'square';
                osc.frequency.setValueAtTime(Math.random() * 50 + 100, ctx.currentTime);
                gain.gain.setValueAtTime(0.02, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 0.05);
            },
            playDing: () => {
                init();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(1200, ctx.currentTime);
                gain.gain.setValueAtTime(0.05, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 0.3);
            },
            playSlam: () => {
                init();
                const noise = ctx.createBufferSource();
                const filter = ctx.createBiquadFilter();
                const gain = ctx.createGain();
                noise.buffer = createNoiseBuffer();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(100, ctx.currentTime);
                gain.gain.setValueAtTime(0.5, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
                noise.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);
                noise.start();
            }
        };
    })();

    // ==========================================
    // 4. ATMOSPHERIC FX (Canvas Smoke)
    // ==========================================
    class SmokeParticle {
        constructor(canvas) {
            this.canvas = canvas;
            this.reset();
        }
        reset() {
            this.x = Math.random() * this.canvas.width;
            this.y = this.canvas.height + Math.random() * 100;
            this.vx = Math.random() * 0.5 - 0.25;
            this.vy = -(Math.random() * 0.5 + 0.2);
            this.size = Math.random() * 150 + 50;
            this.alpha = Math.random() * 0.2;
            this.maxAlpha = this.alpha;
        }
        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.alpha -= 0.0002;
            if (this.alpha <= 0 || this.y < -200) this.reset();
        }
        draw(ctx) {
            ctx.beginPath();
            const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);
            grad.addColorStop(0, `rgba(150, 150, 150, ${this.alpha})`);
            grad.addColorStop(1, 'rgba(150, 150, 150, 0)');
            ctx.fillStyle = grad;
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    const FX = {
        initSmoke: (canvasId) => {
            const canvas = document.getElementById(canvasId);
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            let particles = [];
            
            const resize = () => {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
            };
            window.addEventListener('resize', resize);
            resize();

            for (let i = 0; i < CONFIG.MAX_SMOKE_PARTICLES; i++) {
                particles.push(new SmokeParticle(canvas));
            }

            const loop = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                particles.forEach(p => {
                    p.update();
                    p.draw(ctx);
                });
                requestAnimationFrame(loop);
            };
            loop();
        }
    };

    // ==========================================
    // 5. NARRATIVE & TEXT PROCESSOR
    // ==========================================
    const Text = {
        async typewrite(element, text, options = {}) {
            const speed = options.speed || CONFIG.DEFAULT_TYPE_SPEED;
            const onComplete = options.onComplete || (() => {});
            const playSound = options.playSound !== false;

            element.innerHTML = "";
            element.classList.add('typewriter-cursor');

            const characters = text.split("");
            let currentText = "";

            for (let i = 0; i < characters.length; i++) {
                const char = characters[i];
                currentText += char;
                element.textContent = currentText;

                if (playSound && char !== " ") Synth.playTypewriter();

                // Rhythmic pauses for punctuation
                let wait = speed;
                if ([".", "!", "?", ":"].includes(char)) wait += CONFIG.PUNCTUATION_PAUSE;
                if (char === ",") wait += 150;

                await new Promise(r => setTimeout(r, wait));
                
                // Keep scrolled to bottom
                const parent = element.closest('.case-file');
                if (parent) parent.scrollTop = parent.scrollHeight;
            }

            element.classList.remove('typewriter-cursor');
            onComplete();
        },

        formatMarkdown(text) {
            if (!text) return "";
            return text
                .replace(/\*\*(.*?)\*\*/g, '<b style="color:var(--oxblood)">$1</b>')
                .replace(/\*(.*?)\*/g, '<i>$1</i>')
                .replace(/\n/g, '<br>')
                .replace(/# (.*?)(<br>|$)/g, '<h1 style="border-bottom: 2px solid #000; margin: 1rem 0;">$1</h1>')
                .replace(/## (.*?)(<br>|$)/g, '<h2 style="color:var(--oxblood); border-bottom: 1px solid #ccc; margin: 1rem 0;">$1</h2>');
        }
    };

    // ==========================================
    // 6. STATE & PERSISTENCE
    // ==========================================
    const State = {
        _store: {},
        _subscribers: [],

        init(initialData) {
            this._store = { ...initialData };
            this.loadFromDisk();
        },

        set(key, val) {
            this._store[key] = val;
            this.saveToDisk();
            this._notify();
        },

        get(key) {
            return this._store[key];
        },

        subscribe(callback) {
            this._subscribers.push(callback);
        },

        _notify() {
            this._subscribers.forEach(cb => cb(this._store));
        },

        saveToDisk() {
            localStorage.setItem('NOIR_PRO_SAVE', JSON.stringify(this._store));
        },

        loadFromDisk() {
            const data = localStorage.getItem('NOIR_PRO_SAVE');
            if (data) {
                try {
                    this._store = { ...this._store, ...JSON.parse(data) };
                } catch (e) { console.error("Save Corrupted."); }
            }
        },

        clearDisk() {
            localStorage.removeItem('NOIR_PRO_SAVE');
        }
    };

    // ==========================================
    // 7. INPUT & GESTURES
    // ==========================================
    const Input = {
        _shortcuts: {},
        init() {
            window.addEventListener('keydown', (e) => {
                const key = `${e.ctrlKey ? 'CTRL+' : ''}${e.key.toUpperCase()}`;
                if (this._shortcuts[key]) {
                    e.preventDefault();
                    this._shortcuts[key]();
                }
            });
        },
        register(key, callback) {
            this._shortcuts[key.toUpperCase()] = callback;
        }
    };

    // ==========================================
    // 8. LOGGING & DEBUG
    // ==========================================
    const Log = (msg, level = 'info') => {
        const colors = { info: '#c5a028', error: '#ff0000', success: '#1e8449' };
        console.log(`%c[NOIR] %c${msg}`, `color: ${colors[level]}; font-weight: bold;`, 'color: #888');
    };

    return {
        Animate,
        Synth,
        FX,
        Text,
        State,
        Input,
        Log,
        Utils: {
            generateUUID: () => 'xxxx-xxxx-4xxx-yxxx'.replace(/[xy]/g, c => {
                const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            }),
            clamp: (val, min, max) => Math.max(min, Math.min(max, val))
        }
    };
})();

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    NoirProKit.FX.initSmoke('atmosphere-canvas');
    NoirProKit.Input.init();
    NoirProKit.Log("Pro Kit Online. Ready for Investigation.", 'success');
});

