const request = require('request');
const TelegramBot = require('node-telegram-bot-api');

var md5hash = require('md5');

function getCode() {
    var e = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    this.encode = function (n) {
        var o, a, r, i, s, l, c, u = "",
            d = 0;
        for (n = t(n); d < n.length;) o = n.charCodeAt(d++), a = n.charCodeAt(d++), r = n.charCodeAt(d++), i = o >> 2, s = (3 & o) << 4 | a >> 4, l = (15 & a) << 2 | r >> 6, c = 63 & r, isNaN(a) ? l = c = 64 : isNaN(r) && (c = 64), u = u + e.charAt(i) + e.charAt(s) + e.charAt(l) + e.charAt(c);
        return u
    }, this.decode = function (t) {
        var o, a, r, i, s, l, c, u = "",
            d = 0;
        for (t = t.replace(/[^A-Za-z0-9\+\/\=]/g, ""); d < t.length;) i = e.indexOf(t.charAt(d++)), s = e.indexOf(t.charAt(d++)), l = e.indexOf(t.charAt(d++)), c = e.indexOf(t.charAt(d++)), o = i << 2 | s >> 4, a = (15 & s) << 4 | l >> 2, r = (3 & l) << 6 | c, u += String.fromCharCode(o), 64 != l && (u += String.fromCharCode(a)), 64 != c && (u += String.fromCharCode(r));
        return u = n(u)
    };
    var t = function (e) {
            e = e.replace(/\r\n/g, "\n");
            for (var t = "", n = 0; n < e.length; n++) {
                var o = e.charCodeAt(n);
                o < 128 ? t += String.fromCharCode(o) : o > 127 && o < 2048 ? (t += String.fromCharCode(o >> 6 | 192), t += String.fromCharCode(63 & o | 128)) : (t += String.fromCharCode(o >> 12 | 224), t += String.fromCharCode(o >> 6 & 63 | 128), t += String.fromCharCode(63 & o | 128))
            }
            return t
        },
        n = function (e) {
            for (var t = "", n = 0, o = c1 = c2 = 0; n < e.length;) o = e.charCodeAt(n), o < 128 ? (t += String.fromCharCode(o), n++) : o > 191 && o < 224 ? (c2 = e.charCodeAt(n + 1), t += String.fromCharCode((31 & o) << 6 | 63 & c2), n += 2) : (c2 = e.charCodeAt(n + 1), c3 = e.charCodeAt(n + 2), t += String.fromCharCode((15 & o) << 12 | (63 & c2) << 6 | 63 & c3), n += 3);
            return t
        }
}
/*End get encode function*/

n = new getCode;

var userName = "root";
var userPwd = "kefila79***";
var userKey = md5hash(userName + ":" + userPwd);
var xToken = "";
var getEncode = n.encode(userPwd);
var oltUrl = "http://103.176.96.81:1000/"

// replace the value below with the Telegram token you receive from @BotFather
const token = '5629960055:AAHBkOMVLrWdrwhYnWkF0C1q0bi0fAS6kMs';
const bot = new TelegramBot(token, {
    polling: true
});



