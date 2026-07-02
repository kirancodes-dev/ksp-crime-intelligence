/* ==========================================================================
   Interactive Birthday Card - Upgraded Premium Logic
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    initAmbientParticles();
    initEnvelopeControls();
    initScrollReveal();
    initPolaroids();
    initScratchCard();
    initWheelOfLove();
    initWishSky();
});

/* ==========================================================================
   1. Ambient Particles, Heart Bursts, Rose Petals & Sound Ripples
   ========================================================================== */
function initAmbientParticles() {
    const container = document.getElementById('ambient-particles');
    if (!container) return;

    // Create continuous floating background particles
    const particleCount = 25;
    for (let i = 0; i < particleCount; i++) {
        createAmbientParticle(container);
    }

    // Create falling rose petals
    const petalCount = 15;
    for (let i = 0; i < petalCount; i++) {
        createRosePetal(container);
    }

    // Spawn hearts on document clicks
    document.addEventListener('click', (e) => {
        // Don't spawn heart bursts inside the canvas elements or audio controls to avoid cluttering interactions
        if (e.target.tagName === 'CANVAS' || e.target.closest('.audio-control-container') || e.target.closest('#wax-seal')) {
            return;
        }
        createHeartBurst(e.clientX, e.clientY);
    });
}

function createAmbientParticle(container) {
    const particle = document.createElement('div');
    particle.classList.add('particle');
    
    // Randomize properties
    const size = Math.random() * 8 + 4;
    const startX = Math.random() * 100;
    const delay = Math.random() * 15;
    const duration = Math.random() * 10 + 10;
    
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.left = `${startX}%`;
    particle.style.animationDelay = `${delay}s`;
    particle.style.animationDuration = `${duration}s`;
    
    // Randomize background color slightly (rose gold vs soft pink)
    const colorType = Math.random();
    if (colorType < 0.3) {
        particle.style.background = 'radial-gradient(circle, rgba(223,184,120,0.6) 0%, rgba(223,184,120,0) 70%)'; // Gold
    } else if (colorType < 0.6) {
        particle.style.background = 'radial-gradient(circle, rgba(211,104,127,0.6) 0%, rgba(211,104,127,0) 70%)'; // Rose
    }
    
    container.appendChild(particle);

    // Recycle particle after animation ends
    particle.addEventListener('animationiteration', () => {
        particle.style.left = `${Math.random() * 100}%`;
    });
}

function createRosePetal(container) {
    const petal = document.createElement('div');
    petal.classList.add('petal');
    
    // Randomize dimensions and timings
    const sizeWidth = Math.random() * 15 + 10;
    const sizeHeight = sizeWidth * (1.2 + Math.random() * 0.3);
    const startX = Math.random() * 100;
    const delay = Math.random() * 12;
    const duration = Math.random() * 8 + 8;
    
    petal.style.width = `${sizeWidth}px`;
    petal.style.height = `${sizeHeight}px`;
    petal.style.left = `${startX}%`;
    petal.style.animationDelay = `${delay}s`;
    petal.style.animationDuration = `${duration}s`;
    
    container.appendChild(petal);

    // Recycle petal after animation ends
    petal.addEventListener('animationiteration', () => {
        petal.style.left = `${Math.random() * 100}%`;
    });
}

function createHeartBurst(x, y) {
    const burstCount = 6;
    for (let i = 0; i < burstCount; i++) {
        const heart = document.createElement('div');
        heart.innerHTML = '❤️';
        heart.style.position = 'fixed';
        heart.style.left = `${x}px`;
        heart.style.top = `${y}px`;
        heart.style.fontSize = `${Math.random() * 14 + 10}px`;
        heart.style.pointerEvents = 'none';
        heart.style.zIndex = '9999';
        heart.style.opacity = '1';
        heart.style.transition = 'transform 1s cubic-bezier(0.1, 0.8, 0.3, 1), opacity 1s ease';
        
        // Random trajectory
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 80 + 30;
        const tx = Math.cos(angle) * distance;
        const ty = Math.sin(angle) * distance - 40; // upward bias
        
        document.body.appendChild(heart);
        
        // Trigger reflow to start transition
        heart.getBoundingClientRect();
        
        heart.style.transform = `translate(${tx}px, ${ty}px) scale(0.5) rotate(${Math.random() * 360}deg)`;
        heart.style.opacity = '0';
        
        setTimeout(() => {
            heart.remove();
        }, 1000);
    }
}

