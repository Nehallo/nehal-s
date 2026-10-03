
let leftImage, rightImage, unlockScreen;
let isDraggingLeft = false;
let isDraggingRight = false;
let isUnlocked = false;

let offset = { x: 0, y: 0 };
let leftPos = { x: 0, y: 0 };
let rightPos = { x: 0, y: 0 };

const imageSize = 400;

function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}

function initUnlockScreen() {
    unlockScreen = document.getElementById("unlock-screen");
    leftImage = document.getElementById("left-image");
    rightImage = document.getElementById("right-image");

    const centerY = window.innerHeight / 2 - imageSize / 2;

    leftPos.x = -imageSize + 200;
    leftPos.y = centerY - 200;

    rightPos.x = window.innerWidth - 400;
    rightPos.y = centerY + 100;

    applyPositions();

    leftImage.addEventListener("mousedown", e => startDrag(e, "left"));
    rightImage.addEventListener("mousedown", e => startDrag(e, "right"));

    document.addEventListener("mousemove", drag);
    document.addEventListener("mouseup", stopDrag);
}

function applyPositions() {
    leftImage.style.left = leftPos.x + "px";
    leftImage.style.top = leftPos.y + "px";
    rightImage.style.left = rightPos.x + "px";
    rightImage.style.top = rightPos.y + "px";
}

function startDrag(e, side) {
    e.preventDefault();
    offset.x = e.clientX - (side === "left" ? leftPos.x : rightPos.x);
    offset.y = e.clientY - (side === "left" ? leftPos.y : rightPos.y);

    if (side === "left") isDraggingLeft = true;
    else isDraggingRight = true;
}

function drag(e) {
    if (isDraggingLeft) {
        leftPos.x = clamp(e.clientX - offset.x, -imageSize, 0);
        leftPos.y = clamp(e.clientY - offset.y, 0, window.innerHeight - imageSize);
    }

    if (isDraggingRight) {
        rightPos.x = clamp(
            e.clientX - offset.x,
            window.innerWidth - 680,
            window.innerWidth - imageSize
        );
        rightPos.y = clamp(e.clientY - offset.y, 0, window.innerHeight - imageSize);
    }

    applyPositions();
    checkUnlock();
}

function stopDrag() {
    isDraggingLeft = false;
    isDraggingRight = false;
}

function checkUnlock() {
    if (isUnlocked) return;

    if (leftPos.x === 0 && rightPos.x === window.innerWidth - 680) {
        unlock();
    }
}

function unlock() {
    isUnlocked = true;
    unlockScreen.classList.add("unlocked");
    initHeroZoom(); // ✅ start zoom ONLY now
}


function scrollToSection(id) {

    const section = document.getElementById(id);
    if (!section) return;

    const yOffset = -80; // adjust if navbar overlaps
    const y = section.getBoundingClientRect().top + window.pageYOffset + yOffset;

    window.scrollTo({
        top: y,
        behavior: "smooth"
    });
}