// oltUrl/onumgmt?form=base-info&port_id=2&onu_id=2
// oltUrl/onumgmt?form=optical-diagnose&port_id=2&onu_id=2

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    request({
        url: `${oltUrl}userlogin?form=login`,
        method: "POST",
        json: true,
        body: {
            method: "set",
            param: {
                name: userName,
                key: userKey,
                value: getEncode,
                captcha_v: this.captcha || "",
                captcha_f: this.captchaSrc || ""
            }
        }
    }, function (err, response, body) {
        if (xToken == "") {
            xToken = response.headers['x-token'];
        }
        console.log(body);
        var port_id = 1;
        var f_port_id = 0;
        var f_ont_id = 0;
        request({
            url: `${oltUrl}board?info=pon`,
            headers: {
                "X-Token": xToken
            }
        }, function (err, response, body) {
            let pon = JSON.parse(body).data;
            pon.forEach(val => {
                request({
                    url: `${oltUrl}gponont_mgmt?form=auth&port_id=${val.port_id}`,
                    headers: {
                        "X-Token": xToken
                    }
                }, function (err, response, body) {
                    let onuTable = JSON.parse(body).data;
                    let Found = true;
                    for (var index in onuTable) {
                        if (onuTable[index].ont_name == msg.text) {
                            let x = index;
                            request({
                                url: `${oltUrl}gponont_mgmt?form=resource&port_id=${val.port_id}`,
                                headers: {
                                    "X-Token": xToken
                                }
                            }, function (err, response, body) {
                                body = JSON.parse(body);
                                if (body.code == 1) {
                                    let resource = body.data.resource.split(",");
                                    request({
                                        url: `${oltUrl}gponont_mgmt?form=base&port_id=${val.port_id}&ont_id=${resource[x]}`,
                                        headers: {
                                            "X-Token": xToken,
                                        }
                                    }, function (err, response, body) {
                                        let base = JSON.parse(body).data;
                                        if (base.ont_name == msg.text) {
                                            f_port_id = val.port_id;
                                            f_ont_id = resource[x];
                                            request({
                                                url: oltUrl + "gponont_mgmt?form=ont_optical&port_id=" + val.port_id + "&ont_id=" + resource[x],
                                                headers: {
                                                    "X-Token": xToken,
                                                }
                                            }, function (err, response, body) {
                                                let opticalDiagnostic = JSON.parse(body).data;
                                                request({
                                                    url: oltUrl + "gponont_mgmt?form=ont_version&port_id=" + val.port_id + "&ont_id=" + resource[x],
                                                    headers: {
                                                        "X-Token": xToken,
                                                    }
                                                }, function (err, response, body) {
                                                    let version = JSON.parse(body).data;
                                                    var status = base.rstate == 1 ? " Active" : "Off Line";
                                                    var Message = "\n*Base Info*" +
                                                        "\nNama Pelanggan : " + msg.text +
                                                        "\nStatus : " + status +
                                                        "\nDistance : " + base.distance + " M" +
                                                        "\nVendor : " + version.vendorid +
                                                        "\nVersion : " + version.mainversion +
                                                        "\nLast Down Time : " + base.last_d_time +
                                                        "\nLast Down Cause : " + base.last_d_cause +
                                                        "\nUptime : " + base.uptime +
                                                        "\nOnu Type : " + base.onu_type +
                                                        "\nPort ID : " + val.port_id +
                                                        "\nONT ID : " + resource[x] +
                                                        "\n*Optical Diagnose*";
                                                    if (opticalDiagnostic === undefined) {
                                                        Message = Message +
                                                            "\nTemperature : -" +
                                                            "\nVoltage : -" +
                                                            "\nTx Bias : -" +
                                                            "\nTx Power : -" +
                                                            "\nRx Power : -" +
                                                            "\nOLT Rx Power : -";
                                                    } else {
                                                        Message = Message +
                                                            "\nTemperature : " + opticalDiagnostic.work_temprature +
                                                            "\nVoltage : " + opticalDiagnostic.work_voltage +
                                                            "\nTx Bias : " + opticalDiagnostic.transmit_bias +
                                                            "\nTx Power : " + opticalDiagnostic.transmit_power +
                                                            "\nRx Power : " + opticalDiagnostic.receive_power +
                                                            "\nOLT Rx Power : " + opticalDiagnostic.olt_rxpower;
                                                    }
                                                    const opts = {
                                                        parse_mode: 'Markdown'
                                                    };
                                                    bot.sendMessage(chatId, Message, opts);
                                                });
                                                port_id = 10;
                                            });
                                        }
                                    });
                                }
                            });
                        }
                    }
                });
            });
        });
    });
});