// Spawns expanding ripples in the background when chime notes play
function createSoundRipple(x, y) {
    const ripple = document.createElement('div');
    ripple.classList.add('sound-ripple');
    
    // Default position: around the music toggle button
    if (x === undefined || y === undefined) {
        const btn = document.getElementById('music-toggle-btn');
        if (btn) {
            const rect = btn.getBoundingClientRect();
            x = rect.left + rect.width / 2;
            y = rect.top + rect.height / 2;
        } else {
            x = window.innerWidth / 2;
            y = window.innerHeight / 2;
        }
    }
    
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    
    document.body.appendChild(ripple);
    
    // Trigger reflow
    ripple.getBoundingClientRect();
    
    // Expand and fade out
    ripple.style.transform = 'translate(-50%, -50%) scale(8)';
    ripple.style.opacity = '0';
    
    setTimeout(() => {
        ripple.remove();
    }, 1200);
}

/* ==========================================================================
   2. Web Audio API Wind-Chime Melody Synthesizer
   ========================================================================== */
class MusicBox {
    constructor() {
        this.ctx = null;
        this.isPlaying = false;
        this.schedulerTimer = null;
        this.currentNoteIndex = 0;
        this.tempo = 650; // time in ms between notes
        
        // Chord progressions (Pentatonic voicings to ensure harmony)
        this.chords = [
            // Cmaj7 (C4, E4, G4, B4, C5, E5, G5, B5)
            [261.63, 329.63, 392.00, 493.88, 523.25, 659.25, 783.99, 987.77],
            // Am7 (A3, C4, E4, G4, A4, C5, E5, G5)
            [220.00, 261.63, 329.63, 392.00, 440.00, 523.25, 659.25, 783.99],
            // Fmaj7 (F3, A3, C4, E4, F4, A4, C5, E5)
            [174.61, 220.00, 261.63, 329.63, 349.23, 440.00, 523.25, 659.25],
            // G7 (G3, B3, D4, F4, G4, B4, D5, F5)
            [196.00, 246.94, 293.66, 349.23, 392.00, 493.88, 587.33, 698.46]
        ];
        
        this.currentChordIndex = 0;
        this.chordTick = 0;
    }

    init() {
        if (this.ctx) return;
        
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
        
        // Master delay/echo effect chain
        this.delay = this.ctx.createDelay(1.0);
        this.delayFeedback = this.ctx.createGain();
        this.delayGain = this.ctx.createGain();
        
        this.delay.delayTime.value = 0.45; // delay time
        this.delayFeedback.gain.value = 0.45; // echo repeat depth
        this.delayGain.gain.value = 0.3; // volume of echo
        
        // Connect loop
        this.delay.connect(this.delayFeedback);
        this.delayFeedback.connect(this.delay);
        
        this.delay.connect(this.delayGain);
        this.delayGain.connect(this.ctx.destination);
    }

    start() {
        this.init();
        if (this.isPlaying) return;
        
        this.isPlaying = true;
        this.currentNoteIndex = 0;
        this.currentChordIndex = 0;
        this.chordTick = 0;
        
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        
        this.scheduleNextNote();
    }

    stop() {
        this.isPlaying = false;
        clearTimeout(this.schedulerTimer);
    }

    scheduleNextNote() {
        if (!this.isPlaying) return;
        
        if (this.chordTick >= 16) {
            this.currentChordIndex = (this.currentChordIndex + 1) % this.chords.length;
            this.chordTick = 0;
        }

        const chordNotes = this.chords[this.currentChordIndex];
        
        let freq;
        if (Math.random() < 0.2) {
            freq = null; // rests
        } else {
            // Select higher range notes for music box chimes
            const index = Math.floor(Math.random() * (chordNotes.length - 2)) + 2; 
            freq = chordNotes[index];
        }

        if (freq) {
            this.playChime(freq);
        }

        this.chordTick++;
        
        this.schedulerTimer = setTimeout(() => {
            this.scheduleNextNote();
        }, this.tempo + (Math.random() * 100 - 50));
    }

