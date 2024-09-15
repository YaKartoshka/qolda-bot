const admin = require('firebase-admin');
const TelegramBot = require('node-telegram-bot-api');
const { v4: uuidv4 } = require('uuid');

const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const express = require('express');
const http = require('http');
var session = require('express-session');



// db initialize
const firebase_lib = require('./libs/firebase_db');

const db = firebase_lib.fdb;
const bucket = firebase_lib.storage;

const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json({ limit: '500mb' }));
app.use(bodyParser.urlencoded({ limit: '500mb', extended: true }));
app.use(session({
    secret: "qoldatoken",
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // set this to true on production
    }
}));

app.set('views', path.join(__dirname, 'views'));
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

// routes
const index = require('./routes/index')
const auth = require('./routes/auth');
const events = require('./routes/events')
app.use('/auth', auth);
app.use('/events', events);
app.use('/', index);


const userSteps = {};
let searchResults = {}
// local
const { showProfile, createInlineKeyboard, updateUser } = require('./profile');
const { startListeningPosts } = require('./posts');
const { sendWebhookRequest } = require('./ai');

const categories = ['Football', 'Basketball', 'Swimming', 'Tennis', 'Yoga', 'Gym', 'Martial Arts', 'Dancing'];

const token = '7095655168:AAEwMovy8KAROwEtKAbu5gmcdfjy9pIiUg8';
const bot = new TelegramBot(token, { polling: true });

bot.setMyCommands([
    { command: '/start', description: 'Начало работы с ботом' },
    { command: '/profile', description: 'Просмотр профиля' },
    { command: '/search', description: 'Поиск единомышленников' },
    { command: '/subscribe', description: 'Подписка на получение новых постов' },
    { command: '/unsubscribe', description: 'Отписка от получение новых постов' },
]);

var commands = ['/start', '/profile', '/search', '/subscribe', '/unsubscribe'];

bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;

    try {
        const usersRef = db.collection('bot_users');
        const snapshot = await usersRef.where('chat_id', '==', chatId).get();

        if (snapshot.empty) {

            bot.sendMessage(chatId, 'Добро пожаловать! Давайте зарегистрируемся. Как вас зовут?');
            userSteps[chatId] = { step: 'name' };
        } else {

            snapshot.forEach(doc => {
                bot.sendMessage(chatId, `С возвращением, ${doc.data().name}! Вы можете задать вопрос или использовать наше меню`);
            });
        }
    } catch (error) {
        console.error('Ошибка при получении пользователя:', error);
        bot.sendMessage(chatId, 'Ошибка при получении данных пользователя.');
    }
});

bot.onText(/\/profile/, async (msg) => {
    const chatId = msg.chat.id;
    showProfile(bot, chatId);
});





bot.onText(/\/search/, async (msg) => {
    const chatId = msg.chat.id;

    try {
        const usersRef = db.collection('bot_users');
        const snapshot = await usersRef.where('chat_id', '==', chatId).get();

        if (snapshot.empty) {
            bot.sendMessage(chatId, 'Добро пожаловать! Давайте зарегистрируемся. Как вас зовут?');
            userSteps[chatId] = { step: 'name' }; // Начинаем отслеживание шагов регистрации
        } else {
            bot.sendMessage(chatId, 'Введите навык или профессию для поиска:');
            searchResults[chatId] = { step: 'searchInput' };
        }
    } catch (error) {
        console.error('Ошибка при получении пользователя:', error);
        bot.sendMessage(chatId, 'Ошибка при получении данных пользователя.');
    }

});


bot.onText(/\/subscribe/, async (msg) => {
    const chatId = msg.chat.id;

    try {
        const usersRef = db.collection('bot_users');
        const snapshot = await usersRef.where('chat_id', '==', chatId).get();

        if (snapshot.empty) {
            bot.sendMessage(chatId, 'Добро пожаловать! Давайте зарегистрируемся. Как вас зовут?');
            userSteps[chatId] = { step: 'name' };
        } else {
            const userDoc = snapshot.docs[0].ref;
            await userDoc.update({ 'posts_notify': '1' });

            bot.sendMessage(chatId, 'Вы успешно подписались на получение постов');
        }
    } catch (error) {
        console.error('Ошибка при получении пользователя:', error);
        bot.sendMessage(chatId, 'Ошибка при получении данных пользователя.');
    }
});

