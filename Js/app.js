let THREE;
const config = window.GARDEN_CONFIG;
const garden = document.getElementById("garden");
const openButton = document.getElementById("openGift");
const letter = document.getElementById("letter");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const random = (min, max) => min + Math.random() * (max - min);

for (const [id, value] of [["recipientName", config.recipient], ["dedicationText", config.dedication], ["signatureText", config.signature]]) {
    document.getElementById(id).textContent = value;
}
const personalPhoto = document.getElementById("personalPhoto");
if (config.personalImage) {
    personalPhoto.addEventListener("load", () => { personalPhoto.hidden = false; }, { once: true });
    personalPhoto.src = config.personalImage;
}

let phraseIndex = -1;
function showFlowerPhrase() {
    const message = document.getElementById("discoveryMessage");
    const phrases = config.flowerPhrases;
    if (!phrases.length) return;
    const possible = phrases.map((_, index) => index).filter((index) => index !== phraseIndex);
    phraseIndex = possible[Math.floor(Math.random() * possible.length)] ?? 0;
    message.textContent = phrases[phraseIndex];
}
document.getElementById("discoverFlower").addEventListener("click", () => {
    showFlowerPhrase();
});

function makeFloatingWords() {
    const container = document.getElementById("floatingWords");
    const mobile = window.matchMedia("(max-width: 700px)").matches;
    const positions = mobile
        ? [{ left: "5%", top: "43%" }, { right: "6%", top: "36%" }]
        : [{ left: "8%", top: "42%" }, { right: "8%", top: "35%" }, { left: "13%", top: "60%" }];
    container.replaceChildren();
    config.floatingPhrases.slice(0, positions.length).forEach((phrase, index) => {
        const span = document.createElement("span");
        span.textContent = phrase;
        Object.assign(span.style, positions[index]);
        span.style.setProperty("--word-size", `${random(13, mobile ? 14 : 17)}px`);
        span.style.setProperty("--duration", `${random(15, 21)}s`);
        span.style.setProperty("--delay", `${-random(1, 12)}s`);
        container.append(span);
    });
}
makeFloatingWords();
window.addEventListener("resize", makeFloatingWords, { passive: true });

let audioContext;
let masterGain;
let audioElement;
let musicEnabled = false;
let noteTimer;
let audioFade;
let noteIndex = 0;
const melody = [261.63, 329.63, 392, 329.63, 293.66, 349.23, 440, 349.23, 246.94, 329.63, 392, 329.63, 220, 293.66, 369.99, 293.66];

function playNote(frequency, duration, gainAmount) {
    if (!audioContext || !masterGain || audioContext.state !== "running") return;
    const oscillator = audioContext.createOscillator();
    const envelope = audioContext.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    envelope.gain.setValueAtTime(0.0001, audioContext.currentTime);
    envelope.gain.exponentialRampToValueAtTime(gainAmount, audioContext.currentTime + 0.08);
    envelope.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);
    oscillator.connect(envelope).connect(masterGain);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration + 0.03);
}

function scheduleMusic() {
    if (!musicEnabled || audioElement) return;
    const frequency = melody[noteIndex % melody.length];
    playNote(frequency, 2.4, 0.12);
    if (noteIndex % 4 === 0) playNote(frequency / 2, 3.8, 0.035);
    noteIndex += 1;
    noteTimer = window.setTimeout(scheduleMusic, 1700);
}

