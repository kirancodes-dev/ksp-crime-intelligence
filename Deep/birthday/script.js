/* ========================================================
   🎂 BIRTHDAY WISHES — ULTRA INTERACTIVE SCRIPT
   ======================================================== */

// ===================== CONFIG =====================
const TOTAL_PHOTOS = 30;
const PHOTO_FOLDER = 'photos';
// Supported extensions — JS will try .jpg first, then .jpeg, .png, .webp
const PHOTO_EXT = '.jpg';

// Captions for photos (customize these!)
const photoCaptions = [
    'Us 💕', 'Beautiful you ✨', 'My favorite moment 💖',
    'Together forever 🌹', 'Your smile 😊', 'Pure love 💗',
    'Adventure time 🌍', 'My world 🌎', 'Precious 💎',
    'Golden moments ✨', 'My heart 💝', 'Our story 📖',
    'Magic ✨', 'Perfect day ☀️', 'Love of my life 💕',
    'Unforgettable 🌟', 'My everything 💖', 'Dream team 🤝',
    'Blessed 🙏', 'Happy us 😄', 'Soulmates 💫',
    'Best day ever 🎉', 'My queen 👑', 'Always 💗',
    'Cherished 🌸', 'Joy 😊', 'My person 💜',
    'Love wins 🏆', 'Forever yours 💍', 'My love 💖'
];

// ===================== STATE =====================
let currentSlide = 0;
const totalSlides = 10;
let isAnimating = false;
let touchStartX = 0;
let musicPlaying = false;
let audioCtx = null;
let lightboxIndex = 0;

// ===================== DOM =====================
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const sliderWrapper = $('#sliderWrapper');
const navDots = $$('.dot');
const prevBtn = $('#prevBtn');
const nextBtn = $('#nextBtn');
const preloader = $('#preloader');
const preloaderBar = $('#preloaderBar');
const progressFill = $('#progressFill');
const slideCounter = $('.current-num');
const musicToggle = $('#musicToggle');

// ===================== PRELOADER =====================
let loadProgress = 0;
const loadInterval = setInterval(() => {
    loadProgress += Math.random() * 15 + 5;
    if (loadProgress >= 100) {
        loadProgress = 100;
        clearInterval(loadInterval);
        setTimeout(() => {
            preloader.classList.add('hidden');
            triggerSlideAnimations(0);
            createSparkleField();
        }, 600);
    }
    preloaderBar.style.width = loadProgress + '%';
}, 200);

// ===================== PHOTO LOADING =====================
function getPhotoPath(num) {
    return `${PHOTO_FOLDER}/${num}${PHOTO_EXT}`;
}

// Populate filmstrip (row 1: photos 1-15, row 2: photos 16-30)
function populateFilmstrip() {
    const track1 = $('#filmstripTrack');
    const track2 = $('#filmstripTrack2');
    if (!track1 || !track2) return;

    // Row 1: photos 1-15, duplicated for infinite scroll
    const row1Photos = [];
    for (let i = 1; i <= 15; i++) row1Photos.push(i);

    const tilts = [-3, 2, -1, 3, -2, 1, -3, 2, -1, 3, -2, 1, -3, 2, -1];

    // Create cards twice for seamless loop
    for (let copy = 0; copy < 2; copy++) {
        row1Photos.forEach((num, idx) => {
            track1.appendChild(createFilmstripCard(num, tilts[idx]));
        });
    }

    // Row 2: photos 16-30, duplicated
    const row2Photos = [];
    for (let i = 16; i <= 30; i++) row2Photos.push(i);

    for (let copy = 0; copy < 2; copy++) {
        row2Photos.forEach((num, idx) => {
            track2.appendChild(createFilmstripCard(num, tilts[idx]));
        });
    }
}

