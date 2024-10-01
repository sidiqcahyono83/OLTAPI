const express = require('express');
const request = require('request');
const md5 = require('md5');
const bodyParser = require('body-parser');
const encoder = new TextEncoder();
const cors = require('cors');


const app = express();
const port = 3001;

app.use(cors({
    origin: 'http://localhost:5173',
    methods: 'GET,POST,PUT,DELETE',
    allowedHeaders: ['Content-Type', 'Authorization'] // Ensure the Authorization header is allowed
}));
app.use(bodyParser.json());

let userName = "root"; // Menggunakan let agar bisa diubah
let userPwd = "kefila78**"; // Menggunakan let agar bisa diubah
const oltUrl = "http://192.168.12.88/";

// Simpan xToken secara global untuk autentikasi
let xToken = '';

// Fungsi untuk login dan mendapatkan xToken dari OLT
function loginToOLT(callback) {
    const userKey = md5(userName + ":" + userPwd);
    const getEncode = encoder.encode(userPwd);

    request({
        url: `${oltUrl}userlogin?form=login`,
        method: 'POST',
        json: true,
        body: {
            method: "set",
            param: {
                name: userName,
                key: userKey,
                value: getEncode
            }
        }
    }, (err, response, body) => {
        if (err) {
            console.error("Request error:", err);
            return callback(err, null);
        }

        console.log("Response status:", response.statusCode);
        console.log("Response body:", body);

        if (response.statusCode !== 200 || !response.headers['x-token']) {
            return callback("Login gagal", null);
        }

        xToken = response.headers['x-token'];
        callback(null, xToken);
    });
}

// Endpoint POST untuk login
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Perbarui userName dan userPwd dengan kredensial yang diterima dari permintaan
    userName = username;
    userPwd = password;

    console.log("Attempting to login with:", { username, password }); // Debugging log

    loginToOLT((err, token) => {
        if (err) {
            return res.status(500).json({ error: "Error saat login ke OLT: " + err });
        }
        res.json({ token: xToken });
    });
});

/// Endpoint GET untuk mendapatkan informasi ONT berdasarkan nama ONT
// Endpoint GET untuk mendapatkan informasi ONU berdasarkan nama ONU
app.get('/getOnuInfo/:onuName', (req, res) => {
    const onuName = req.params.onuName; // Mengambil nama ONU dari parameter request
    const xToken = req.headers['x-token']; // Mengambil xToken dari header request

    // Cek apakah xToken ada
    if (!xToken) {
        return res.status(401).json({ error: "Missing authentication token" });
    }

    // Request untuk mendapatkan info PON
    request({
        url: `${oltUrl}board?info=pon`, // URL untuk mendapatkan informasi PON
        headers: {
            "X-Token": xToken
        }
    }, function (err, response, body) {
        if (err) {
            console.error("Request Error:", err);
            return res.status(500).json({ error: "Internal Server Error" });
        }

        let pon;
        try {
            pon = JSON.parse(body).data; // Parsing respons JSON
        } catch (parseError) {
            console.error("Failed to parse PON response:", parseError);
            return res.status(500).json({ error: "Failed to parse PON response" });
        }

        if (!pon || pon.length === 0) {
            return res.status(404).json({ error: "No PON ports found" });
        }

        let foundONU = null; // Untuk menyimpan informasi ONU yang ditemukan
        let requestsCount = 0; // Menghitung jumlah permintaan yang telah diproses
        let totalRequests = pon.length; // Total permintaan untuk melacak penyelesaian

        // Fungsi untuk memeriksa apakah semua permintaan selesai
        function checkAllRequestsDone() {
            requestsCount++;
            if (requestsCount === totalRequests && !foundONU) {
                return res.status(404).json({ error: "ONU not found" });
            }
        }

        // Loop melalui setiap port PON
        pon.forEach(val => {
            // Permintaan untuk mendapatkan informasi ONU untuk setiap port
            request({
                url: `${oltUrl}gponont_mgmt?form=auth&port_id=${val.port_id}`,
                headers: {
                    "X-Token": xToken
                }
            }, function (err, response, body) {
                if (err) {
                    console.error("Request Error for gponont_mgmt:", err);
                    checkAllRequestsDone();
                    return; // Keluar dari callback ini
                }

                let onuTable;
                try {
                    onuTable = JSON.parse(body).data; // Parsing respons ONU
                    console.log(`onuTable for port_id ${val.port_id}:`, onuTable); // Log tabel ONU
                } catch (parseError) {
                    console.error("Failed to parse ONU response:", parseError);
                    checkAllRequestsDone();
                    return; // Keluar dari callback ini
                }

                if (!onuTable || onuTable.length === 0) {
                    console.error("onuTable is null or undefined for port_id:", val.port_id);
                    checkAllRequestsDone();
                    return; // Keluar dari callback ini
                }

                // Mencari nama ONU di tabel ONU
                let foundIndex = onuTable.findIndex(onu => onu.ont_name === onuName);
                if (foundIndex !== -1) {
                    foundONU = { port_id: val.port_id, onu_index: foundIndex }; // Menyimpan detail ONU yang ditemukan
                    fetchOnuDetails(foundONU, xToken, res); // Mengambil detail untuk ONU yang ditemukan
                } else {
                    checkAllRequestsDone(); // Periksa apakah semua permintaan telah selesai tanpa menemukan ONU
                }
            });
        });
    });
});