function initHeroZoom() {
    const stage = document.querySelector(".hero-zoom-stage");
    const sceneGroup = document.getElementById("sceneGroup");
    const heroType = document.getElementById("heroType");
    const frameHanger = document.getElementById("frameHanger");
    const header = document.querySelector(".header"); // ✅ ADD

    if (!stage || !sceneGroup) return;

    const clamp01 = (v) => Math.max(0, Math.min(1, v));
    const lerp = (a, b, t) => a + (b - a) * t;

    const ZOOM_END = 0.42;
    const MOVE_START = 0.52;

    const START_SCALE = 1.0;
    const REST_SCALE = 0.20;
    const CORNER_SCALE = 0.05;

    const PAN_X_VW = 34;
    const PAN_Y_VH = -30;

    const maxScroll = stage.offsetHeight - window.innerHeight;

    function onScroll() {
        const p = clamp01(window.scrollY / maxScroll);

        // PHASE 1
        if (p <= ZOOM_END) {
            const t = p / ZOOM_END;
            const s = lerp(START_SCALE, REST_SCALE, t);

            sceneGroup.style.transform = `translate3d(0,0,0) scale(${s})`;

            header?.classList.remove("visible");
            heroType?.classList.remove("visible");
            frameHanger?.classList.remove("visible");
            return;
        }

        // HOLD
        if (p > ZOOM_END && p <= MOVE_START) {
            sceneGroup.style.transform = `translate3d(0,0,0) scale(${REST_SCALE})`;

            header?.classList.remove("visible"); 
            heroType?.classList.remove("visible");
            frameHanger?.classList.remove("visible");
            return;
        }

        // PHASE 2
        const t2 = (p - MOVE_START) / (1 - MOVE_START);
        const s2 = lerp(REST_SCALE, CORNER_SCALE, t2);
        const x = lerp(0, PAN_X_VW, t2);
        const y = lerp(0, PAN_Y_VH, t2);

        sceneGroup.style.transform = `translate3d(${x}vw, ${y}vh, 0) scale(${s2})`;

        if (t2 >= 1) {
            header?.classList.add("visible"); // ✅ SHOW NAVBAR ONLY AFTER ZOOM DONE
            heroType?.classList.add("visible");
            frameHanger?.classList.add("visible");
        } else {
            header?.classList.remove("visible"); // ✅ keep hidden during phase 2 motion
            heroType?.classList.remove("visible");
            frameHanger?.classList.remove("visible");
        }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();
}



// ===============================
// PUZZLE (drag & drop reveal)
// ===============================
function initPuzzle() {
    const PUZZLE_IMAGE = "./public/puzzle.jpg"; // <-- change this
    const GRID = 3; // 3x3 (change to 4 for harder)

    const board = document.getElementById("puzzleBoard");
    const tray = document.getElementById("puzzlePieces");
    const win = document.getElementById("puzzleWin");
    const shuffleBtn = document.getElementById("puzzleShuffleBtn");
    const restartBtn = document.getElementById("puzzleRestartBtn");

    const continueBtn = document.getElementById("puzzleContinueBtn");


    if (!board || !tray) return;

    // Build board grid
    board.style.gridTemplateColumns = `repeat(${GRID}, 1fr)`;
    board.style.gridTemplateRows = `repeat(${GRID}, 1fr)`;

    // State: slot -> pieceId
    const placed = new Map(); // slotIndex -> pieceIndex

    function makeSlot(i) {
        const slot = document.createElement("div");
        slot.className = "puzzle-slot";
        slot.dataset.slot = String(i);

        slot.addEventListener("dragover", (e) => {
            e.preventDefault();
            slot.classList.add("over");
        });

        slot.addEventListener("dragleave", () => slot.classList.remove("over"));

        slot.addEventListener("drop", (e) => {
            e.preventDefault();
            slot.classList.remove("over");

            const pieceIndex = Number(e.dataTransfer.getData("text/pieceIndex"));
            const piece = document.querySelector(`.puzzle-piece[data-piece="${pieceIndex}"]`);
            if (!piece) return;

            // If target slot already has a piece, ignore
            if (slot.querySelector(".puzzle-piece")) return;

            // Remove old slot record if this piece was already placed
            for (const [slotIndex, placedPiece] of placed.entries()) {
                if (placedPiece === pieceIndex) {
                    placed.delete(slotIndex);
                    break;
                }
            }

            slot.appendChild(piece);
            piece.classList.add("placed");
            piece.setAttribute("draggable", "true");

            placed.set(i, pieceIndex);

            checkWin();
        });

        return slot;
    }

    function makePiece(pieceIndex) {
        const r = Math.floor(pieceIndex / GRID);
        const c = pieceIndex % GRID;

        const piece = document.createElement("div");
        piece.className = "puzzle-piece";
        piece.dataset.piece = String(pieceIndex);

        piece.style.backgroundImage = `url("${PUZZLE_IMAGE}")`;

        piece.style.backgroundSize = `${GRID * 100}% ${GRID * 100}%`;
        piece.style.backgroundPosition = `${(c * 100) / (GRID - 1)}% ${(r * 100) / (GRID - 1)}%`;

        piece.setAttribute("draggable", "true");

        piece.addEventListener("dragstart", (e) => {
            e.dataTransfer.setData("text/pieceIndex", String(pieceIndex));
            e.dataTransfer.effectAllowed = "move";
        });

        
        return piece;
    }

    tray.addEventListener("dragover", (e) => {
        e.preventDefault();
    });

    tray.addEventListener("drop", (e) => {
        e.preventDefault();

        const pieceIndex = Number(e.dataTransfer.getData("text/pieceIndex"));
        const piece = document.querySelector(`.puzzle-piece[data-piece="${pieceIndex}"]`);
        if (!piece) return;

        for (const [slotIndex, placedPiece] of placed.entries()) {
            if (placedPiece === pieceIndex) {
                placed.delete(slotIndex);
                break;
            }
        }

        piece.classList.remove("placed");
        piece.setAttribute("draggable", "true");
        tray.appendChild(piece);
    });

    function clearAll() {
        board.innerHTML = "";
        tray.innerHTML = "";
        placed.clear();
        win?.classList.remove("show");
    }

    function shuffleArray(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    continueBtn?.addEventListener("click", () => {
        win?.classList.remove("show");

        const nextSection = document.querySelector("#puzzle") // change target id
        nextSection?.scrollIntoView({ behavior: "smooth" });
    });

    function build() {
        clearAll();

        for (let i = 0; i < GRID * GRID; i++) {
            board.appendChild(makeSlot(i));
        }

        const indices = shuffleArray([...Array(GRID * GRID).keys()]);
        indices.forEach((idx) => tray.appendChild(makePiece(idx)));
    }

    function checkWin() {
        if (placed.size !== GRID * GRID) return;

        for (let i = 0; i < GRID * GRID; i++) {
            if (placed.get(i) !== i) return;
        }

        win?.classList.add("show");
    }

    shuffleBtn?.addEventListener("click", build);
    restartBtn?.addEventListener("click", build);

    build();
}



function initNavbarReveal() {
    const header = document.querySelector(".header");
    const gallery = document.querySelector("#gallery");

    if (!header || !gallery) return;

    const observer = new IntersectionObserver(
        ([entry]) => {
            if (entry.isIntersecting) {
                header.classList.add("visible");
            } else {
                header.classList.remove("visible");
            }
        },
        {
            threshold: 0.2,
        }
    );

    observer.observe(gallery);
}

function initGalleryPaintings() {

    const paintings = document.querySelectorAll(".art-frame:not(.front-small)");

    const lightbox = document.getElementById("artLightbox");
    const lightboxImg = document.getElementById("lightboxImg");
    const closeBtn = document.getElementById("artClose");

    paintings.forEach(frame => {

        frame.addEventListener("click", () => {

            const img = frame.querySelector("img");

            if (!img) return;

            lightboxImg.src = img.src;

            lightbox.classList.add("show");

        });

    });

    closeBtn.addEventListener("click", () => {
        lightbox.classList.remove("show");
    });

    lightbox.addEventListener("click", (e) => {
        if (e.target === lightbox) {
            lightbox.classList.remove("show");
        }
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            lightbox.classList.remove("show");
        }
    });

}


function enterMuseum() {

    const museum = document.getElementById("artMuseum");

    museum.classList.add("show-museum");

    document.body.style.overflow = "hidden";

}
function exitMuseum() {

    const museum = document.getElementById("artMuseum");

    museum.classList.remove("show-museum");

    document.body.style.overflow = "auto";

}
function toggleReveal() {
    document.getElementById("revealedImage").classList.toggle("show");
}

function initFlowerDraw() {
    const aboutSection = document.querySelector("#about");
    const flower = document.querySelector(".flower-line-art");

    if (!aboutSection || !flower) return;

    const observer = new IntersectionObserver(
        ([entry]) => {
            if (entry.isIntersecting) {
                flower.classList.add("draw");
            } else {
                flower.classList.remove("draw");
            }
        },
        {
            threshold: 0.35,
        }
    );

    observer.observe(aboutSection);
}

document.addEventListener("DOMContentLoaded", () => {
    initUnlockScreen();
    initPuzzle();
    initGalleryPaintings();

    initFlowerDraw();

    initSnapScroll("#tickets", "#about");
    initSnapScroll("#about", "#contact");
});