function createFilmstripCard(photoNum, tilt) {
    const card = document.createElement('div');
    card.classList.add('filmstrip-card');
    card.style.transform = `rotate(${tilt}deg)`;

    const img = document.createElement('img');
    img.classList.add('filmstrip-img');
    img.src = getPhotoPath(photoNum);
    img.alt = `Memory ${photoNum}`;
    img.loading = 'lazy';
    img.onerror = () => {
        img.style.display = 'none';
    };

    const label = document.createElement('div');
    label.classList.add('filmstrip-label');
    label.textContent = photoCaptions[photoNum - 1] || `Memory #${photoNum}`;

    card.appendChild(img);
    card.appendChild(label);
    return card;
}

// Populate gallery grid (all 30 photos)
function populateGallery() {
    const grid = $('#galleryGrid');
    if (!grid) return;

    for (let i = 1; i <= TOTAL_PHOTOS; i++) {
        const card = document.createElement('div');
        card.classList.add('polaroid-card');
        // Random slight tilt
        const tilt = (Math.random() * 6 - 3).toFixed(1);
        card.style.setProperty('--tilt', `${tilt}deg`);
        card.dataset.index = i - 1;

        const img = document.createElement('img');
        img.classList.add('polaroid-img');
        img.src = getPhotoPath(i);
        img.alt = `Photo ${i}`;
        img.loading = 'lazy';
        img.onerror = () => {
            img.style.display = 'none';
        };

        const caption = document.createElement('div');
        caption.classList.add('polaroid-caption');
        caption.textContent = photoCaptions[i - 1] || `#${i}`;

        const heart = document.createElement('span');
        heart.classList.add('polaroid-heart');
        heart.textContent = '💖';

        card.appendChild(img);
        card.appendChild(caption);
        card.appendChild(heart);

        // Click to open lightbox
        card.addEventListener('click', () => openLightbox(i - 1));

        grid.appendChild(card);
    }
}

// Initialize photos
populateFilmstrip();
populateGallery();

// ===================== LIGHTBOX =====================
const lightbox = $('#lightbox');
const lightboxImg = $('#lightboxImg');
const lightboxClose = $('#lightboxClose');
const lightboxPrev = $('#lightboxPrev');
const lightboxNext = $('#lightboxNext');
const lightboxCounter = $('#lightboxCounter');

function openLightbox(index) {
    lightboxIndex = index;
    lightbox.classList.remove('hidden');
    updateLightboxImage();
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    lightbox.classList.add('hidden');
    document.body.style.overflow = '';
}

function updateLightboxImage() {
    lightboxImg.src = getPhotoPath(lightboxIndex + 1);
    lightboxImg.alt = photoCaptions[lightboxIndex] || `Photo ${lightboxIndex + 1}`;
    lightboxCounter.textContent = `${lightboxIndex + 1} / ${TOTAL_PHOTOS}`;
    // Re-trigger animation
    lightboxImg.style.animation = 'none';
    lightboxImg.offsetHeight; // force reflow
    lightboxImg.style.animation = '';
}

function lightboxNavPrev() {
    lightboxIndex = (lightboxIndex - 1 + TOTAL_PHOTOS) % TOTAL_PHOTOS;
    updateLightboxImage();
}

function lightboxNavNext() {
    lightboxIndex = (lightboxIndex + 1) % TOTAL_PHOTOS;
    updateLightboxImage();
}

if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
if (lightboxPrev) lightboxPrev.addEventListener('click', lightboxNavPrev);
if (lightboxNext) lightboxNext.addEventListener('click', lightboxNavNext);

// Close on backdrop click
if (lightbox) {
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox || e.target.classList.contains('lightbox-img-wrap')) {
            closeLightbox();
        }
    });
}

// Lightbox keyboard
document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('hidden')) {
        if (e.key === 'Escape') closeLightbox();
        else if (e.key === 'ArrowLeft') lightboxNavPrev();
        else if (e.key === 'ArrowRight') lightboxNavNext();
        e.stopPropagation();
        return;
    }
});

// ===================== STARFIELD =====================
const starCanvas = $('#starCanvas');
const starCtx = starCanvas.getContext('2d');
let stars = [];

function resizeStarCanvas() {
    starCanvas.width = window.innerWidth;
    starCanvas.height = window.innerHeight;
}