    playChime(freq) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        
        const now = this.ctx.currentTime;
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.22, now + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
        
        osc.connect(gainNode);
        gainNode.connect(this.ctx.destination);
        gainNode.connect(this.delay);
        
        osc.start(now);
        osc.stop(now + 2.6);

        // Spawn a background sound wave ripple in sync with this chime
        createSoundRipple();
    }
}

const musicBox = new MusicBox();

// Configure the music button handler
const musicToggleBtn = document.getElementById('music-toggle-btn');
if (musicToggleBtn) {
    musicToggleBtn.addEventListener('click', () => {
        if (musicBox.isPlaying) {
            musicBox.stop();
            musicToggleBtn.classList.remove('playing');
            musicToggleBtn.querySelector('.btn-text').textContent = 'Play Melody';
        } else {
            musicBox.start();
            musicToggleBtn.classList.add('playing');
            musicToggleBtn.querySelector('.btn-text').textContent = 'Mute Melody';
        }
    });
}

/* ==========================================================================
   3. Wax Seal & Envelope Interactions
   ========================================================================== */
function initEnvelopeControls() {
    const envelope = document.getElementById('main-envelope');
    const seal = document.getElementById('wax-seal');
    const welcomeScreen = document.getElementById('welcome-screen');
    const mainContent = document.getElementById('main-content');

    if (!seal || !envelope) return;

    seal.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // Start music on click
        musicBox.start();
        if (musicToggleBtn) {
            musicToggleBtn.classList.add('playing');
            musicToggleBtn.querySelector('.btn-text').textContent = 'Mute Melody';
        }
        
        envelope.classList.add('opened-flap');
        
        setTimeout(() => {
            welcomeScreen.classList.add('opened');
            mainContent.classList.remove('hidden');
            
            // Trigger typewriter letter
            setTimeout(() => {
                startTypewriter();
            }, 800);
            
        }, 1800);
    });
}

/* ==========================================================================
   4. Letter Typewriter Effect
   ========================================================================== */
const birthdayLetterText = `To My Dearest,

From the very moment you walked into my life, everything changed. You brought warmth to my coldest days, laughter to my quietest moments, and a love deeper than I ever thought possible.

Today is all about celebrating the incredible person you are. You inspire me with your kindness, amaze me with your strength, and fill my heart with absolute joy.

I am so grateful for every laugh we've shared, every dream we've whispered, and every memory we've built together. As you blow out your candles today, know that my biggest wish has already come true: having you by my side.

May this year bring you all the happiness, success, and magic you so deeply deserve.

Happy Birthday, my love. Here's to us, and to many more beautiful chapters together.`;

function startTypewriter() {
    const textContainer = document.getElementById('typewriter-text');
    const scrollPrompt = document.getElementById('scroll-prompt');
    if (!textContainer) return;

    let index = 0;
    textContainer.textContent = '';

    function type() {
        if (index < birthdayLetterText.length) {
            textContainer.textContent += birthdayLetterText.charAt(index);
            index++;
            const speed = birthdayLetterText.charAt(index - 1) === '.' || birthdayLetterText.charAt(index - 1) === ',' ? 350 : 35 + Math.random() * 25;
            setTimeout(type, speed);
        } else {
            if (scrollPrompt) {
                scrollPrompt.classList.add('visible');
            }
        }
    }

    type();
}

/* ==========================================================================
   5. Scroll-driven Reveals (Intersection Observer)
   ========================================================================== */
function initScrollReveal() {
    const items = document.querySelectorAll('.timeline-event, .polaroid-wrapper, .wheel-card');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px'
    });

    items.forEach(item => {
        observer.observe(item);
    });
}

/* ==========================================================================
   6. Polaroid Gallery Interactions
   ========================================================================== */
function initPolaroids() {
    const polaroids = document.querySelectorAll('.polaroid');
    polaroids.forEach(card => {
        card.addEventListener('click', () => {
            card.classList.toggle('flipped');
            if (musicBox.isPlaying) {
                musicBox.playChime(880.00); // A5 note chime
            }
        });
    });
}

