// Kunci penyimpanan LocalStorage
const STORAGE_KEY = "dompetsiswa_transactions_v1";

// Elemen navigasi tampilan & panel
const views = document.querySelectorAll(".view");
const panels = document.querySelectorAll(".feature-panel");
const activeTitle = document.getElementById("active-feature-title");
const btnToHub = document.getElementById("btn-to-hub");

// Elemen ringkasan & halaman pembuka
const welcomeSaldo = document.getElementById("welcome-saldo");
const saldoUtama = document.getElementById("saldo-utama");
const totalPemasukan = document.getElementById("total-pemasukan");
const totalPengeluaran = document.getElementById("total-pengeluaran");

// Elemen form, riwayat, & backup
const formTransaksi = document.getElementById("form-transaksi");
const inputJenis = document.getElementById("trx-jenis");
const inputKategori = document.getElementById("trx-kategori");
const inputKeterangan = document.getElementById("trx-keterangan");
const inputNominal = document.getElementById("trx-nominal");
const daftarRiwayat = document.getElementById("daftar-riwayat");
const btnExportCsv = document.getElementById("btn-export-csv");
const btnResetData = document.getElementById("btn-reset-data");

const featureTitles = {
  "feature-transaksi": "Catat Transaksi",
  "feature-tabungan": "Target Tabungan",
  "feature-evaluasi": "Limit & Grafik",
  "feature-data": "Backup & Export"
};

let transactions = [];

// Format angka ke Rupiah (contoh: Rp 15.000)
function formatRupiah(amount) {
  const numeric = Number(amount) || 0;
  const sign = numeric < 0 ? "-" : "";
  const formatted = Math.abs(numeric).toLocaleString("id-ID");
  return ${sign}Rp ${formatted};
}

// Format tanggal singkat untuk riwayat transaksi
function formatDate(isoString) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

// Simpan data ke LocalStorage
function saveTransactions() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  } catch (err) {
    console.error("Gagal menyimpan ke LocalStorage:", err);
  }
}

// Muat data dari LocalStorage dengan validasi aman
function loadTransactions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item) =>
        item &&
        typeof item.id === "string" &&
        (item.type === "income" || item.type === "expense") &&
        typeof item.title === "string" &&
        Number.isFinite(Number(item.amount)) &&
        Number(item.amount) > 0
    );
  } catch (err) {
    console.error("Gagal membaca LocalStorage:", err);
    return [];
  }
}

// Hitung pemasukan, pengeluaran, dan sisa saldo
function calculateSummary(items) {
  let income = 0;
  let expense = 0;

  for (const item of items) {
    const amount = Number(item.amount) || 0;
    if (item.type === "income") {
      income += amount;
    } else if (item.type === "expense") {
      expense += amount;
    }
  }

  return {
    income,
    expense,
    balance: income - expense
  };
}

// Render ulang ringkasan saldo di halaman pembuka & panel transaksi
function renderSummary() {
  const { income, expense, balance } = calculateSummary(transactions);

  const formattedBalance = formatRupiah(balance);
  if (welcomeSaldo) welcomeSaldo.textContent = formattedBalance;
  if (saldoUtama) saldoUtama.textContent = formattedBalance;
  if (totalPemasukan) totalPemasukan.textContent = formatRupiah(income);
  if (totalPengeluaran) totalPengeluaran.textContent = formatRupiah(expense);
}

