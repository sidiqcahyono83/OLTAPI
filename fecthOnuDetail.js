// Fungsi untuk mengambil detail untuk ONU yang ditemukan
function fetchOnuDetails(foundONT, xToken) {
    const port_id = foundONT.port_id;
    const onu_index = foundONT.onu_index;

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

                let status = base.rstate === 1 ? 'online' : 'offline'; // Menentukan status ONT
                return res.json({
                    status: status,
                    info: base // Mengembalikan informasi dasar ONT
                });
            });
        }
    });
}
