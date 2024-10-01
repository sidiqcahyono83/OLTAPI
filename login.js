// Fungsi untuk login dan mendapatkan xToken dari OLT
function loginToOLT(callback) {
    const userKey = md5(userName + ":" + userPwd); // Hashing password
    const getEncode = encoder.encode(userPwd); // Mengonversi password ke format yang dibutuhkan

    request({
        url: `${oltUrl}userlogin?form=login`, // URL login OLT
        method: 'POST', // Menggunakan metode POST
        json: true, // Mengharapkan JSON sebagai respons
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
            return callback(err, null); // Mengirimkan kesalahan jika ada
        }

        console.log("Response status:", response.statusCode);
        console.log("Response body:", body);

        if (response.statusCode !== 200 || !response.headers['x-token']) {
            return callback("Login gagal", null); // Mengirimkan kesalahan jika login gagal
        }

        xToken = response.headers['x-token']; // Menyimpan xToken
        callback(null, xToken); // Mengirimkan token ke callback
    });
}