// Fungsi untuk mengambil detail untuk ONU yang ditemukan
function fetchOnuDetails(foundONU, xToken, res) {
    const port_id = foundONU.port_id;
    const onu_index = foundONU.onu_index;

    // Mengambil sumber daya ONU
    request({
        url: `${oltUrl}gponont_mgmt?form=resource&port_id=${port_id}`,
        headers: {
            "X-Token": xToken
        }
    }, function (err, response, body) {
        if (err) {
            console.error("Request Error for ONU resources:", err);
            return; // Keluar dari callback ini
        }

        let bodyResource;
        try {
            bodyResource = JSON.parse(body); // Parsing respons sumber daya
            console.log("ONU Resource Response:", bodyResource); // Log respons sumber daya
        } catch (parseError) {
            console.error("Failed to parse ONU resource response:", parseError);
            return; // Keluar dari callback ini
        }

        if (bodyResource.code === 1) {
            let resource = bodyResource.data.resource.split(","); // Memisahkan sumber daya
            let onu_id = resource[onu_index];

            // Mengambil informasi dasar
            request({
                url: `${oltUrl}gponont_mgmt?form=base&port_id=${port_id}&ont_id=${onu_id}`,
                headers: {
                    "X-Token": xToken
                }
            }, function (err, response, body) {
                let base;
                try {
                    base = JSON.parse(body).data; // Parsing respons informasi dasar
                    console.log("Base Info Response:", base); // Log respons informasi dasar
                } catch (parseError) {
                    console.error("Failed to parse base response:", parseError);
                    return; // Keluar dari callback ini
                }

                // Mendapatkan OLT RX power
                request({
                    url: `${oltUrl}gponont_mgmt?form=ont_optical&port_id=${port_id}&ont_id=${onu_id}`,
                    headers: {
                        "X-Token": xToken
                    }
                }, function (err, response, body) {
                    let opticalInfo;
                    try {
                        opticalInfo = JSON.parse(body).data; // Parsing respons optik
                        console.log("Optical Info Response:", opticalInfo); // Log respons optik
                    } catch (parseError) {
                        console.error("Failed to parse optical info response:", parseError);
                        return; // Keluar dari callback ini
                    }

                    let status = base.rstate === 1 ? 'online' : 'offline'; // Menentukan status ONU
                    let olt_rxpower = opticalInfo ? opticalInfo.olt_rxpower : null; // Mendapatkan nilai olt_rxpower

                    // Mengembalikan respons lengkap dengan informasi dasar dan optik
                    return res.json({
                        status: status,
                        olt_rxpower: olt_rxpower,
                        info: base,
                    });
                });
            });
        } else {
            return res.status(404).json({ error: "ONU resources not found" });
        }
    });
}


// Jalankan server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
