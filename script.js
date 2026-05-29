// --- ГЛАВНЫЕ НАСТРОЙКИ МОНЕТИЗАЦИИ ---
const isTestMode = true; // СТАВИМ TRUE, ЧТОБЫ МАЛЫШ ИГРАЛ БЕЗ ОГРАНИЧЕНИЙ!
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
        console.log("ОТВЕТ СЕРВЕРА:", data); 
        
        if (data.success && data.has_premium) {
            userHasPremium = true;
        }
    } catch (error) {
        console.error("Ошибка при проверке премиума:", error);
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

async function goToPayment() {
    vkBridge.send("VKWebAppTapticImpactOccurred", {"style": "heavy"}).catch(() => {});
    
    const btn = document.querySelector('#paywall-modal .wind-start-btn');
    const originalText = btn.innerText;
    btn.innerText = "Создаем платеж...";
    btn.style.opacity = "0.7";
    btn.style.pointerEvents = "none";
    
    try {
        const userInfo = await vkBridge.send('VKWebAppGetUserInfo');
        const vkSignParams = window.location.search.substring(1);
        
        const response = await fetch(`${SERVER_URL}/api/yookassa/create-payment`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "x-vk-sign": vkSignParams 
            },
            body: JSON.stringify({
                user_id: userInfo.id,
                amount: 150,
                description: "Подписка на развивающие игры (1 мес.)",
                currency_type: "kids_sub" 
            })
        });
        
        const data = await response.json();
        
        if (data.success && data.payment_url) {
            window.open(data.payment_url, '_blank');
        } else {
            alert("Произошла ошибка при создании платежа. Попробуйте чуть позже.");
        }
    } catch (error) {
        console.error("Ошибка сети при оплате:", error);
        alert("Нет связи с сервером. Проверьте интернет-соединение.");
    } finally {
        btn.innerText = originalText;
        btn.style.opacity = "1";
        btn.style.pointerEvents = "auto";
    }
}

let currentRoom = ''; let isQuizMode = false; let expectedCardId = null; let currentLearningIndex = 0; let quizCards = []; let playNamesMode = false; 
let activeItem = null; let startX = 0, startY = 0; let matchedCount = 0;
let currentPairIndex = 0; let bsActiveItemsCount = 0; // Переменные для Большой-Маленький

const drawData = [
    { id: 'kitten', text: 'Котенок', file: 'kitten.jpg' }, { id: 'puppy', text: 'Щенок', file: 'puppy.jpg' },
    { id: 'fox', text: 'Лисенок', file: 'fox.jpg' }, { id: 'squirrel', text: 'Бельчонок', file: 'squirrel.jpg' },
    { id: 'capybara', text: 'Капибара', file: 'capybara.jpg' }, { id: 'alpaca', text: 'Альпака', file: 'alpaca.jpg' },
    { id: 'bunny', text: 'Зайчонок', file: 'bunny.jpg' }
];
let currentDrawIndex = 0;

const paintCanvas = document.getElementById('paintCanvas'); const ctx = paintCanvas.getContext('2d');
let isDrawing = false; let brushColor = '#FF4D4D'; let brushSize = 25;

