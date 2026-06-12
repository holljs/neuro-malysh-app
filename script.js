// ==========================================
// ЗАГЛУШКА НА СЛУЧАЙ ПРОБЛЕМ С VK BRIDGE
// ==========================================
if (typeof vkBridge === 'undefined') {
    console.warn("⚠️ VK Bridge не загружен, создаём фиктивный объект");
    window.vkBridge = {
        send: (method, params) => {
            console.log("[FAKE] VK Bridge send:", method, params);
            if (method === 'VKWebAppGetUserInfo') {
                return Promise.resolve({ id: 550971822, first_name: 'Тест', last_name: '' });
            }
            if (method === 'VKWebAppInit') {
                return Promise.resolve({ result: true });
            }
            return Promise.resolve({});
        }
    };
}

// Безопасная обёртка для VK Bridge
const safeVkSend = async (method, params) => {
    try {
        return await vkBridge.send(method, params);
    } catch(e) {
        console.error(`❌ Ошибка при вызове ${method}:`, e);
        if (method === 'VKWebAppGetUserInfo') return { id: 550971822, first_name: 'Гость', last_name: '' };
        if (method === 'VKWebAppInit') return { result: true };
        return {};
    }
};

const isTestMode = true; 
const vkPlatform = new URLSearchParams(window.location.search).get('vk_platform') || 'desktop_web';
const isMobileVK = vkPlatform.includes('mobile');
let userHasPremium = false; 

const SERVER_URL = "https://neuro-master.online"; 
const freeRooms = ['animals', 'colors']; 

function getVkSignParams() {
    let search = window.location.search;
    let hash = window.location.hash;
    if (search && search.includes('vk_user_id=')) return search.substring(1);
    if (hash && hash.includes('vk_user_id=')) return hash.substring(1);
    return '';
}

async function initAppAndCheckPremium() {
    try {
        await safeVkSend('VKWebAppInit');
        const userInfo = await safeVkSend('VKWebAppGetUserInfo');
        const vkSignParams = getVkSignParams();
        
        const response = await fetch(`${SERVER_URL}/api/user/${userInfo.id}`, {
            method: 'GET',
            headers: { 
                'x-vk-sign': vkSignParams,
                'x-bot-token': 'SuperSecret_987654321_Token'
            }
        });
        const data = await response.json();
        userHasPremium = !!(data.has_premium === true || data.is_pro === true || data.subscription === true);
    } catch (error) {
        console.error("❌ Ошибка при проверке премиума:", error);
        userHasPremium = false; 
    } finally {
        applyLocks();
    }
}

async function isPremiumActive() {
    try {
        const userInfo = await safeVkSend('VKWebAppGetUserInfo');
        const vkSignParams = getVkSignParams();
        const response = await fetch(`${SERVER_URL}/api/user/${userInfo.id}`, {
            method: 'GET',
            headers: { 
                'x-vk-sign': vkSignParams,
                'x-bot-token': 'SuperSecret_987654321_Token'
            }
        });
        const data = await response.json();
        userHasPremium = !!(data.has_premium === true || data.is_pro === true || data.subscription === true);
        applyLocks();
        return userHasPremium;
    } catch(e) {
        console.error("❌ Ошибка проверки премиума:", e);
        return false; 
    }
}

function applyLocks() {
    // ЖЕЛЕЗОБЕТОННАЯ ПРОВЕРКА БАННЕРА
    const banner = document.getElementById('vip-bonus-banner');
    if (userHasPremium || localStorage.getItem('hide_vip_banner') === 'true') {
        if (banner) banner.style.display = 'none';
    } else {
        if (banner) banner.style.display = 'block';
    }

    const roomMapping = {
        'big_small': '.cat-bs',
        'shapes': '.cat-shapes',
        'draw': '.cat-draw',
        'feeding': '.cat-feed',
        'wants': '.cat-wants',
        'letters': '.cat-letters',
        'numbers': '.cat-numbers',
        'actions': '.cat-wind',
        'garden': '.cat-garden',
        'poems': '.cat-poems', 
        'yesno': '.cat-yesno', // НОВАЯ КОМНАТА
        'wind': '.cat-breeze'
    };

    for (const [roomId, classSelector] of Object.entries(roomMapping)) {
        if (!freeRooms.includes(roomId)) {
            const card = document.querySelector(classSelector);
            if (card) {
                const titleDiv = card.querySelector('.category-title');
                if (titleDiv) {
                    const cleanTitle = titleDiv.innerText.replace('🔒 ', '');
                    if (userHasPremium) {
                        titleDiv.innerText = cleanTitle;
                        card.style.opacity = '1';
                    } else {
                        if (!titleDiv.innerText.includes('🔒')) {
                            titleDiv.innerText = '🔒 ' + cleanTitle;
                        }
                        card.style.opacity = '0.85';
                    }
                }
            }
        }
    }
}

function openModal(modalId) {
    safeVkSend("VKWebAppTapticImpactOccurred", {"style": "light"}).catch(() => {});
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId, event) {
    if (event && event.target !== document.getElementById(modalId)) return;
    safeVkSend("VKWebAppTapticImpactOccurred", {"style": "light"}).catch(() => {});
    document.getElementById(modalId).classList.remove('active');
}

