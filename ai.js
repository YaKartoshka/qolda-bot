const request = require('request');

function sendWebhookRequest(userId, text, callback) {
    // Define the URL and query parameters
    const url = 'https://c1615.webapi.ai/cmc/user_message';
    const queryParams = {
        auth_token: 'r5ej6nqt',
        text: text
    };

    if (userId) {
        queryParams.user_id = userId;
    }

    // Send the HTTP GET request
    request.get({ url: url, qs: queryParams, json: true }, (error, response, body) => {
        if (error) {
            return callback(error, null);
        }
        callback(null, body);
    });
}

module.exports = {sendWebhookRequest}