const roomsData = {
    'wants': [{ id: 'drink', text: 'Пить', sound: 'w_drink.wav', image: 'w_drink.png' }, { id: 'eat', text: 'Кушать', sound: 'w_eat.wav', image: 'w_eat.png' }, { id: 'give', text: 'Дай', sound: 'w_give.wav', image: 'w_give.png' }, { id: 'help', text: 'Помоги', sound: 'w_help.wav', image: 'w_help.png' }, { id: 'cartoon', text: 'Мультик', sound: 'w_cartoon.wav', image: 'w_cartoon.png' }, { id: 'walk', text: 'Гулять', sound: 'w_walk.wav', image: 'w_walk.png' }, { id: 'more', text: 'Ещё', sound: 'w_more.wav', image: 'w_more.png' }, { id: 'play', text: 'Играть', sound: 'w_play.wav', image: 'w_play.png' }, { id: 'read', text: 'Читать', sound: 'w_read.wav', image: 'w_read.png' }, { id: 'potty', text: 'На горшок', sound: 'w_potty.wav', image: 'w_potty.png' }, { id: 'yes', text: 'Да', sound: 'w_yes.wav', image: 'w_yes.png' }, { id: 'no', text: 'Нет', sound: 'w_no.wav', image: 'w_no.png' }, { id: 'sleep', text: 'Спать', sound: 'w_sleep.wav', image: 'w_sleep.png' }],
    'feeding': [{ id: 'cat', text: 'Кошка ест', target: 'a1.jpg', drag: 'food_fish.png', sound: 'f_cat.wav' }, { id: 'dog', text: 'Собака ест', target: 'a2.jpg', drag: 'food_bone.png', sound: 'f_dog.wav' }, { id: 'cow', text: 'Корова ест', target: 'a3.jpg', drag: 'food_hay.png', sound: 'f_cow.wav' }, { id: 'horse', text: 'Лошадь ест', target: 'a4.jpg', drag: 'food_apple.png', sound: 'f_horse.wav' }, { id: 'sheep', text: 'Овца ест', target: 'a5.jpg', drag: 'food_grass.png', sound: 'f_sheep.wav' }, { id: 'pig', text: 'Свинья ест', target: 'a6.jpg', drag: 'food_acorn.png', sound: 'f_pig.wav' }, { id: 'goat', text: 'Коза ест', target: 'a7.jpg', drag: 'food_cabbage.png', sound: 'f_goat.wav' }, { id: 'wolf', text: 'Волк ест', target: 'a8.jpg', drag: 'food_steak.png', sound: 'f_wolf.wav' }, { id: 'goose', text: 'Гусь ест', target: 'a9.jpg', drag: 'food_grain.png', sound: 'f_goose.wav' }, { id: 'frog', text: 'Лягушка ест', target: 'a10.jpg', drag: 'food_fly.png', sound: 'f_frog.wav' }, { id: 'lion', text: 'Лев ест', target: 'a11.jpg', drag: 'food_steak.png', sound: 'f_lion.wav' }, { id: 'tiger', text: 'Тигр ест', target: 'a12.jpg', drag: 'food_steak.png', sound: 'f_tiger.wav' }, { id: 'bee', text: 'Пчела ест', target: 'a15.jpg', drag: 'food_flower.png', sound: 'f_bee.wav' }, { id: 'fox', text: 'Лиса ест', target: 'a16.jpg', drag: 'food_chicken.png', sound: 'f_fox.wav' }, { id: 'hedgehog', text: 'Ёжик ест', target: 'a17.jpg', drag: 'food_mushroom.png', sound: 'f_hedgehog.wav' }, { id: 'hen', text: 'Курица ест', target: 'a18.jpg', drag: 'food_grain.png', sound: 'f_hen.wav' }, { id: 'rooster', text: 'Петушок ест', target: 'a19.jpg', drag: 'food_grain.png', sound: 'f_rooster.wav' }, { id: 'donkey', text: 'Ослик ест', target: 'a21.jpg', drag: 'food_carrot.png', sound: 'f_donkey.wav' }, { id: 'mouse', text: 'Мышка ест', target: 'a24.jpg', drag: 'food_cheese.png', sound: 'f_mouse.wav' }],
    'colors': [
        { id: 'yellow', text: 'Жёлтый', image: 'duck_yellow.png', target: 'boat_yellow.png', drag: 'duck_yellow.png', sound: 'color_yellow.wav' },
        { id: 'orange', text: 'Оранжевый', image: 'duck_orange.png', target: 'boat_orange.png', drag: 'duck_orange.png', sound: 'color_orange.wav' },
        { id: 'red', text: 'Красный', image: 'duck_red.png', target: 'boat_red.png', drag: 'duck_red.png', sound: 'color_red.wav' },
        { id: 'pink', text: 'Розовый', image: 'duck_pink.png', target: 'boat_pink.png', drag: 'duck_pink.png', sound: 'color_pink.wav' },
        { id: 'purple', text: 'Фиолетовый', image: 'duck_purple.png', target: 'boat_purple.png', drag: 'duck_purple.png', sound: 'color_purple.wav' },
        { id: 'blue', text: 'Синий', image: 'duck_blue.png', target: 'boat_blue.png', drag: 'duck_blue.png', sound: 'color_blue.wav' },
        { id: 'green', text: 'Зелёный', image: 'duck_green.png', target: 'boat_green.png', drag: 'duck_green.png', sound: 'color_green.wav' },
        { id: 'grey', text: 'Серый', image: 'duck_grey.png', target: 'boat_grey.png', drag: 'duck_grey.png', sound: 'color_grey.wav' }
    ],
    'animals': [{ id: 'кошка', text: 'Кошка', sound: 'a1.wav', image: 'a1.jpg' }, { id: 'собака', text: 'Собака', sound: 'a2.wav', image: 'a2.jpg' }, { id: 'корова', text: 'Корова', sound: 'a3.wav', image: 'a3.jpg' }, { id: 'лошадь', text: 'Лошадь', sound: 'a4.wav', image: 'a4.jpg' }, { id: 'овца', text: 'Овца', sound: 'a5.wav', image: 'a5.jpg' }, { id: 'свинья', text: 'Свинья', sound: 'a6.wav', image: 'a6.jpg' }, { id: 'коза', text: 'Коза', sound: 'a7.wav', image: 'a7.jpg' }, { id: 'волк', text: 'Волк', sound: 'a8.wav', image: 'a8.jpg' }, { id: 'гусь', text: 'Гусь', sound: 'a9.wav', image: 'a9.jpg' }, { id: 'лягушка', text: 'Лягушка', sound: 'a10.wav', image: 'a10.jpg' }, { id: 'лев', text: 'Лев', sound: 'a11.wav', image: 'a11.jpg' }, { id: 'тигр', text: 'Тигр', sound: 'a12.wav', image: 'a12.jpg' }, { id: 'лиса', text: 'Лиса', sound: 'a16.wav', image: 'a16.jpg' }, { id: 'ежик', text: 'Ёжик', sound: 'a17.wav', image: 'a17.jpg' }, { id: 'курица', text: 'Курица', sound: 'a18.wav', image: 'a18.jpg' }, { id: 'петушок', text: 'Петушок', sound: 'a19.wav', image: 'a19.jpg' }, { id: 'ворона', text: 'Ворона', sound: 'a20.wav', image: 'a20.jpg' }, { id: 'ослик', text: 'Ослик', sound: 'a21.wav', image: 'a21.jpg' }, { id: 'сова', text: 'Сова', sound: 'a22.wav', image: 'a22.jpg' }, { id: 'мышка', text: 'Мышка', sound: 'a24.wav', image: 'a24.jpg' }],
    'letters': [{ id: 'a', text: 'А', image: 'b_a.png' }, { id: 'b', text: 'Б', image: 'b_b.png' }, { id: 'v', text: 'В', image: 'b_v.png' }, { id: 'g', text: 'Г', image: 'b_g.png' }, { id: 'd', text: 'Д', image: 'b_d.png' }, { id: 'e', text: 'Е', image: 'b_e.png' }, { id: 'yo', text: 'Ё', image: 'b_yo.png' }, { id: 'zh', text: 'Ж', image: 'b_zh.png' }, { id: 'z', text: 'З', image: 'b_z.png' }, { id: 'i', text: 'И', image: 'b_i.png' }, { id: 'y', text: 'Й', image: 'b_y.png' }, { id: 'k', text: 'К', image: 'b_k.png' }, { id: 'l', text: 'Л', image: 'b_l.png' }, { id: 'm', text: 'М', image: 'b_m.png' }, { id: 'n', text: 'Н', image: 'b_n.png' }, { id: 'o', text: 'О', image: 'b_o.png' }, { id: 'p', text: 'П', image: 'b_p.png' }, { id: 'r', text: 'Р', image: 'b_r.png' }, { id: 's', text: 'С', image: 'b_s.png' }, { id: 't', text: 'Т', image: 'b_t.png' }, { id: 'u', text: 'У', image: 'b_u.png' }, { id: 'f', text: 'Ф', image: 'b_f.png' }, { id: 'h', text: 'Х', image: 'b_h.png' }, { id: 'ts', text: 'Ц', image: 'b_ts.png' }, { id: 'ch', text: 'Ч', image: 'b_ch.png' }, { id: 'sh', text: 'Ш', image: 'b_sh.png' }, { id: 'sch', text: 'Щ', image: 'b_sch.png' }, { id: 'tv', text: 'Ъ', image: 'b_tv.png' }, { id: 'ы', text: 'Ы', image: 'b_ы.png' }, { id: 'myag', text: 'Ь', image: 'b_myag.png' }, { id: 'e_ob', text: 'Э', image: 'b_e_ob.png' }, { id: 'yu', text: 'Ю', image: 'b_yu.png' }, { id: 'ya', text: 'Я', image: 'b_ya.png' }],
    'numbers': [{ id: '1', text: 'Один', sound: '1.wav', image: '1.jpg' }, { id: '2', text: 'Два', sound: '2.wav', image: '2.jpg' }, { id: '3', text: 'Три', sound: '3.wav', image: '3.jpg' }, { id: '4', text: 'Четыре', sound: '4.wav', image: '4.jpg' }, { id: '5', text: 'Пять', sound: '5.wav', image: '5.jpg' }, { id: '6', text: 'Шесть', sound: '6.wav', image: '6.jpg' }, { id: '7', text: 'Семь', sound: '7.wav', image: '7.jpg' }, { id: '8', text: 'Восемь', sound: '8.wav', merge: '8.jpg' }, { id: '9', text: 'Девять', sound: '9.wav', image: '9.jpg' }, { id: '10', text: 'Десять', sound: '10.wav', image: '10.jpg' }],
    'shapes': [
        { id: 'circle', text: 'Круг', image: 'card_circle.png', sound: 'shape_circle.wav', targets: ['target_circle_wheel.png', 'target_circle_sun.png'] },
        { id: 'square', text: 'Квадрат', image: 'card_square.png', sound: 'shape_square.wav', targets: ['target_square_house.png', 'target_square_gift1.png', 'target_square_gift2.png'] },
        { id: 'triangle', text: 'Треугольник', image: 'card_triangle.png', sound: 'shape_triangle.wav', targets: ['target_triangle_sail.png', 'target_triangle_roof.png'] },
        { id: 'rect', text: 'Прямоугольник', image: 'card_rect.png', sound: 'shape_rect.wav', targets: ['target_rect_train.png', 'target_rect_truck1.png', 'target_rect_truck2.png'] },
        { id: 'star', text: 'Звезда', image: 'card_star.png', sound: 'shape_star.wav', targets: ['target_star_wand.png', 'target_star_sky.png'] },
        { id: 'rhombus', text: 'Ромб', image: 'card_romb.png', sound: 'shape_rhombus.wav', targets: ['target_romb_kite.png', 'target_romb_diamond.png'] }
    ],
    'big_small': [
        { id: 'elephant', big_img: 'bs_elephant.png', big_sound: 'bs_elephant.wav', small_img: 'bs_mouse.png', small_sound: 'bs_mouse.wav' },
        { id: 'car', big_img: 'bs_car_big.png', big_sound: 'bs_car_big.wav', small_img: 'bs_car_small.png', small_sound: 'bs_car_small.wav' },
        { id: 'ball', big_img: 'bs_ball_big.png', big_sound: 'bs_ball_big.wav', small_img: 'bs_ball_small.png', small_sound: 'bs_ball_small.wav' },
        { id: 'dog', big_img: 'bs_dog.png', big_sound: 'bs_dog.wav', small_img: 'bs_puppy.png', small_sound: 'bs_puppy.wav' },
        { id: 'apple', big_img: 'bs_apple.png', big_sound: 'bs_apple.wav', small_img: 'bs_berry.png', small_sound: 'bs_berry.wav' },
        { id: 'house', big_img: 'bs_house_big.png', big_sound: 'bs_house_big.wav', small_img: 'bs_house_small.png', small_sound: 'bs_house_small.wav' },
        { id: 'tree', big_img: 'bs_tree.png', big_sound: 'bs_tree.wav', small_img: 'bs_leaf.png', small_sound: 'bs_leaf.wav' },
        { id: 'plate', big_img: 'bs_plate.png', big_sound: 'bs_plate.wav', small_img: 'bs_spoon.png', small_sound: 'bs_spoon.wav' },
        { id: 'bear', big_img: 'bs_bear.png', big_sound: 'bs_bear.wav', small_img: 'bs_bunny.png', small_sound: 'bs_bunny.wav' },
        { id: 'truck', big_img: 'bs_truck.png', big_sound: 'bs_truck.wav', small_img: 'bs_block.png', small_sound: 'bs_block.wav' },
        { id: 'chair', big_img: 'bs_chair_big.png', big_sound: 'bs_chair_big.wav', small_img: 'bs_chair_small.png', small_sound: 'bs_chair_small.wav' },
        { id: 'ship', big_img: 'bs_ship.png', big_sound: 'bs_ship.wav', small_img: 'bs_boat.png', small_sound: 'bs_boat.wav' }
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

function initDrawCanvas() {
    setTimeout(() => { resizeCanvas(); clearDrawCanvas(false); updateDrawImage();
        if (!canvasInitialized) {
            paintCanvas.addEventListener('touchstart', startDrawing, {passive: false}); paintCanvas.addEventListener('touchmove', drawPath, {passive: false}); paintCanvas.addEventListener('touchend', stopDrawing);
            paintCanvas.addEventListener('mousedown', startDrawing); paintCanvas.addEventListener('mousemove', drawPath); paintCanvas.addEventListener('mouseup', stopDrawing); paintCanvas.addEventListener('mouseleave', stopDrawing);
            canvasInitialized = true;
        }
    }, 50); 
}

function resizeCanvas() { const wrapper = document.querySelector('.canvas-wrapper'); paintCanvas.width = wrapper.clientWidth; paintCanvas.height = wrapper.clientHeight; }
function changeDrawImage(dir) { vkBridge.send("VKWebAppTapticImpactOccurred", {"style": "light"}).catch(() => {}); currentDrawIndex += dir; if (currentDrawIndex < 0) currentDrawIndex = drawData.length - 1; if (currentDrawIndex >= drawData.length) currentDrawIndex = 0; updateDrawImage(); clearDrawCanvas(false); }
function updateDrawImage() { document.getElementById('contourImage').src = drawData[currentDrawIndex].file; document.getElementById('draw-image-title').innerText = drawData[currentDrawIndex].text; }
function setBrushColor(colorHex, soundName, btnElem) { vkBridge.send("VKWebAppTapticImpactOccurred", {"style": "light"}).catch(() => {}); playSound(soundName + '.wav'); brushColor = colorHex; document.querySelectorAll('.color-btn').forEach(btn => btn.classList.remove('active')); btnElem.classList.add('active'); }
function clearDrawCanvas(playAudio = true) { if(playAudio) playSound('paint_clear.wav'); ctx.clearRect(0, 0, paintCanvas.width, paintCanvas.height); ctx.fillStyle = "white"; ctx.fillRect(0, 0, paintCanvas.width, paintCanvas.height); }
function getMousePos(evt) { const rect = paintCanvas.getBoundingClientRect(); const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX; const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY; return { x: (clientX - rect.left) * (paintCanvas.width / rect.width), y: (clientY - rect.top) * (paintCanvas.height / rect.height) }; }
function startDrawing(e) { e.preventDefault(); isDrawing = true; const pos = getMousePos(e); ctx.beginPath(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = brushColor; ctx.lineWidth = brushSize; ctx.moveTo(pos.x, pos.y); ctx.lineTo(pos.x, pos.y + 0.1); ctx.stroke(); }
function drawPath(e) { if (!isDrawing) return; e.preventDefault(); const pos = getMousePos(e); ctx.lineTo(pos.x, pos.y); ctx.stroke(); ctx.beginPath(); ctx.moveTo(pos.x, pos.y); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = brushColor; ctx.lineWidth = brushSize; }
function stopDrawing(e) { if (isDrawing && Math.random() < 0.1) { playSound(Math.random() > 0.5 ? 'paint_good.wav' : 'paint_beautiful.wav'); } isDrawing = false; }

function toggleSoundMode(event) { if (event) event.stopPropagation(); vkBridge.send("VKWebAppTapticImpactOccurred", {"style": "light"}).catch(() => {}); playNamesMode = !playNamesMode; renderLearningCard(); }
function renderWantsBoard() { const area = document.getElementById('wants-area'); area.innerHTML = ''; roomsData['wants'].forEach(card => { const cardDiv = document.createElement('div'); cardDiv.className = 'wants-card'; cardDiv.innerHTML = `<img src="${card.image}"><div>${card.text}</div>`; cardDiv.onclick = () => { vkBridge.send("VKWebAppTapticImpactOccurred", {"style": "light"}).catch(() => {}); playSound(card.sound); }; area.appendChild(cardDiv); }); }

function renderLearningCard() { 
    const cards = roomsData[currentRoom]; 
    const card = cards[currentLearningIndex]; 
    const area = document.getElementById('learning-area'); 
    const imageHtml = card.image ? `<img src="${card.image}">` : `<div class="placeholder">🖼️</div>`; 
    let soundModeHTML = ''; 
    let currentSoundToPlay = ''; 
    if (currentRoom === 'animals') { 
        soundModeHTML = `<div class="sound-mode-switch" onclick="toggleSoundMode(event)">🔄 ${playNamesMode ? "🗣️ Названия" : "🔊 Звуки"}</div>`; 
        currentSoundToPlay = playNamesMode ? 'n' + card.sound : card.sound; 
    } else if (currentRoom === 'letters') { 
        soundModeHTML = `<div class="sound-mode-switch" onclick="toggleSoundMode(event)">🔄 ${playNamesMode ? "🗣️ Буквы" : "🔊 Звуки"}</div>`; 
        const prefix = playNamesMode ? 'n_b_' : 's_b_'; 
        currentSoundToPlay = prefix + card.id + '.wav'; 
    } else if (currentRoom === 'shapes') { 
        currentSoundToPlay = card.sound; 
    } else { 
        currentSoundToPlay = card.sound; 
    } 
    area.innerHTML = `${soundModeHTML}<div class="large-card" onclick="playSound('${currentSoundToPlay}')">${imageHtml}<div>${card.text}</div></div><div class="tap-hint">Нажми, чтобы услышать 🔊</div><div class="slider-controls"><div class="nav-btn" onclick="prevLearningCard()">⬅️</div><div class="nav-btn" onclick="nextLearningCard()">➡️</div></div>`; 
    if (currentSoundToPlay) playSound(currentSoundToPlay); 
}

function prevLearningCard() { vkBridge.send("VKWebAppTapticImpactOccurred", {"style": "light"}).catch(() => {}); const cards = roomsData[currentRoom]; currentLearningIndex = (currentLearningIndex === 0) ? cards.length - 1 : currentLearningIndex - 1; renderLearningCard(); }
function nextLearningCard() { vkBridge.send("VKWebAppTapticImpactOccurred", {"style": "light"}).catch(() => {}); const cards = roomsData[currentRoom]; currentLearningIndex = (currentLearningIndex === cards.length - 1) ? 0 : currentLearningIndex + 1; renderLearningCard(); }

function toggleQuiz() { 
    vkBridge.send("VKWebAppTapticImpactOccurred", {"style": "medium"}).catch(() => {}); 
    isQuizMode = !isQuizMode; 
    updateQuizToggleUI(); 
    const learningArea = document.getElementById('learning-area'); 
    const quizArea = document.getElementById('quiz-area'); 
    const gameArea = document.getElementById('game-area'); 
    
    if (isQuizMode) { 
        learningArea.style.display = 'none'; 
        if (currentRoom === 'colors' || currentRoom === 'feeding') { 
            gameArea.classList.add('active'); 
            setupDragGame(); 
        } else if (currentRoom === 'shapes') { 
            gameArea.classList.add('active'); 
            setupDragGame(); 
        } else { 
            quizArea.classList.add('active'); 
            startNewQuizRound(); 
        } 
    } else { 
        quizArea.classList.remove('active'); 
        gameArea.classList.remove('active'); 
        if (currentRoom === 'feeding') { 
            goHome(); 
        } else { 
            learningArea.style.display = 'flex'; 
            currentLearningIndex = 0; 
            renderLearningCard(); 
        } 
    } 
}

function setupDragGame() { 
    const dragZone = document.getElementById('drag-zone'); 
    const targetZone = document.getElementById('target-zone'); 
    dragZone.innerHTML = ''; 
    targetZone.innerHTML = ''; 
    matchedCount = 0; 
    if (currentRoom === 'colors') playSound('color_intro.wav'); 
    if (currentRoom === 'feeding') playSound('f_intro.wav'); 
    if (currentRoom === 'shapes') playSound('shapes_intro.wav'); 
    
    let allData = [...roomsData[currentRoom]]; 
    shuffleArray(allData); 
    let roundData = []; 
    let usedDrags = new Set(); 
    for (let i = 0; i < allData.length; i++) { 
        if (currentRoom === 'shapes') { 
            if (!usedDrags.has(allData[i].id)) { 
                roundData.push(allData[i]); 
                usedDrags.add(allData[i].id); 
            } 
        } else { 
            if (!usedDrags.has(allData[i].drag)) { 
                roundData.push(allData[i]); 
                usedDrags.add(allData[i].drag); 
            } 
        } 
        if (roundData.length === 3) break; 
    } 
    let draggables = shuffleArray([...roundData]); 
    let targets = shuffleArray([...roundData]); 
    
    draggables.forEach(item => { 
        const img = document.createElement('img'); 
        if (currentRoom === 'shapes') { 
            img.src = item.image; 
        } else { 
            img.src = item.drag; 
        } 
        img.className = 'draggable-item'; 
        img.setAttribute('data-id', item.id); 
        img.ondragstart = () => false; 
        img.addEventListener('touchstart', handlePointerStart, {passive: false}); 
        img.addEventListener('mousedown', handlePointerStart); 
        dragZone.appendChild(img); 
    }); 
    
    targets.forEach(item => { 
        const img = document.createElement('img'); 
        if (currentRoom === 'shapes') { 
            const targetsArray = item.targets; 
            const randomTarget = targetsArray[Math.floor(Math.random() * targetsArray.length)]; 
            img.src = randomTarget; 
        } else { 
            img.src = item.target; 
        } 
        img.className = 'target-item'; 
        img.setAttribute('data-id', item.id); 
        targetZone.appendChild(img); 
    }); 
}

function setupBigSmallGame() {
    // 1. Очищаем зону для предметов
    document.getElementById('bs-drag-zone').innerHTML = ''; 
    
    // 2. Берём НАШУ ПОЛНУЮ БАЗУ ИЗ 12 ПАР
    const allPairs = roomsData['big_small'];
    
    // ПРОВЕРКА ИНДЕКСА: если вышли за пределы 12 пар, сбрасываем в 0 и перемешиваем для нового круга
    if (currentPairIndex >= allPairs.length || currentPairIndex < 0) {
        currentPairIndex = 0; 
        shuffleArray(allPairs);
    }
    
    // 3. Достаем конкретную пару по текущему индексу
    const pair = allPairs[currentPairIndex];
    bsActiveItemsCount = 2; // Ждем, пока разложат оба предмета
    
    const dragZone = document.getElementById('bs-drag-zone');
    
    // 4. Создаем БОЛЬШОЙ предмет (240px)
    const bigImg = document.createElement('img');
    bigImg.src = pair.big_img; 
    bigImg.className = 'draggable-item';
    bigImg.setAttribute('data-size', 'big'); 
    bigImg.setAttribute('data-sound', pair.big_sound);
    bigImg.style.cssText = 'width: 240px; height: 240px; margin: 10px;'; 
    bigImg.addEventListener('touchstart', handlePointerStart, {passive: false});
    bigImg.addEventListener('mousedown', handlePointerStart);
    
    // 5. Создаем МАЛЕНЬКИЙ предмет (120px)
    const smallImg = document.createElement('img');
    smallImg.src = pair.small_img; 
    smallImg.className = 'draggable-item';
    smallImg.setAttribute('data-size', 'small'); 
    smallImg.setAttribute('data-sound', pair.small_sound);
    smallImg.style.cssText = 'width: 120px; height: 120px; margin: 10px;'; 
    smallImg.addEventListener('touchstart', handlePointerStart, {passive: false});
    smallImg.addEventListener('mousedown', handlePointerStart);
    
    // 6. Перемешиваем их случайно (лево/право), чтобы Сева не запоминал шаблон
    const items = [bigImg, smallImg];
    shuffleArray(items);
    items.forEach(img => dragZone.appendChild(img));
}

function handlePointerStart(e) { 
    if (e.type === 'touchstart') e.preventDefault(); 
    if (e.target.classList.contains('matched')) return; 
    
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
            vkBridge.send("VKWebAppTapticImpactOccurred", {"style": "medium"}).catch(() => {});
            activeItem.style.display = 'none'; 
            playSound('color_correct.wav'); 
            bsActiveItemsCount--;
            if (bsActiveItemsCount === 0) {
                currentPairIndex++;
                setTimeout(() => {
                    playSound('bs_win.wav'); 
                    setTimeout(setupBigSmallGame, 2000); 
                }, 1000); 
            }
            activeItem = null; return; 
        }
    } 
    else {
        const itemId = activeItem.getAttribute('data-id'); 
        if (target && target.getAttribute('data-id') === itemId && !target.classList.contains('matched')) { 
            vkBridge.send("VKWebAppTapticImpactOccurred", {"style": "medium"}).catch(() => {}); 
            activeItem.classList.add('matched'); 
            target.classList.add('matched'); 
            activeItem.style.display = 'none'; 
            
            if (currentRoom === 'colors') playSound('color_correct.wav'); 
            else if (currentRoom === 'feeding') { 
                const animalSound = roomsData['feeding'].find(a => a.id === itemId).sound; 
                playSound('f_yum.wav'); 
                setTimeout(() => playSound(animalSound), 1000); 
            } else if (currentRoom === 'shapes') { 
                playSound('shape_correct.wav'); 
            } 
            
            matchedCount++; 
            if (matchedCount === 3) { 
                if (currentRoom === 'colors') setTimeout(() => { playSound('color_win.wav'); setTimeout(setupDragGame, 4500); }, 1500); 
                else if (currentRoom === 'feeding') setTimeout(() => { playSound('f_win.wav'); setTimeout(setupDragGame, 3500); }, 3000); 
                else if (currentRoom === 'shapes') setTimeout(() => { playSound('shapes_win.wav'); setTimeout(setupDragGame, 4000); }, 2000); 
            }
            activeItem = null; return; 
        } 
    }

    vkBridge.send("VKWebAppTapticImpactOccurred", {"style": "light"}).catch(() => {}); 
    playSound('wrong.wav'); 
    activeItem.style.transition = 'all 0.3s ease'; 
    activeItem.style.position = 'relative'; 
    activeItem.style.left = '0px'; activeItem.style.top = '0px'; 
    activeItem.style.width = ''; activeItem.style.height = ''; 
    setTimeout(() => { if (activeItem) activeItem.style.transition = 'none'; }, 300); 
    activeItem = null; 
}

document.addEventListener('touchmove', handlePointerMove, {passive: false}); document.addEventListener('touchend', handlePointerEnd); document.addEventListener('mousemove', handlePointerMove); document.addEventListener('mouseup', handlePointerEnd);

function startNewQuizRound() { const allCards = [...roomsData[currentRoom]]; shuffleArray(allCards); quizCards = allCards.slice(0, 4); const randomTarget = quizCards[Math.floor(Math.random() * quizCards.length)]; expectedCardId = randomTarget.id; renderQuizGrid(); if (currentRoom === 'letters') playSound(`q_b_${randomTarget.id}.wav`); else if (randomTarget.sound) { const soundFilename = randomTarget.sound.split('/').pop(); const fileBase = soundFilename.substring(0, soundFilename.lastIndexOf('.')); playSound(`q${fileBase}.wav`); } }
function renderQuizGrid() { const quizArea = document.getElementById('quiz-area'); quizArea.innerHTML = ''; quizCards.forEach(card => { const cardDiv = document.createElement('div'); cardDiv.className = 'quiz-card'; cardDiv.innerHTML = `<img src="${card.image}"><div>${card.text}</div>`; cardDiv.onclick = () => handleQuizClick(card.id); quizArea.appendChild(cardDiv); }); }
function handleQuizClick(actionId) { vkBridge.send("VKWebAppTapticImpactOccurred", {"style": "light"}).catch(() => {}); if (actionId === expectedCardId) { playSound('correct.wav'); setTimeout(startNewQuizRound, 1500); } else { playSound('wrong.wav'); } }
function shuffleArray(array) { for (let i = array.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [array[i], array[j]] = [array[j], array[i]]; } return array; }
function updateQuizToggleUI() { const btn = document.getElementById('quizToggle'); if (isQuizMode) { btn.innerText = "🛑 Выключить"; btn.style.backgroundColor = "#95D5B2"; btn.style.color = "#FFFFFF"; } else { btn.innerText = "🎓 Игра"; btn.style.backgroundColor = "#FFFFFF"; btn.style.color = "var(--text-color)"; } }
function playSound(soundFile) { if (soundFile) { const audio = new Audio(soundFile); audio.play().catch(err => console.log(err)); } }