async function goToPayment() {
    safeVkSend("VKWebAppTapticImpactOccurred", {"style": "heavy"}).catch(() => {});
    const btn = document.querySelector('#paywall-modal .wind-start-btn');
    const originalText = btn.innerText;
    btn.innerText = "Создаем платеж...";
    btn.style.opacity = "0.7";
    btn.style.pointerEvents = "none";
    
    try {
        const userInfo = await safeVkSend('VKWebAppGetUserInfo');
        const vkSignParams = getVkSignParams();  
        const response = await fetch(`${SERVER_URL}/api/yookassa/create-payment`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-vk-sign": vkSignParams },
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
        btn.innerText = originalText; btn.style.opacity = "1"; btn.style.pointerEvents = "auto";
    }
}

function subscribeToGroup() {
    safeVkSend("VKWebAppTapticImpactOccurred", {"style": "heavy"}).catch(() => {});
    const groupId = 78549529; 
    safeVkSend("VKWebAppAllowMessagesFromGroup", {"group_id": groupId})
        .then(data => {
            if (data.result) {
                const banner = document.getElementById('vip-bonus-banner');
                if (banner) banner.style.display = 'none';
                localStorage.setItem('hide_vip_banner', 'true');
                openModal('bonus-success-modal');
            }
        })
        .catch(error => {
            console.log("Пользователь закрыл окно подписки:", error);
        });
}

let currentRoom = ''; let isQuizMode = false; let expectedCardId = null; let currentLearningIndex = 0; let quizCards = []; let playNamesMode = false; 
let activeItem = null; let dragOffsetX = 0, dragOffsetY = 0; let matchedCount = 0;
let currentPairIndex = 0; let bsActiveItemsCount = 0;
let canvasInitialized = false; 
let currentGardenLevel = 1; let gardenTargetCount = 0;
let currentPoemLevel = 0; let poemClickBlocked = false; let poemTimeout = null;
let currentYesNoLevel = 0; let yesNoClickBlocked = false; let yesNoTimeout = null;

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
    'yesno': [
        { bg: 'yn_bg_1.jpg', q_sound: 'yn_q1.wav', target: 'yes', a_sound: 'yn_yes1.wav' },
        { bg: 'yn_bg_2.jpg', q_sound: 'yn_q2.wav', target: 'yes', a_sound: 'yn_yes2.wav' },
        { bg: 'yn_bg_3.jpg', q_sound: 'yn_q3.wav', target: 'yes', a_sound: 'yn_yes3.wav' },
        { bg: 'yn_bg_4.jpg', q_sound: 'yn_q4.wav', target: 'yes', a_sound: 'yn_yes4.wav' },
        { bg: 'yn_bg_5.jpg', q_sound: 'yn_q5.wav', target: 'yes', a_sound: 'yn_yes5.wav' },
        { bg: 'yn_bg_6.jpg', q_sound: 'yn_q6.wav', target: 'no', a_sound: 'yn_no1.wav' },
        { bg: 'yn_bg_7.jpg', q_sound: 'yn_q7.wav', target: 'no', a_sound: 'yn_no2.wav' },
        { bg: 'yn_bg_8.jpg', q_sound: 'yn_q8.wav', target: 'no', a_sound: 'yn_no3.wav' },
        { bg: 'yn_bg_9.jpg', q_sound: 'yn_q9.wav', target: 'no', a_sound: 'yn_no4.wav' },
        { bg: 'yn_bg_10.jpg', q_sound: 'yn_q10.wav', target: 'no', a_sound: 'yn_no5.wav' }
    ],
    'poems': [
        { bg: 'poem_bg_1.png', q_sound: 'p_q1.wav', f_sound: 'p_f1.wav', target: 'p_opt_myachik', options: [{ id: 'p_opt_myachik', img: 'p_opt_myachik.png', sound: 'p_opt_myachik.wav' }, { id: 'p_opt_mashinka', img: 'p_opt_mashinka.png', sound: 'p_opt_mashinka.wav' }, { id: 'p_opt_domik', img: 'p_opt_domik.png', sound: 'p_opt_domik.wav' }] },
        { bg: 'poem_bg_2.png', q_sound: 'p_q2.wav', f_sound: 'p_f2.wav', target: 'p_opt_med', options: [{ id: 'p_opt_med', img: 'p_opt_med.png', sound: 'p_opt_med.wav' }, { id: 'p_opt_grib', img: 'p_opt_grib.png', sound: 'p_opt_grib.wav' }, { id: 'p_opt_yagoda', img: 'p_opt_yagoda.png', sound: 'p_opt_yagoda.wav' }] },
        { bg: 'poem_bg_3.png', q_sound: 'p_q3.wav', f_sound: 'p_f3.wav', target: 'p_opt_morkovka', options: [{ id: 'p_opt_morkovka', img: 'p_opt_morkovka.png', sound: 'p_opt_morkovka.wav' }, { id: 'p_opt_kapusta', img: 'p_opt_kapusta.png', sound: 'p_opt_kapusta.wav' }, { id: 'p_opt_yabloko', img: 'p_opt_yabloko.png', sound: 'p_opt_yabloko.wav' }] },
        { bg: 'poem_bg_4.png', q_sound: 'p_q4.wav', f_sound: 'p_f4.wav', target: 'p_opt_sir', options: [{ id: 'p_opt_sir', img: 'p_opt_sir.png', sound: 'p_opt_sir.wav' }, { id: 'p_opt_tort', img: 'p_opt_tort.png', sound: 'p_opt_tort.wav' }, { id: 'p_opt_banan', img: 'p_opt_banan.png', sound: 'p_opt_banan.wav' }] },
        { bg: 'poem_bg_5.png', q_sound: 'p_q5.wav', f_sound: 'p_f5.wav', target: 'p_opt_banan', options: [{ id: 'p_opt_banan', img: 'p_opt_banan.png', sound: 'p_opt_banan.wav' }, { id: 'p_opt_ogurec', img: 'p_opt_ogurec.png', sound: 'p_opt_ogurec.wav' }, { id: 'p_opt_limon', img: 'p_opt_limon.png', sound: 'p_opt_limon.wav' }] },
        { bg: 'poem_bg_6.png', q_sound: 'p_q6.wav', f_sound: 'p_f6.wav', target: 'p_opt_moloko', options: [{ id: 'p_opt_moloko', img: 'p_opt_moloko.png', sound: 'p_opt_moloko.wav' }, { id: 'p_opt_sok', img: 'p_opt_sok.png', sound: 'p_opt_sok.wav' }, { id: 'p_opt_chay', img: 'p_opt_chay.png', sound: 'p_opt_chay.wav' }] },
        { bg: 'poem_bg_7.png', q_sound: 'p_q7.wav', f_sound: 'p_f7.wav', target: 'p_opt_mashina', options: [{ id: 'p_opt_mashina', img: 'p_opt_mashina.png', sound: 'p_opt_mashina.wav' }, { id: 'p_opt_lodka', img: 'p_opt_lodka.png', sound: 'p_opt_lodka.wav' }, { id: 'p_opt_poezd', img: 'p_opt_poezd.png', sound: 'p_opt_poezd.wav' }] },
        { bg: 'poem_bg_8.png', q_sound: 'p_q8.wav', f_sound: 'p_f8.wav', target: 'p_opt_krisha', options: [{ id: 'p_opt_krisha', img: 'p_opt_krisha.png', sound: 'p_opt_krisha.wav' }, { id: 'p_opt_okno', img: 'p_opt_okno.png', sound: 'p_opt_okno.wav' }, { id: 'p_opt_dver', img: 'p_opt_dver.png', sound: 'p_opt_dver.wav' }] }
    ],
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
    'numbers': [{ id: '1', text: 'Один', sound: '1.wav', image: '1.jpg' }, { id: '2', text: 'Два', sound: '2.wav', image: '2.jpg' }, { id: '3', text: 'Три', sound: '3.wav', image: '3.jpg' }, { id: '4', text: 'Четыре', sound: '4.wav', image: '4.jpg' }, { id: '5', text: 'Пять', sound: '5.wav', image: '5.jpg' }, { id: '6', text: 'Шесть', sound: '6.wav', image: '6.jpg' }, { id: '7', text: 'Семь', sound: '7.wav', image: '7.jpg' }, { id: '8', text: 'Восемь', sound: '8.wav', image: '8.jpg' }, { id: '9', text: 'Девять', sound: '9.wav', image: '9.jpg' }, { id: '10', text: 'Десять', sound: '10.wav', image: '10.jpg' }],
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
    ],
    'garden': [
        { level: 1, count: 1, sound: 'g_level1.wav', bg: 'garden_bg_1.png', item: 'garden_item_1.png' },
        { level: 2, count: 2, sound: 'g_level2.wav', bg: 'garden_bg_2.png', item: 'garden_item_2.png' },
        { level: 3, count: 3, sound: 'g_level3.wav', bg: 'garden_bg_3.png', item: 'garden_item_3.png' },
        { level: 4, count: 4, sound: 'g_level4.wav', bg: 'garden_bg_4.png', item: 'garden_item_4.png' },
        { level: 5, count: 5, sound: 'g_level5.wav', bg: 'garden_bg_5.png', item: 'garden_item_5.png' },
        { level: 6, count: 6, sound: 'g_level6.wav', bg: 'garden_bg_6.png', item: 'garden_item_6.png' },
        { level: 7, count: 7, sound: 'g_level7.wav', bg: 'garden_bg_7.png', item: 'garden_item_7.png' },
        { level: 8, count: 8, sound: 'g_level8.wav', bg: 'garden_bg_8.png', item: 'garden_item_8.png' },
        { level: 9, count: 9, sound: 'g_level9.wav', bg: 'garden_bg_9.png', item: 'garden_item_9.png' }
    ],
    'actions': [
        { id: 'run', text: 'Утя бежит', image: 'act_run.gif', sound: 'act_run.wav' },
        { id: 'swing', text: 'Утя качается', image: 'act_swing.gif', sound: 'act_swing.wav' },
        { id: 'wash', text: 'Утя моется', image: 'act_wash.gif', sound: 'act_wash.wav' },
        { id: 'play', text: 'Утя играет', image: 'act_play.gif', sound: 'act_play.wav' },
        { id: 'cry', text: 'Утя плачет', image: 'act_cry.gif', sound: 'act_cry.wav' },
        { id: 'jump', text: 'Утя прыгает', image: 'act_jump.gif', sound: 'act_jump.wav' },
        { id: 'talk', text: 'Утя говорит', image: 'act_talk.gif', sound: 'act_talk.wav' },
        { id: 'laugh', text: 'Утя смеется', image: 'act_laugh.gif', sound: 'act_laugh.wav' },
        { id: 'dance', text: 'Утя танцует', image: 'act_dance.gif', sound: 'act_dance.wav' }
    ]
};