function setMusic(enabled) {
    const button = document.getElementById("musicToggle");
    const label = document.getElementById("musicLabel");
    musicEnabled = enabled;
    button.setAttribute("aria-pressed", String(enabled));
    button.setAttribute("aria-label", enabled ? "Silenciar música" : "Activar música");
    label.textContent = enabled ? "Silenciar música" : "Activar música";
    window.clearInterval(audioFade);

    if (enabled && config.audioFile) {
        if (!audioElement) {
            audioElement = new Audio(config.audioFile);
            audioElement.loop = true;
            audioElement.volume = 0;
        }
        audioElement.play().then(() => {
            audioFade = window.setInterval(() => {
                if (!musicEnabled || audioElement.volume >= 0.27) {
                    window.clearInterval(audioFade);
                    return;
                }
                audioElement.volume = Math.min(0.27, audioElement.volume + 0.025);
            }, 90);
        }).catch(() => setMusic(false));
    } else if (enabled) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) {
            setMusic(false);
            return;
        }
        audioContext ||= new AudioContextClass();
        masterGain ||= audioContext.createGain();
        masterGain.gain.setTargetAtTime(0.19, audioContext.currentTime, 0.8);
        masterGain.connect(audioContext.destination);
        audioContext.resume().then(scheduleMusic).catch(() => setMusic(false));
    } else {
        window.clearTimeout(noteTimer);
        if (masterGain && audioContext) masterGain.gain.setTargetAtTime(0.0001, audioContext.currentTime, 0.35);
        if (audioElement) {
            audioFade = window.setInterval(() => {
                audioElement.volume = Math.max(0, audioElement.volume - 0.045);
                if (audioElement.volume === 0) {
                    window.clearInterval(audioFade);
                    audioElement.pause();
                }
            }, 70);
        }
    }
}
document.getElementById("musicToggle").addEventListener("click", () => setMusic(!musicEnabled));

function createFallback() {
    const fallback = document.getElementById("gardenFallback");
    if (fallback.childElementCount) return;
    fallback.classList.add("is-visible");
    ["sunflower", "daisy", "tulip", "rose", "daisy", "tulip", "sunflower"].forEach((type, index) => {
        const flower = document.createElement("div");
        flower.className = `fallback-flower ${type}`;
        flower.style.left = `${10 + index * 12}%`;
        flower.style.transform = `scale(${0.7 + ((index * 17) % 5) * 0.1}) rotate(${index % 2 ? 6 : -5}deg)`;
        flower.style.animationDelay = `${index * -0.6}s`;
        const bloom = document.createElement("div");
        bloom.className = "fallback-bloom";
        const count = type === "tulip" ? 6 : type === "daisy" ? 14 : 12;
        for (let petal = 0; petal < count; petal += 1) {
            const shape = document.createElement("i");
            shape.style.transform = `rotate(${petal * 360 / count}deg)`;
            bloom.append(shape);
        }
        bloom.append(document.createElement("b"));
        flower.append(bloom);
        fallback.append(flower);
    });
}

let openStarted = false;
let bouquet;
let flowers = [];
let renderer;
let scene;
let camera;
let resizeObserver;
let animationFrame;
let pollen;
let raycaster;
let pointer;
let galaxy;
let lotusOrbit;
let flowerOrbit;
let orbitLabels = [];
let reducedMotion = prefersReducedMotion.matches;
let threeReady = false;

function openGift() {
    if (openStarted) return;
    openStarted = true;
    openButton.disabled = true;
    garden.classList.add("is-opening");
    if (reducedMotion) {
        garden.classList.add("is-open");
        letter.setAttribute("aria-hidden", "false");
        if (threeReady) flowers.forEach((flower) => { flower.userData.bloom = 1; flower.userData.petalGroup.scale.setScalar(1); });
        return;
    }
    if (threeReady) bouquet.userData.openStarted = performance.now();
    window.setTimeout(() => {
        garden.classList.add("is-open");
        letter.setAttribute("aria-hidden", "false");
    }, 3900);
}
openButton.addEventListener("click", openGift);