bot.onText(/\/unsubscribe/, async (msg) => {
    const chatId = msg.chat.id;

    try {
        const usersRef = db.collection('bot_users');
        const snapshot = await usersRef.where('chat_id', '==', chatId).get();

        if (snapshot.empty) {
            bot.sendMessage(chatId, 'Добро пожаловать! Давайте зарегистрируемся. Как вас зовут?');
            userSteps[chatId] = { step: 'name' };
        } else {
            const userDoc = snapshot.docs[0].ref;
            await userDoc.update({ 'posts_notify': '0' });

            bot.sendMessage(chatId, 'Вы успешно отписались от получения постов');
        }
    } catch (error) {
        console.error('Ошибка при получении пользователя:', error);
        bot.sendMessage(chatId, 'Ошибка при получении данных пользователя.');
    }
});

bot.onText(/\/clubs/, (msg) => {
    const chatId = msg.chat.id;

    const categoryButtons = categories.map(category => ({
        text: category, callback_data: `category_${category}`
    }));


    bot.sendMessage(chatId, 'Выберите категорию клуба:', {
        reply_markup: {
            inline_keyboard: [
                categoryButtons.slice(0, 4),
                categoryButtons.slice(4, 8),
            ]
        }
    });
});

bot.on('callback_query', async (callbackQuery) => {
    const action = callbackQuery.data;
    const chatId = callbackQuery.message.chat.id;
    const index = parseInt(action.split('_')[1]);

    if (action.startsWith('skip')) {
        try {
            if (!searchResults[chatId]) return;
            const skippedUserId = searchResults[chatId].matches[index].id;

            await bot.deleteMessage(chatId, callbackQuery.message.message_id);

            if (index + 1 < searchResults[chatId].matches.length) {
                showMatch(chatId, index + 1);
            } else {
                bot.sendMessage(chatId, 'Других пользователей с такими навыками не найдено.');
                delete searchResults[chatId];
            }

            await bot.answerCallbackQuery(callbackQuery.id);
        } catch (error) {
            console.error('Ошибка при обработке пропуска:', error);
            bot.sendMessage(chatId, 'Произошла ошибка при обработке вашего запроса. Попробуйте снова.');
        }
    } else if (action === 'edit_profile') {

        bot.sendMessage(chatId, 'Введите ваше имя', createInlineKeyboard('new_name'));
        userSteps[chatId] = { step: 'new_name' };


    } else if (action === 'delete_profile') {

        try {
            const userSnapshot = await db.collection('bot_users').where('chat_id', '==', chatId).get();
            if (!userSnapshot.empty) {
                await userSnapshot.docs[0].ref.delete();
                await bot.deleteMessage(chatId, callbackQuery.message.message_id);
                await bot.sendMessage(chatId, 'Ваш профиль был удален.');
            } else {
                await bot.sendMessage(chatId, 'Ваш профиль не найден.');
            }
        } catch (error) {
            console.error('Ошибка при удалении профиля:', error);
            await bot.sendMessage(chatId, 'Произошла ошибка при удалении вашего профиля. Попробуйте снова.');
        }
    } else if (action.startsWith('category_')) {
        const selectedCategory = action.split('_')[1]; 


        const clubsSnapshot = await db.collection('clubs')
            .where('category', '==', selectedCategory).get();

        if (!clubsSnapshot.empty) {
            let clubsMessage = `Клубы в категории *${selectedCategory}*:\n\n`;
            clubsSnapshot.forEach(doc => {
                const club = doc.data();
                clubsMessage += `*Название:* ${club.fullName}\n`;
                clubsMessage += `*Описание:* ${club.description}\n`;
                clubsMessage += `*Адрес:* ${club.address}\n\n`;
            });

            bot.sendMessage(chatId, clubsMessage, { parse_mode: 'Markdown' });
        } else {
            // No clubs found
            bot.sendMessage(chatId, `В категории *${selectedCategory}* нет клубов.`, { parse_mode: 'Markdown' });
        }
    }
});