async function openRoom(roomId, title) {
    stopAllAudio(); // ⬅️ ДОБАВИЛИ СЮДА
    safeVkSend("VKWebAppTapticImpactOccurred", {"style": "light"}).catch(() => {});
    
    if (!freeRooms.includes(roomId)) {
        const hasAccess = await isPremiumActive();
        if (!hasAccess) {
            if (isMobileVK) openModal('mobile-paywall-modal');
            else openModal('paywall-modal');
            return;
        }
    }
    
    currentRoom = roomId; isQuizMode = false; currentLearningIndex = 0;
    document.getElementById('quiz-area').classList.remove('active'); 
    document.getElementById('game-area').classList.remove('active'); 
    document.getElementById('bs-area').classList.remove('active'); 
    document.getElementById('learning-area').style.display = 'none'; 
    document.getElementById('wants-area').classList.remove('active'); 
    document.getElementById('draw-area').classList.remove('active'); 
    document.getElementById('wind-area').style.display = 'none'; 
    document.getElementById('garden-area').style.display = 'none'; 
    document.getElementById('poems-area').style.display = 'none'; 
    document.getElementById('yesno-area').style.display = 'none'; // НОВАЯ КОМНАТА
    document.getElementById('quizToggle').style.display = 'block'; 
    
    if (roomId === 'wants') { document.getElementById('quizToggle').style.display = 'none'; document.getElementById('wants-area').classList.add('active'); renderWantsBoard(); } 
    else if (roomId === 'draw') { document.getElementById('quizToggle').style.display = 'none'; document.getElementById('draw-area').classList.add('active'); initDrawCanvas(); } 
    else if (roomId === 'feeding') { document.getElementById('learning-area').style.display = 'none'; toggleQuiz(); }
    else if (roomId === 'big_small') { document.getElementById('quizToggle').style.display = 'none'; document.getElementById('bs-area').classList.add('active'); setupBigSmallGame(); }
    else if (roomId === 'wind') { 
        document.getElementById('quizToggle').style.display = 'none'; 
        document.getElementById('wind-area').style.display = 'flex'; 
        document.getElementById('wind-instruction').innerText = "Нажми кнопку и подуй в телефон!"; 
        document.getElementById('wind-start-btn').style.display = 'block'; 
    }
    else if (roomId === 'garden') { 
        document.getElementById('quizToggle').style.display = 'none'; 
        document.getElementById('garden-area').style.display = 'flex'; 
        currentGardenLevel = 1; 
        setupGardenGame(); 
    }
    else if (roomId === 'poems') { 
        document.getElementById('quizToggle').style.display = 'none'; 
        document.getElementById('poems-area').style.display = 'flex'; 
        currentPoemLevel = 0; 
        setupPoemGame(); 
    }
    else if (roomId === 'yesno') { 
        document.getElementById('quizToggle').style.display = 'none'; 
        document.getElementById('yesno-area').style.display = 'flex'; 
        currentYesNoLevel = 0; 
        setupYesNoGame(); 
    }
    else { document.getElementById('learning-area').style.display = 'flex'; renderLearningCard(); updateQuizToggleUI(); }

    document.getElementById('room-title').innerText = title;
    document.getElementById('screen-menu').classList.remove('active'); 
    document.getElementById('screen-room').classList.add('active');
}