class Star {
    constructor() { this.reset(); }
    reset() {
        this.x = Math.random() * starCanvas.width;
        this.y = Math.random() * starCanvas.height;
        this.size = Math.random() * 1.8 + 0.3;
        this.twinkleSpeed = Math.random() * 0.02 + 0.005;
        this.twinkleOffset = Math.random() * Math.PI * 2;
        this.baseOpacity = Math.random() * 0.4 + 0.1;
        this.hue = Math.random() > 0.7 ? 340 : (Math.random() > 0.5 ? 45 : 240);
    }
    update(t) {
        this.opacity = this.baseOpacity + Math.sin(t * this.twinkleSpeed + this.twinkleOffset) * 0.2;
    }
    draw() {
        starCtx.beginPath();
        starCtx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        starCtx.fillStyle = `hsla(${this.hue}, 60%, 80%, ${Math.max(0, this.opacity)})`;
        starCtx.fill();
    }
}

function initStars() {
    resizeStarCanvas();
    stars = [];
    const count = Math.min(200, Math.floor((starCanvas.width * starCanvas.height) / 8000));
    for (let i = 0; i < count; i++) stars.push(new Star());
}

function animateStars(t) {
    starCtx.clearRect(0, 0, starCanvas.width, starCanvas.height);
    stars.forEach(s => { s.update(t); s.draw(); });
    requestAnimationFrame(animateStars);
}

window.addEventListener('resize', () => { resizeStarCanvas(); initStars(); });
initStars();
requestAnimationFrame(animateStars);

// ===================== SPARKLE FIELD =====================
function createSparkleField() {
    const field = $('#sparkleField');
    if (!field) return;
    for (let i = 0; i < 30; i++) {
        const dot = document.createElement('div');
        dot.classList.add('sparkle-dot');
        dot.style.left = Math.random() * 100 + '%';
        dot.style.top = Math.random() * 100 + '%';
        dot.style.animationDuration = (Math.random() * 3 + 1.5) + 's';
        dot.style.animationDelay = (Math.random() * 3) + 's';
        field.appendChild(dot);
    }
}

// ===================== FLOATING HEARTS =====================
const heartsContainer = $('#heartsContainer');
const heartEmojis = ['💕', '💖', '💗', '💝', '💘', '💓', '❤️', '🩷', '🤍', '💜', '🩵'];

function spawnHeart() {
    const heart = document.createElement('span');
    heart.classList.add('floating-heart');
    heart.textContent = heartEmojis[Math.floor(Math.random() * heartEmojis.length)];
    heart.style.left = Math.random() * 100 + '%';
    heart.style.fontSize = (Math.random() * 1.2 + 0.6) + 'rem';
    heart.style.animationDuration = (Math.random() * 10 + 8) + 's';
    heartsContainer.appendChild(heart);
    setTimeout(() => heart.remove(), 20000);
}
setInterval(spawnHeart, 2000);

// ===================== FALLING PETALS =====================
function createPetals() {
    const container = $('#fallingPetals');
    if (!container) return;
    const petals = ['🌸', '🌺', '🌷', '🌻', '🌼', '💮'];
    for (let i = 0; i < 12; i++) {
        const p = document.createElement('span');
        p.classList.add('petal-fall');
        p.textContent = petals[Math.floor(Math.random() * petals.length)];
        p.style.left = Math.random() * 100 + '%';
        p.style.fontSize = (Math.random() * 1.2 + 0.8) + 'rem';
        p.style.animationDuration = (Math.random() * 8 + 10) + 's';
        p.style.animationDelay = (Math.random() * 10) + 's';
        container.appendChild(p);
    }
}
createPetals();