const showMatch = async (chatId, index) => {
    const match = searchResults[chatId].matches[index];

    // Escape special characters for Markdown
    const escapedUsername = match.username
        .replace(/_/g, '\\_')  // Escape underscores
        .replace(/\*/g, '\\*')  // Escape asterisks
        .replace(/\[/g, '\\[')  // Escape brackets
        .replace(/\]/g, '\\]')  // Escape brackets
        .replace(/\(/g, '\\(')  // Escape parentheses
        .replace(/\)/g, '\\)'); // Escape parentheses

    // Prepare the message
    let message = `*Имя:* ${match.name}\n`;
    message += `*Возраст:* ${match.age}\n`;
    message += `*Описание:* ${match.description}\n`;
    message += `*Навыки:* ${match.skills}\n`;
    message += `*Тег:* ${escapedUsername}\n`;

    // Prepare options for sending
    const options = {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [
                    { text: 'Далее', callback_data: `skip_${index}` }
                ]
            ]
        }
    };

    try {
        if (match.profile_image) {
            // Send profile image
            await bot.sendPhoto(chatId, match.profile_image, { caption: message, ...options });
        } else {
            // Send message without image
            await bot.sendMessage(chatId, message, options);
        }
    } catch (error) {
        console.error('Ошибка при отправке сообщения или изображения:', error);
        bot.sendMessage(chatId, 'Произошла ошибка при отправке данных. Попробуйте снова.'); // Fallback message
    }
};