function goHome() { 
    stopAllAudio(); // ⬅️ ДОБАВИЛИ СЮДА
    if (typeof stopWindGame === 'function') stopWindGame();
    clearTimeout(poemTimeout); 
    clearTimeout(yesNoTimeout); // Очищаем таймер Да/Нет
    document.getElementById('screen-room').classList.remove('active'); 
    document.getElementById('screen-menu').classList.add('active'); 
}

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
function changeDrawImage(dir) { safeVkSend("VKWebAppTapticImpactOccurred", {"style": "light"}).catch(() => {}); currentDrawIndex += dir; if (currentDrawIndex < 0) currentDrawIndex = drawData.length - 1; if (currentDrawIndex >= drawData.length) currentDrawIndex = 0; updateDrawImage(); clearDrawCanvas(false); }
function updateDrawImage() { document.getElementById('contourImage').src = drawData[currentDrawIndex].file; document.getElementById('draw-image-title').innerText = drawData[currentDrawIndex].text; }
function setBrushColor(colorHex, soundName, btnElem) { safeVkSend("VKWebAppTapticImpactOccurred", {"style": "light"}).catch(() => {}); playSound(soundName + '.wav'); brushColor = colorHex; document.querySelectorAll('.color-btn').forEach(btn => btn.classList.remove('active')); btnElem.classList.add('active'); }
function clearDrawCanvas(playAudio = true) { if(playAudio) playSound('paint_clear.wav'); ctx.clearRect(0, 0, paintCanvas.width, paintCanvas.height); ctx.fillStyle = "white"; ctx.fillRect(0, 0, paintCanvas.width, paintCanvas.height); }
function getMousePos(evt) { const rect = paintCanvas.getBoundingClientRect(); const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX; const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY; return { x: (clientX - rect.left) * (paintCanvas.width / rect.width), y: (clientY - rect.top) * (paintCanvas.height / rect.height) }; }
function startDrawing(e) { e.preventDefault(); isDrawing = true; const pos = getMousePos(e); ctx.beginPath(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = brushColor; ctx.lineWidth = brushSize; ctx.moveTo(pos.x, pos.y); ctx.lineTo(pos.x, pos.y + 0.1); ctx.stroke(); }
function drawPath(e) { if (!isDrawing) return; e.preventDefault(); const pos = getMousePos(e); ctx.lineTo(pos.x, pos.y); ctx.stroke(); ctx.beginPath(); ctx.moveTo(pos.x, pos.y); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = brushColor; ctx.lineWidth = brushSize; }
function stopDrawing(e) { if (isDrawing && Math.random() < 0.1) { playSound(Math.random() > 0.5 ? 'paint_good.wav' : 'paint_beautiful.wav'); } isDrawing = false; }

function toggleSoundMode(event) { if (event) event.stopPropagation(); safeVkSend("VKWebAppTapticImpactOccurred", {"style": "light"}).catch(() => {}); playNamesMode = !playNamesMode; renderLearningCard(); }
function renderWantsBoard() { const area = document.getElementById('wants-area'); area.innerHTML = ''; roomsData['wants'].forEach(card => { const cardDiv = document.createElement('div'); cardDiv.className = 'wants-card'; cardDiv.innerHTML = `<img src="${card.image}"><div>${card.text}</div>`; cardDiv.onclick = () => { safeVkSend("VKWebAppTapticImpactOccurred", {"style": "light"}).catch(() => {}); playSound(card.sound); }; area.appendChild(cardDiv); }); }

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
    
    // ВЕРНУЛИ ПОТЕРЯННУЮ СКОБОЧКУ ВОТ ТУТ:
    if (currentSoundToPlay) playSound(currentSoundToPlay); 
}

