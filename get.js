const request = require('request');
const oltUrl = "http://192.168.12.88/";

function getPonData(xToken, callback) {
    request({
        url: `${oltUrl}board?info=pon`,
        headers: {
            "X-Token": xToken
        }
    }, function (err, response, body) {
        if (err) {
            callback(err, null);
        } else {
            const ponData = JSON.parse(body).data;
            callback(null, ponData);
        }
    });
}

module.exports = getPonData;