function petalGeometry(length, width, lift, cup = 0, frontFacing = false) {
    const vertices = [];
    const uCount = 12;
    const vCount = 8;
    for (let uStep = 0; uStep <= uCount; uStep += 1) {
        const u = uStep / uCount;
        const taper = Math.pow(Math.sin(Math.PI * (0.12 + u * 0.88)), 0.72);
        const halfWidth = width * taper * (0.5 + 0.5 * u);
        for (let vStep = 0; vStep <= vCount; vStep += 1) {
            const v = (vStep / vCount) * 2 - 1;
            const height = lift * u * u + cup * v * v * u + Math.sin(u * Math.PI) * 0.045;
            vertices.push(length * u, frontFacing ? height + v * halfWidth : height, frontFacing ? cup * v * v * u + Math.sin(u * Math.PI) * 0.045 : v * halfWidth);
        }
    }
    const indices = [];
    const row = vCount + 1;
    for (let uStep = 0; uStep < uCount; uStep += 1) {
        for (let vStep = 0; vStep < vCount; vStep += 1) {
            const start = uStep * row + vStep;
            indices.push(start, start + row, start + 1, start + 1, start + row, start + row + 1);
        }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
}

function addLeaf(parent, x, y, angle, scale = 1) {
    const leafMaterial = new THREE.MeshStandardMaterial({ color: 0x758b62, roughness: 0.68, side: THREE.DoubleSide });
    const leaf = new THREE.Mesh(petalGeometry(0.7 * scale, 0.29 * scale, 0.18), leafMaterial);
    leaf.position.set(x, y, 0);
    leaf.rotation.set(-0.18, 0, angle);
    parent.add(leaf);
}

function makeStem(parent, height, lean) {
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.038, height, 8), new THREE.MeshStandardMaterial({ color: 0x647c59, roughness: 0.7 }));
    stem.position.set(lean / 2, -height / 2, 0);
    stem.rotation.z = -lean / height;
    parent.add(stem);
    addLeaf(parent, -0.02, -height * 0.35, Math.PI * 0.78, 0.85);
    addLeaf(parent, 0.03, -height * 0.57, -0.56, 0.72);
}

function makeFlower(parent, type, x, y, z, scale, turn, delay) {
    const flower = new THREE.Group();
    flower.position.set(x, y, z);
    flower.rotation.set(random(-0.1, 0.14), turn, random(-0.18, 0.18));
    flower.scale.setScalar(scale);
    flower.userData = { delay, type, phase: random(0, Math.PI * 2), baseZ: flower.rotation.z };
    parent.add(flower);
    const petalGroup = new THREE.Group();
    flower.add(petalGroup);
    flower.userData.petalGroup = petalGroup;

    const species = {
        sunflower: { count: 15, length: 0.55, width: 0.22, lift: 0.1, colors: [0xf8cb46, 0xffdd69, 0xe9af32], center: 0x50372a },
        daisy: { count: 19, length: 0.41, width: 0.115, lift: 0.045, colors: [0xffe5a0, 0xfff1c8, 0xf4ce69], center: 0xd49a2d },
        tulip: { count: 6, length: 0.4, width: 0.3, lift: 0.5, colors: [0xf6c741, 0xffdf75, 0xeeb339], center: 0xd79c2a },
        rose: { count: 9, length: 0.33, width: 0.26, lift: 0.29, colors: [0xf2bd46, 0xffd56b, 0xdca53c], center: 0xa96d2e },
        lotus: { count: 10, length: 0.51, width: 0.29, lift: 0.2, colors: [0xe8a0b2, 0xffd9ce, 0xf5b8bd], center: 0xd49b45 },
        filler: { count: 8, length: 0.22, width: 0.095, lift: 0.08, colors: [0xffe5a0, 0xfff0c0, 0xf3c85e], center: 0xc78c33 }
    }[type];

    const layers = type === "rose" || type === "lotus" ? 3 : 1;
    for (let layer = 0; layer < layers; layer += 1) {
        for (let petalIndex = 0; petalIndex < species.count; petalIndex += 1) {
            const geometry = petalGeometry(species.length * (1 - layer * (type === "lotus" ? 0.2 : 0.23)), species.width * (1 - layer * 0.16), species.lift * (type === "rose" ? 1 + layer * 0.48 : 1), type === "tulip" ? 0.27 : type === "rose" ? 0.11 : type === "lotus" ? 0.16 : 0.025, type === "lotus");
            const color = species.colors[(petalIndex + layer) % species.colors.length];
            const petal = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, roughness: 0.48, side: THREE.DoubleSide, metalness: 0.015 }));
            const petalAngle = petalIndex / species.count * Math.PI * 2 + (layer % 2) * Math.PI / species.count;
            const pivot = new THREE.Group();
            if (type === "lotus") pivot.rotation.z = -petalAngle;
            else pivot.rotation.y = -petalAngle;
            petal.position.x = type === "rose" ? 0.035 + layer * 0.025 : type === "tulip" ? 0.015 : type === "lotus" ? 0.04 + layer * 0.025 : 0.065;
            pivot.add(petal);
            petalGroup.add(pivot);
            pivot.userData = { petalAngle, layer };
        }
    }

    const centerRadius = type === "sunflower" ? 0.27 : type === "daisy" ? 0.15 : type === "rose" ? 0.18 : type === "lotus" ? 0.14 : type === "filler" ? 0.095 : 0.1;
    const center = new THREE.Mesh(new THREE.SphereGeometry(centerRadius, type === "sunflower" ? 20 : 14, 12), new THREE.MeshStandardMaterial({ color: species.center, roughness: 0.83 }));
    center.scale.y = 0.56;
    center.position.y = type === "tulip" ? 0.43 : type === "rose" ? 0.28 : 0.01;
    flower.add(center);
    if (type === "sunflower") {
        const seedMaterial = new THREE.MeshStandardMaterial({ color: 0x9b6c39, roughness: 1 });
        for (let seed = 0; seed < 24; seed += 1) {
            const angle = seed * 2.4;
            const radius = 0.055 * Math.sqrt(seed);
            const dot = new THREE.Mesh(new THREE.SphereGeometry(0.012, 5, 4), seedMaterial);
            dot.position.set(Math.cos(angle) * radius, 0.025, Math.sin(angle) * radius);
            flower.add(dot);
        }
    }
    makeStem(flower, type === "filler" ? 0.85 : type === "lotus" ? 0.95 : 1.55 + random(0.05, 0.48), random(-0.2, 0.2));
    return flower;
}