/* ==========================================================================
   7. HTML Canvas Scratch Card
   ========================================================================== */
function initScratchCard() {
    const canvas = document.getElementById('scratch-canvas');
    const container = document.querySelector('.scratch-card-container');
    const instructionText = document.getElementById('scratch-instructions');
    
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    let isDrawing = false;
    let isRevealed = false;

    function resizeCanvas() {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        drawOverlay();
    }

    function drawOverlay() {
        const w = canvas.width;
        const h = canvas.height;

        ctx.clearRect(0, 0, w, h);
        
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, '#cca2a8');
        grad.addColorStop(0.3, '#f7cad0');
        grad.addColorStop(0.5, '#dfb878');
        grad.addColorStop(0.7, '#f7cad0');
        grad.addColorStop(1, '#cca2a8');
        
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        for (let i = 0; i < 2000; i++) {
            const x = Math.random() * w;
            const y = Math.random() * h;
            const r = Math.random() * 1.5;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 2;
        drawHeart(ctx, w / 2, h / 2 - 10, 60);

        ctx.fillStyle = '#4a2f3a';
        ctx.font = "italic bold 15px 'Playfair Display', Georgia, serif";
        ctx.textAlign = 'center';
        ctx.fillText('Scratch Here ❤️', w / 2, h / 2 + 65);
    }

    function drawHeart(ctx, x, y, size) {
        ctx.beginPath();
        ctx.moveTo(x, y + size / 4);
        ctx.quadraticCurveTo(x, y, x - size / 2, y);
        ctx.quadraticCurveTo(x - size, y, x - size, y + size / 2);
        ctx.quadraticCurveTo(x - size, y + (size * 3) / 4, x, y + size * 1.1);
        ctx.quadraticCurveTo(x + size, y + (size * 3) / 4, x + size, y + size / 2);
        ctx.quadraticCurveTo(x + size, y, x + size / 2, y);
        ctx.quadraticCurveTo(x, y, x, y + size / 4);
        ctx.stroke();
    }

    function getMousePos(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }

    function scratch(e) {
        if (!isDrawing || isRevealed) return;
        e.preventDefault();

        const pos = getMousePos(e);
        
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 25, 0, Math.PI * 2);
        ctx.fill();

        checkScratchPercentage();
    }

    let checkTimeout = null;
    function checkScratchPercentage() {
        if (checkTimeout || isRevealed) return;
        
        checkTimeout = setTimeout(() => {
            checkTimeout = null;
            
            const w = canvas.width;
            const h = canvas.height;
            const imgData = ctx.getImageData(0, 0, w, h);
            const data = imgData.data;
            
            let transparentPixels = 0;
            for (let i = 3; i < data.length; i += 16) {
                if (data[i] === 0) {
                    transparentPixels++;
                }
            }
            
            const checkedTotal = data.length / 16;
            const percent = (transparentPixels / checkedTotal) * 100;
            
            if (percent > 45) {
                revealCoupon();
            } else {
                instructionText.textContent = `Scratched: ${Math.round(percent)}% / 50%`;
            }
        }, 100);
    }

    function revealCoupon() {
        isRevealed = true;
        canvas.classList.add('fade-out');
        instructionText.textContent = "Coupon Unlocked! Enjoy your day! 🎉";
        
        const rect = canvas.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        createHeartBurst(centerX - 50, centerY);
        createHeartBurst(centerX + 50, centerY);
        
        if (musicBox.isPlaying) {
            musicBox.playChime(523.25); // C5
            setTimeout(() => musicBox.playChime(659.25), 100); // E5
            setTimeout(() => musicBox.playChime(783.99), 200); // G5
            setTimeout(() => musicBox.playChime(1046.50), 300); // C6
        }
    }

    canvas.addEventListener('mousedown', (e) => { isDrawing = true; scratch(e); });
    window.addEventListener('mouseup', () => isDrawing = false);
    canvas.addEventListener('mousemove', scratch);
    canvas.addEventListener('touchstart', (e) => { isDrawing = true; scratch(e); });
    window.addEventListener('touchend', () => isDrawing = false);
    canvas.addEventListener('touchmove', scratch);

    setTimeout(resizeCanvas, 500);
    window.addEventListener('resize', resizeCanvas);
}

