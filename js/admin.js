/**
 * ADMIN.JS
 * Logika Bisnis Dashboard Pengelola (Halaman admin.html)
 * Terintegrasi Penuh ke API Live Google Sheets SDN Ranuklindungan I
 * Fitur Tambahan: Jurnal Matriks Rekap Bulanan (1-31), Tahunan & Unduh CSV
 */

document.addEventListener('DOMContentLoaded', () => {
  const loginSection = document.getElementById('loginSection');
  const dashboardSection = document.getElementById('dashboardSection');
  const btnLogin = document.getElementById('btnLogin');
  const btnLogout = document.getElementById('btnLogout');
  const excelFileInput = document.getElementById('excelFile');
  const btnUploadExcel = document.getElementById('btnUploadExcel');
  const tabelMuridBody = document.getElementById('tabelMuridBody');
  const lblTahunAktif = document.getElementById('lblTahunAktif');

  // Elemen UI Tambahan untuk Rekap & Modal Popup
  const btnRekapBulanan = document.getElementById('btnRekapBulanan');
  const btnRekapTahunan = document.getElementById('btnRekapTahunan');
  const modalRekap = document.getElementById('modalRekap');
  const btnTutupModal = document.getElementById('btnTutupModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalSubtitle = document.getElementById('modalSubtitle');
  const modalTableHead = document.getElementById('modalTableHead');
  const modalTableBody = document.getElementById('modalTableBody');
  const btnUnduhCSV = document.getElementById('btnUnduhCSV');
  
  let parsedStudentsData = [];
  let cachedStudentsList = []; // Menyimpan data murid yang berhasil ditarik dari server
  let dataExportCSV = "";      // Wadah string data CSV siap unduh
  let tipeRekapAktif = "";     // "bulanan" atau "tahunan"
  let komponenFilterContainer = null;

  // Pengecekan Sesi Login (Guard)
  if (sessionStorage.getItem("adminLoggedIn") === "true") {
    initDashboard();
  }

  // 1. Alur Login Admin
  btnLogin.addEventListener('click', () => {
    const user = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value.trim();

    if(!user || !pass) return alert("Masukkan username dan sandi!");
    
    btnLogin.innerText = "⏳ Memverifikasi...";
    btnLogin.setAttribute('disabled', 'true');

    fetch(CONFIG.API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: "login", username: user, password: pass })
    })
    .then(res => res.json())
    .then(data => {
      if(data.status === "success") {
        sessionStorage.setItem("adminLoggedIn", "true");
        sessionStorage.setItem("adminName", data.admin_name);
        sessionStorage.setItem("activeYear", data.active_year || CONFIG.TAHUN_AJARAN_DEFAULT);
        if(data.avatar_url) sessionStorage.setItem("adminAvatar", data.avatar_url);
        initDashboard();
      } else {
        alert("Gagal: " + data.message);
        btnLogin.innerText = "Masuk Sistem";
        btnLogin.removeAttribute('disabled');
      }
    })
    .catch(() => {
      alert("Terjadi masalah saat menghubungi server.");
      btnLogin.innerText = "Masuk Sistem";
      btnLogin.removeAttribute('disabled');
    });
  });

  // 2. Inisialisasi Tampilan Dashboard
  function initDashboard() {
    loginSection.classList.add('hidden');
    dashboardSection.classList.remove('hidden');
    
    document.getElementById('adminName').innerText = sessionStorage.getItem("adminName");
    lblTahunAktif.innerText = sessionStorage.getItem("activeYear");
    
    const currentActiveYear = sessionStorage.getItem("activeYear");
    const selectTahun = document.getElementById('selectTahun');
    if (selectTahun && currentActiveYear) {
      selectTahun.value = currentActiveYear;
    }
    
    const avatar = sessionStorage.getItem("adminAvatar");
    if(avatar) {
      document.getElementById('adminAvatar').src = avatar;
      document.getElementById('adminAvatar').classList.remove('hidden');
      document.getElementById('avatarPlaceholder').classList.add('hidden');
    }
    
    loadDatabaseTable();
  }

  // 3. Parsing File Excel di Sisi Klien
  if(excelFileInput) {
    excelFileInput.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function(evt) {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson = XLSX.utils.sheet_to_json(worksheet);
        
        parsedStudentsData = rawJson.map(row => ({
          no_absen: row['no-absen'] || row['No Absen'] || row['no_absen'],
          nama_murid: row['nama-murid'] || row['Nama Murid'] || row['nama_murid'],
          alamat: row['alamat'] || row['Alamat']
        })).filter(item => item.no_absen && item.nama_murid);

        if (parsedStudentsData.length > 0) {
          btnUploadExcel.removeAttribute('disabled');
          btnUploadExcel.className = "w-full py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all text-sm uppercase tracking-wider cursor-pointer";
          btnUploadExcel.innerText = `Kirim ${parsedStudentsData.length} Data Murid`;
        } else {
          alert("Berkas Excel kosong atau format kolom salah (Wajib: no-absen, nama-murid, alamat).");
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  // 4. Batch Upload Data Excel ke Google Sheets
  btnUploadExcel.addEventListener('click', () => {
    btnUploadExcel.setAttribute('disabled', 'true');
    btnUploadExcel.innerText = "⏳ Memproses Massal...";

    fetch(CONFIG.API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: "bulkUploadStudents",
        tahun_ajaran: sessionStorage.getItem("activeYear"),
        students: parsedStudentsData
      })
    })
    .then(res => res.json())
    .then(res => {
      if(res.status === "success") {
        alert("🎉 Data murid berhasil diunggah masal ke Google Sheets!");
        excelFileInput.value = "";
        btnUploadExcel.setAttribute('disabled', 'true');
        btnUploadExcel.className = "w-full py-2.5 bg-slate-200 text-slate-400 font-bold rounded-xl cursor-not-allowed transition-all text-sm uppercase tracking-wider";
        btnUploadExcel.innerText = "Proses & Kirim Data";
        loadDatabaseTable();
      } else {
        alert("Gagal mengunggah data masal: " + res.message);
        btnUploadExcel.removeAttribute('disabled');
        btnUploadExcel.innerText = "Coba Kirim Ulang";
      }
    })
    .catch(() => {
      alert("Terjadi gangguan jaringan saat mengunggah data masal.");
      btnUploadExcel.removeAttribute('disabled');
      btnUploadExcel.innerText = "Coba Kirim Ulang";
    });
  });

  // 5. Render Database Siswa ke Tabel Utama & Cache Data Lokal
  function loadDatabaseTable() {
    tabelMuridBody.innerHTML = `
      <tr>
        <td colspan="4" class="py-8 text-center text-blue-600 font-bold animate-pulse">
          ⏳ Sedang mengambil data riil dari Google Sheets...
        </td>
      </tr>
    `;
    
    const activeYear = sessionStorage.getItem("activeYear") || CONFIG.TAHUN_AJARAN_DEFAULT;

    fetch(CONFIG.API_URL, {
      method: 'POST',
      body: JSON.stringify({ 
        action: "getAllStudents", 
        tahun_ajaran: activeYear 
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.status === "success" && data.students && data.students.length > 0) {
        tabelMuridBody.innerHTML = "";
        cachedStudentsList = data.students; // Salin data ke memori lokal untuk keperluan fitur rekap laporan
        
        data.students.forEach(siswa => {
          tabelMuridBody.innerHTML += `
            <tr class="hover:bg-slate-50 transition-colors border-b border-slate-100">
              <td class="py-3.5 px-4 text-center font-bold text-slate-700">${siswa.no_absen}</td>
              <td class="py-3.5 px-4 font-bold text-blue-600">${siswa.nama}</td>
              <td class="py-3.5 px-4 text-slate-600">${siswa.alamat}</td>
              <td class="py-3.5 px-4 text-center text-lg">
                ${siswa.foto_url ? `<a href="${siswa.foto_url}" target="_blank" class="text-blue-500 hover:underline">👁️ Lihat</a>` : '👤'}
              </td>
            </tr>
          `;
        });
      } else {
        cachedStudentsList = [];
        tabelMuridBody.innerHTML = `
          <tr>
            <td colspan="4" class="py-8 text-center text-slate-400 font-medium">
              📭 Belum ada data murid terdaftar untuk Tahun Ajaran ${activeYear}.
            </td>
          </tr>
        `;
      }
    })
    .catch((error) => {
      console.error("Error fetching table:", error);
      tabelMuridBody.innerHTML = `
        <tr>
          <td colspan="4" class="py-8 text-center text-rose-500 font-bold">
            ⚠️ Gagal memuat database. Pastikan Web App Script Anda sudah di-deploy ulang.
          </td>
        </tr>
      `;
    });
  }

  // 6. Aktivasi Perubahan Tahun Ajaran
  document.getElementById('btnAktifkanTahun').addEventListener('click', () => {
    const thn = document.getElementById('selectTahun').value;
    const btnAktifkan = document.getElementById('btnAktifkanTahun');
    
    btnAktifkan.innerText = "⏳ Menyimpan...";
    btnAktifkan.setAttribute('disabled', 'true');

    fetch(CONFIG.API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: "updateActiveYear",
        tahun_ajaran: thn
      })
    })
    .then(res => res.json())
    .then(res => {
      if (res.status === "success") {
        sessionStorage.setItem("activeYear", thn);
        lblTahunAktif.innerText = thn;
        loadDatabaseTable();
        alert(`Sistem: Tahun ajaran ${thn} berhasil diaktifkan secara global untuk semua perangkat.`);
      } else {
        alert("Gagal mengubah tahun ajaran di server: " + res.message);
      }
      btnAktifkan.innerText = "Aktifkan";
      btnAktifkan.removeAttribute('disabled');
    })
    .catch(() => {
      alert("Terjadi masalah jaringan saat menghubungi server.");
      btnAktifkan.innerText = "Aktifkan";
      btnAktifkan.removeAttribute('disabled');
    });
  });

  // ==========================================
  // FITUR REKAP ABSENSI INTEGRAL (BULANAN & TAHUNAN)
  // ==========================================
  
  // Aksi Klik Tombol Rekap Bulanan
  btnRekapBulanan.addEventListener('click', () => {
    tipeRekapAktif = "bulanan";
    modalTitle.innerText = "📅 Jurnal Rekap Absensi Bulanan (Matriks)";
    modalSubtitle.innerText = `Tahun Ajaran Aktif: ${sessionStorage.getItem("activeYear")}`;
    
    buatFilterBulanUI();
    
    modalTableHead.innerHTML = "";
    modalTableBody.innerHTML = `<tr><td class="p-8 text-center text-slate-400 italic" colspan="100%">Silakan tentukan pilihan nama bulan di atas, lalu klik tombol "Lihat Laporan".</td></tr>`;
    modalRekap.classList.remove('hidden');
  });

  // Membuat Dropdown Pilihan Nama Bulan secara Dinamis saat Tombol Bulanan Diklik
  function buatFilterBulanUI() {
    if (document.getElementById('containerFilterBulan')) return;

    komponenFilterContainer = document.createElement('div');
    komponenFilterContainer.id = "containerFilterBulan";
    komponenFilterContainer.className = "mt-4 flex flex-wrap gap-2 items-center bg-purple-50 p-3 rounded-2xl border border-purple-100";
    komponenFilterContainer.innerHTML = `
      <label class="text-xs font-black text-purple-700 uppercase pl-1">Pilih Bulan Berjalan:</label>
      <select id="bulanDipilih" class="bg-white border-2 border-purple-200 text-slate-700 font-bold px-3 py-1.5 rounded-xl text-xs focus:outline-none focus:border-purple-500">
        <option value="1">Januari</option><option value="2">Februari</option><option value="3">Maret</option>
        <option value="4">April</option><option value="5">Mei</option><option value="6">Juni</option>
        <option value="7">Juli</option><option value="8">Agustus</option><option value="9">September</option>
        <option value="10">Oktober</option><option value="11">November</option><option value="12">Desember</option>
      </select>
      <button id="btnProsesLihatBulan" class="bg-purple-600 hover:bg-purple-700 text-white font-bold px-4 py-1.5 rounded-xl text-xs shadow-sm transition-all active:scale-95 cursor-pointer">
        Lihat Laporan
      </button>
    `;
    modalSubtitle.parentNode.appendChild(komponenFilterContainer);

    document.getElementById('btnProsesLihatBulan').addEventListener('click', () => {
      const bkn = parseInt(document.getElementById('bulanDipilih').value);
      tarikDanKalkulasiMatriks(bkn);
    });
  }

  // Menghubungkan Log Riwayat dari Server dan Menyusun ke Bentuk Matriks Jurnal Horisontal
  function tarikDanKalkulasiMatriks(bulanAngka) {
    modalTableBody.innerHTML = `<tr><td class="p-8 text-center text-slate-400 animate-pulse" colspan="100%">⏳ Menghitung akumulasi log absensi siswa dari Google Sheets...</td></tr>`;
    
    // Tarik data riwayat absensi mentah (Dari tab Log_Absensi)
    fetch(CONFIG.API_URL, {
      method: 'POST',
      body: JSON.stringify({ 
        action: "getAttendanceLogs", // Pastikan fungsi di Apps script bernama ini atau sesuaikan
        tahun_ajaran: sessionStorage.getItem("activeYear")
      })
    })
    .then(res => res.json())
    .then(data => {
      const logs = data.logs || [];
      renderMatriksBulananHTML(bulanAngka, logs);
    })
    .catch(() => {
      // Pembubuhan fallback lokal agar tidak macet jika endpoint belum siap sepenuhnya
      renderMatriksBulananHTML(bulanAngka, []);
    });
  }

  function renderMatriksBulananHTML(bulanAngka, logs) {
    const namaBulanArr = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    
    // 1. MEMBUAT HEADER HORISONTAL MATRIKS (NO | NAMA | 1 s/d 31 | S | I)
    let headHTML = `<tr class="bg-slate-800 text-white text-center font-bold text-xs">
      <th class="p-3 border border-slate-700 text-left bg-slate-900" style="min-width: 50px;">NO</th>
      <th class="p-3 border border-slate-700 text-left bg-slate-900" style="min-width: 180px;">NAMA MURID</th>`;
    
    for (let t = 1; t <= 31; t++) {
      headHTML += `<th class="p-1 border border-slate-700 text-center text-[10px]" style="width: 26px;">${t}</th>`;
    }
    headHTML += `
      <th class="p-2 border border-slate-700 bg-amber-600 text-white text-[11px]" style="width: 35px;">S</th>
      <th class="p-2 border border-slate-700 bg-blue-600 text-white text-[11px]" style="width: 35px;">I</th>
    </tr>`;
    modalTableHead.innerHTML = headHTML;

    // 2. MENGISI BARIS DATA MATRIKS MAHASISWA
    if (cachedStudentsList.length === 0) {
      modalTableBody.innerHTML = `<tr><td class="p-6 text-center text-slate-400 italic" colspan="35">Database murid kosong. Segarkan tabel utama terlebih dahulu.</td></tr>`;
      return;
    }

    let bodyHTML = "";
    let csvString = `BULAN: ${namaBulanArr[bulanAngka-1].toUpperCase()}\nNO,NAMA MURID,` + Array.from({length: 31}, (_, i) => i + 1).join(",") + `,S,I\n`;

    cachedStudentsList.forEach((siswa) => {
      let totalS = 0;
      let totalI = 0;
      
      bodyHTML += `<tr class="hover:bg-slate-50 transition-colors">
        <td class="p-2 border border-slate-200 text-center font-bold text-slate-500">${siswa.no_absen}</td>
        <td class="p-2 border border-slate-200 font-bold text-slate-800 uppercase text-xs">${siswa.nama}</td>`;
      
      let csvRow = `${siswa.no_absen},${siswa.nama},`;

      for (let t = 1; t <= 31; t++) {
        let statusHariIni = "";
        
        // Melakukan filter log kecocokan (Tanggal + Bulan + No Absen)
        logs.forEach(log => {
          const tglLog = new Date(log.timestamp);
          if (tglLog.getDate() === t && (tglLog.getMonth() + 1) === bulanAngka && String(log.no_absen) === String(siswa.no_absen)) {
            if (log.keterangan.toLowerCase().includes("sakit")) { statusHariIni = "S"; totalS++; }
            if (log.keterangan.toLowerCase().includes("izin")) { statusHariIni = "I"; totalI++; }
          }
        });

        bodyHTML += `<td class="p-1 border border-slate-200 text-center font-black text-xs ${statusHariIni === 'S' ? 'text-amber-500 bg-amber-50' : statusHariIni === 'I' ? 'text-blue-500 bg-blue-50' : ''}">${statusHariIni}</td>`;
        csvRow += `${statusHariIni},`;
      }

      bodyHTML += `
        <td class="p-2 border border-slate-200 text-center font-black text-amber-600 bg-amber-50/50">${totalS}</td>
        <td class="p-2 border border-slate-200 text-center font-black text-blue-600 bg-blue-50/50">${totalI}</td>
      </tr>`;
      
      csvString += csvRow + `${totalS},${totalI}\n`;
    });

    modalTableBody.innerHTML = bodyHTML;
    dataExportCSV = csvString;
  }

  // Aksi Klik Tombol Rekap Tahunan (Total Akumulatif)
  btnRekapTahunan.addEventListener('click', () => {
    tipeRekapAktif = "tahunan";
    modalTitle.innerText = "📆 Jurnal Rekap Absensi Kumulatif Tahunan";
    modalSubtitle.innerText = `Tahun Ajaran Aktif: ${sessionStorage.getItem("activeYear")}`;
    
    if(komponenFilterContainer) {
      komponenFilterContainer.remove();
      komponenFilterContainer = null;
    }

    modalTableHead.innerHTML = `
      <tr class="bg-slate-800 text-white font-bold text-xs">
        <th class="p-4 border border-slate-700 text-center w-24">NO ABSEN</th>
        <th class="p-4 border border-slate-700">NAMA LENGKAP MURID</th>
        <th class="p-4 border border-slate-700 text-center bg-amber-600 w-44">TOTAL SAKIT (S)</th>
        <th class="p-4 border border-slate-700 text-center bg-blue-600 w-44">TOTAL IZIN (I)</th>
      </tr>`;

    modalTableBody.innerHTML = `<tr><td class="p-8 text-center text-slate-400 animate-pulse" colspan="4">⏳ Mengambil log tahunan...</td></tr>`;

    fetch(CONFIG.API_URL, {
      method: 'POST',
      body: JSON.stringify({ 
        action: "getAttendanceLogs", 
        tahun_ajaran: sessionStorage.getItem("activeYear") 
      })
    })
    .then(res => res.json())
    .then(data => {
      const logs = data.logs || [];
      let bodyHTML = "";
      let csvString = `REKAP TAHUNAN: ${sessionStorage.getItem("activeYear")}\nNO ABSEN,NAMA LENGKAP MURID,TOTAL SAKIT,TOTAL IZIN\n`;

      if (cachedStudentsList.length === 0) {
        modalTableBody.innerHTML = `<tr><td class="p-6 text-center text-slate-400 italic" colspan="4">Database murid kosong.</td></tr>`;
        return;
      }

      cachedStudentsList.forEach(siswa => {
        let totalS = 0;
        let totalI = 0;

        logs.forEach(log => {
          if (String(log.no_absen) === String(siswa.no_absen)) {
            if (log.keterangan.toLowerCase().includes("sakit")) totalS++;
            if (log.keterangan.toLowerCase().includes("izin")) totalI++;
          }
        });

        bodyHTML += `
          <tr class="hover:bg-slate-50 transition-colors text-sm font-semibold">
            <td class="p-3 border border-slate-200 text-center font-bold text-slate-500">${siswa.no_absen}</td>
            <td class="p-3 border border-slate-200 text-slate-800 font-bold uppercase">${siswa.nama}</td>
            <td class="p-3 border border-slate-200 text-center text-amber-600 font-black bg-amber-50/20">${totalS}</td>
            <td class="p-3 border border-slate-200 text-center text-blue-600 font-black bg-blue-50/20">${totalI}</td>
          </tr>`;
          
        csvString += `${siswa.no_absen},${siswa.nama},${totalS},${totalI}\n`;
      });

      modalTableBody.innerHTML = bodyHTML;
      dataExportCSV = csvString;
    })
    .catch(() => {
      modalTableBody.innerHTML = `<tr><td class="p-6 text-center text-rose-500" colspan="4">⚠️ Gagal terhubung ke modul log repositori.</td></tr>`;
    });

    modalRekap.classList.remove('hidden');
  });

  // Mesin Ekspor Data Menjadi File .CSV Sekali Klik
  btnUnduhCSV.addEventListener('click', () => {
    if(!dataExportCSV) {
      alert("Tidak ada data laporan matriks yang siap diekspor.");
      return;
    }
    
    const blob = new Blob([dataExportCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    const formatNamaFile = `Rekap_${tipeRekapAktif}_Kelas4_${sessionStorage.getItem("activeYear").replace('/', '-')}`;
    link.setAttribute("href", url);
    link.setAttribute("download", `${formatNamaFile}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  // Tutup Modal Popup
  btnTutupModal.addEventListener('click', () => {
    modalRekap.classList.add('hidden');
  });

  document.getElementById('btnRefresh').addEventListener('click', loadDatabaseTable);

  // Logout Sesi
  btnLogout.addEventListener('click', () => {
    sessionStorage.clear();
    location.reload();
  });
});
