// src/utils/excelExport.js
import ExcelJS from 'exceljs';

const UR_COLUMNS = ['D', 'E', 'F', 'G', 'H', 'I', 'J']; // Nisan-Ekim
const UR_MONTH_INDEXES = [3, 4, 5, 6, 7, 8, 9]; // Array'de aylar 0-indeksli

export const exportToExcelWithTemplate = async ({ formData, tableData, results, urunler, sulamalar }) => {
  // Şablon dosyayı fetch et
  const response = await fetch('/Kitap1.xlsx');
  const arrayBuffer = await response.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);
  const ws = workbook.worksheets[0];

  // SULAMA ADI: ID'den bul, yoksa fallback
  let sulamaAdi = '';
  if (sulamalar && Array.isArray(sulamalar)) {
    const s = sulamalar.find(x => String(x.id) === String(formData.sulama));
    if (s) sulamaAdi = s.isim;
  }
  if (!sulamaAdi) sulamaAdi = formData.sulama?.label || formData.sulama || '';

  // Başlıklar ve girdiler
  ws.getCell('B2').value = sulamaAdi || '';
  ws.getCell('G2').value = formData.kurumAdi || '';
  ws.getCell('K2').value = formData.yil || '';
  ws.getCell('C41').value = formData.ciftlikRandi || '';
  ws.getCell('C43').value = formData.iletimRandi || '';

  // Ürünleri ekle (A7, A9, ...)
  let excelRow = 6;
tableData.forEach((row) => {
  // Ürün adını al
  let urunAdi = row.urun;
  if (urunler && Array.isArray(urunler)) {
    const urunObj = urunler.find(u => String(u.id) === String(row.urun));
    if (urunObj) urunAdi = urunObj.isim || urunObj.label || urunAdi;
  }

  // Ürün bilgileri
  ws.getCell(`A${excelRow}`).value = urunAdi || '';
  ws.getCell(`A${excelRow}`).alignment = { horizontal: 'left' }; // 👈 sola hizalama
  ws.getCell(`B${excelRow}`).value = row.ekim_alani || '';
  ws.getCell(`B${excelRow}`).alignment = { horizontal: 'center' };
  ws.getCell(`C${excelRow}`).value = row.ekim_orani || '';
  ws.getCell(`C${excelRow + 1}`).value = 'u-r'; // alt satıra sabit u-r yazılabilir

  // U-R ve çarpım değerleri
  if (Array.isArray(row.ur_values)) {
    UR_COLUMNS.forEach((col, i) => {
      const urVal = parseFloat(row.ur_values[UR_MONTH_INDEXES[i]] || 0);
      const oran = parseFloat(row.ekim_orani || 0);

      // Üst satıra U-R
      ws.getCell(`${col}${excelRow}`).value = urVal;

      // Alt satıra çarpım (U-R × oran / 100)
      const carpim = (urVal * oran / 100).toFixed(2);
      ws.getCell(`${col}${excelRow + 1}`).value = parseFloat(carpim);
    });

    // Toplamlar
    const toplam_ur = row.ur_values
      .slice(UR_MONTH_INDEXES[0], UR_MONTH_INDEXES[UR_MONTH_INDEXES.length - 1] + 1)
      .reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
    const carpimli_toplam = (toplam_ur * (parseFloat(row.ekim_orani) || 0) / 100).toFixed(2);

    ws.getCell(`K${excelRow}`).value = toplam_ur.toFixed(2);          // üst satıra toplam U-R
    ws.getCell(`K${excelRow + 1}`).value = parseFloat(carpimli_toplam); // alt satıra çarpımlı toplam
  }

  excelRow += 2;
});

  // Sonuç satırlarını doldur
  ws.getCell('B38').value = results.toplam_alan?.toFixed(2) || '';
  ws.getCell('C38').value = results.toplam_oran?.toFixed(2) || '';

  // Aylık toplamlar (D38:K38)
  if (results.aylik_toplamlari) {
    UR_COLUMNS.forEach((col, i) => {
      ws.getCell(`${col}38`).value = results.aylik_toplamlari[i]?.toFixed(2) || '';
    });
    ws.getCell('K38').value = results.aylik_toplamlari.reduce((sum, v) => sum + (parseFloat(v) || 0), 0).toFixed(2);
  }

  // Net Su İhtiyacı (hm³) (D39–J39, K39)
  if (results.net_su_aylik) {
    const netAylik = results.net_su_aylik;
    for (let i = 0; i < 7; i++) {
      const col = String.fromCharCode('D'.charCodeAt(0) + i);
      ws.getCell(`${col}39`).value = netAylik[3 + i]?.toFixed(3) || '';
    }
    ws.getCell('K39').value = netAylik.slice(3, 10).reduce((a, b) => a + b, 0).toFixed(3);
  }

  // Çiftlik Su İhtiyacı (hm³) (D41–J41, K41)
  if (results.ciftlik_su_aylik) {
    const ciftlikAylik = results.ciftlik_su_aylik;
    for (let i = 0; i < 7; i++) {
      const col = String.fromCharCode('D'.charCodeAt(0) + i);
      ws.getCell(`${col}41`).value = ciftlikAylik[3 + i]?.toFixed(3) || '';
    }
    ws.getCell('K41').value = ciftlikAylik.slice(3, 10).reduce((a, b) => a + b, 0).toFixed(3);
  }

  // Brüt Su İhtiyacı (hm³) (D43–J43, K43)
  if (results.brut_su_aylik) {
    const brutAylik = results.brut_su_aylik;
    for (let i = 0; i < 7; i++) {
      const col = String.fromCharCode('D'.charCodeAt(0) + i);
      ws.getCell(`${col}43`).value = brutAylik[3 + i]?.toFixed(3) || '';
    }
    ws.getCell('K43').value = brutAylik.slice(3, 10).reduce((a, b) => a + b, 0).toFixed(3);
  }
  // 2. Sonra merge yap
ws.mergeCells('D44:K45');

// 3. Sonra ortala, font ve border işlemleri
ws.getCell('D44').alignment = { horizontal: 'center', vertical: 'middle' };
ws.getCell('D44').font = { bold: true, size: 14 };

// 4. Kenarlıklar (her hücreye tek tek ekle)
const borderStyle = {
  top: { style: 'thin' }, left: { style: 'thin' },
  bottom: { style: 'thin' }, right: { style: 'thin' }
};
for (let row = 44; row <= 45; row++) {
  for (let col = 4; col <= 11; col++) {
    ws.getCell(row, col).border = borderStyle;
  }
}
  // Toplam Sulama Suyu İhtiyacı (hm³) (D44)
  ws.getCell('D44').value = results.brut_su_toplam?.toFixed(3) || '';

  // Dosya adında Sulama Adı + yıl kullanalım
  const dosyaAdi = `${sulamaAdi}_${formData.yil}.xlsx`;

  // 5. Dosyayı indir
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = dosyaAdi;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};