/* ==========================================================================
   8. Upgraded Glowing "Wheel of Love" (Roulette)
   ========================================================================== */
function initWheelOfLove() {
    const canvas = document.getElementById('wheel-canvas');
    const spinBtn = document.getElementById('spin-btn');
    const resultText = document.getElementById('wheel-result');
    const pointerPin = document.querySelector('.wheel-pointer-pin');
    
    if (!canvas || !spinBtn || !resultText) return;
    
    const ctx = canvas.getContext('2d');
    
    const gifts = [
        "A Romantic Dinner 🍽️",
        "A Cozy Movie Night 🍿",
        "A Giant Warm Hug 🤗",
        "A Weekend Getaway 🚗",
        "A Surprise Gift 🎁",
        "Relaxing Massage 💆‍♀️",
        "Breakfast in Bed 🥞",
        "Endless Kisses 💋"
    ];
    
    const colors = [
        "#b85c7c", // Burgundy Red
        "#e0a96d", // Warm Rose Gold
        "#d3687f", // Elegant Rose
        "#dfb878", // Champagne Gold
        "#b85c7c",
        "#e0a96d",
        "#d3687f",
        "#dfb878"
    ];
    
    let currentRotation = 0;
    let isSpinning = false;

    function drawWheel() {
        const w = canvas.width = 360;
        const h = canvas.height = 360;
        const cx = w / 2;
        const cy = h / 2;
        const r = w / 2 - 12;
        const sliceAngle = (Math.PI * 2) / gifts.length;
        
        ctx.clearRect(0, 0, w, h);
        
        // Draw outer glowing gold ring border
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#dfb878';
        ctx.strokeStyle = '#dfb878';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        
        // Draw segments
        for (let i = 0; i < gifts.length; i++) {
            const angle = i * sliceAngle;
            ctx.fillStyle = colors[i];
            
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, r - 4, angle, angle + sliceAngle);
            ctx.closePath();
            ctx.fill();
            
            // Draw segment gold dividers
            ctx.strokeStyle = 'rgba(223, 184, 120, 0.4)';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Draw segment text
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(angle + sliceAngle / 2);
            
            // Format typography
            ctx.fillStyle = '#f3f3f5';
            ctx.font = "bold 13px 'Inter', sans-serif";
            ctx.textAlign = 'right';
            ctx.shadowBlur = 4;
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            
            // Draw short version of text to fit slices
            const text = gifts[i];
            ctx.fillText(text, r - 25, 5);
            ctx.restore();
        }
        
        // Draw center gold glowing core
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#dfb878';
        ctx.fillStyle = '#faf6f0';
        ctx.strokeStyle = '#dfb878';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(cx, cy, 25, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Draw a heart in center core
        ctx.fillStyle = '#d3687f';
        ctx.font = '16px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('❤️', cx, cy + 1);
        ctx.restore();
    }

    // Spin mechanism
    spinBtn.addEventListener('click', () => {
        if (isSpinning) return;
        isSpinning = true;
        
        resultText.textContent = "Spinning the Wheel of Love...";
        resultText.classList.remove('winner');
        pointerPin.classList.add('wiggling');
        
        // Random spin: 5 full rotations + random slice
        const rotations = 5 + Math.floor(Math.random() * 4);
        const randomSliceIndex = Math.floor(Math.random() * gifts.length);
        const sliceAngleDeg = 360 / gifts.length;
        
        // Compute ending angle
        // Subtract target slice to align it with top pointer (270 degrees on canvas)
        // 0 segment starts at 3 o'clock (0 rad). The pointer is at 12 o'clock (270 degrees).
        // Target angle is calculated so slice center aligns with top pointer.
        const targetAngleDeg = 360 - (randomSliceIndex * sliceAngleDeg) - (sliceAngleDeg / 2) + 270;
        const totalSpinDeg = (rotations * 360) + targetAngleDeg;
        
        currentRotation += totalSpinDeg;
        
        // Apply rotation to CSS on GPU
        canvas.style.transform = `rotate(${currentRotation}deg)`;
        
        // Synthesize ticking chime sound effect as it rotates
        let lastTickSegment = 0;
        const tickInterval = setInterval(() => {
            if (!isSpinning) {
                clearInterval(tickInterval);
                return;
            }
            // Simple tick chime estimation based on rotation speed
            if (musicBox.isPlaying && Math.random() < 0.3) {
                musicBox.playChime(783.99); // high tick G5
            }
        }, 120);

        setTimeout(() => {
            clearInterval(tickInterval);
            isSpinning = false;
            pointerPin.classList.remove('wiggling');
            
            // Highlight result
            const prize = gifts[randomSliceIndex];
            resultText.textContent = `You won: ${prize} 🎉`;
            resultText.classList.add('winner');
            
            // Play sweet winner chime sweep
            if (musicBox.isPlaying) {
                musicBox.playChime(659.25); // E5
                setTimeout(() => musicBox.playChime(880.00), 120); // A5
                setTimeout(() => musicBox.playChime(1046.50), 240); // C6
            }
            
            // Confetti burst
            const rect = canvas.getBoundingClientRect();
            createHeartBurst(rect.left + rect.width / 2, rect.top + rect.height / 2);
            
        }, 4500); // match transition speed
    });
    
    // Initial draw
    setTimeout(drawWheel, 500);
}