// ===================== SLIDE NAVIGATION =====================
function goToSlide(index) {
    if (isAnimating || index === currentSlide || index < 0 || index >= totalSlides) return;
    // Don't navigate slides when lightbox is open
    if (lightbox && !lightbox.classList.contains('hidden')) return;

    isAnimating = true;
    currentSlide = index;

    sliderWrapper.style.transform = `translateX(-${index * 100}vw)`;

    navDots.forEach((d, i) => d.classList.toggle('active', i === index));

    prevBtn.style.opacity = index === 0 ? '0.3' : '1';
    prevBtn.style.pointerEvents = index === 0 ? 'none' : 'auto';
    nextBtn.style.opacity = index === totalSlides - 1 ? '0.3' : '1';
    nextBtn.style.pointerEvents = index === totalSlides - 1 ? 'none' : 'auto';

    progressFill.style.width = ((index / (totalSlides - 1)) * 100) + '%';
    slideCounter.textContent = String(index + 1).padStart(2, '0');

    setTimeout(() => {
        triggerSlideAnimations(index);
        isAnimating = false;
    }, 900);

    // Special triggers
    if (index === 4) setTimeout(openEnvelope, 1500);    // Love Letter slide
    if (index === 9) setTimeout(() => {                   // Grand Finale slide
        launchFireworks();
        launchConfetti();
        animateMeter();
    }, 1200);
}

function triggerSlideAnimations(index) {
    const slide = $(`.slide[data-index="${index}"]`);
    if (!slide) return;
    slide.querySelectorAll('.animate-in').forEach((el, i) => {
        setTimeout(() => el.classList.add('visible'), i * 120);
    });
}

// Dots
navDots.forEach(dot => {
    dot.addEventListener('click', () => goToSlide(parseInt(dot.dataset.slide)));
});

// Arrows
prevBtn.addEventListener('click', () => goToSlide(currentSlide - 1));
nextBtn.addEventListener('click', () => goToSlide(currentSlide + 1));

// CTA Button
const startBtn = $('#startJourney');
if (startBtn) startBtn.addEventListener('click', () => goToSlide(1));

// Keyboard (only when lightbox is closed)
document.addEventListener('keydown', (e) => {
    if (lightbox && !lightbox.classList.contains('hidden')) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goToSlide(currentSlide + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') goToSlide(currentSlide - 1);
});

// Touch
document.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
}, { passive: true });
document.addEventListener('touchend', (e) => {
    if (lightbox && !lightbox.classList.contains('hidden')) return;
    const diff = touchStartX - e.changedTouches[0].screenX;
    if (Math.abs(diff) > 60) {
        diff > 0 ? goToSlide(currentSlide + 1) : goToSlide(currentSlide - 1);
    }
}, { passive: true });

// Wheel
let wheelLock;
document.addEventListener('wheel', (e) => {
    if (lightbox && !lightbox.classList.contains('hidden')) return;
    if (wheelLock) return;
    wheelLock = setTimeout(() => wheelLock = null, 1200);
    (e.deltaY > 0 || e.deltaX > 0) ? goToSlide(currentSlide + 1) : goToSlide(currentSlide - 1);
}, { passive: true });

// Initial state
prevBtn.style.opacity = '0.3';
prevBtn.style.pointerEvents = 'none';

// ===================== GIFT BOX =====================
const giftLid = $('#giftLid');
const openGiftBtn = $('#openGiftBtn');
const giftMessage = $('#giftMessage');
const giftBox = $('#giftBox');

if (openGiftBtn) {
    openGiftBtn.addEventListener('click', () => {
        giftLid.classList.add('opened');
        openGiftBtn.classList.add('hidden');
        for (let i = 0; i < 40; i++) {
            setTimeout(() => createBurstParticle(giftBox), i * 25);
        }
        setTimeout(() => giftMessage.classList.remove('hidden'), 800);
    });
}

function createBurstParticle(anchor) {
    const colors = ['#ff6b9d', '#f9ca24', '#a29bfe', '#55efc4', '#fd79a8', '#74b9ff'];
    const p = document.createElement('div');
    p.style.cssText = `
        position: absolute; width: ${Math.random()*8+4}px; height: ${Math.random()*8+4}px;
        background: ${colors[Math.floor(Math.random()*colors.length)]};
        border-radius: ${Math.random()>0.5 ? '50%' : '2px'};
        left: 50%; top: 30%; z-index: 20; pointer-events: none;
        transition: all 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    `;
    anchor.parentElement.appendChild(p);
    requestAnimationFrame(() => {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * 200 + 80;
        p.style.transform = `translate(${Math.cos(angle)*dist}px, ${Math.sin(angle)*dist}px) rotate(${Math.random()*720}deg)`;
        p.style.opacity = '0';
    });
    setTimeout(() => p.remove(), 1500);
}