function prevLearningCard() { 
    stopAllAudio(); // ⬅️ ДОБАВИЛИ СЮДА
    safeVkSend("VKWebAppTapticImpactOccurred", {"style": "light"}).catch(() => {}); 
    const cards = roomsData[currentRoom]; 
    currentLearningIndex = (currentLearningIndex === 0) ? cards.length - 1 : currentLearningIndex - 1; 
    renderLearningCard(); 
}

function nextLearningCard() { 
    stopAllAudio(); // ⬅️ ДОБАВИЛИ СЮДА
    safeVkSend("VKWebAppTapticImpactOccurred", {"style": "light"}).catch(() => {}); 
    const cards = roomsData[currentRoom]; 
    currentLearningIndex = (currentLearningIndex === cards.length - 1) ? 0 : currentLearningIndex + 1; 
    renderLearningCard(); 
}

function toggleQuiz() { 
    safeVkSend("VKWebAppTapticImpactOccurred", {"style": "medium"}).catch(() => {}); 
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

// ==========================================
// ЛОГИКА ИГРЫ: ДА ИЛИ НЕТ
// ==========================================
function setupYesNoGame() {
    const area = document.getElementById('yesno-area');
    const btnYes = document.getElementById('btn-yes');
    const btnNo = document.getElementById('btn-no');

    clearTimeout(yesNoTimeout);
    yesNoClickBlocked = false;

    btnYes.style.transform = 'scale(1)';
    btnYes.style.boxShadow = '0 8px 15px rgba(0,0,0,0.2)';
    btnNo.style.transform = 'scale(1)';
    btnNo.style.boxShadow = '0 8px 15px rgba(0,0,0,0.2)';

    if (currentYesNoLevel >= roomsData['yesno'].length) {
        currentYesNoLevel = 0;
    }
    if (currentYesNoLevel < 0) {
        currentYesNoLevel = roomsData['yesno'].length - 1;
    }

    const levelData = roomsData['yesno'][currentYesNoLevel];
    
    // Умная подгонка фона
    if (window.innerWidth < window.innerHeight) {
        area.style.backgroundPosition = 'center top'; 
        area.style.backgroundSize = 'contain'; // ⬅️ Вписываем картинку целиком по ширине
        area.style.backgroundRepeat = 'no-repeat';
        area.style.backgroundColor = '#FFF9C4'; // ⬅️ Добавляем нежный фон под картинкой
    } else {
        area.style.backgroundPosition = 'center top';
        area.style.backgroundSize = 'cover';
        area.style.backgroundRepeat = 'no-repeat';
    }
    area.style.backgroundImage = `url('${levelData.bg}')`;

    playSound(levelData.q_sound);
}

function prevYesNo() {
    stopAllAudio(); // ⬅️ ДОБАВИЛИ СЮДА
    safeVkSend("VKWebAppTapticImpactOccurred", {"style": "light"}).catch(() => {});
    currentYesNoLevel--;
    setupYesNoGame();
}

function nextYesNo() {
    stopAllAudio(); // ⬅️ ДОБАВИЛИ СЮДА
    safeVkSend("VKWebAppTapticImpactOccurred", {"style": "light"}).catch(() => {});
    currentYesNoLevel++;
    setupYesNoGame();
}

function handleYesNoClick(choice) {
    if (yesNoClickBlocked) return;
    safeVkSend("VKWebAppTapticImpactOccurred", {"style": "light"}).catch(() => {});

    const levelData = roomsData['yesno'][currentYesNoLevel];
    const btn = choice === 'yes' ? document.getElementById('btn-yes') : document.getElementById('btn-no');

    if (choice === levelData.target) {
        yesNoClickBlocked = true;
        btn.style.transform = 'scale(1.15)';
        btn.style.boxShadow = choice === 'yes' ? '0 0 20px 10px #4DFF4D' : '0 0 20px 10px #FF4D4D';
        
        playSound(levelData.a_sound);
        
        yesNoTimeout = setTimeout(() => {
            currentYesNoLevel++;
            setupYesNoGame();
        }, 2500); 
    } else {
        playSound('wrong.wav'); 
        btn.style.animation = 'shakeOpt 0.4s ease'; 
        setTimeout(() => {
            btn.style.animation = ''; 
        }, 400);
    }
}
// ==========================================


function setupPoemGame() {
    const area = document.getElementById('poems-area');
    const optionsContainer = document.getElementById('poem-options');
    const successImg = document.getElementById('poem-success-img');

    clearTimeout(poemTimeout);
    
    successImg.style.display = 'none';
    optionsContainer.innerHTML = '';
    poemClickBlocked = false;

    if (currentPoemLevel >= roomsData['poems'].length) {
        currentPoemLevel = 0;
    }
    if (currentPoemLevel < 0) {
        currentPoemLevel = roomsData['poems'].length - 1;
    }

    const levelData = roomsData['poems'][currentPoemLevel];
    
    if (window.innerWidth < window.innerHeight) {
        area.style.backgroundPosition = 'left top'; 
    } else {
        area.style.backgroundPosition = 'center top';
    }
    area.style.backgroundImage = `url('${levelData.bg}')`;

    playSound(levelData.q_sound);

    let options = shuffleArray([...levelData.options]);

    options.forEach(opt => {
        const btn = document.createElement('div');
        btn.style.width = '30%';
        btn.style.maxWidth = '110px';
        btn.style.aspectRatio = '1/1';
        btn.style.backgroundColor = '#ffffff';
        btn.style.borderRadius = '20px';
        btn.style.boxShadow = '0 6px 12px rgba(0,0,0,0.15)';
        btn.style.display = 'flex';
        btn.style.justifyContent = 'center';
        btn.style.alignItems = 'center';
        btn.style.cursor = 'pointer';
        btn.style.transition = 'transform 0.2s, box-shadow 0.2s';
        
        const img = document.createElement('img');
        img.src = opt.img;
        img.style.width = '75%';
        img.style.height = '75%';
        img.style.objectFit = 'contain';
        img.style.pointerEvents = 'none';
        
        btn.appendChild(img);
        btn.onclick = () => handlePoemClick(opt, levelData, btn);
        optionsContainer.appendChild(btn);
    });
}

function prevPoem() {
    stopAllAudio(); // ⬅️ ДОБАВИЛИ СЮДА
    safeVkSend("VKWebAppTapticImpactOccurred", {"style": "light"}).catch(() => {});
    currentPoemLevel--;
    setupPoemGame();
}

function nextPoem() {
    stopAllAudio(); // ⬅️ ДОБАВИЛИ СЮДА
    safeVkSend("VKWebAppTapticImpactOccurred", {"style": "light"}).catch(() => {});
    currentPoemLevel++;
    setupPoemGame();
}

function handlePoemClick(opt, levelData, btnElem) {
    if (poemClickBlocked) return;
    
    safeVkSend("VKWebAppTapticImpactOccurred", {"style": "light"}).catch(() => {});
    
    if (opt.id === levelData.target) {
        poemClickBlocked = true;
        btnElem.style.transform = 'scale(1.1)';
        btnElem.style.boxShadow = '0 0 15px 5px #4DFF4D'; 
        
        const successImg = document.getElementById('poem-success-img');
        successImg.src = opt.img;
        successImg.style.display = 'block';
        
        playSound(levelData.f_sound);
        
        poemTimeout = setTimeout(() => {
            currentPoemLevel++;
            setupPoemGame();
        }, 3500); 
    } else {
        playSound(opt.sound); 
        btnElem.style.animation = 'shakeOpt 0.4s ease'; 
        setTimeout(() => {
            btnElem.style.animation = ''; 
        }, 400);
    }
}


function setupGardenGame() {
    const targetZone = document.getElementById('garden-targets');
    const dragZone = document.getElementById('garden-drags');
    targetZone.innerHTML = ''; dragZone.innerHTML = '';
    matchedCount = 0;

    const levelData = roomsData['garden'].find(l => l.level === currentGardenLevel);
    if (!levelData) {
        playSound('bs_win.wav');
        currentGardenLevel = 1; 
        setTimeout(setupGardenGame, 3000);
        return;
    }

    gardenTargetCount = levelData.count;
    document.getElementById('garden-area').style.backgroundImage = `url('${levelData.bg}')`;
    
    if (window.innerWidth < window.innerHeight) {
        document.getElementById('garden-area').style.backgroundPosition = 'left top'; 
    } else {
        document.getElementById('garden-area').style.backgroundPosition = 'center top';
    }
    playSound(levelData.sound);

    const itemSize = gardenTargetCount > 5 ? '65px' : '85px';

    for(let i=0; i < gardenTargetCount; i++) {
        const img = document.createElement('img');
        img.src = levelData.item;
        img.className = 'target-item';
        img.setAttribute('data-id', 'veg');
        img.style.filter = 'brightness(0)';
        img.style.WebkitFilter = 'brightness(0)'; 
        img.style.opacity = '0.5'; 
        img.style.width = itemSize; img.style.height = itemSize; img.style.objectFit = 'contain';
        img.style.margin = '5px';
        targetZone.appendChild(img);
    }

    for(let i=0; i < gardenTargetCount; i++) {
        const img = document.createElement('img');
        img.src = levelData.item;
        img.className = 'draggable-item';
        img.setAttribute('data-id', 'veg');
        img.style.width = itemSize; img.style.height = itemSize; img.style.objectFit = 'contain';
        img.style.margin = '5px';
        img.ondragstart = () => false;
        img.addEventListener('pointerdown', onDragStart);
        dragZone.appendChild(img);
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
        img.addEventListener('pointerdown', onDragStart); 
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
    document.getElementById('bs-drag-zone').innerHTML = ''; 
    
    const allPairs = roomsData['big_small'];
    if (currentPairIndex >= allPairs.length || currentPairIndex < 0) {
        currentPairIndex = 0; 
        shuffleArray(allPairs);
    }
    
    const pair = allPairs[currentPairIndex];
    bsActiveItemsCount = 2; 
    const dragZone = document.getElementById('bs-drag-zone');
    
    const bigImg = document.createElement('img');
    bigImg.src = pair.big_img; bigImg.className = 'draggable-item bs-drag-big';
    bigImg.setAttribute('data-size', 'big'); bigImg.setAttribute('data-sound', pair.big_sound);
    bigImg.addEventListener('pointerdown', onDragStart); 
    bigImg.ondragstart = () => false;
    
    const smallImg = document.createElement('img');
    smallImg.src = pair.small_img; smallImg.className = 'draggable-item bs-drag-small';
    smallImg.setAttribute('data-size', 'small'); smallImg.setAttribute('data-sound', pair.small_sound);
    smallImg.addEventListener('pointerdown', onDragStart);
    smallImg.ondragstart = () => false;
    
    const items = [bigImg, smallImg];
    shuffleArray(items);
    items.forEach(img => dragZone.appendChild(img));
}

function onDragStart(e) {
    if (!e.target.classList.contains('draggable-item') || e.target.classList.contains('matched')) return;
    e.preventDefault();
    e.target.setPointerCapture(e.pointerId);
    
    activeItem = e.target;
    const rect = activeItem.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;
    
    activeItem.style.width = rect.width + 'px';
    activeItem.style.height = rect.height + 'px';
    activeItem.style.minWidth = rect.width + 'px';
    activeItem.style.minHeight = rect.height + 'px';
    activeItem.classList.add('dragging');
    activeItem.style.position = 'fixed';
    activeItem.style.zIndex = '1000';
    activeItem.style.left = (e.clientX - dragOffsetX) + 'px';
    activeItem.style.top = (e.clientY - dragOffsetY) + 'px';
    
    if (currentRoom === 'big_small' && activeItem) {
        const currentSound = activeItem.getAttribute('data-sound');
        if (currentSound) playSound(currentSound);
    }
}

function onDragMove(e) {
    if (!activeItem) return;
    e.preventDefault();
    activeItem.style.left = (e.clientX - dragOffsetX) + 'px';
    activeItem.style.top = (e.clientY - dragOffsetY) + 'px';
}

function onDragEnd(e) {
    if (!activeItem) return;
    activeItem.releasePointerCapture?.(e.pointerId);
    activeItem.classList.remove('dragging');
    
    const rectDrag = activeItem.getBoundingClientRect();
    const centerX = rectDrag.left + rectDrag.width / 2;
    const centerY = rectDrag.top + rectDrag.height / 2;
    
    activeItem.style.display = 'none';
    const elemUnderPointer = document.elementsFromPoint(centerX, centerY) || [];
    let target = null;
    for (let el of elemUnderPointer) {
        if (el.classList && el.classList.contains('target-item')) {
            target = el;
            break;
        }
    }
    activeItem.style.display = '';
    
    if (currentRoom === 'big_small') {
        if (target && target.getAttribute('data-size') === activeItem.getAttribute('data-size')) {
            safeVkSend("VKWebAppTapticImpactOccurred", {"style": "medium"}).catch(() => {});
            activeItem.style.display = 'none';
            playSound('color_correct.wav');
            bsActiveItemsCount--;
            if (bsActiveItemsCount === 0) {
                    currentPairIndex++;
                    setTimeout(() => {
                        playSound('molodec.wav'); 
                        setTimeout(setupBigSmallGame, 2000);
                    }, 1000);
                }
            activeItem = null;
            return;
        }
    } 
    else {
        const itemId = activeItem.getAttribute('data-id');
        if (target && target.getAttribute('data-id') === itemId && !target.classList.contains('matched')) {
            safeVkSend("VKWebAppTapticImpactOccurred", {"style": "medium"}).catch(() => {});
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
            } else if (currentRoom === 'garden') {
                target.style.filter = 'none';
                target.style.WebkitFilter = 'none';
                target.style.opacity = '1';
                playSound((matchedCount + 1) + '.wav'); 
            }
            
            matchedCount++;
            
            if (currentRoom === 'colors' && matchedCount === 3) setTimeout(() => { playSound('color_win.wav'); setTimeout(setupDragGame, 4500); }, 1500);
            else if (currentRoom === 'feeding' && matchedCount === 3) setTimeout(() => { playSound('f_win.wav'); setTimeout(setupDragGame, 3500); }, 3000);
            else if (currentRoom === 'shapes' && matchedCount === 3) setTimeout(() => { playSound('shapes_win.wav'); setTimeout(setupDragGame, 4000); }, 2000);
            else if (currentRoom === 'garden' && matchedCount === gardenTargetCount) {
                setTimeout(() => {
                    playSound('g_win.wav');
                    currentGardenLevel++;
                    setTimeout(setupGardenGame, 6000); 
                }, 1200);
            }
            activeItem = null;
            return;
        }
    }
    
    safeVkSend("VKWebAppTapticImpactOccurred", {"style": "light"}).catch(() => {});
    playSound('wrong.wav');
    activeItem.style.transition = 'all 0.3s ease';
    activeItem.style.position = '';
    activeItem.style.left = '';
    activeItem.style.top = '';
    activeItem.style.width = '';
    activeItem.style.height = '';
    setTimeout(() => {
        if (activeItem) activeItem.style.transition = '';
    }, 300);
    activeItem = null;
}

document.addEventListener('pointermove', onDragMove);
document.addEventListener('pointerup', onDragEnd);

function startNewQuizRound() { const allCards = [...roomsData[currentRoom]]; shuffleArray(allCards); quizCards = allCards.slice(0, 4); const randomTarget = quizCards[Math.floor(Math.random() * quizCards.length)]; expectedCardId = randomTarget.id; renderQuizGrid(); if (currentRoom === 'letters') playSound(`q_b_${randomTarget.id}.wav`); else if (randomTarget.sound) { const soundFilename = randomTarget.sound.split('/').pop(); const fileBase = soundFilename.substring(0, soundFilename.lastIndexOf('.')); playSound(`q${fileBase}.wav`); } }
function renderQuizGrid() { const quizArea = document.getElementById('quiz-area'); quizArea.innerHTML = ''; quizCards.forEach(card => { const cardDiv = document.createElement('div'); cardDiv.className = 'quiz-card'; cardDiv.innerHTML = `<img src="${card.image}"><div>${card.text}</div>`; cardDiv.onclick = () => handleQuizClick(card.id); quizArea.appendChild(cardDiv); }); }
function handleQuizClick(actionId) { safeVkSend("VKWebAppTapticImpactOccurred", {"style": "light"}).catch(() => {}); if (actionId === expectedCardId) { playSound('correct.wav'); setTimeout(startNewQuizRound, 1500); } else { playSound('wrong.wav'); } }
function shuffleArray(array) { for (let i = array.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [array[i], array[j]] = [array[j], array[i]]; } return array; }
function updateQuizToggleUI() { const btn = document.getElementById('quizToggle'); if (isQuizMode) { btn.innerText = "🛑 Выключить"; btn.style.backgroundColor = "#95D5B2"; btn.style.color = "#FFFFFF"; } else { btn.innerText = "🎓 Игра"; btn.style.backgroundColor = "#FFFFFF"; btn.style.color = "var(--text-color)"; } }
let activeAudios = [];
function playSound(soundFile) { 
    if (soundFile) { 
        const audio = new Audio(soundFile); 
        activeAudios.push(audio);
        audio.onended = () => { activeAudios = activeAudios.filter(a => a !== audio); };
        audio.play().catch(err => console.log(err)); 
    } 
}
function stopAllAudio() {
    activeAudios.forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
    });
    activeAudios = [];
}

