-- Commercial hypotheses (IDR). Prices are VALIDATION HYPOTHESES, editable in Admin.
INSERT OR IGNORE INTO plans (id,name,price_idr,tagline,entitlements,features,sort) VALUES
('trial','Free Trial',0,'Kenali QELNAR tanpa biaya',
 '{"runs_per_month":5,"credits_per_month":50,"max_workspaces":1,"max_members":1,"max_projects":2,"tools":["web_search","llm_synthesis","workspace_context"],"export":false,"team":false,"trial_days":14}',
 '["1 workspace","5 intelligence run / bulan","Riset web publik dasar","Laporan contoh & evidence","Tanpa kartu kredit"]',0),
('solo','Solo',149000,'Untuk kreator individu',
 '{"runs_per_month":40,"credits_per_month":250,"max_workspaces":1,"max_members":1,"max_projects":5,"tools":["web_search","web_extract","llm_synthesis","workspace_context"],"export":false,"team":false}',
 '["1 workspace","40 intelligence run / bulan","Creator intelligence dasar","Strategi & rencana konten","Riwayat run & evidence"]',1),
('pro','Creator Pro',299000,'Untuk kreator & operator aktif',
 '{"runs_per_month":120,"credits_per_month":800,"max_workspaces":3,"max_members":1,"max_projects":20,"tools":["web_search","web_extract","llm_synthesis","workspace_context"],"export":true,"team":false}',
 '["3 workspace","120 intelligence run / bulan","Analisis kompetitor","Analisis peluang konten","Ekspor laporan (Markdown)"]',2),
('studio','Studio',799000,'Untuk tim kreator kecil',
 '{"runs_per_month":400,"credits_per_month":2500,"max_workspaces":10,"max_members":8,"max_projects":100,"tools":["web_search","web_extract","llm_synthesis","workspace_context"],"export":true,"team":true}',
 '["10 workspace, 8 anggota","400 intelligence run / bulan","Role-based access","Proyek bersama & kolaborasi","Laporan tim"]',3),
('business','Business',NULL,'Untuk tim & organisasi besar',
 '{"runs_per_month":2000,"credits_per_month":10000,"max_workspaces":50,"max_members":50,"max_projects":1000,"tools":["web_search","web_extract","llm_synthesis","workspace_context"],"export":true,"team":true}',
 '["Batas penggunaan kustom","Tata kelola lanjutan","Manajemen tim tambahan","Onboarding terdampingi","Ketentuan komersial kustom"]',4);

INSERT OR IGNORE INTO service_packages (id,name,price_idr_min,price_idr_max,timeline_days,revisions,summary,scope,deliverables,exclusions,est_hours,sort) VALUES
('quick_audit','Creator Intelligence Quick Audit',499000,NULL,3,1,'Audit cepat posisi kreator dan 5 peluang prioritas.',
 '["Review 1 akun/kanal utama","Pemetaan niche & audiens publik","Scan 3 kreator pembanding"]',
 '["Laporan audit (PDF/Markdown) 5–8 halaman","5 peluang konten prioritas","Sesi tanya-jawab tertulis"]',
 '["Eksekusi konten","Jaminan views/followers/penjualan","Akses akun pribadi"]',3,0),
('competitor_report','Competitor Intelligence Report',1500000,NULL,7,2,'Analisis mendalam kompetitor dan pola konten mereka.',
 '["Hingga 8 kompetitor","Analisis format, frekuensi, hook, positioning","Gap & peluang diferensiasi"]',
 '["Laporan kompetitor lengkap","Matriks positioning","Daftar ide diferensiasi berbasis evidence"]',
 '["Data privat kompetitor","Scraping yang melanggar ToS","Jaminan hasil bisnis"]',10,1),
('growth_strategy','Creator Growth Strategy',2500000,NULL,10,2,'Strategi pertumbuhan 90 hari berbasis riset.',
 '["Riset pasar & audiens","Pilar konten","Rencana distribusi 90 hari"]',
 '["Dokumen strategi","Kalender 90 hari","KPI & metode pengukuran"]',
 '["Produksi konten","Iklan berbayar","Jaminan viral"]',16,2),
('system_setup','Content Intelligence System Setup',3500000,NULL,14,2,'Setup workspace QELNAR + sistem riset konten tim Anda.',
 '["Setup workspace & proyek","Template command & workflow","Onboarding tim (2 sesi)"]',
 '["Workspace terkonfigurasi","Playbook operasional","Rekaman/dokumentasi onboarding"]',
 '["Integrasi kustom pihak ketiga","Biaya langganan SaaS"]',20,3),
('monthly_retainer','Monthly Intelligence Retainer',1500000,4500000,30,0,'Laporan intelijen bulanan berkelanjutan.',
 '["Monitoring niche & kompetitor bulanan","Laporan tren","Rekomendasi prioritas"]',
 '["1–4 laporan per bulan (tergantung paket)","Ringkasan peluang","Review bulanan"]',
 '["Eksekusi & publikasi konten","Jaminan pertumbuhan"]',12,4);

INSERT OR IGNORE INTO provider_settings (provider,enabled,monthly_cap_usd_micros,note) VALUES
('tavily',1,5000000,'Free plan 1.000 kredit/bulan. Paid tidak diaktifkan.'),
('firecrawl',1,5000000,'Free/plan credits. Tidak ada auto top-up.'),
('workers_ai',1,2000000,'Cloudflare Workers AI (free allocation harian).'),
('apify',0,0,'Dinonaktifkan: Actor berbayar butuh persetujuan owner.'),
('scrapely',0,0,'Dinonaktifkan: belum diverifikasi & butuh persetujuan owner.');

INSERT OR IGNORE INTO app_settings (key,value) VALUES
('usd_idr_rate','16500'),
('payment_processing_pct','2.9'),
('infra_monthly_usd','5'),
('service_hourly_cost_idr','100000');
