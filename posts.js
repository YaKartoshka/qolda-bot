const admin = require('firebase-admin');
const db = admin.firestore();

async function startListeningPosts(bot) {
    const postsRef = db.collection('posts').orderBy('timestamp', 'desc');

    // postsRef.onSnapshot(async (snapshot) => {
    //     snapshot.docChanges().forEach(async (change) => {
    //         if (change.type === 'added') {
    //             const newPost = change.doc.data();
             
    //             const postDate = new Date(newPost.timestamp.seconds * 1000);
    //             const today = new Date();
    //             today.setHours(0, 0, 0, 0); 

         
    //             if (postDate >= today) {
    //                 let postMessage = `*${newPost.title}*\n`;
    //                 postMessage += `_${postDate.toLocaleString()}_\n\n`;
    //                 postMessage += `${newPost.content}\n`;

    //                 const options = {
    //                     parse_mode: 'Markdown',
    //                 };

    //                 const usersSnapshot = await db.collection('bot_users')
    //                     .where('posts_notify', '==', '1').get();

    //                 if (!usersSnapshot.empty) {
    //                     usersSnapshot.forEach(async (doc) => {
    //                         const user = doc.data();
    //                         if (user.chat_id) {
    //                             // Send post with or without image
    //                             if (newPost.imageURL) {
    //                                 try {
    //                                     await bot.sendPhoto(user.chat_id, newPost.imageURL, {
    //                                         caption: postMessage,
    //                                         ...options,
    //                                     });
    //                                 } catch (error) {
    //                                     // console.error('Ошибка при отправке изображения:', error);
    //                                     await bot.sendMessage(user.chat_id, postMessage, options);
    //                                 }
    //                             } else {
    //                                 await bot.sendMessage(user.chat_id, postMessage, options);
    //                             }
    //                         }
    //                     });
    //                 } else {
    //                     console.log('No users found in the database.');
    //                 }
    //             } 
    //         }
    //     });
    // });
}

module.exports = {startListeningPosts}