// Update User
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (userSteps[chatId]) {
        const currentStep = userSteps[chatId].step;

        // add User

        if (currentStep === 'name') {
            userSteps[chatId].name = text.trim().toLowerCase().replace(/^./, char => char.toUpperCase());
            bot.sendMessage(chatId, 'Отлично! Теперь укажите вашу фамилию.');
            userSteps[chatId].step = 'surname';
        } else if (currentStep === 'surname') {
            userSteps[chatId].surname = text.trim().toLowerCase().replace(/^./, char => char.toUpperCase());
            bot.sendMessage(chatId, 'Какой у вас возраст?');
            userSteps[chatId].step = 'age';
        } else if (currentStep === 'age') {
            userSteps[chatId].age = text;
            bot.sendMessage(chatId, 'Отправьте ваше фото профиля или напишите "нет", если не хотите отправлять фото.');
            userSteps[chatId].step = 'profile_image';
        } else if (currentStep === 'profile_image') {
            if (msg.photo) {
                const photo = msg.photo[msg.photo.length - 1];
                const fileId = photo.file_id;

                try {

                    const filePath = await bot.getFileLink(fileId);
                    const fileName = `${uuidv4()}.jpg`;
                    const fileUpload = bucket.file(`bot_profile_images/${fileName}`);


                    const response = await require('axios').get(filePath, { responseType: 'stream' });
                    const writeStream = fileUpload.createWriteStream({
                        metadata: {
                            contentType: 'image/jpeg',
                            metadata: {
                                firebaseStorageDownloadTokens: uuidv4()
                            }
                        }
                    });

                    response.data.pipe(writeStream);

                    writeStream.on('finish', async () => {
                        const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(`bot_profile_images/${fileName}`)}?alt=media&token=${fileUpload.metadata.metadata.firebaseStorageDownloadTokens}`;

                        userSteps[chatId].profile_image = publicUrl;
                        bot.sendMessage(chatId, 'Назовите вашу профессию');
                        userSteps[chatId].step = 'profession';
                    });

                    writeStream.on('error', (err) => {
                        console.error('Ошибка при загрузке файла:', err);
                        bot.sendMessage(chatId, 'Ошибка при загрузке вашего фото. Попробуйте снова.');
                    });

                } catch (error) {
                    console.error('Ошибка при получении файла Telegram:', error);
                    bot.sendMessage(chatId, 'Ошибка при получении вашего фото. Попробуйте снова.');
                }
            } else if (text.toLowerCase() === 'нет') {
                userSteps[chatId].profile_image = null;
                bot.sendMessage(chatId, 'Назовите вашу профессию');
                userSteps[chatId].step = 'profession';
            }
        } else if (currentStep === 'profession') {
            const profession = text.trim().toLowerCase().replace(/^./, char => char.toUpperCase())
            userSteps[chatId].profession = profession;

            bot.sendMessage(chatId, 'Теперь укажите ваши навыки через запятую (не более 5).');
            userSteps[chatId].step = 'skills';
        } else if (currentStep === 'skills') {
            const skills = text.split(',').map(skill => skill.trim().toLowerCase().replace(/^./, char => char.toUpperCase())).slice(0, 5);
            userSteps[chatId].skills = skills;
            bot.sendMessage(chatId, 'Отлично! Теперь укажите краткое описание о себе.');
            userSteps[chatId].step = 'description';
        } else if (currentStep === 'description') {
            userSteps[chatId].description = text;

            try {
                await db.collection('bot_users').add({
                    chat_id: chatId,
                    name: userSteps[chatId].name,
                    surname: userSteps[chatId].surname,
                    age: userSteps[chatId].age,
                    profile_image: userSteps[chatId].profile_image,
                    profession: userSteps[chatId].profession,
                    skills: userSteps[chatId].skills,
                    description: userSteps[chatId].description,
                    username: '@' + msg.chat.username
                });
                bot.sendMessage(chatId, `Вы успешно зарегистрированы! Добро пожаловать, ${userSteps[chatId].name}! Теперь вы можете задать вопрос или использовать комманды.`);
                delete userSteps[chatId];
            } catch (error) {
                console.error('Ошибка при сохранении данных пользователя:', error);
                bot.sendMessage(chatId, 'Ошибка при сохранении ваших данных. Попробуйте снова.');
            }
        }

        // Update User

        else if (currentStep === 'new_name') {
            if (text) {
                userSteps[chatId].name = text.trim().toLowerCase().replace(/^./, char => char.toUpperCase());
                bot.sendMessage(chatId, 'Отлично! Теперь укажите вашу фамилию.', createInlineKeyboard('new_surname'));
                userSteps[chatId].step = 'new_surname';
            } else {
                bot.sendMessage(chatId, 'Пожалуйста, укажите ваше имя.');
            }
        } else if (currentStep === 'new_surname') {
            if (text) {
                userSteps[chatId].surname = text.trim().toLowerCase().replace(/^./, char => char.toUpperCase());
                bot.sendMessage(chatId, 'Какой у вас возраст?', createInlineKeyboard('new_age'));
                userSteps[chatId].step = 'new_age';
            } else {
                bot.sendMessage(chatId, 'Пожалуйста, укажите вашу фамилию.');
            }
        } else if (currentStep === 'new_age') {
            if (text) {
                userSteps[chatId].age = text;
                bot.sendMessage(chatId, 'Отправьте ваше фото профиля или напишите "нет", если не хотите отправлять фото.', createInlineKeyboard('new_profile_image'));
                userSteps[chatId].step = 'new_profile_image';
            } else {
                bot.sendMessage(chatId, 'Пожалуйста, укажите ваш возраст.');
            }
        } else if (currentStep === 'new_profile_image') {
            if (msg.photo) {
                const photo = msg.photo[msg.photo.length - 1];
                const fileId = photo.file_id;

                try {
                    const filePath = await bot.getFileLink(fileId);
                    const fileName = `${uuidv4()}.jpg`;
                    const fileUpload = bucket.file(`bot_profile_images/${fileName}`);

                    const response = await require('axios').get(filePath, { responseType: 'stream' });
                    const writeStream = fileUpload.createWriteStream({
                        metadata: {
                            contentType: 'image/jpeg',
                            metadata: {
                                firebaseStorageDownloadTokens: uuidv4()
                            }
                        }
                    });

                    response.data.pipe(writeStream);

                    writeStream.on('finish', async () => {
                        const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(`bot_profile_images/${fileName}`)}?alt=media&token=${fileUpload.metadata.metadata.firebaseStorageDownloadTokens}`;

                        userSteps[chatId].profile_image = publicUrl;
                        bot.sendMessage(chatId, 'Назовите вашу профессию', createInlineKeyboard('new_profession'));
                        userSteps[chatId].step = 'new_profession';
                    });

                    writeStream.on('error', (err) => {
                        console.error('Ошибка при загрузке файла:', err);
                        bot.sendMessage(chatId, 'Ошибка при загрузке вашего фото. Попробуйте снова.');
                    });

                } catch (error) {
                    console.error('Ошибка при получении файла Telegram:', error);
                    bot.sendMessage(chatId, 'Ошибка при получении вашего фото. Попробуйте снова.');
                }
            } else if (text.toLowerCase() === 'нет') {
                userSteps[chatId].profile_image = null;
                bot.sendMessage(chatId, 'Назовите вашу профессию', createInlineKeyboard('new_profession'));
                userSteps[chatId].step = 'new_profession';
            } else {
                bot.sendMessage(chatId, 'Пожалуйста, отправьте ваше фото или напишите "нет".');
            }
        } else if (currentStep === 'new_profession') {
            if (text) {
                const profession = text.trim().toLowerCase().replace(/^./, char => char.toUpperCase());
                userSteps[chatId].profession = profession;
                bot.sendMessage(chatId, 'Теперь укажите ваши навыки через запятую (не более 5).', createInlineKeyboard('new_skills'));
                userSteps[chatId].step = 'new_skills';
            } else {
                bot.sendMessage(chatId, 'Пожалуйста, укажите вашу профессию.');
            }
        } else if (currentStep === 'new_skills') {
            if (text) {
                const skills = text.split(',').map(skill => skill.trim().toLowerCase().replace(/^./, char => char.toUpperCase())).slice(0, 5);
                userSteps[chatId].skills = skills;
                bot.sendMessage(chatId, 'Отлично! Теперь укажите краткое описание о себе.', createInlineKeyboard('new_description'));
                userSteps[chatId].step = 'new_description';
            } else {
                bot.sendMessage(chatId, 'Пожалуйста, укажите ваши навыки.');
            }
        } else if (currentStep === 'new_description') {
            if (text) {
                userSteps[chatId].description = text;

                await finalizeRegistration(chatId);

            } else {
                bot.sendMessage(chatId, 'Пожалуйста, укажите краткое описание о себе.');
            }
        }
    }

    else

        if (searchResults[chatId] && searchResults[chatId].step === 'searchInput') {
            const searchQuery = msg.text.trim().toLowerCase().replace(/^./, char => char.toUpperCase());
            try {
                const usersRef = db.collection('bot_users');
                const snapshot = await usersRef
                    .where('skills', 'array-contains', searchQuery)
                    .get();

                if (snapshot.empty) {
                    const snapshot2 = await usersRef
                        .where('profession', '==', searchQuery)
                        .get();

                    if (snapshot2.empty) {
                        bot.sendMessage(chatId, 'Пользователи с таким навыком или профессией не найдены.');
                        delete searchResults[chatId];
                    } else {
                        searchResults[chatId].matches = [];
                        snapshot2.forEach(doc => {
                            const userData = doc.data();
                            searchResults[chatId].matches.push({
                                id: doc.id,
                                name: `${userData.name} ${userData.surname}`,
                                age: userData.age,
                                description: userData.description,
                                profession: userData.profession,
                                username: userData.username,
                                skills: userData.skills.join(', '),
                                profile_image: userData.profile_image,
                                contact: `ID: ${doc.id}, Chat ID: ${userData.chat_id}`,
                            });
                        });

                        if (searchResults[chatId].matches.length > 0) {
                            showMatch(chatId, 0);
                        }
                    }
                } else {
                    searchResults[chatId].matches = [];
                    snapshot.forEach(doc => {
                        const userData = doc.data();
                        searchResults[chatId].matches.push({
                            id: doc.id,
                            name: `${userData.name} ${userData.surname}`,
                            age: userData.age,
                            description: userData.description,
                            profession: userData.profession,
                            username: userData.username,
                            skills: userData.skills.join(', '),
                            profile_image: userData.profile_image,
                            contact: `ID: ${doc.id}, Chat ID: ${userData.chat_id}`,
                        });
                    });


                    if (searchResults[chatId].matches.length > 0) {
                        showMatch(chatId, 0);
                    }
                }
            } catch (error) {
                console.error('Ошибка поиска пользователей:', error);
                bot.sendMessage(chatId, 'Произошла ошибка во время поиска. Попробуйте снова.');
            }
        }

        else {
            if (commands.includes(text)) return;
            console.log(chatId)
            // bot.sendMessage(chatId, 'Бот на данный момент кушает и хочет спать. Попробуйте позже');
            sendWebhookRequest(chatId, text, (error, response) => {
                if (error) {
                    console.error('Error:', error);
                } else {
                    console.log('Response data:', response);
                }
            });
        }
});

