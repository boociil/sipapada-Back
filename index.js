
var db = require('./dbconn');

const express = require('express');
const app = express();
const cors = require('cors');

const port = 3000;



app.use(cors());
app.use(express.urlencoded({ extended: true })); // Untuk form data seperti input text dalam form
app.use(express.json());

// FUNGSI PENDUKUNG
///////////////////////////////////////////////////

// Autentikasi User (Admin) di cek menggunakan fungsi ini
function authenticateToken(req, res, next) {
    const token = req.headers['token']
    if (token == null) return res.sendStatus(401); // Unauthorized

    jwt.verify(token, secretKey, (err, user) => {
        if (err) return res.sendStatus(403); // Forbidden
        req.user = user;
        if (user.role === 'Admin'){
            next();
        }else{
            res.sendStatus(403); // Forbidden
        }
    });
}


// BAGIAN API
///////////////////////////////////////////////////

// GET

app.get('/', (req, res) => {
    res.send('Hello Bro');
});


app.get('/get_all_instansi', (req, res) => {
    let query = "SELECT nama,alamat FROM `dinas`";
    
    db.query(query, (err, result) => {  // Ubah 'res' menjadi 'result'
        if (err) {
            res.status(500).send({
                msg: "Failed",
            });
            return;  // Tambahkan return agar eksekusi berhenti setelah error
        }
        
        res.status(200).send({
            status : 200,
            msg: result,  // Gunakan 'result' untuk mengirim hasil query
        });
    });
});

// POST

app.post('/input_instansi', (req, res) => {
    const { nama, alamat } = req.body;

    // Validasi input
    if (req.body === undefined || req.body.nama === undefined || req.body.alamat === undefined) {
        return res.status(400).send({
            msg: "Nama dan alamat harus diisi",
        });
    }

    let query = "INSERT INTO dinas (nama, alamat) VALUES (?, ?)";
    
    db.query(query, [nama, alamat], (err, result) => {
        if (err) {
            console.error(err);  // Log error di server untuk debugging
            return res.status(500).send({
                msg: "Gagal",
                error: err.message,  // Mengirimkan pesan error dari MySQL untuk lebih jelas
            });
        }

        res.status(201).send({
            status: 201,
            msg: "Instansi berhasil ditambahkan",
            id: result.insertId,  // Anda bisa mengirimkan ID yang baru saja dimasukkan ke dalam tabel
        });
    });
});



app.post("/input_ms_keg", authenticateToken, async (req,res) => {

});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
