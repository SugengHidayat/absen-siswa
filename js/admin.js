/**
 * ADMIN.JS
 * Logika Bisnis Dashboard Pengelola (Halaman admin.html)
 * Terintegrasi Penuh ke API Live Google Sheets SDN Ranuklindungan I
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
  
  let parsedStudentsData = [];

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
    
    // Set nilai default dropdown select sesuai tahun aktif yang tersimpan
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

  // 3. Parsing File Excel di Sisi Klien (Membaca berkas lokal)
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
        
        // Pemetaan struktur header kolom excel
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

  // 4. Batch Upload Data Hasil Parse Excel ke Google Sheets
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

  // 5. Render Database Riil Siswa dari Google Spreadsheet (LIVE UPDATE)
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
        tabelMuridBody.innerHTML = ""; // Bersihkan indikator loading
        
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

  // Aktivasi Perubahan Tahun Ajaran
  document.getElementById('btnAktifkanTahun').addEventListener('click', () => {
    const thn = document.getElementById('selectTahun').value;
    sessionStorage.setItem("activeYear", thn);
    lblTahunAktif.innerText = thn;
    
    // Langsung muat ulang data tabel secara otomatis begitu tahun ajaran berganti
    loadDatabaseTable();
    alert(`Sistem: Tahun ajaran ${thn} berhasil diaktifkan.`);
  });

  document.getElementById('btnRefresh').addEventListener('click', loadDatabaseTable);

  // Logout Sesi
  btnLogout.addEventListener('click', () => {
    sessionStorage.clear();
    location.reload();
  });
});
