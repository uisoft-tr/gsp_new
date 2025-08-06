import os
import pandas as pd
from django.core.management.base import BaseCommand
from sulama.models import DepolamaTesisi, DepolamaTesisiAbak

class Command(BaseCommand):
    help = "Baraj kot-hacim verilerini Excel'den okur ve DepolamaTesisi/DepolamaTesisiAbak'a kaydeder."

    def add_arguments(self, parser):
        parser.add_argument('--file', type=str, help='Excel dosya yolu (varsayılan: baraj_kot.xlsx)')
        parser.add_argument('--clear', action='store_true', help='Mevcut kayıtları siler.')

    def handle(self, *args, **options):
        file_path = options.get('file')
        clear = options.get('clear')
        BASE_DIR = os.path.dirname(os.path.abspath(__file__))

        if file_path:
            excel_path = file_path
        else:
            excel_path = os.path.join(BASE_DIR, "./baraj_kot1.xlsx")
        excel_path = os.path.abspath(excel_path)

        if not os.path.exists(excel_path):
            self.stdout.write(self.style.ERROR(f"Excel dosyası bulunamadı: {excel_path}"))
            return

        

        
        excel_file = pd.ExcelFile(excel_path)
        sheet_names = excel_file.sheet_names

        toplam_kayit = 0

        for baraj_ad in sheet_names:
            df = pd.read_excel(excel_path, sheet_name=baraj_ad, header=None)
            print(f"{baraj_ad} yükleniyor...")

            
            # Diğer barajlar (ladik, yedikır...)
            kot_eki_row = 1  # Yedikır'da kot_ekleri bu satırda
            kot_ekleri = [0.00]  # 0.00 kot ekini manuel ekle (861.10, 862.10 için)
            for c in range(2, df.shape[1]):
                try:
                    v = float(str(df.iloc[kot_eki_row, c]).replace(",", "."))
                    kot_ekleri.append(v)
                except Exception:
                    kot_ekleri.append(None)

            r = kot_eki_row + 1
            while r < df.shape[0]:
                ana_kot_raw = str(df.iloc[r, 0]).replace(",", ".").replace("+", "").strip()
                try:
                    ana_kot = float(ana_kot_raw)
                    ana_kot = round(ana_kot, 2)
                except Exception:
                    r += 1
                    continue

                try:
                    hacim_raw = df.iloc[r, 1]
                    if not pd.isnull(hacim_raw):
                        print(baraj_ad)
                        hacim = float(str(hacim_raw).replace(",", ".")) * 1000  # 1000 ile çarp
                        
                        baraj_obj= DepolamaTesisi.objects.get(isim=baraj_ad)
                        DepolamaTesisiAbak.objects.create(
                            depolama_tesisi=baraj_obj,
                            kot=ana_kot,
                            hacim = hacim
                        )
                        toplam_kayit += 1
                except Exception as e:
                    print(f"ANA KOT HACİM HATASI: {e}")

                # Ana kot + kot ekleri (861.00, 861.01, 861.02, 861.03... için)
                for idx, kot_eki in enumerate(kot_ekleri):
                    if kot_eki is None:
                        continue
                    try:
                        # Sütun 1: 0.00 kot eki, Sütun 2: 0.01 kot eki, vb.
                        hacim_raw = df.iloc[r, idx + 1]
                        if pd.isnull(hacim_raw) or str(hacim_raw).strip() == '':
                            continue
                        hacim = float(str(hacim_raw).replace(",", ".")) * 1000  # 1000 ile çarp
                        
                        baraj_obj= DepolamaTesisi.objects.get(isim=baraj_ad)
                        final_kot = ana_kot + kot_eki
                        DepolamaTesisiAbak.objects.create(
                            depolama_tesisi=baraj_obj,
                            kot=round(final_kot, 2),
                            hacim = hacim
                        )
                        toplam_kayit += 1
                        print(f"Ana+Ek kot eklendi: {round(final_kot, 2)} -> {hacim}")
                    except Exception as e:
                        print(f"ANA+EK KOT HATA: sütun={idx+2} -> {e}")

                # Ara kotlar
                for rr in range(r + 1, r + 10):
                    if rr >= df.shape[0]:
                        break
                    alt_kot_raw = str(df.iloc[rr, 0]).replace(",", ".").strip()

                    try:
                        alt_kot = round(int(float(alt_kot_raw)) / 100, 2)
                    except Exception:
                        continue

                    for idx, kot_eki in enumerate(kot_ekleri):
                        if kot_eki is None:
                            continue
                        try:
                            hacim_raw = df.iloc[rr, idx + 1]
                            # 0 değerlerini de dahil et - sadece null/NaN değerleri ve boş string'leri atla
                            if pd.isnull(hacim_raw) or str(hacim_raw).strip() == '':
                                continue
                            hacim = float(str(hacim_raw).replace(",", ".")) * 1000  # 1000 ile çarp
                            
                            print(baraj_ad)
                            baraj_obj= DepolamaTesisi.objects.get(isim=baraj_ad)

                            temp_ara_kot = float(ana_kot+alt_kot+kot_eki)
                            DepolamaTesisiAbak.objects.create(
                                depolama_tesisi=baraj_obj,
                                kot=round(temp_ara_kot,2),
                                hacim = hacim
                            )
                            toplam_kayit += 1
                        except Exception as e:
                            print(f"ARA KOT HATA: satır={rr}, sütun={idx+2} -> {e}")
                r += 10

        print("✅ Tüm barajlar yüklendi!")
        print(f"📦 Toplam kayıt edilen Kot-Hacim verisi: {toplam_kayit}")
        print("🗂️ Eklenen Barajlar:", [str(b) for b in DepolamaTesisiAbak.objects.all()])