// ===================== ENVELOPE =====================
function openEnvelope() {
    const env = $('#envelope3d');
    if (!env || env.classList.contains('opened')) return;
    env.classList.add('opened');
    setTimeout(() => {
        $$('.letter-line').forEach((line, i) => {
            setTimeout(() => line.classList.add('revealed'), i * 400);
        });
    }, 800);
}

const envelope3d = $('#envelope3d');
if (envelope3d) envelope3d.addEventListener('click', openEnvelope);

// ===================== BLOW CANDLES =====================
const blowBtn = $('#blowCandles');
const wishReveal = $('#wishReveal');

if (blowBtn) {
    blowBtn.addEventListener('click', () => {
        $$('.flame').forEach((f, i) => {
            setTimeout(() => {
                f.classList.add('out');
                createSmoke(f);
            }, i * 250);
        });
        setTimeout(() => {
            blowBtn.classList.add('hidden');
            wishReveal.classList.remove('hidden');
            cakeConfetti();
        }, 1500);
    });
}

function createSmoke(flame) {
    const slide = flame.closest('.slide');
    for (let i = 0; i < 5; i++) {
        const s = document.createElement('div');
        const rect = flame.getBoundingClientRect();
        const slideRect = slide.getBoundingClientRect();
        s.style.cssText = `
            position: absolute; width: 6px; height: 6px;
            background: rgba(200,200,200,0.4); border-radius: 50%;
            left: ${rect.left - slideRect.left}px; top: ${rect.top - slideRect.top}px;
            z-index: 20; pointer-events: none;
            transition: all 1.5s ease; filter: blur(3px);
        `;
        slide.appendChild(s);
        requestAnimationFrame(() => {
            s.style.transform = `translate(${(Math.random()-0.5)*40}px, ${-60-Math.random()*40}px)`;
            s.style.opacity = '0';
        });
        setTimeout(() => s.remove(), 2000);
    }
}

function cakeConfetti() {
    const slide = $('.slide-7');
    const colors = ['#ff6b9d', '#f9ca24', '#a29bfe', '#fd79a8', '#55efc4', '#ffeaa7', '#ff9ff3'];
    for (let i = 0; i < 80; i++) {
        setTimeout(() => {
            const p = document.createElement('div');
            const size = Math.random() * 10 + 5;
            p.style.cssText = `
                position: absolute; width: ${size}px; height: ${size}px;
                background: ${colors[Math.floor(Math.random()*colors.length)]};
                border-radius: ${Math.random()>0.5 ? '50%' : '2px'};
                left: 50%; top: 35%; z-index: 20; pointer-events: none;
                transition: all 1.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            `;
            slide.appendChild(p);
            requestAnimationFrame(() => {
                const a = Math.random() * Math.PI * 2;
                const d = Math.random() * 250 + 100;
                p.style.transform = `translate(${Math.cos(a)*d}px, ${Math.sin(a)*d}px) rotate(${Math.random()*1080}deg)`;
                p.style.opacity = '0';
            });
            setTimeout(() => p.remove(), 2500);
        }, i * 20);
    }
}

