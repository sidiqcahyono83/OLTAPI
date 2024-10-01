const request = require('request');
const oltUrl = "http://192.168.12.88//";

function postOpticalData(xToken, portId, ontId, callback) {
    request({
        url: `${oltUrl}gponont_mgmt?form=ont_optical&port_id=${portId}&ont_id=${ontId}`,
        headers: {
            "X-Token": xToken
        }
    }, function (err, response, body) {
        if (err) {
            callback(err, null);
        } else {
            const opticalData = JSON.parse(body).data;
            callback(null, opticalData);
        }
    });
}

module.exports = postOpticalData;