function makeWrapper(group) {
    const paper = new THREE.MeshStandardMaterial({ color: 0xf2dfbb, roughness: 0.9, side: THREE.DoubleSide });
    const fold = new THREE.MeshStandardMaterial({ color: 0xe7cda4, roughness: 0.86, side: THREE.DoubleSide });
    const front = new THREE.Shape();
    front.moveTo(-0.9, -1.08);
    front.lineTo(0.9, -1.08);
    front.lineTo(0.43, 0.18);
    front.quadraticCurveTo(0, 0.02, -0.43, 0.18);
    front.closePath();
    const frontMesh = new THREE.Mesh(new THREE.ShapeGeometry(front, 4), paper);
    frontMesh.position.z = 0.37;
    group.add(frontMesh);

    for (const side of [-1, 1]) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.Float32BufferAttribute([
            side * 0.9, -1.08, 0.4, side * 0.44, 0.16, 0.4, side * 0.23, -0.6, 0.48
        ], 3));
        geometry.setIndex(side < 0 ? [0, 1, 2] : [0, 2, 1]);
        geometry.computeVertexNormals();
        group.add(new THREE.Mesh(geometry, fold));
        const crease = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 1.23, 5), new THREE.MeshStandardMaterial({ color: 0xd5b98c, roughness: 1 }));
        crease.position.set(side * 0.58, -0.46, 0.42);
        crease.rotation.z = side * 0.34;
        group.add(crease);
    }

    const ribbon = new THREE.MeshStandardMaterial({ color: 0xd99eaa, roughness: 0.55, side: THREE.DoubleSide });
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), ribbon);
    knot.scale.set(1.2, 0.72, 0.58);
    knot.position.set(0, -0.78, 0.53);
    group.add(knot);
    for (const side of [-1, 1]) {
        const loop = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.055, 8, 18, Math.PI * 1.75), ribbon);
        loop.position.set(side * 0.21, -0.74, 0.5);
        loop.rotation.z = side * 0.7;
        group.add(loop);
        const tail = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.36), ribbon);
        tail.position.set(side * 0.12, -1.02, 0.52);
        tail.rotation.z = side * 0.24;
        group.add(tail);
    }
}

function makeOrbitLabel(text) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const context = canvas.getContext("2d");
    context.font = "600 40px Georgia, serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "#60464f";
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, opacity: 0.82 }));
    sprite.scale.set(text.length > 10 ? 1.55 : 1.15, 0.31, 1);
    scene.add(sprite);
    return sprite;
}