// ===================== FIREWORKS =====================
function launchFireworks() {
    const canvas = $('#fireworksCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const fireworks = [];
    const particles = [];

    class Firework {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = canvas.height;
            this.targetY = Math.random() * canvas.height * 0.4 + 50;
            this.speed = Math.random() * 4 + 3;
            this.hue = Math.random() * 360;
            this.done = false;
        }
        update() {
            this.y -= this.speed;
            if (this.y <= this.targetY) { this.done = true; this.explode(); }
        }
        explode() {
            for (let i = 0; i < 35; i++) particles.push(new FWParticle(this.x, this.y, this.hue));
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
            ctx.fillStyle = `hsl(${this.hue}, 80%, 70%)`;
            ctx.fill();
        }
    }

    class FWParticle {
        constructor(x, y, hue) {
            this.x = x; this.y = y;
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 5 + 1;
            this.vx = Math.cos(angle) * speed;
            this.vy = Math.sin(angle) * speed;
            this.hue = hue + Math.random() * 30 - 15;
            this.life = 1;
            this.decay = Math.random() * 0.02 + 0.01;
            this.size = Math.random() * 2.5 + 0.5;
        }
        update() {
            this.x += this.vx; this.y += this.vy;
            this.vy += 0.05; this.vx *= 0.99; this.life -= this.decay;
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${this.hue}, 80%, 65%, ${this.life})`;
            ctx.fill();
        }
    }

    let frame = 0;
    function animateFW() {
        if (frame > 300) { ctx.clearRect(0, 0, canvas.width, canvas.height); return; }
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = 'lighter';
        if (frame % 20 === 0 && frame < 240) fireworks.push(new Firework());
        for (let i = fireworks.length - 1; i >= 0; i--) {
            fireworks[i].update();
            if (!fireworks[i].done) fireworks[i].draw(); else fireworks.splice(i, 1);
        }
        for (let i = particles.length - 1; i >= 0; i--) {
            particles[i].update();
            if (particles[i].life > 0) particles[i].draw(); else particles.splice(i, 1);
        }
        frame++;
        requestAnimationFrame(animateFW);
    }
    animateFW();
}

// ===================== CONFETTI =====================
function launchConfetti() {
    const box = $('#confettiBox');
    if (!box) return;
    const colors = ['#ff6b9d', '#f9ca24', '#a29bfe', '#fd79a8', '#55efc4', '#ffeaa7', '#ff9ff3', '#48dbfb'];
    for (let i = 0; i < 120; i++) {
        const c = document.createElement('div');
        c.classList.add('conf-piece');
        c.style.left = Math.random() * 100 + '%';
        c.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        c.style.width = (Math.random() * 12 + 4) + 'px';
        c.style.height = (Math.random() * 12 + 4) + 'px';
        c.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        c.style.animationDuration = (Math.random() * 4 + 2) + 's';
        c.style.animationDelay = (Math.random() * 3) + 's';
        box.appendChild(c);
        setTimeout(() => c.remove(), 8000);
    }
}

// ===================== LOVE METER =====================
function animateMeter() {
    const fill = $('#meterFill');
    if (fill) setTimeout(() => fill.classList.add('full'), 500);
}

// ===================== AMBIENT MUSIC =====================
function createAmbientMusic() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    function pad(freq, type, gainVal, detune = 0) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const filter = audioCtx.createBiquadFilter();
        osc.type = type; osc.frequency.value = freq; osc.detune.value = detune;
        filter.type = 'lowpass'; filter.frequency.value = 800; filter.Q.value = 1;
        gain.gain.value = 0;
        gain.gain.linearRampToValueAtTime(gainVal, audioCtx.currentTime + 3);
        osc.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination);
        osc.start();
    }

    pad(130.81, 'sine', 0.04);
    pad(164.81, 'sine', 0.03, 5);
    pad(196.00, 'sine', 0.03, -3);
    pad(246.94, 'sine', 0.02, 7);
    pad(261.63, 'triangle', 0.015);
    pad(329.63, 'sine', 0.01, 10);
}

function stopAmbientMusic() {
    if (audioCtx) { audioCtx.close(); audioCtx = null; }
}

musicToggle.addEventListener('click', () => {
    musicPlaying = !musicPlaying;
    musicToggle.classList.toggle('muted', !musicPlaying);
    musicPlaying ? createAmbientMusic() : stopAmbientMusic();
});
musicToggle.classList.add('muted');

// ===================== INIT =====================
console.log('💖 Happy Birthday! Made with infinite love 💖');