bot.on('callback_query', async (query) => {
    const chatId = query.from.id;
    const action = query.data;

    if (action.startsWith('skipinput-')) {
        const skippedStep = action.split('-')[1];

        if (userSteps[chatId]) {

            switch (skippedStep) {
                case 'new_name':
                    userSteps[chatId].step = 'new_surname';
                    bot.sendMessage(chatId, 'Теперь укажите вашу фамилию.', createInlineKeyboard('new_surname'));
                    break;
                case 'new_surname':
                    userSteps[chatId].step = 'new_age';
                    bot.sendMessage(chatId, 'Какой у вас возраст?', createInlineKeyboard('new_age'));
                    break;
                case 'new_age':
                    userSteps[chatId].step = 'new_profile_image';
                    bot.sendMessage(chatId, 'Отправьте ваше фото профиля или напишите "нет", если не хотите отправлять фото.', createInlineKeyboard('new_profile_image'));
                    break;
                case 'new_profile_image':
                    userSteps[chatId].step = 'new_profession';
                    bot.sendMessage(chatId, 'Назовите вашу профессию', createInlineKeyboard('new_profession'));
                    break;
                case 'new_profession':
                    userSteps[chatId].step = 'new_skills';
                    bot.sendMessage(chatId, 'Теперь укажите ваши навыки через запятую (не более 5).', createInlineKeyboard('new_skills'));
                    break;
                case 'new_skills':
                    userSteps[chatId].step = 'new_description';
                    bot.sendMessage(chatId, 'Отлично! Теперь укажите краткое описание о себе.', createInlineKeyboard('new_description'));
                    break;
                case 'new_description':
                    await finalizeRegistration(chatId);
                    break;
            }
        }
    }
});


async function finalizeRegistration(chatId) {
    try {
        const { name, surname, age, profile_image, profession, skills, description } = userSteps[chatId];

        await updateUser(chatId, {
            name,
            surname,
            age,
            profile_image,
            profession,
            skills,
            description,
            username: '@' + (await bot.getChat(chatId)).username
        });

        bot.sendMessage(chatId, `Вы успешно обновили профиль`);
    } catch (error) {
        console.error('Ошибка при сохранении данных пользователя:', error);
        bot.sendMessage(chatId, 'Ошибка при сохранении ваших данных. Попробуйте снова.');
    } finally {
        delete userSteps[chatId];
    }
}


startListeningPosts(bot)
console.log('Bot is running...');




app.get('/webhook', (req, res) => {
    console.log(req.query)
    var chatId = req.query.user_id;
    var text = req.query.text
    bot.sendMessage(chatId, text);
})



const server = http.createServer(app);

// Listen on port 80
server.listen(80, () => {
    console.log('Server running at http://localhost:80/');
});