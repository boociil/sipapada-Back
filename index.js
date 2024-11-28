
var db = require('./dbconn');

const express = require('express');
const app = express();
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');
// const upload = multer({ dest: 'uploads/' });

const port = 3000;

const secretKey = 'babi';

app.use(cors());
app.use(express.urlencoded({ extended: true })); // Untuk form data seperti input text dalam form
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const uploadDir = './uploads';

// Pastikan folder uploads ada
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Konfigurasi penyimpanan file dengan multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Menyimpan file ke folder 'uploads'
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // File akan dinamakan dengan ID yang akan didapatkan setelah menyimpan data
    cb(null, file.originalname);  // Ini sementara, kita akan mengganti nama nanti
  }
});

const upload = multer({ storage: storage });

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
    let query = "SELECT id,nama,alamat,alias FROM `dinas`";
    
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

app.get('/get_all_users', (req, res) => {
    let query = "SELECT `username`, `role`, `dinas` FROM `users`";
    
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

app.get('/get_all_users', (req, res) => {
    let query = "SELECT `username`, `role`, `dinas` FROM `users` WHERE `role` != 0 ORDER BY `dinas` ASC;";
    
    db.query(query, (err, result) => {  // Ubah 'res' menjadi 'result'
        if (err) {
            res.status(500).send({
                status:500,
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

app.post("/login", async (req,res) => {

    try {

        const { username, password } = req.body;
        
        const query = "SELECT username,password,role,dinas FROM `users` WHERE `username`= ?;";
        
        db.query(query, [username] ,(err,results) =>{
            if (results.length === 0){
                // Jika Kesalahan berada pada username
                res.status(200).send({
                    msg : "Username",
                    accessToken : "-",
                });
            }else{
                let hashed_pass = results[0].password;
                bcrypt.compare(password, hashed_pass, function(err,resultss){
                    if (err) {
                        // Kesalahan selama pembandingan
                        res.status(500).send("Terjadi Kesalahan")
                    } else {
                        // Hasil pembandingan
                        if (resultss) {
                            // Informasi yang terkandung dalam token
                            const info = {
                                "username": results[0].username,
                                "role": results[0].role,
                                "dinas": results[0].dinas,
                            }
                            // TOKEN
                            const token = jwt.sign(info,secretKey);
                            
                            res.status(200).json({
                                status:200,
                                msg:"Success",
                                accessToken : token,
                                role : results[0].role,
                                username : info.username,
                            })
                           
                            
                        } else {
                            // Jika Kesalahan berada pada password
                            res.status(400).send({msg:"Password", accessToken : "-"});
                        }
                    }
                });
            }
        });
    } catch (error) {
        res.status(500).send("Terjadi Kesalahan")
    }
});



app.post("/add_user",  async (req,res) =>{
    try{
        const { username, password, role,dinas } = req.body;
        const hashedPass = await bcrypt.hash(password, 10);

        //Push ke db
        const query = "INSERT INTO `users`(`username`, `password`, `role`, `dinas`) VALUES (?,?,?,?)";

        db.query(query, [username,hashedPass,role,dinas] , (err,results) => {
            if (err){
                res.status(403).send(err);
                throw err;
            }

            res.status(201).send({
                status: 201,
                msg: "User berhasil ditambahkan",
            });
        });

        
    } catch(error){
        // res.status(500).send("Terjadi Kesalahan")
    }
    
})

app.post("/delete_user",  async (req,res) =>{
    try{
        const { username} = req.body;

        //Push ke db
        const query = "DELETE FROM `users` WHERE username = ?;";

        db.query(query, [username] , (err,results) => {
            if (err){
                res.status(404).send(err);
                throw err;
            }

            res.status(200).send({
                status: 200,
                msg: "User berhasil dihapus",
            });
        });

        
    } catch(error){
        // res.status(500).send("Terjadi Kesalahan")
    }
    
})

app.post('/add_opd', upload.single('file'), (req, res) => {
    const { nama, alias } = req.body;
    
    // Validasi input
    if (!nama || !alias || !req.file) {
      return res.status(400).send({
        msg: "Nama, alias, dan file harus diisi.",
      });
    }
  
    // Menyimpan data ke database terlebih dahulu untuk mendapatkan ID
    let query = "INSERT INTO dinas (nama, alias) VALUES (?, ?)";
    db.query(query, [nama, alias], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).send({
          msg: "Gagal",
          error: err.message,
        });
      }
  
      // Setelah data berhasil disimpan, dapatkan ID
      const id = result.insertId;
  
      // Mengganti nama file dengan ID yang didapatkan dari database
      const fileExtension = path.extname(req.file.originalname);  // Mengambil ekstensi file
      const newFileName = `${id}${fileExtension}`;  // Nama file baru berdasarkan ID
      const newFilePath = path.join(uploadDir, newFileName);
  
      // Mengganti nama file yang sudah disimpan di folder uploads
      fs.rename(req.file.path, newFilePath, (err) => {
        if (err) {
          console.error('Gagal mengganti nama file:', err);
          return res.status(500).send({
            msg: 'Gagal mengganti nama file',
          });
        }

        // Setelah file berhasil diubah namanya, kirimkan response sukses
        res.status(201).send({
          status: 201,
          msg: "Instansi berhasil ditambahkan",
          id: id,  // Mengirimkan ID yang baru saja ditambahkan ke database
          file: newFileName  // Mengirimkan nama file yang sudah diganti
        });
      });
    });
});



app.post("/input_ms_keg",  async (req,res) => {
    const query = `
    INSERT INTO metadata_keg (
      dinas_id, tahun, nama_kegiatan, kode_kegiatan, pj_eselon_1, pj_eselon_2, pj_eselon_3, jabatan_es_3, 
      alamat_es_3, telepon_es_3, email_es_3, faksimile_es_3, cara_pengumpulan, sektor_kegiatan, 
      rekomendasi, id_rekomendasi, telepon_intansi, email_instansi, faksimile, latbel_kegiatan, 
      tujuan_kegiatan, perencanaan_awal, perencanaan_akhir, desain_awal, desain_akhir, pengumpulan_awal, 
      pengumpulan_akhir, pengolahan_awal, pengolahan_akhir, analisis_awal, analisis_akhir, diseminasi_awal, diseminasi_akhir,
      evaluasi_awal, evaluasi_akhir, variabel_stat, kegiatan_dilakukan, jika_berulang, tipe_pengumpulan_data, 
      cakupan_wilayah, wilayah_kegiatan, metode_pengumpulan, metode_pengumpulan_lainnya, sarana_pengumpulan, 
      sarana_pengumpulan_lainnya, unit_pengumpulan, unit_pengumpulan_lainnya, rancangan_sampel, 
      metode_pemiliahan_sampel_terakir, metode_sampel, kerangka_sampel_terakir, fraksi_sampel, sampling_error, 
      unit_sampel, unit_observasi, uji_coba, metode_pemeriksaan_kualitas_data, 
      metode_pemeriksaan_kualitas_data_lainnya, penyesuaian_non_respon, petugas_pengumpulan_data, 
      persyaratan_pendidikan_terendah_petugas, jumlah_petugas, jumlah_supervisor, jumlah_pengumpul, 
      pelatihan_petugas, penyuntingan, penyandian, data_entry, penyahihan, metode_analisis, 
      unit_analisis, unit_analisis_lainnya, penyajian_analisis, penyajian_analisis_lainnya, cetak, digital, 
      data_mikro
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    );
  `;

  const {dinas_id, tahun, nama_kegiatan, kode_kegiatan, pj_eselon_1, pj_eselon_2, pj_eselon_3, jabatan_es_3, 
    alamat_es_3, telepon_es_3, email_es_3, faksimile_es_3, cara_pengumpulan, sektor_kegiatan, 
    rekomendasi, id_rekomendasi, telepon_intansi, email_instansi, faksimile, 
    // BAB III
    latbel_kegiatan, tujuan_kegiatan, perencanaan_awal, perencanaan_akhir, desain_awal, desain_akhir, pengumpulan_awal, 
    pengumpulan_akhir, pengolahan_awal, pengolahan_akhir, analisis_awal, analisis_akhir, diseminasi_awal, diseminasi_akhir, 
    evaluasi_awal, evaluasi_akhir, variabel_stat, 
    // BAB IV
    kegiatan_dilakukan, jika_berulang, tipe_pengumpulan_data, 
    cakupan_wilayah, wilayah_kegiatan, metode_pengumpulan, metode_pengumpulan_lainnya, sarana_pengumpulan, 
    sarana_pengumpulan_lainnya, unit_pengumpulan, unit_pengumpulan_lainnya, 
    // BAB V
    rancangan_sampel, metode_pemiliahan_sampel_terakir, metode_sampel, kerangka_sampel_terakir, fraksi_sampel, sampling_error, 
    unit_sampel, unit_observasi, 
    // BAB VI
    uji_coba, metode_pemeriksaan_kualitas_data, 
    metode_pemeriksaan_kualitas_data_lainnya, penyesuaian_non_respon, petugas_pengumpulan_data, 
    persyaratan_pendidikan_terendah_petugas, jumlah_supervisor, jumlah_pengumpul, pelatihan_petugas,
    // BAB VII
    penyuntingan, penyandian, data_entry, penyahihan, metode_analisis, 
    unit_analisis, unit_analisis_lainnya, penyajian_analisis, penyajian_analisis_lainnya, 
    // BAB VIII
    cetak, digital, 
    data_mikro
    } = req.body

    const jumlah_petugas = jumlah_pengumpul + jumlah_supervisor

    console.log(req.body);
    
  
    // ALUR!!!
    // baca req.body -> query tabel keg -> query tabel varstat -> query tabel wilkeg

  db.query(query, [
    dinas_id, tahun, nama_kegiatan, kode_kegiatan, pj_eselon_1, pj_eselon_2, pj_eselon_3, jabatan_es_3, 
    alamat_es_3, telepon_es_3, email_es_3, faksimile_es_3, cara_pengumpulan, sektor_kegiatan, 
    rekomendasi, id_rekomendasi, telepon_intansi, email_instansi, faksimile, 
    latbel_kegiatan, tujuan_kegiatan, perencanaan_awal, perencanaan_akhir, desain_awal, desain_akhir, pengumpulan_awal, 
    pengumpulan_akhir, pengolahan_awal, pengolahan_akhir, analisis_awal, analisis_akhir, diseminasi_awal, diseminasi_akhir, 
    evaluasi_awal, evaluasi_akhir, variabel_stat, 
    kegiatan_dilakukan, jika_berulang, tipe_pengumpulan_data, 
    cakupan_wilayah, wilayah_kegiatan, metode_pengumpulan, metode_pengumpulan_lainnya, sarana_pengumpulan, 
    sarana_pengumpulan_lainnya, unit_pengumpulan, unit_pengumpulan_lainnya, 
    rancangan_sampel, metode_pemiliahan_sampel_terakir, metode_sampel, kerangka_sampel_terakir, fraksi_sampel, sampling_error, 
    unit_sampel, unit_observasi, 
    uji_coba, metode_pemeriksaan_kualitas_data, 
    metode_pemeriksaan_kualitas_data_lainnya, penyesuaian_non_respon, petugas_pengumpulan_data, 
    persyaratan_pendidikan_terendah_petugas, jumlah_petugas, jumlah_supervisor, jumlah_pengumpul, pelatihan_petugas,
    penyuntingan, penyandian, data_entry, penyahihan, metode_analisis, 
    unit_analisis, unit_analisis_lainnya, penyajian_analisis, penyajian_analisis_lainnya, 
    cetak, digital, 
    data_mikro,
  ], (err,result) => {
    if (err) {
        console.log("error BE", err);
        
        res.status(500).send({
            msg: "Failed",
        });
        return;  // Tambahkan return agar eksekusi berhenti setelah error
    }
    console.log("ga error BE");
    res.status(201).send({
        status: 201,
        msg: "Success",
      })
  })
});


app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