// Render daftar riwayat transaksi (terbaru di atas)
function renderHistory() {
  if (!daftarRiwayat) return;
  daftarRiwayat.innerHTML = "";

  if (transactions.length === 0) {
    const emptyLi = document.createElement("li");
    emptyLi.className = "empty-state";
    emptyLi.textContent = "Belum ada transaksi tercatat.";
    daftarRiwayat.appendChild(emptyLi);
    return;
  }

  const sorted = [...transactions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  for (const trx of sorted) {
    const li = document.createElement("li");
    li.className = history-item ${trx.type};
    li.style.cssText =
      "display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px;border:1px solid var(--border);border-radius:var(--radius-sm);background:#fffafb;";

    const infoDiv = document.createElement("div");
    infoDiv.style.cssText = "display:flex;flex-direction:column;gap:2px;min-width:0;";

    const titleEl = document.createElement("strong");
    titleEl.textContent = trx.title;
    titleEl.style.cssText = "font-size:0.95rem;word-break:break-word;";

    const metaEl = document.createElement("small");
    metaEl.className = "muted";
    const dateText = formatDate(trx.createdAt);
    metaEl.textContent = dateText ? ${trx.category} • ${dateText} : trx.category;

    infoDiv.appendChild(titleEl);
    infoDiv.appendChild(metaEl);

    const rightDiv = document.createElement("div");
    rightDiv.style.cssText = "display:flex;align-items:center;gap:10px;flex-shrink:0;";

    const amountEl = document.createElement("span");
    const prefix = trx.type === "income" ? "+" : "-";
    amountEl.textContent = ${prefix}${formatRupiah(trx.amount)};
    amountEl.style.cssText =
      trx.type === "income"
        ? "font-weight:700;font-size:0.92rem;color:var(--income-text);"
        : "font-weight:700;font-size:0.92rem;color:var(--expense-text);";

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.textContent = "Hapus";
    delBtn.setAttribute("aria-label", Hapus transaksi ${trx.title});
    delBtn.style.cssText =
      "padding:6px 10px;border-radius:8px;font-size:0.8rem;font-weight:600;background:var(--expense-bg);color:var(--expense-text);";
    delBtn.addEventListener("click", () => deleteTransaction(trx.id));

    rightDiv.appendChild(amountEl);
    rightDiv.appendChild(delBtn);

    li.appendChild(infoDiv);
    li.appendChild(rightDiv);
    daftarRiwayat.appendChild(li);
  }
}

// Tambah transaksi baru
function addTransaction(event) {
  event.preventDefault();

  const type = inputJenis?.value === "income" ? "income" : "expense";
  const category = inputKategori?.value || "Lainnya";
  const title = (inputKeterangan?.value || "").trim();
  const amount = Number(inputNominal?.value);

  if (!title) {
    alert("Keterangan transaksi wajib diisi.");
    inputKeterangan?.focus();
    return;
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    alert("Nominal harus lebih dari 0.");
    inputNominal?.focus();
    return;
  }

  const newTrx = {
    id:
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : trx_${Date.now()}_${Math.random().toString(36).slice(2, 7)},
    type,
    category,
    title,
    amount: Math.round(amount),
    createdAt: new Date().toISOString()
  };

  transactions.push(newTrx);
  saveTransactions();
  renderAll();

  formTransaksi?.reset();
  if (inputJenis) inputJenis.value = type;
  inputKeterangan?.focus();
}

// Hapus transaksi berdasarkan ID
function deleteTransaction(id) {
  transactions = transactions.filter((item) => item.id !== id);
  saveTransactions();
  renderAll();
}

// Export transaksi ke CSV (kompatibel dengan Excel)
function exportToCsv() {
  if (transactions.length === 0) {
    alert("Belum ada data transaksi untuk di-export.");
    return;
  }

  const headers = ["Tanggal", "Jenis", "Kategori", "Keterangan", "Nominal (Rp)"];
  const rows = transactions.map((trx) => {
    const jenisLabel = trx.type === "income" ? "Pemasukan" : "Pengeluaran";
    const signedAmount = trx.type === "income" ? trx.amount : -trx.amount;
    const fields = [
      formatDate(trx.createdAt),
      jenisLabel,
      trx.category,
      trx.title,
      signedAmount
    ];
    return fields
      .map((val) => "${String(val).replaceAll('"', '""')}")
      .join(",");
  });

  const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  const today = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = dompetsiswa-${today}.csv;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Hapus seluruh data transaksi
function resetAllData() {
  if (transactions.length === 0) {
    alert("Data sudah kosong.");
    return;
  }

  const confirmed = confirm(
    "Yakin ingin menghapus semua riwayat transaksi? Tindakan ini tidak bisa dibatalkan."
  );
  if (!confirmed) return;

  transactions = [];
  saveTransactions();
  renderAll();
}

// Render seluruh tampilan data
function renderAll() {
  renderSummary();
  renderHistory();
}

// Navigasi antar tampilan utama (#view-welcome, #view-hub, #view-feature)
function showView(viewId) {
  views.forEach((v) => v.classList.remove("active"));
  const targetView = document.getElementById(viewId);
  if (targetView) {
    targetView.classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

// Buka salah satu panel fitur di dalam #view-feature
function openFeature(panelId) {
  panels.forEach((p) => p.classList.remove("active"));
  const targetPanel = document.getElementById(panelId);
  if (targetPanel) {
    targetPanel.classList.add("active");
    if (activeTitle) {
      activeTitle.textContent = featureTitles[panelId] || "Fitur";
    }
    showView("view-feature");
  }
}

// Pasang event listener navigasi
btnToHub?.addEventListener("click", () => {
  showView("view-hub");
});

document.querySelectorAll(".feature-card").forEach((card) => {
  card.addEventListener("click", () => {
    const panelId = card.dataset.open;
    if (panelId) openFeature(panelId);
  });
});

document.querySelectorAll(".btn-back").forEach((btn) => {
  btn.addEventListener("click", () => {
    const targetViewId = btn.dataset.target;
    if (targetViewId) showView(targetViewId);
  });
});

// Pasang event listener form & tombol data
formTransaksi?.addEventListener("submit", addTransaction);
btnExportCsv?.addEventListener("click", exportToCsv);
btnResetData?.addEventListener("click", resetAllData);

// Inisialisasi aplikasi saat dimuat
transactions = loadTransactions();
renderAll();
