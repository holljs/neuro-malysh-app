const isTestMode = true; 
const vkPlatform = new URLSearchParams(window.location.search).get('vk_platform') || 'desktop_web';
const isMobileVK = vkPlatform.includes('mobile');
let userHasPremium = false; 
const SERVER_URL = "https://neuro-master.online"; 

async function initAppAndCheckPremium() {
    try {
        await vkBridge.send('VKWebAppInit');
        const userInfo = await vkBridge.send('VKWebAppGetUserInfo');
        const vkSignParams = window.location.search.substring(1); 
        const response = await fetch(`${SERVER_URL}/api/user/${userInfo.id}`, {
            method: 'GET',
            headers: { 'x-vk-sign': vkSignParams }
        });
        const data = await response.json();
        if (data.success && data.has_premium) {
            userHasPremium = true;
        }
    } catch (error) {
        console.error("Ошибка премиума:", error);
    }
}
initAppAndCheckPremium();

function openModal(modalId) {
    vkBridge.send("VKWebAppTapticImpactOccurred", {"style": "light"}).catch(() => {});
    document.getElementById(modalId).classList.add('active');
}
function closeModal(modalId, event) {
    if (event && event.target !== document.getElementById(modalId)) return;
    vkBridge.send("VKWebAppTapticImpactOccurred", {"style": "light"}).catch(() => {});
    document.getElementById(modalId).classList.remove('active');
}

let currentRoom = ''; let isQuizMode = false; let expectedCardId = null; let currentLearningIndex = 0; let quizCards = []; let playNamesMode = false; 
let activeItem = null; let startX = 0, startY = 0; let matchedCount = 0;
let currentPairIndex = 0; let bsActiveItemsCount = 0;

const drawData = [
    { id: 'kitten', text: 'Котенок', file: 'kitten.jpg' }, { id: 'puppy', text: 'Щенок', file: 'puppy.jpg' }
];
let currentDrawIndex = 0;
const paintCanvas = document.getElementById('paintCanvas'); const ctx = paintCanvas.getContext('2d');
let isDrawing = false; let brushColor = '#FF4D4D'; let brushSize = 25;

const roomsData = {
    'wants': [{ id: 'drink', text: 'Пить', sound: 'w_drink.wav', image: 'w_drink.png' }, { id: 'eat', text: 'Кушать', sound: 'w_eat.wav', image: 'w_eat.png' }],
    'feeding': [{ id: 'cat', text: 'Кошка ест', target: 'a1.jpg', drag: 'food_fish.png', sound: 'f_cat.wav' }],
    'colors': [{ id: 'red', text: 'Красный', image: 'duck_red.png', target: 'boat_red.png', drag: 'duck_red.png', sound: 'color_red.wav' }],
    'animals': [{ id: 'кошка', text: 'Кошка', sound: 'a1.wav', image: 'a1.jpg' }],
    'letters': [{ id: 'a', text: 'А', image: 'b_a.png' }],
    'numbers': [{ id: '1', text: 'Один', sound: '1.wav', image: '1.jpg' }],
    'shapes': [{ id: 'circle', text: 'Круг', image: 'card_circle.png', sound: 'shape_circle.wav', targets: ['target_circle_wheel.png'] }],
    'big_small': [
        { id: 'elephant', big_img: 'bs_elephant.png', big_sound: 'bs_elephant.wav', small_img: 'bs_mouse.png', small_sound: 'bs_mouse.wav' },
        { id: 'car', big_img: 'bs_car_big.png', big_sound: 'bs_car_big.wav', small_img: 'bs_car_small.png', small_sound: 'bs_car_small.wav' }
    ]
};

function openRoom(roomId, title) {
    vkBridge.send("VKWebAppTapticImpactOccurred", {"style": "light"}).catch(() => {});
    
    currentRoom = roomId; isQuizMode = false; currentLearningIndex = 0;
    document.getElementById('quiz-area').classList.remove('active'); 
    document.getElementById('game-area').classList.remove('active'); 
    document.getElementById('bs-area').classList.remove('active'); 
    document.getElementById('learning-area').style.display = 'none'; 
    document.getElementById('wants-area').classList.remove('active'); 
    document.getElementById('draw-area').classList.remove('active'); 
    document.getElementById('quizToggle').style.display = 'block'; 
    
    if (roomId === 'wants') { document.getElementById('quizToggle').style.display = 'none'; document.getElementById('wants-area').classList.add('active'); renderWantsBoard(); } 
    else if (roomId === 'draw') { document.getElementById('quizToggle').style.display = 'none'; document.getElementById('draw-area').classList.add('active'); initDrawCanvas(); } 
    else if (roomId === 'feeding') { document.getElementById('learning-area').style.display = 'none'; toggleQuiz(); }
    else if (roomId === 'big_small') { document.getElementById('quizToggle').style.display = 'none'; document.getElementById('bs-area').classList.add('active'); setupBigSmallGame(); }
    else { document.getElementById('learning-area').style.display = 'flex'; renderLearningCard(); updateQuizToggleUI(); }

    document.getElementById('room-title').innerText = title;
    document.getElementById('screen-menu').classList.remove('active'); document.getElementById('screen-room').classList.add('active');
}