function createGalaxy() {
    galaxy = new THREE.Group();
    bouquet.add(galaxy);

    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.48, 24, 18), new THREE.MeshBasicMaterial({ color: 0xdf9cc1, transparent: true, opacity: 0.13, depthWrite: false }));
    glow.scale.set(1.18, 0.76, 0.58);
    galaxy.add(glow);
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 18), new THREE.MeshStandardMaterial({ color: 0xffe2a0, emissive: 0xe4a6c6, emissiveIntensity: 1.7, roughness: 0.3 }));
    galaxy.add(core);

    const particleCount = config.visualIntensity === "minimal" ? 90 : window.innerWidth < 700 ? 150 : 230;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const rose = new THREE.Color(0xed9eb7);
    const gold = new THREE.Color(0xf5d37b);
    const lilac = new THREE.Color(0xb8a4d4);
    for (let index = 0; index < particleCount; index += 1) {
        const arm = index % 3;
        const radius = 0.2 + Math.sqrt(Math.random()) * 0.83;
        const angle = arm * Math.PI * 2 / 3 + radius * 3.1 + random(-0.19, 0.19);
        positions[index * 3] = Math.cos(angle) * radius;
        positions[index * 3 + 1] = Math.sin(angle) * radius * 0.56;
        positions[index * 3 + 2] = random(-0.11, 0.11);
        const color = new THREE.Color().lerpColors(rose, gold, radius * 0.64).lerp(lilac, arm * 0.16);
        colors[index * 3] = color.r;
        colors[index * 3 + 1] = color.g;
        colors[index * 3 + 2] = color.b;
    }
    const spiralGeometry = new THREE.BufferGeometry();
    spiralGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    spiralGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const spiral = new THREE.Points(spiralGeometry, new THREE.PointsMaterial({ size: 0.064, vertexColors: true, transparent: true, opacity: 0.92, sizeAttenuation: true, depthWrite: false }));
    spiral.rotation.x = 0.16;
    galaxy.add(spiral);

    const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xf6d48b, transparent: true, opacity: 0.38, depthWrite: false });
    const innerRing = new THREE.Mesh(new THREE.TorusGeometry(0.69, 0.012, 6, 80), ringMaterial);
    innerRing.scale.y = 0.58;
    innerRing.rotation.z = -0.28;
    galaxy.add(innerRing);
    const outerRing = new THREE.Mesh(new THREE.TorusGeometry(1.02, 0.008, 6, 100), new THREE.MeshBasicMaterial({ color: 0xe8afbd, transparent: true, opacity: 0.23, depthWrite: false }));
    outerRing.scale.y = 0.57;
    outerRing.rotation.z = 0.2;
    galaxy.add(outerRing);
    galaxy.userData.spiral = spiral;
    galaxy.userData.innerRing = innerRing;
    galaxy.userData.outerRing = outerRing;
}

function createBouquet() {
    bouquet = new THREE.Group();
    scene.add(bouquet);
    bouquet.userData.openStarted = null;
    createGalaxy();

    lotusOrbit = new THREE.Group();
    bouquet.add(lotusOrbit);
    for (let index = 0; index < 3; index += 1) {
        const angle = -Math.PI / 2 + index * Math.PI * 2 / 3;
        const radius = 1.42;
        const lotus = makeFlower(lotusOrbit, "lotus", Math.cos(angle) * radius, Math.sin(angle) * radius, index === 1 ? 0.18 : -0.12, 0.72 + index * 0.035, angle, index * 0.18);
        lotus.userData.orbitIndex = index;
    }

    flowerOrbit = new THREE.Group();
    bouquet.add(flowerOrbit);
    const outerFlowers = ["sunflower", "daisy", "rose", "tulip", "daisy", "filler", "sunflower"];
    outerFlowers.forEach((type, index) => {
        const angle = index * Math.PI * 2 / outerFlowers.length;
        const radius = index % 2 ? 2.28 : 2.03;
        flowers.push(makeFlower(flowerOrbit, type, Math.cos(angle) * radius, Math.sin(angle) * radius * 0.75, index % 2 ? -0.32 : 0.24, type === "filler" ? 0.33 : 0.38, angle, 0.3 + index * 0.13));
    });
    flowers.unshift(...lotusOrbit.children);

    orbitLabels = [makeOrbitLabel("F L O R E S"), makeOrbitLabel("flores para ti"), makeOrbitLabel("LUZ Y VIDA")];
    const pollenCount = config.visualIntensity === "minimal" ? 4 : config.visualIntensity === "soft" ? 9 : 16;
    const pollenPositions = new Float32Array(pollenCount * 3);
    for (let index = 0; index < pollenCount; index += 1) {
        pollenPositions[index * 3] = random(-3.3, 3.3);
        pollenPositions[index * 3 + 1] = random(-2.3, 2.7);
        pollenPositions[index * 3 + 2] = random(0.7, 2.8);
    }
    const pollenGeometry = new THREE.BufferGeometry();
    pollenGeometry.setAttribute("position", new THREE.BufferAttribute(pollenPositions, 3));
    pollen = new THREE.Points(pollenGeometry, new THREE.PointsMaterial({ color: 0xffefae, size: 0.075, transparent: true, opacity: config.visualIntensity === "minimal" ? 0.35 : 0.62, sizeAttenuation: true, depthWrite: false }));
    scene.add(pollen);
}

