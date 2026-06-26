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
const freeRooms = ['animals', 'colors']; // Сказку пока делаем бесплатной для теста

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
        'yesno': '.cat-yesno',
        'words': '.cat-words', 
        'wind': '.cat-breeze',
        'story': '.cat-story',
        'music': '.cat-music' // <--- ДОБАВИЛИ ПИАНИНО СЮДА!
    };

    for (const [roomId, classSelector] of Object.entries(roomMapping)) {
        if (!freeRooms.includes(roomId)) {
            const card = document.querySelector(classSelector);
            if (card) {
                // Обязательно добавляем relative, чтобы бейдж позиционировался относительно карточки
                card.style.position = 'relative'; 

                // Удаляем старый бейдж, если он есть (чтобы не дублировались)
                const existingBadge = card.querySelector('.vip-badge');
                if (existingBadge) {
                    existingBadge.remove();
                }

                // Очищаем старые текстовые замки из заголовка (на случай, если они там остались)
                const titleDiv = card.querySelector('.category-title');
                if (titleDiv) {
                    titleDiv.innerText = titleDiv.innerText.replace('🔒 ', '');
                }

                if (userHasPremium) {
                    // Если премиум есть, карточка яркая и без бейджа
                    card.style.opacity = '1';
                } else {
                    // Если премиума нет, карточка тусклая и с красивым VIP-бейджем
                    card.style.opacity = '0.85';
                    
                    const badge = document.createElement('div');
                    badge.className = 'vip-badge';
                    // Золотой цвет для эмодзи замочка и белый текст VIP
                    badge.innerHTML = '<span style="color: #FFD700; font-size: 12px;">🔒</span> VIP'; 
                    card.appendChild(badge);
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
                amount: 88,
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
let currentWordsLevel = 0; let wordsActiveCount = 0; let wordsPlacedCount = 0; let wordsTimeout = null;

// Переменные для сказки
let currentStoryStep = -1; 
let storyClickBlocked = false; 
let storyTimeout = null;
let currentStoryId = ''; // <--- ДОБАВИТЬ ЭТУ СТРОЧКУ!

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
    'story': {
        'rain_walk': {
            title: '🌧️ Прогулка под дождем',
            end_sound: 'st_end.wav',
            steps: [
                {
                    q_sound: 'st_q1.wav',
                    choices: [
                        { id: 'norm', img: 'item_umbrella.png', bg: 'st_bg_1_norm.jpg', sound: 'st_a1_norm.wav' },
                        { id: 'abs', img: 'item_pot.png', bg: 'st_bg_1_abs.jpg', sound: 'st_a1_abs.wav' }
                    ]
                },
                {
                    q_sound: 'st_q2.wav',
                    choices: [
                        { id: 'norm', img: 'item_boots.png', bg: 'st_bg_2_norm.jpg', sound: 'st_a2_norm.wav' },
                        { id: 'abs', img: 'item_flippers.png', bg: 'st_bg_2_abs.jpg', sound: 'st_a2_abs.wav' }
                    ]
                },
                {
                    q_sound: 'st_q3.wav',
                    choices: [
                        { id: 'norm', img: 'item_boat.png', bg: 'st_bg_3_norm.jpg', sound: 'st_a3_norm.wav' },
                        { id: 'abs', img: 'item_basin.png', bg: 'st_bg_3_abs.jpg', sound: 'st_a3_abs.wav' }
                    ]
                },
                {
                    q_sound: 'st_q4.wav',
                    choices: [
                        { id: 'norm', img: 'item_bone.png', bg: 'st_bg_4_norm.jpg', sound: 'st_a4_norm.wav' },
                        { id: 'abs', img: 'item_shoe.png', bg: 'st_bg_4_abs.jpg', sound: 'st_a4_abs.wav' }
                    ]
                },
                {
                    q_sound: 'st_q5.wav',
                    choices: [
                        { id: 'norm', img: 'item_towel.png', bg: 'st_bg_5_norm.jpg', sound: 'st_a5_norm.wav' },
                        { id: 'abs', img: 'item_vacuum.png', bg: 'st_bg_5_abs.jpg', sound: 'st_a5_abs.wav' }
                    ]
                }
            ]
        },
        'fun_walk': {
            title: '☀️ Весёлая прогулка',
            end_sound: 'st2_end.wav',
            steps: [
                {
                    q_sound: 'st2_q1.wav',
                    choices: [
                        { id: 'norm', img: 'item_sneakers.png', bg: 'st2_bg_1_norm.jpg', sound: 'st2_a1_norm.wav' },
                        { id: 'abs', img: 'item_banana.png', bg: 'st2_bg_1_abs.jpg', sound: 'st2_a1_abs.wav' }
                    ]
                },
                {
                    q_sound: 'st2_q2.wav',
                    choices: [
                        { id: 'norm', img: 'item_mug.png', bg: 'st2_bg_2_norm.jpg', sound: 'st2_a2_norm.wav' },
                        { id: 'abs', img: 'item_boot.png', bg: 'st2_bg_2_abs.jpg', sound: 'st2_a2_abs.wav' }
                    ]
                },
                {
                    q_sound: 'st2_q3.wav',
                    choices: [
                        { id: 'norm', img: 'item_crayons.png', bg: 'st2_bg_3_norm.jpg', sound: 'st2_a3_norm.wav' },
                        { id: 'abs', img: 'item_sausage.png', bg: 'st2_bg_3_abs.jpg', sound: 'st2_a3_abs.wav' }
                    ]
                },
                {
                    q_sound: 'st2_q4.wav',
                    choices: [
                        { id: 'norm', img: 'item_bag.png', bg: 'st2_bg_4_norm.jpg', sound: 'st2_a4_norm.wav' },
                        { id: 'abs', img: 'item_washing_machine.png', bg: 'st2_bg_4_abs.jpg', sound: 'st2_a4_abs.wav' }
                    ]
                },
                {
                    q_sound: 'st2_q5.wav',
                    choices: [
                        { id: 'norm', img: 'item_pillow.png', bg: 'st2_bg_5_norm.jpg', sound: 'st2_a5_norm.wav' },
                        { id: 'abs', img: 'item_cactus.png', bg: 'st2_bg_5_abs.jpg', sound: 'st2_a5_abs.wav' }
                    ]
                }
            ]
        }
    },
    'words': [
        { id: 'kisa', text: 'Киса', image: 'puzzle_kisa.png', full_sound: 'w_kisa.wav', syllables: [{ sound: 'sl_ki.wav', label: 'КИ' }, { sound: 'sl_sa.wav', label: 'СА' }] },
        { id: 'zayka', text: 'Зайка', image: 'puzzle_zayka.png', full_sound: 'w_zayka.wav', syllables: [{ sound: 'sl_zay.wav', label: 'ЗАЙ' }, { sound: 'sl_ka.wav', label: 'КА' }] },
        { id: 'yozhik', text: 'Ёжик', image: 'puzzle_yozhik.png', full_sound: 'w_yozhik.wav', syllables: [{ sound: 'sl_yo.wav', label: 'Ё' }, { sound: 'sl_zhik.wav', label: 'ЖИК' }] },
        { id: 'slonik', text: 'Слоник', image: 'puzzle_slonik.png', full_sound: 'w_slonik.wav', syllables: [{ sound: 'sl_slo.wav', label: 'СЛО' }, { sound: 'sl_nik.wav', label: 'НИК' }] },
        { id: 'oslik', text: 'Ослик', image: 'puzzle_oslik.png', full_sound: 'w_oslik.wav', syllables: [{ sound: 'sl_os.wav', label: 'ОС' }, { sound: 'sl_lik.wav', label: 'ЛИК' }] },
        { id: 'svinka', text: 'Свинка', image: 'puzzle_svinka.png', full_sound: 'w_svinka.wav', syllables: [{ sound: 'sl_svin.wav', label: 'СВИН' }, { sound: 'sl_ka.wav', label: 'КА' }] },
        { id: 'loshad', text: 'Лошадь', image: 'puzzle_loshad.png', full_sound: 'w_loshad.wav', syllables: [{ sound: 'sl_lo.wav', label: 'ЛО' }, { sound: 'sl_shad.wav', label: 'ШАДЬ' }] },
        { id: 'domik', text: 'Домик', image: 'puzzle_domik.png', full_sound: 'w_domik.wav', syllables: [{ sound: 'sl_do.wav', label: 'ДО' }, { sound: 'sl_mik.wav', label: 'МИК' }] },
        { id: 'myachik', text: 'Мячик', image: 'puzzle_myachik.png', full_sound: 'w_myachik.wav', syllables: [{ sound: 'sl_mya.wav', label: 'МЯ' }, { sound: 'sl_chik.wav', label: 'ЧИК' }] },
        { id: 'lisa', text: 'Лиса', image: 'puzzle_lisa.png', full_sound: 'w_lisa.wav', syllables: [{ sound: 'sl_li.wav', label: 'ЛИ' }, { sound: 'sl_sa.wav', label: 'СА' }] },
        { id: 'kasha', text: 'Каша', image: 'puzzle_kasha.png', full_sound: 'w_kasha.wav', syllables: [{ sound: 'sl_ka.wav', label: 'КА' }, { sound: 'sl_sha.wav', label: 'ША' }] },
        { id: 'ryba', text: 'Рыба', image: 'puzzle_ryba.png', full_sound: 'w_ryba.wav', syllables: [{ sound: 'sl_ry.wav', label: 'РЫ' }, { sound: 'sl_ba.wav', label: 'БА' }] },
        { id: 'myshka', text: 'Мышка', image: 'puzzle_myshka.png', full_sound: 'w_myshka.wav', syllables: [{ sound: 'sl_mysh.wav', label: 'МЫШ' }, { sound: 'sl_ka.wav', label: 'КА' }] },
        { id: 'koza', text: 'Коза', image: 'puzzle_koza.png', full_sound: 'w_koza.wav', syllables: [{ sound: 'sl_ko.wav', label: 'КО' }, { sound: 'sl_za.wav', label: 'ЗА' }] },
        { id: 'ovtsa', text: 'Овца', image: 'puzzle_ovtsa.png', full_sound: 'w_ovtsa.wav', syllables: [{ sound: 'sl_ov.wav', label: 'ОВ' }, { sound: 'sl_tsa.wav', label: 'ЦА' }] }
    ],
    'yesno': [
        // ВАШИ СТАРЫЕ ЗАГАДКИ (ВСЁ НА МЕСТЕ!)
        { bg: 'yn_bg_1.jpg', q_sound: 'yn_q1.wav', target: 'yes', a_sound: 'yn_yes1.wav' },
        { bg: 'yn_bg_2.jpg', q_sound: 'yn_q2.wav', target: 'yes', a_sound: 'yn_yes2.wav' },
        { bg: 'yn_bg_3.jpg', q_sound: 'yn_q3.wav', target: 'yes', a_sound: 'yn_yes3.wav' },
        { bg: 'yn_bg_4.jpg', q_sound: 'yn_q4.wav', target: 'yes', a_sound: 'yn_yes4.wav' },
        { bg: 'yn_bg_5.jpg', q_sound: 'yn_q5.wav', target: 'yes', a_sound: 'yn_yes5.wav' },
        { bg: 'yn_bg_6.jpg', q_sound: 'yn_q6.wav', target: 'no', a_sound: 'yn_no1.wav' },
        { bg: 'yn_bg_7.jpg', q_sound: 'yn_q7.wav', target: 'no', a_sound: 'yn_no2.wav' },
        { bg: 'yn_bg_8.jpg', q_sound: 'yn_q8.wav', target: 'no', a_sound: 'yn_no3.wav' },
        { bg: 'yn_bg_9.jpg', q_sound: 'yn_q9.wav', target: 'no', a_sound: 'yn_no4.wav' },
        { bg: 'yn_bg_10.jpg', q_sound: 'yn_q10.wav', target: 'no', a_sound: 'yn_no5.wav' },
        
        // НАШИ НОВЫЕ 6 ЗАГАДОК (ДОБАВЛЕНЫ В КОНЕЦ)
        { bg: 'yesno_bag.png', q_sound: 'yesno_bag.wav', target: 'no', a_sound: 'yn_no1.wav' },
        { bg: 'yesno_elephant.png', q_sound: 'yesno_elephant.wav', target: 'no', a_sound: 'yn_no2.wav' },
        { bg: 'yesno_garden.png', q_sound: 'yesno_garden.wav', target: 'no', a_sound: 'yn_no3.wav' },
        
        { bg: 'yesno_walk.png', q_sound: 'yesno_walk.wav', target: 'yes', a_sound: 'yn_yes1.wav' },
        { bg: 'yesno_pie.png', q_sound: 'yesno_pie.wav', target: 'yes', a_sound: 'yn_yes2.wav' },
        { bg: 'yesno_hands.png', q_sound: 'yesno_hands.wav', target: 'yes', a_sound: 'yn_yes3.wav' }
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
    ]
};

async function openRoom(roomId, title) {
    stopAllAudio(); 
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
    document.getElementById('yesno-area').style.display = 'none'; 
    document.getElementById('words-area').style.display = 'none'; 
    if (document.getElementById('story-area')) document.getElementById('story-area').style.display = 'none';
    // Скрываем music-area, если она есть
    const musicArea = document.getElementById('music-area');
    if (musicArea) musicArea.style.display = 'none';
    document.getElementById('quizToggle').style.display = 'block'; 
    
    if (roomId === 'wants') { 
        document.getElementById('quizToggle').style.display = 'none'; 
        document.getElementById('wants-area').classList.add('active'); 
        renderWantsBoard(); 
    } 
    else if (roomId === 'draw') { 
        document.getElementById('quizToggle').style.display = 'none'; 
        document.getElementById('draw-area').classList.add('active'); 
        initDrawCanvas(); 
    } 
    else if (roomId === 'feeding') { 
        document.getElementById('learning-area').style.display = 'none'; 
        toggleQuiz(); 
    }
    else if (roomId === 'big_small') { 
        document.getElementById('quizToggle').style.display = 'none'; 
        document.getElementById('bs-area').classList.add('active'); 
        setupBigSmallGame(); 
    }
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
    else if (roomId === 'words') { 
        document.getElementById('quizToggle').style.display = 'none'; 
        document.getElementById('words-area').style.display = 'flex'; 
        currentWordsLevel = 0; 
        setupWordsGame(); 
    }
    else if (roomId === 'story') { 
        document.getElementById('quizToggle').style.display = 'none'; 
        const storyArea = document.getElementById('story-area');
        if (storyArea) storyArea.style.display = 'flex';
        setupStoryIntro(); 
    }
    else if (roomId === 'music') {   // <--- ПРАВИЛЬНОЕ МЕСТО
        document.getElementById('quizToggle').style.display = 'none'; 
        const area = document.getElementById('music-area');
        if (area) area.style.display = 'flex';
        setupMusicRoom(); 
    }
    else { 
        document.getElementById('learning-area').style.display = 'flex'; 
        renderLearningCard(); 
        updateQuizToggleUI(); 
    }

    document.getElementById('room-title').innerText = title;
    document.getElementById('screen-menu').classList.remove('active'); 
    document.getElementById('screen-room').classList.add('active');
}

// ==========================================
// ЛОГИКА ИГРЫ: ИНТЕРАКТИВНАЯ СКАЗКА
// ==========================================
function setupStoryIntro() {
    clearTimeout(storyTimeout);
    stopAllAudio(); 
    currentStoryStep = -1;
    storyClickBlocked = false;
    
    const area = document.getElementById('story-area');
    const ui = document.getElementById('story-ui');
    if (!area || !ui) return;

    area.style.backgroundImage = `url('st_bg_start.jpg')`;
    ui.innerHTML = '';
    
    // Делаем контейнер гибким, чтобы кнопки красиво выстраивались в ряд или столбик
    ui.style.flexDirection = 'column';
    ui.style.gap = '15px';

    // Автоматически рендерим кнопки для ВСЕХ сказок, сколько бы вы их ни добавили в будущем!
    Object.entries(roomsData['story']).forEach(([storyId, storyData]) => {
        const startBtn = document.createElement('div');
        startBtn.className = 'wind-start-btn';
        startBtn.style.position = 'relative';
        startBtn.style.bottom = 'auto';
        startBtn.style.left = 'auto';
        startBtn.style.transform = 'none';
        startBtn.style.width = '240px';
        startBtn.style.textAlign = 'center';
        
        startBtn.innerText = '▶️ ' + storyData.title;
        
        startBtn.onclick = () => {
            safeVkSend("VKWebAppTapticImpactOccurred", {"style": "medium"}).catch(() => {});
            stopAllAudio(); 
            currentStoryId = storyId; // Запоминаем ID выбранной сказки
            currentStoryStep = 0;
            setupStoryStep();
        };

        ui.appendChild(startBtn);
    });

    playSound('st_intro.wav'); // Звук-приветствие комнаты сказок
}

function setupStoryStep() {
    clearTimeout(storyTimeout);
    storyClickBlocked = false;
    stopAllAudio(); 
    
    const area = document.getElementById('story-area');
    const ui = document.getElementById('story-ui');
    
    // Достаем объект текущей сказки
    const story = roomsData['story'][currentStoryId];
    
    // Проверяем конец по длине шагов конкретной сказки
    if (currentStoryStep >= story.steps.length) {
        area.style.backgroundImage = `url('st_bg_start.jpg')`;
        ui.innerHTML = '';
        playSound(story.end_sound); // Концовка именно этой сказки!
        storyTimeout = setTimeout(goHome, 4000);
        return;
    }

    // Берем данные текущего шага
    const stepData = story.steps[currentStoryStep];
    ui.innerHTML = '';
    
    // Возвращаем кнопкам горизонтальное расположение для игрового процесса
    ui.style.flexDirection = 'row';
    ui.style.gap = '20px';

    const options = shuffleArray([...stepData.choices]);

    options.forEach(opt => {
        const btn = document.createElement('div');
        btn.style.width = '120px';
        btn.style.height = '120px';
        btn.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
        btn.style.borderRadius = '20px';
        btn.style.boxShadow = '0 6px 12px rgba(0,0,0,0.2)';
        btn.style.display = 'flex';
        btn.style.justifyContent = 'center';
        btn.style.alignItems = 'center';
        btn.style.cursor = 'pointer';
        btn.style.transition = 'transform 0.2s, box-shadow 0.2s';
        
        const img = document.createElement('img');
        img.src = opt.img;
        img.style.width = '80%';
        img.style.height = '80%';
        img.style.objectFit = 'contain';
        img.style.pointerEvents = 'none';
        
        btn.appendChild(img);
        btn.onclick = () => handleStoryChoice(opt, btn);
        ui.appendChild(btn);
    });

    playSound(stepData.q_sound);
}

function handleStoryChoice(opt, btnElem) {
    if (storyClickBlocked) return;
    storyClickBlocked = true;
    safeVkSend("VKWebAppTapticImpactOccurred", {"style": "light"}).catch(() => {});
    stopAllAudio();
    
    btnElem.style.transform = 'scale(1.1)';
    btnElem.style.boxShadow = '0 0 20px 10px #FFD700';
    
    const area = document.getElementById('story-area');
    area.style.backgroundImage = `url('${opt.bg}')`;
    
    const ui = document.getElementById('story-ui');
    ui.innerHTML = ''; // Прячем кнопки, чтобы ребенок смотрел картинку

    playSound(opt.sound);
    
    storyTimeout = setTimeout(() => {
        currentStoryStep++;
        setupStoryStep();
    }, 7000); // Увеличили паузу до 7 секунд, чтобы аудио не обрывалось!
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
    if (currentSoundToPlay) playSound(currentSoundToPlay); 
}

function prevLearningCard() { 
    stopAllAudio(); 
    safeVkSend("VKWebAppTapticImpactOccurred", {"style": "light"}).catch(() => {}); 
    const cards = roomsData[currentRoom]; 
    currentLearningIndex = (currentLearningIndex === 0) ? cards.length - 1 : currentLearningIndex - 1; 
    renderLearningCard(); 
}

function nextLearningCard() { 
    stopAllAudio(); 
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
    
    if (window.innerWidth < window.innerHeight) {
        area.style.backgroundPosition = 'center top'; 
        area.style.backgroundSize = 'contain'; 
        area.style.backgroundRepeat = 'no-repeat';
        area.style.backgroundColor = '#FFF9C4'; 
    } else {
        area.style.backgroundPosition = 'center top';
        area.style.backgroundSize = 'cover';
        area.style.backgroundRepeat = 'no-repeat';
    }
    area.style.backgroundImage = `url('${levelData.bg}')`;

    playSound(levelData.q_sound);
}

function prevYesNo() {
    stopAllAudio(); 
    safeVkSend("VKWebAppTapticImpactOccurred", {"style": "light"}).catch(() => {});
    currentYesNoLevel--;
    setupYesNoGame();
}

function nextYesNo() {
    stopAllAudio(); 
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

function setupWordsGame() {
    clearTimeout(wordsTimeout);
    const board = document.getElementById('words-shadow-board');
    const dock = document.getElementById('words-dock');
    
    board.style.width = '300px';
    board.style.height = '300px';
    board.innerHTML = '';
    dock.innerHTML = '';
    
    if (currentWordsLevel >= roomsData['words'].length) currentWordsLevel = 0;
    if (currentWordsLevel < 0) currentWordsLevel = roomsData['words'].length - 1;
    
    const levelData = roomsData['words'][currentWordsLevel];
    
    wordsPlacedCount = 0; 
    wordsActiveCount = 2; 
    
    if (currentWordsLevel === 0 && wordsPlacedCount === 0) {
        playSound('words_intro.wav');
    }

    const shadowImg = document.createElement('img');
    shadowImg.src = levelData.image;
    shadowImg.style.width = '100%';
    shadowImg.style.height = '100%';
    shadowImg.style.objectFit = 'contain';
    shadowImg.style.filter = 'brightness(0) opacity(0.12)';
    shadowImg.style.position = 'absolute';
    shadowImg.style.left = '0';
    shadowImg.style.top = '0';
    shadowImg.style.pointerEvents = 'none';
    board.appendChild(shadowImg);
    
    const clips2 = [
        'polygon(0 0, 52% 0, 45% 30%, 55% 70%, 48% 100%, 0 100%)',
        'polygon(52% 0, 100% 0, 100% 100%, 48% 100%, 55% 70%, 45% 30%)'
    ];
    
    let pieces = [];
    
    levelData.syllables.forEach((syl, index) => {
        const container = document.createElement('div');
        container.style.width = '110px'; 
        container.style.height = '110px';
        container.style.display = 'flex';
        container.style.justifyContent = 'center';
        container.style.alignItems = 'center';
        container.style.position = 'relative';
        
        const piece = document.createElement('div');
        piece.className = 'draggable-item word-puzzle-piece';
        
        piece.style.cssText += 'max-width: none !important; max-height: none !important;';
        piece.style.width = '300px';
        piece.style.height = '300px';
        piece.style.transform = 'scale(0.35)'; 
        piece.style.transformOrigin = 'center center';
        piece.style.flexShrink = '0';
        piece.style.position = 'relative';
        piece.style.cursor = 'pointer';
        piece.setAttribute('data-index', index);
        
        const img = document.createElement('img');
        img.src = levelData.image;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain';
        img.style.clipPath = clips2[index];
        img.style.webkitClipPath = clips2[index];
        img.style.pointerEvents = 'none';
        
        piece.appendChild(img);
        piece.ondragstart = () => false;
        piece.addEventListener('pointerdown', onDragStart);
        
        container.appendChild(piece);
        pieces.push(container);
    });
    
    shuffleArray(pieces);
    pieces.forEach(p => dock.appendChild(p));
}

function prevWordsLevel() {
    stopAllAudio();
    safeVkSend("VKWebAppTapticImpactOccurred", {"style": "light"}).catch(() => {});
    currentWordsLevel--;
    setupWordsGame();
}

function nextWordsLevel() {
    stopAllAudio();
    safeVkSend("VKWebAppTapticImpactOccurred", {"style": "light"}).catch(() => {});
    currentWordsLevel++;
    setupWordsGame();
}

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
    stopAllAudio(); 
    safeVkSend("VKWebAppTapticImpactOccurred", {"style": "light"}).catch(() => {});
    currentPoemLevel--;
    setupPoemGame();
}

function nextPoem() {
    stopAllAudio(); 
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
    
    if (currentRoom === 'words') {
        activeItem.style.cssText += 'max-width: none !important; max-height: none !important;';
        activeItem.style.width = '300px';
        activeItem.style.height = '300px';
        activeItem.style.transform = 'scale(1)';
        activeItem.style.transition = 'none'; 
        
        dragOffsetX = 150;
        dragOffsetY = 150;
        
        const levelData = roomsData['words'][currentWordsLevel];
        const currentSyllableSound = levelData.syllables[wordsPlacedCount].sound;
        playSound(currentSyllableSound);
        
    } else {
        dragOffsetX = e.clientX - rect.left;
        dragOffsetY = e.clientY - rect.top;
        activeItem.style.width = rect.width + 'px';
        activeItem.style.height = rect.height + 'px';
    }
    
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
    
    if (currentRoom === 'words') {
        const board = document.getElementById('words-shadow-board');
        const boardRect = board.getBoundingClientRect();
        
        const pieceCenterX = rectDrag.left + rectDrag.width / 2;
        const pieceCenterY = rectDrag.top + rectDrag.height / 2;
        
        const boardCenterX = boardRect.left + boardRect.width / 2;
        const boardCenterY = boardRect.top + boardRect.height / 2;
        
        const diffX = Math.abs(pieceCenterX - boardCenterX);
        const diffY = Math.abs(pieceCenterY - boardCenterY);
        
        if (diffX < 150 && diffY < 150) {
            safeVkSend("VKWebAppTapticImpactOccurred", {"style": "medium"}).catch(() => {});
            
            activeItem.classList.add('matched');
            activeItem.style.transition = 'all 0.2s ease-out';
            activeItem.style.position = 'absolute';
            activeItem.style.left = '0';
            activeItem.style.top = '0';
            activeItem.style.transform = 'scale(1)';
            board.appendChild(activeItem);
            
            const levelData = roomsData['words'][currentWordsLevel];
            wordsPlacedCount++; 
            
            wordsActiveCount--;
            if (wordsActiveCount === 0) {
                setTimeout(() => {
                    playSound(levelData.full_sound); 
                    
                    board.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                    board.style.transform = 'scale(1.15)'; 
                    
                    setTimeout(() => {
                        board.style.transform = 'scale(1)'; 
                    }, 400);
                    
                    wordsTimeout = setTimeout(() => {
                        board.style.transition = ''; 
                        currentWordsLevel++;
                        setupWordsGame();
                    }, 3200);
                }, 500); 
            }
            activeItem = null;
            return;
        }
        
        activeItem.style.transition = 'all 0.3s ease';
        activeItem.style.position = 'relative';
        activeItem.style.left = '';
        activeItem.style.top = '';
        activeItem.style.transform = 'scale(0.35)'; 
        playSound('wrong.wav');
        activeItem = null;
        return;
    }

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

// ==========================================
// ЛОГИКА ИГРЫ: ВОЛШЕБНОЕ ПИАНИНО
// ==========================================
let currentMusicMode = 'piano';
// Множители скорости для изменения нот (от До до верхнего До)
const noteRates = [1.0, 1.122, 1.259, 1.334, 1.498, 1.681, 1.887, 2.0]; 

function setupMusicRoom() {
    stopAllAudio();
    setMusicMode('piano'); 
    
    const keysContainer = document.getElementById('piano-keys');
    keysContainer.innerHTML = '';
    
    const keyColors = ['#FF4D4D', '#FFA500', '#FFD700', '#4DFF4D', '#4D79FF', '#0000FF', '#9932CC', '#FF69B4'];
    
    for (let i = 0; i < 8; i++) {
        const key = document.createElement('div');
        key.style.flex = '1';
        key.style.background = `linear-gradient(to bottom, ${keyColors[i]}, ${keyColors[i]} 80%, #000 150%)`;
        key.style.borderRadius = '0 0 12px 12px';
        key.style.border = '1px solid rgba(0,0,0,0.3)';
        key.style.borderTop = 'none';
        key.style.boxShadow = '0 8px 10px rgba(0,0,0,0.4), inset 0 2px 5px rgba(255,255,255,0.5)';
        key.style.cursor = 'pointer';
        key.style.transition = 'transform 0.1s, box-shadow 0.1s, filter 0.1s';
        key.style.transformOrigin = 'top';
        
        // 👇 ДОБАВЛЯЕМ ЦИФРЫ ВНИЗ КЛАВИШИ 👇
        key.style.display = 'flex';
        key.style.alignItems = 'flex-end';
        key.style.justifyContent = 'center';
        key.style.paddingBottom = '15px'; // Отступ снизу
        key.style.color = 'rgba(255, 255, 255, 0.9)';
        key.style.fontSize = '24px';
        key.style.fontWeight = 'bold';
        key.style.fontFamily = 'Arial, sans-serif';
        key.style.textShadow = '1px 1px 3px rgba(0,0,0,0.5)'; // Тень, чтобы цифра хорошо читалась
        key.innerText = i + 1; // Нумерация от 1 до 8

        // Обработка нажатия
        key.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            
            safeVkSend("VKWebAppTapticImpactOccurred", {"style": "light"}).catch(() => {});
            
            // Анимация нажатия
            key.style.transform = 'scaleY(0.95) rotateX(10deg)';
            key.style.boxShadow = '0 2px 4px rgba(0,0,0,0.5), inset 0 2px 5px rgba(255,255,255,0.8)';
            key.style.filter = 'brightness(1.2)';
            
            // 👇 ЛОГИКА ВОСПРОИЗВЕДЕНИЯ 👇
            if (currentMusicMode === 'radio') {
                // Если включен Магнитофон, каждая кнопка включает свою песню!
                stopAllAudio(); // Выключаем предыдущую песню
                playSound('song_' + (i + 1) + '.wav'); // Ищет song_1.wav, song_2.wav и т.д.
            } else {
                // Если включено пианино, котик или собачка — играем ноты
                playPianoNote(i);
            }
            
            setTimeout(() => {
                key.style.transform = 'none';
                key.style.boxShadow = '0 8px 10px rgba(0,0,0,0.4), inset 0 2px 5px rgba(255,255,255,0.5)';
                key.style.filter = 'none';
            }, 150);
        });
        
        keysContainer.appendChild(key);
    }
}

function setMusicMode(mode) {
    currentMusicMode = mode;
    safeVkSend("VKWebAppTapticImpactOccurred", {"style": "medium"}).catch(() => {});
    
    // Обновляем визуал кнопок (выделяем активную)
    const modes = ['piano', 'cat', 'dog', 'radio'];
    modes.forEach(m => {
        const btn = document.getElementById('mode-btn-' + m);
        if (btn) {
            if (m === currentMusicMode) {
                btn.style.transform = 'scale(1.15)';
                btn.style.boxShadow = '0 0 15px 5px #FFD700';
                btn.style.backgroundColor = '#FFFFFF';
            } else {
                btn.style.transform = 'scale(1)';
                btn.style.boxShadow = 'none';
                btn.style.backgroundColor = 'rgba(255,255,255,0.5)';
            }
        }
    });

    stopAllAudio();
    
    // Реакция на переключение
    if (mode === 'radio') {
    } else {
        // Озвучиваем, какой режим включен (если есть файл, например m_cat.wav)
        playSound('m_' + mode + '.wav'); 
    }
}

function playPianoNote(noteIndex) {
    const soundFile = `${currentMusicMode}_note.wav`; // piano_note.wav, cat_note.wav, dog_note.wav
    const audio = new Audio(soundFile);
    
    // МАГИЯ: отключаем сохранение тональности и ускоряем звук = получаем новую ноту!
    audio.preservesPitch = false; 
    audio.playbackRate = noteRates[noteIndex];
    
    audio.play().catch(err => console.log("Ошибка воспроизведения:", err));
}