function goHome() { document.getElementById('screen-room').classList.remove('active'); document.getElementById('screen-menu').classList.add('active'); }

function setupBigSmallGame() {
    document.getElementById('bs-drag-zone').innerHTML = ''; 
    playSound('bs_intro.wav');
    
    const allPairs = roomsData['big_small'];
    if (currentPairIndex >= allPairs.length) currentPairIndex = 0; 
    
    const pair = allPairs[currentPairIndex];
    bsActiveItemsCount = 2; 
    const dragZone = document.getElementById('bs-drag-zone');
    
    const bigImg = document.createElement('img');
    bigImg.src = pair.big_img; bigImg.className = 'draggable-item';
    bigImg.setAttribute('data-size', 'big'); bigImg.setAttribute('data-sound', pair.big_sound);
    bigImg.style.cssText = 'width: 130px; height: 130px; margin: 15px;'; 
    bigImg.addEventListener('touchstart', handlePointerStart, {passive: false});
    bigImg.addEventListener('mousedown', handlePointerStart);
    
    const smallImg = document.createElement('img');
    smallImg.src = pair.small_img; smallImg.className = 'draggable-item';
    smallImg.setAttribute('data-size', 'small'); smallImg.setAttribute('data-sound', pair.small_sound);
    smallImg.style.cssText = 'width: 65px; height: 65px; margin: 15px;'; 
    smallImg.addEventListener('touchstart', handlePointerStart, {passive: false});
    smallImg.addEventListener('mousedown', handlePointerStart);
    
    const items = [bigImg, smallImg];
    shuffleArray(items);
    items.forEach(img => dragZone.appendChild(img));
}

function handlePointerStart(e) { 
    if (e.type === 'touchstart') e.preventDefault(); 
    activeItem = e.target; 
    const rect = activeItem.getBoundingClientRect(); 
    const clientX = e.touches ? e.touches[0].clientX : e.clientX; 
    const clientY = e.touches ? e.touches[0].clientY : e.clientY; 
    
    startX = clientX - rect.left; 
    startY = clientY - rect.top; 
    
    activeItem.style.width = rect.width + 'px'; 
    activeItem.style.height = rect.height + 'px'; 
    activeItem.classList.add('dragging'); 
    activeItem.style.position = 'fixed'; 
    activeItem.style.zIndex = '1000'; 
    
    activeItem.style.left = (clientX - startX) + 'px'; 
    activeItem.style.top = (clientY - startY) + 'px'; 

    if (currentRoom === 'big_small' && activeItem) { 
        const currentSound = activeItem.getAttribute('data-sound');
        if (currentSound) playSound(currentSound); 
    }
}

function handlePointerMove(e) { 
    if (!activeItem) return; 
    e.preventDefault(); 
    const clientX = e.touches ? e.touches[0].clientX : e.clientX; 
    const clientY = e.touches ? e.touches[0].clientY : e.clientY; 
    activeItem.style.left = (clientX - startX) + 'px'; 
    activeItem.style.top = (clientY - startY) + 'px'; 
}

function handlePointerEnd(e) { 
    if (!activeItem) return; 
    activeItem.classList.remove('dragging'); 
    const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX; 
    const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY; 
    
    activeItem.style.display = 'none'; 
    const elementUnderTouch = document.elementFromPoint(clientX, clientY); 
    activeItem.style.display = 'block'; 
    
    let target = (elementUnderTouch && elementUnderTouch.classList.contains('target-item')) ? elementUnderTouch : null; 
    
    if (currentRoom === 'big_small') {
        if (target && target.getAttribute('data-size') === activeItem.getAttribute('data-size')) {
            activeItem.style.display = 'none'; 
            playSound('color_correct.wav'); 
            bsActiveItemsCount--;
            if (bsActiveItemsCount === 0) {
                currentPairIndex++;
                setTimeout(() => {
                    playSound('bs_win.wav'); 
                    setTimeout(setupBigSmallGame, 1500); 
                }, 800); 
            }
            activeItem = null; return; 
        }
    }
    
    // Сброс при промахе
    activeItem.style.position = 'relative'; activeItem.style.left = '0px'; activeItem.style.top = '0px';
    activeItem = null;
}

document.addEventListener('touchmove', handlePointerMove, {passive: false}); document.addEventListener('touchend', handlePointerEnd); document.addEventListener('mousemove', handlePointerMove); document.addEventListener('mouseup', handlePointerEnd);
function shuffleArray(array) { for (let i = array.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [array[i], array[j]] = [array[j], array[i]]; } return array; }
function playSound(soundFile) { if (soundFile) { const audio = new Audio(soundFile); audio.play().catch(err => console.log(err)); } }
