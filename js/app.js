/**
 * APP.JS
 * Logika Bisnis Formulir Absensi Murid (Halaman index.html)
 * Terintegrasi Penuh ke API Live Google Sheets SDN Ranuklindungan I
 */

document.addEventListener('DOMContentLoaded', () => {
  const video = document.getElementById('video');
  const canvas = document.getElementById('canvas');
  const btnCamera = document.getElementById('btnCamera');
  const placeholderImg = document.getElementById('placeholderImg');
  const btnKirim = document.getElementById('btnKirim');
  const inputAbsen = document.getElementById('inputAbsen');
  const infoMurid = document.getElementById('infoMurid');
  const namaSiswa = document.getElementById('namaSiswa');
  const alamatSiswa = document.getElementById('alamatSiswa');
  const lblTahunAktifSiswa = document.getElementById('lblTahunAktifSiswa');
  
  let isStreamActive = false;
  let base64Image = null;
  let dataSiswa = null;
  let debounceTimer;
  let TAHUN_AJARAN_GLOBAL = ""; // Akan diisi otomatis dari server Google Sheets

  // 1. Ambil Tahun Ajaran Aktif Global dari Server Saat Halaman Dimuat
  fetch(CONFIG.API_URL, {
    method: 'POST',
    body: JSON.stringify({ action: "getActiveYear" })
  })
  .then(res => res.json())
  .then(data => {
    if (data.status === "success") {
      TAHUN_AJARAN_GLOBAL = data.active_year;
      if (lblTahunAktifSiswa) lblTahunAktifSiswa.innerText = TAHUN_AJARAN_GLOBAL;
      inputAbsen.removeAttribute('disabled'); // Buka proteksi input absen setelah terhubung
    } else {
      if (lblTahunAktifSiswa) lblTahunAktifSiswa.innerText = "Error Memuat";
    }
  })
  .catch(() => {
    if (lblTahunAktifSiswa) lblTahunAktifSiswa.innerText = CONFIG.TAHUN_AJARAN_DEFAULT + " (Luring)";
    TAHUN_AJARAN_GLOBAL = CONFIG.TAHUN_AJARAN_DEFAULT; // Fallback jika offline
    inputAbsen.removeAttribute('disabled');
  });

  // 2. Deteksi Otomatis Nomor Absen (Debounce 500ms)
  inputAbsen.addEventListener('input', function() {
    clearTimeout(debounceTimer);
    const val = this.value.trim();
    
    if(!val) {
      infoMurid.classList.add('hidden');
      dataSiswa = null;
      disableKirim();
      return;
    }

    debounceTimer = setTimeout(() => {
      // Set styling ke kondisi loading/mencari
      infoMurid.className = "bg-gradient-to-br from-slate-50 to-teal-50/30 p-4 rounded-2xl border-2 border-dashed border-teal-300 mb-5 text-left block";
      namaSiswa.className = "text-xl font-black text-blue-600 animate-pulse";
      namaSiswa.innerText = "⏳ Mencari nama...";
      alamatSiswa.innerText = "Mohon tunggu sebentar...";
      infoMurid.classList.remove('hidden');

      fetch(CONFIG.API_URL, {
        method: 'POST',
        body: JSON.stringify({ 
          action: "getStudent", 
          no_absen: val, 
          tahun_ajaran: TAHUN_AJARAN_GLOBAL || CONFIG.TAHUN_AJARAN_DEFAULT 
        })
      })
      .then(res => res.json())
      .then(data => {
        if(data.status === "found") {
          dataSiswa = data;
          infoMurid.className = "bg-gradient-to-br from-slate-50 to-teal-50/30 p-4 rounded-2xl border-2 border-dashed border-teal-300 mb-5 text-left block";
          namaSiswa.className = "text-xl font-black text-blue-600";
          namaSiswa.innerText = data.nama;
          alamatSiswa.innerText = "📍 Alamat: " + data.alamat;
          checkFormValidity();
        } else {
          // Ganti warna pembungkus menjadi merah jika tidak ditemukan
          infoMurid.className = "bg-rose-50 p-4 rounded-2xl border-2 border-dashed border-rose-300 mb-5 text-left block";
          namaSiswa.className = "text-xl font-black text-rose-600 inline-flex items-center gap-1";
          namaSiswa.innerText = "❌ Tidak Ditemukan";
          alamatSiswa.innerText = "Nomor absen tidak terdaftar pada tahun ajaran aktif.";
          dataSiswa = null;
          disableKirim();
        }
      })
      .catch(() => {
        infoMurid.className = "bg-amber-50 p-4 rounded-2xl border-2 border-dashed border-amber-300 mb-5 text-left block";
        namaSiswa.className = "text-xl font-black text-amber-600";
        namaSiswa.innerText = "⚠️ Gangguan Koneksi";
        alamatSiswa.innerText = "Gagal memuat data dari database.";
      });
    }, 500);
  });

  // 3. Logika Pengendalian Kamera Perangkat
  btnCamera.addEventListener('click', async () => {
    if (!isStreamActive) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: "user" }, 
          audio: false 
        });
        video.srcObject = stream;
        video.classList.remove('hidden');
        placeholderImg.classList.add('hidden');
        canvas.classList.add('hidden');
        btnCamera.innerText = "📸 Klik untuk Jepret (Capture)";
        btnCamera.className = "bg-rose-500 text-white font-bold px-5 py-2.5 rounded-full hover:bg-rose-600 shadow-md inline-flex items-center gap-2 transition-all cursor-pointer";
        isStreamActive = true;
      } catch (err) {
        alert("Gagal mengaktifkan kamera. Periksa izin akses browser Anda.");
      }
    } else {
      // Capture Gambar ke Canvas
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
      base64Image = canvas.toDataURL('image/jpeg', 0.8); // Kompresi kualitas gambar 80%
      
      // Hentikan hardware stream (Hemat daya & indikator kamera mati)
      if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
      }
      
      video.classList.add('hidden');
      canvas.classList.remove('hidden');
      btnCamera.innerText = "🔄 Ambil Ulang Foto";
      btnCamera.className = "bg-teal-500 text-white font-bold px-5 py-2.5 rounded-full hover:bg-teal-600 shadow-md inline-flex items-center gap-2 transition-all cursor-pointer";
      isStreamActive = false;
      checkFormValidity();
    }
  });

  // 4. Monitor Pilihan Sakit / Izin
  document.querySelectorAll('input[name="status"]').forEach(el => {
    el.addEventListener('change', checkFormValidity);
  });

  // 5. Pengendali Validasi Kelayakan Kirim Absen
  function checkFormValidity() {
    const statusSelected = document.querySelector('input[name="status"]:checked');
    if (dataSiswa && base64Image && statusSelected) {
      btnKirim.removeAttribute('disabled');
      btnKirim.className = "w-full py-3.5 bg-blue-600 text-white font-black text-xl rounded-2xl shadow-md hover:bg-blue-700 transition-all cursor-pointer uppercase tracking-wide";
    }
  }

  function disableKirim() {
    btnKirim.setAttribute('disabled', 'true');
    btnKirim.className = "w-full py-3.5 bg-slate-200 text-slate-400 font-black text-xl rounded-2xl shadow-inner cursor-not-allowed transition-all uppercase tracking-wide";
  }

  // 6. Kirim Data Absen Akhir ke Server
  btnKirim.addEventListener('click', () => {
    const statusSelected = document.querySelector('input[name="status"]:checked').value;
    
    btnKirim.innerText = "⏳ Sedang Mengirim Data...";
    btnKirim.setAttribute('disabled', 'true');
    btnKirim.className = "w-full py-3.5 bg-slate-400 text-white font-black text-xl rounded-2xl shadow-inner cursor-not-allowed uppercase tracking-wide animate-pulse";

    fetch(CONFIG.API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: "submitAbsence",
        no_absen: inputAbsen.value,
        nama_murid: dataSiswa.nama,
        status: statusSelected,
        tahun_ajaran: TAHUN_AJARAN_GLOBAL,
        image_base64: base64Image
      })
    })
    .then(res => res.json())
    .then(res => {
      if(res.status === "success") {
        alert("🎉 Alhamdulillah! Absen Berhasil direkam.");
        location.reload();
      } else {
        alert("⚠️ Gagal mengirim data absensi: " + res.message);
        checkFormValidity();
      }
    })
    .catch(() => {
      alert("⚠️ Terjadi gangguan jaringan. Data gagal terkirim.");
      checkFormValidity();
    });
  });
});