function resizeScene() {
    if (!renderer || !camera) return;
    const width = Math.max(1, garden.clientWidth);
    const height = Math.max(1, garden.clientHeight);
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, width < 700 ? 1.35 : 1.8));
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
        if (bouquet) {
            bouquet.position.set(width < 700 ? 0 : -2.45, width < 700 ? 0.58 : -0.58, 0);
            bouquet.scale.setScalar(width < 700 ? 0.88 : 1);
    }
}

function animate(now) {
    animationFrame = requestAnimationFrame(animate);
    if (!renderer || !scene || !camera) return;
    const elapsed = now / 1000;
    const mobile = garden.clientWidth < 700;
    const opening = bouquet.userData.openStarted !== null;
    const progress = opening ? Math.min(1, Math.max(0, (now - bouquet.userData.openStarted) / 3600)) : 0;
    const smooth = progress * progress * (3 - 2 * progress);
    const orbitTime = reducedMotion ? 0 : elapsed * 0.13 + smooth * 0.12;
    lotusOrbit.rotation.z = orbitTime;
    flowerOrbit.rotation.z = -orbitTime * 0.72;
    galaxy.rotation.z = orbitTime * 0.42;
    galaxy.scale.setScalar(1 + (reducedMotion ? 0 : Math.sin(orbitTime * 2.1) * 0.035));
    galaxy.userData.innerRing.rotation.z = -0.28 - orbitTime * 0.34;
    galaxy.userData.outerRing.rotation.z = 0.2 + orbitTime * 0.19;
    orbitLabels.forEach((label, index) => {
        const angle = orbitTime * 0.78 + index * Math.PI * 2 / orbitLabels.length;
        const radius = index === 1 ? 2.72 : 2.58;
        label.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.74, 0.42);
    });
    if (pollen) {
        const positions = pollen.geometry.attributes.position;
        for (let index = 0; index < positions.count; index += 1) {
            const startY = positions.getY(index);
            positions.setY(index, startY + Math.sin(elapsed * 0.52 + index * 4.1) * 0.0009 + 0.00035);
            positions.setX(index, positions.getX(index) + Math.sin(elapsed * 0.3 + index) * 0.00035);
            if (positions.getY(index) > 3.4) positions.setY(index, -1.7);
        }
        positions.needsUpdate = true;
    }
    flowers.forEach((flower, index) => {
        const delay = flower.userData.delay * 0.105;
        const localProgress = reducedMotion && openStarted ? 1 : Math.min(1, Math.max(0, (progress - delay) / (1 - delay)));
        const bloom = localProgress * localProgress * (3 - 2 * localProgress);
        flower.userData.petalGroup.scale.setScalar(Math.max(0.08, bloom));
        flower.rotation.z = flower.userData.baseZ + Math.sin(elapsed * 0.62 + flower.userData.phase) * (opening ? 0.035 * (1 - smooth) : 0.017);
        flower.userData.petalGroup.children.forEach((pivot) => {
            const { petalAngle, layer } = pivot.userData;
                const closed = flower.userData.type === "tulip" ? 0.72 : flower.userData.type === "rose" ? 0.48 : flower.userData.type === "lotus" ? 0.56 : 0.92;
            const opened = flower.userData.type === "tulip" ? 0.12 : flower.userData.type === "rose" ? 0.18 : 0.1;
            const petalSpread = Math.cos(petalAngle) * (closed + (opened - closed) * bloom) + layer * 0.04;
            pivot.rotation.z = (flower.userData.type === "lotus" ? -petalAngle : 0) + petalSpread;
        });
        if (!mobile && opening) flower.position.x += Math.sin(elapsed + index) * 0.0003;
    });
    if (opening) {
        camera.position.x = (mobile ? 0 : -0.65) + Math.sin(smooth * Math.PI * 0.5) * (mobile ? 0.05 : 0.14);
        camera.position.y = Math.sin(smooth * Math.PI) * 0.06;
        camera.position.z = 10 - smooth * 0.45;
        bouquet.rotation.y = Math.sin(smooth * Math.PI) * 0.045;
        bouquet.rotation.z = Math.sin(smooth * Math.PI) * -0.012;
    } else {
        camera.position.set(mobile ? 0 : -0.65, 0, 10);
    }
    camera.lookAt(mobile ? 0 : -0.65, 0.2, 0);
    renderer.render(scene, camera);
}