/* ==========================================================================
   9. Interactive Star Sky & Heart Constellation Upgrade
   ========================================================================== */
function initWishSky() {
    const canvas = document.getElementById('sky-canvas');
    const overlay = document.getElementById('sky-instruction-overlay');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let stars = [];
    let shootingStars = [];
    let clicks = 0;
    let constellationActive = false;
    let constellationProgress = 0; // Tracing animation progress (0 to 1)

    const maxWishes = [
        "May you always smile as brightly as you do today. 😊",
        "I wish you infinite moments of wonder and joy. ✨",
        "May all your secret dreams find wings to fly. 🕊️",
        "I wish for a future filled with endless adventures together. 🗺️",
        "May success and happiness follow you in everything you do. 🌟",
        "I wish for your heart to always feel warm and loved. ❤️",
        "May we share a hundred more birthdays hand in hand. 🤝",
        "I wish you good health and endless giggles. 🌸",
        "May today be the start of your happiest year yet! 🎂"
    ];
    let wishIndex = 0;

    // Heart Constellation Coordinates (relative to canvas scale: 0-1 range)
    const heartPattern = [
        { x: 0.5, y: 0.25 }, // Top notch
        { x: 0.6, y: 0.18 },
        { x: 0.7, y: 0.18 },
        { x: 0.78, y: 0.25 },
        { x: 0.8, y: 0.36 },
        { x: 0.74, y: 0.5 },
        { x: 0.64, y: 0.64 },
        { x: 0.5, y: 0.78 }, // Bottom point
        { x: 0.36, y: 0.64 },
        { x: 0.26, y: 0.5 },
        { x: 0.2, y: 0.36 },
        { x: 0.22, y: 0.25 },
        { x: 0.3, y: 0.18 },
        { x: 0.4, y: 0.18 },
        { x: 0.5, y: 0.25 }  // Back to top
    ];

    function resizeSky() {
        const rect = canvas.parentNode.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        drawSkyBackground();
    }

    function drawSkyBackground() {
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        
        const grad = ctx.createRadialGradient(w/2, h/2, 10, w/2, h/2, Math.max(w, h));
        grad.addColorStop(0, '#0c0721');
        grad.addColorStop(1, '#030208');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
    }

    // Shooting Star Class
    class ShootingStar {
        constructor() {
            this.reset();
        }
        reset() {
            this.x = Math.random() * canvas.width * 0.7;
            this.y = Math.random() * canvas.height * 0.4;
            this.len = Math.random() * 80 + 50;
            this.speed = Math.random() * 4 + 3;
            this.dx = this.speed * 2; // diagonal direction
            this.dy = this.speed;
            this.alpha = 1;
            this.decay = Math.random() * 0.02 + 0.01;
            this.active = true;
        }
        update() {
            this.x += this.dx;
            this.y += this.dy;
            this.alpha -= this.decay;
            if (this.alpha <= 0) {
                this.active = false;
            }
        }
        draw() {
            ctx.save();
            ctx.strokeStyle = `rgba(255, 255, 255, ${this.alpha})`;
            ctx.lineWidth = 1.5;
            ctx.shadowBlur = 8;
            ctx.shadowColor = '#fff';
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x - this.dx * 1.5, this.y - this.dy * 1.5);
            ctx.stroke();
            ctx.restore();
        }
    }

    // Interactive Star Class
    class Star {
        constructor(x, y, wishText) {
            this.x = x;
            this.y = y;
            this.wishText = wishText;
            this.baseSize = Math.random() * 2.5 + 2;
            this.size = this.baseSize;
            this.glow = 10;
            this.alpha = 0;
            this.targetAlpha = 1;
            this.twinkleSpeed = Math.random() * 0.03 + 0.01;
            this.phase = Math.random() * Math.PI;
            this.textAlpha = 0;
            this.textTimer = 220; 
        }

        update() {
            if (this.alpha < this.targetAlpha) {
                this.alpha += 0.05;
            }
            this.phase += this.twinkleSpeed;
            this.size = this.baseSize + Math.sin(this.phase) * 1;
            
            if (this.textTimer > 180) {
                this.textAlpha = (220 - this.textTimer) / 40;
            } else if (this.textTimer < 40) {
                this.textAlpha = this.textTimer / 40;
            } else {
                this.textAlpha = 1;
            }

            if (this.textTimer > 0) {
                this.textTimer--;
            }
        }

        draw() {
            ctx.save();
            ctx.shadowBlur = this.glow * this.alpha;
            ctx.shadowColor = '#dfb878';
            ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha * (0.7 + Math.sin(this.phase) * 0.3)})`;
            
            ctx.beginPath();
            ctx.moveTo(this.x, this.y - this.size * 2);
            ctx.lineTo(this.x + this.size / 2, this.y - this.size / 2);
            ctx.lineTo(this.x + this.size * 2, this.y);
            ctx.lineTo(this.x + this.size / 2, this.y + this.size / 2);
            ctx.moveTo(this.x, this.y + this.size * 2);
            ctx.lineTo(this.x - this.size / 2, this.y + this.size / 2);
            ctx.lineTo(this.x - this.size * 2, this.y);
            ctx.lineTo(this.x - this.size / 2, this.y - this.size / 2);
            ctx.closePath();
            ctx.fill();
            
            if (this.textAlpha > 0.01 && this.wishText) {
                ctx.shadowBlur = 4;
                ctx.shadowColor = 'black';
                ctx.font = "300 13px 'Inter', sans-serif";
                ctx.fillStyle = `rgba(223, 184, 120, ${this.textAlpha})`;
                ctx.textAlign = this.x > canvas.width - 200 ? 'right' : 'left';
                const textX = this.x > canvas.width - 200 ? this.x - 20 : this.x + 20;
                ctx.fillText(this.wishText, textX, this.y + 4);
            }
            
            ctx.restore();
        }
    }

    let bgStars = [];
    function initBgStars() {
        bgStars = [];
        const count = 70;
        for (let i = 0; i < count; i++) {
            bgStars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 1.2 + 0.3,
                opacity: Math.random() * 0.5 + 0.3,
                phase: Math.random() * Math.PI,
                speed: Math.random() * 0.02 + 0.005
            });
        }
    }

    function drawBgStars() {
        bgStars.forEach(s => {
            s.phase += s.speed;
            const op = s.opacity + Math.sin(s.phase) * 0.2;
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.1, Math.min(1, op))})`;
            ctx.fillRect(s.x, s.y, s.size, s.size);
        });
    }

    // Triggers the Heart Constellation
    function triggerHeartConstellation() {
        constellationActive = true;
        stars = []; // clear existing stars
        
        // Spawn 15 stars mapping to the heart outline
        heartPattern.forEach((pt, i) => {
            setTimeout(() => {
                // scale point to current canvas size
                const x = pt.x * canvas.width;
                const y = pt.y * canvas.height;
                const star = new Star(x, y, "");
                star.baseSize = 4; // larger constellation stars
                star.glow = 15;
                stars.push(star);
                
                // Play chord notes sequentially
                if (musicBox.isPlaying) {
                    const freqs = [523.25, 587.33, 659.25, 783.99, 880.00, 987.77, 1046.50, 1174.66, 1318.51];
                    musicBox.playChime(freqs[i % freqs.length]);
                }
            }, i * 200);
        });

        // Trigger tracing animation
        setTimeout(() => {
            animateConstellationLines();
        }, heartPattern.length * 200 + 100);
    }

    function animateConstellationLines() {
        let startTime = null;
        const duration = 2500; // 2.5 seconds to trace
        
        function trace(timestamp) {
            if (!startTime) startTime = timestamp;
            const progress = (timestamp - startTime) / duration;
            constellationProgress = Math.min(progress, 1);
            
            if (constellationProgress < 1) {
                requestAnimationFrame(trace);
            }
        }
        requestAnimationFrame(trace);
    }

    function drawConstellationLines() {
        if (stars.length < 2) return;
        
        ctx.save();
        ctx.strokeStyle = 'rgba(223, 184, 120, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#dfb878';
        
        const totalLines = stars.length - 1;
        const linesToDraw = totalLines * constellationProgress;
        
        ctx.beginPath();
        ctx.moveTo(stars[0].x, stars[0].y);
        
        for (let i = 0; i < linesToDraw; i++) {
            const star = stars[i + 1];
            if (star) {
                ctx.lineTo(star.x, star.y);
            }
        }
        ctx.stroke();
        ctx.restore();
        
        // Draw the central glowing birthday greeting if constellation trace completes
        if (constellationProgress >= 0.95) {
            ctx.save();
            ctx.textAlign = 'center';
            ctx.shadowBlur = 8;
            ctx.shadowColor = 'rgba(247, 202, 208, 0.6)';
            
            // "HAPPY BIRTHDAY" heading
            ctx.fillStyle = '#f7cad0';
            ctx.font = "italic 400 24px 'Playfair Display', Georgia, serif";
            ctx.fillText("HAPPY BIRTHDAY", canvas.width / 2, canvas.height * 0.43);
            
            // Cursive "I Love You" subtitle
            ctx.fillStyle = '#dfb878';
            ctx.font = "bold 34px 'Dancing Script', cursive";
            ctx.fillText("I Love You! ❤️", canvas.width / 2, canvas.height * 0.52);
            ctx.restore();
        }
    }

    // Animation Loop
    function animateSky() {
        drawSkyBackground();
        drawBgStars();
        
        // Process shooting stars
        if (Math.random() < 0.003 && shootingStars.length < 2) {
            shootingStars.push(new ShootingStar());
        }
        shootingStars = shootingStars.filter(s => s.active);
        shootingStars.forEach(s => {
            s.update();
            s.draw();
        });
        
        // Draw lines if constellation is active
        if (constellationActive) {
            drawConstellationLines();
        }
        
        // Draw and update interactive stars
        stars.forEach((star) => {
            star.update();
            star.draw();
        });
        
        requestAnimationFrame(animateSky);
    }

    canvas.addEventListener('click', (e) => {
        if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 800);
        }

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        clicks++;
        
        // If clicks reach 6, trigger the heart constellation!
        if (clicks === 6 && !constellationActive) {
            triggerHeartConstellation();
            return;
        }
        
        if (constellationActive) return; // ignore clicks once constellation active
        
        const wish = maxWishes[wishIndex];
        wishIndex = (wishIndex + 1) % maxWishes.length;
        
        const newStar = new Star(x, y, wish);
        stars.push(newStar);
        
        if (stars.length > 12) {
            stars.shift();
        }
        
        if (musicBox.isPlaying) {
            const notes = [523.25, 587.33, 659.25, 783.99, 880.00, 987.77, 1046.50];
            const randomNote = notes[Math.floor(Math.random() * notes.length)];
            musicBox.playChime(randomNote);
        }
    });

    setTimeout(() => {
        resizeSky();
        initBgStars();
        animateSky();
    }, 500);

    window.addEventListener('resize', () => {
        resizeSky();
        initBgStars();
    });
}