window.addEventListener('focus', () => {
    isPremiumActive().catch(console.error);
});

initAppAndCheckPremium();

let audioCtx, analyser, microphone, javascriptNode, windSpeed = 0, windRotation = 0, windAnimFrame, windPraiseTimer = null, micStarted = false;

function startWindGame() {
    safeVkSend("VKWebAppTapticImpactOccurred", {"style": "medium"}).catch(() => {});
    document.getElementById('wind-start-btn').style.display = 'none';
    document.getElementById('wind-instruction').innerText = "Дуй сильнее!";
    playSound('wind_intro.wav');
    
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then(function(stream) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioCtx.createAnalyser();
            microphone = audioCtx.createMediaStreamSource(stream);
            javascriptNode = audioCtx.createScriptProcessor(2048, 1, 1);
            
            analyser.smoothingTimeConstant = 0.8;
            analyser.fftSize = 1024;
            microphone.connect(analyser);
            analyser.connect(javascriptNode);
            javascriptNode.connect(audioCtx.destination);
            micStarted = true;
            
            javascriptNode.onaudioprocess = function() {
                let array = new Uint8Array(analyser.frequencyBinCount);
                analyser.getByteFrequencyData(array);
                let values = 0;
                let length = array.length;
                for (let i = 0; i < length; i++) values += array[i];
                let average = values / length;
                
                if (average > 15) {
                    windSpeed += (average - 15) * 0.15;
                    if (windSpeed > 40) windSpeed = 40;
                }
            };
            updateWindSpinner();
        })
        .catch(function(err) {
            document.getElementById('wind-instruction').innerText = "Разреши доступ к микрофону :(";
            document.getElementById('wind-start-btn').style.display = 'block';
        });
}

function updateWindSpinner() {
    if (!micStarted) return;
    windRotation += windSpeed;
    windSpeed *= 0.97;
    if (windSpeed < 0) windSpeed = 0;
    
    document.getElementById('wind-spinner').style.transform = `rotate(${windRotation}deg)`;
    
    if (windSpeed > 25 && !windPraiseTimer) {
        playSound('wind_good.wav');
        windPraiseTimer = setTimeout(() => { windPraiseTimer = null; }, 5000);
    } else if (windSpeed > 10 && windSpeed <= 25 && Math.random() < 0.02 && !windPraiseTimer) {
        playSound('wind_more.wav');
        windPraiseTimer = setTimeout(() => { windPraiseTimer = null; }, 4000);
    }
    windAnimFrame = requestAnimationFrame(updateWindSpinner);
}

function stopWindGame() {
    micStarted = false;
    cancelAnimationFrame(windAnimFrame);
    if (audioCtx && audioCtx.state !== 'closed') {
        audioCtx.close().catch(e => console.log(e));
    }
}