async function initThree() {
    try {
        const threeModule = await import(config.threeModule || "https://cdn.jsdelivr.net/npm/three@0.166.1/build/three.module.js");
        THREE = threeModule;
        if (!window.WebGLRenderingContext) throw new Error("WebGL no está disponible");
        renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("scene"), alpha: true, antialias: window.innerWidth > 600, powerPreference: "low-power" });
        renderer.setClearColor(0x000000, 0);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.15;
        scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0xe9b77d, 0.025);
        camera = new THREE.PerspectiveCamera(34, 1, 0.1, 80);
        camera.position.set(0, 0, 10);
        scene.add(new THREE.HemisphereLight(0xfff1d1, 0x725444, 2.05));
        const key = new THREE.DirectionalLight(0xffd894, 3.2);
        key.position.set(-4, 6, 6);
        scene.add(key);
        const fill = new THREE.DirectionalLight(0xffedc8, 1.15);
        fill.position.set(4, 2, -2);
        scene.add(fill);
        createBouquet();
        threeReady = true;
        resizeScene();
        raycaster = new THREE.Raycaster();
        pointer = new THREE.Vector2();
        renderer.domElement.addEventListener("pointerdown", (event) => {
            if (!openStarted || !flowers.length) return;
            const bounds = renderer.domElement.getBoundingClientRect();
            pointer.set(((event.clientX - bounds.left) / bounds.width) * 2 - 1, -((event.clientY - bounds.top) / bounds.height) * 2 + 1);
            raycaster.setFromCamera(pointer, camera);
            const hit = raycaster.intersectObjects(bouquet.children, true)[0];
            let target = hit?.object;
            while (target && target !== bouquet && !target.userData?.type) target = target.parent;
            if (target?.userData?.type) showFlowerPhrase();
        });
        if (openStarted && reducedMotion) flowers.forEach((flower) => flower.userData.petalGroup.scale.setScalar(1));
        else if (openStarted) bouquet.userData.openStarted = performance.now();
        resizeObserver = new ResizeObserver(resizeScene);
        resizeObserver.observe(garden);
        animationFrame = requestAnimationFrame(animate);
    } catch (error) {
        console.warn("Se usará el jardín alternativo:", error);
        createFallback();
    }
}
initThree();

prefersReducedMotion.addEventListener("change", (event) => {
    reducedMotion = event.matches;
    if (reducedMotion && openStarted && bouquet) flowers.forEach((flower) => flower.userData.petalGroup.scale.setScalar(1));
});
window.addEventListener("pagehide", () => {
    cancelAnimationFrame(animationFrame);
    resizeObserver?.disconnect();
    if (audioContext) audioContext.close();
    if (audioElement) audioElement.pause();
});
