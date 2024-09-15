// profile.js
const admin = require('firebase-admin');
const db = admin.firestore();
const { Markup } = require('telegraf');

async function showProfile(bot, chatId) {
    try {
        const userSnapshot = await db.collection('bot_users').where('chat_id', '==', chatId).get();
        if (userSnapshot.empty) {
            await bot.sendMessage(chatId, 'Ваш профиль не найден.');
            return;
        }

        const userData = userSnapshot.docs[0].data();
        let profileMessage = `*Имя:* ${userData.name}\n`;
        profileMessage += `*Фамилия:* ${userData.surname}\n`;
        profileMessage += `*Возраст:* ${userData.age}\n`;
        profileMessage += `*Описание:* ${userData.description}\n`;
        profileMessage += `*Навыки:* ${userData.skills.join(', ')}\n`;

        if (userData.profile_image) {
            await bot.sendPhoto(chatId, userData.profile_image, {
                caption: profileMessage,
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'Редактировать', callback_data: 'edit_profile' }],
                        [{ text: 'Удалить', callback_data: 'delete_profile' }]
                    ]
                }
            });
        } else {
            await bot.sendMessage(chatId, profileMessage, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'Редактировать', callback_data: 'edit_profile' }],
                        [{ text: 'Удалить', callback_data: 'delete_profile' }]
                    ]
                }
            });
        }
    } catch (error) {
        console.error('Ошибка при получении профиля:', error);
        await bot.sendMessage(chatId, 'Произошла ошибка при получении вашего профиля. Попробуйте снова.');
    }
}

async function showProfile(bot, chatId,) {
    try {
        const userSnapshot = await db.collection('bot_users').where('chat_id', '==', chatId).get();
        if (userSnapshot.empty) {
            await bot.sendMessage(chatId, 'Ваш профиль не найден.');
            return;
        }

        const userData = userSnapshot.docs[0].data();
        let profileMessage = `*Имя:* ${userData.name}\n`;
        profileMessage += `*Фамилия:* ${userData.surname}\n`;
        profileMessage += `*Возраст:* ${userData.age}\n`;
        profileMessage += `*Описание:* ${userData.description}\n`;
        profileMessage += `*Навыки:* ${userData.skills.join(', ')}\n`;

        if (userData.profile_image) {
            await bot.sendPhoto(chatId, userData.profile_image, {
                caption: profileMessage,
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'Редактировать', callback_data: 'edit_profile' }],
                        [{ text: 'Удалить', callback_data: 'delete_profile' }]
                    ]
                }
            });
        } else {
            await bot.sendMessage(chatId, profileMessage, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'Редактировать', callback_data: 'edit_profile' }],
                        [{ text: 'Удалить', callback_data: 'delete_profile' }]
                    ]
                }
            });
        }
    } catch (error) {
        console.error('Ошибка при получении профиля:', error);
        await bot.sendMessage(chatId, 'Произошла ошибка при получении вашего профиля. Попробуйте снова.');
    }


}

const createInlineKeyboard = (step) => {
    return Markup.inlineKeyboard([
        Markup.button.callback('Пропустить', `skipinput-${step}`)
    ]);
};

async function updateUser(chatId, userData) {
    try {
        const userRef = db.collection('bot_users').where('chat_id', '==', chatId);
        const snapshot = await userRef.get();

        if (snapshot.empty) {
            console.log(`No matching user found for chat_id: ${chatId}`);
            return;
        }

        const userDoc = snapshot.docs[0].ref;
        const cleanedData = Object.fromEntries(
            Object.entries(userData).filter(([key, value]) => value !== undefined)
          );
        await userDoc.update(cleanedData);

        console.log(`User with chat_id ${chatId} updated successfully.`);
    } catch (error) {
        console.error('Error updating user:', error);
    }
}

module.exports = { showProfile, createInlineKeyboard, updateUser };
