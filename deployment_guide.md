# 🚀 ការណែនាំអំពីការដាក់ឱ្យប្រើប្រាស់ជាផ្លូវការ (Official Production Deployment Guide)
## ប្រព័ន្ធគ្រប់គ្រងសាលារៀន វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង (Hun Sen Porieng Upper Secondary School)

ឯកសារនេះត្រូវបានរៀបចំឡើងជាពិសេស ដើម្បីធានាថាការដាក់ឱ្យដំណើរការគេហទំព័រលើ **Vercel** និងការតភ្ជាប់ជាមួយ **Supabase Real Database** ដំណើរការបានត្រឹមត្រូវ ១០០% ដោយគ្មានបញ្ហា Error ឬបាត់បង់ទិន្នន័យឡើយ។

---

## 🏗️ រចនាសម្ព័ន្ធប្រព័ន្ធទាំងមូល (System Architecture)
1. **Frontend & Backend Server (គេហទំព័រ & API)**: ដំណើរការលើ **Vercel** (Next.js 16 App Router)
2. **Real Database & Authentication**: ដំណើរការលើ **Supabase (PostgreSQL 15)**
3. **File & Photo Storage**: ដំណើរការលើ **Cloudflare R2** (ឬ Database Storage)

---

## 📋 ជំហានទី ១៖ បង្កើត និងរៀបចំ Database លើ Supabase (សំខាន់បំផុត ⚠️)

ប្រសិនបើអ្នកគ្រាន់តែបង្កើត Project លើ Supabase តែមិនទាន់បានដំណើរការ Script បង្កើត Table នោះទេ ប្រព័ន្ធនឹងមិនអាចទាញទិន្នន័យ ឬ Login បានឡើយ។

1. ចូលទៅកាន់ [Supabase.com](https://supabase.com/) ហើយ Login ចូលគណនីរបស់អ្នក។
2. ចុច **"New Project"** -> ដាក់ឈ្មោះ (ឧ. `hun-sen-porieng-db`) -> កំណត់ Database Password -> ជ្រើសរើស Region **Singapore (ap-southeast-1)** -> ចុច **"Create new project"**។
3. រង់ចាំ ២-៣ នាទីឱ្យ Supabase រៀបចំ Database រួចរាល់។
4. នៅ Menu ខាងឆ្វេងដៃ ចុចលើ **"SQL Editor"** (រូបតំណាង `>_`) -> ចុច **"New query"**។
5. បើកឯកសារ [`supabase/full_schema_setup.sql`](file:///d:/Coding/kruai_antigravity/supabase/full_schema_setup.sql) នៅក្នុង Project របស់អ្នក រួច **Copy កូដ SQL ទាំងអស់** មក Paste ចូលក្នុងប្រអប់ SQL Editor របស់ Supabase។
6. ចុចប៊ូតុង **"Run"** (ឬចុច `Ctrl + Enter`)។
   * ✅ **លទ្ធផលជោគជ័យ:** Supabase នឹងបង្ហាញ `Success. No rows returned`។ ពេលនេះ Tables ទាំងអស់ (`profiles`, `classes`, `students`, `grades`, `attendance_records`, `student_enrollments`, `support_cases`...) ព្រមទាំងគណនី Admin/Principal គំរូ និងថ្នាក់រៀនត្រូវបានបង្កើតឡើងជាស្ថាពរ!

---

## 🔑 ជំហានទី ២៖ ចម្លង API Keys ពី Supabase

1. នៅក្នុង Supabase Dashboard ចុចលើ **Project Settings** (រូបកង់ធ្មេញ ⚙️ នៅជ្រុងក្រោមខាងឆ្វេង)។
2. ចុចលើ Menu **"API"** (ក្រោម Configuration)។
3. ចម្លងតម្លៃចំនួន ៣ ដូចខាងក្រោមទុក៖
   * **Project URL**: `https://xxxxxxxxxxxxxxxxxxxx.supabase.co`
   * **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   * **service_role secret key** *(ចុច Reveal ដើម្បីមើល)*: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` ⚠️ *(ចាំបាច់សម្រាប់ Server Admin Actions)*

---

## ☁️ ជំហានទី ៣៖ (ជម្រើសបន្ថែម) រៀបចំ Cloudflare R2 Storage

*(ប្រសិនបើអ្នកមិនទាន់មាន Cloudflare R2 ទេ ប្រព័ន្ធនឹងប្រើប្រាស់ Local/Database Fallback ដោយស្វ័យប្រវត្តិ។ ប៉ុន្តែសម្រាប់ការផ្ទុកឯកសាររូបថតធំៗ គួររៀបចំ R2)*

1. ចូលទៅកាន់ [Cloudflare Dashboard](https://dash.cloudflare.com/) -> ជ្រើសរើស **R2 Object Storage**។
2. ចុច **Create Bucket** -> ដាក់ឈ្មោះ `kru-ai-storage` -> ចុច Create Bucket។
3. ចុចលើ **Manage R2 API Tokens** (នៅខាងស្តាំលើ) -> **Create API token** -> កំណត់ Permission ជា **Object Read & Write** -> ចុច Create API Token។
4. ចម្លងទុក៖
   * **Account ID** (មាននៅក្នុង Endpoint URL)
   * **Access Key ID**
   * **Secret Access Key**

---

## 🚀 ជំហានទី ៤៖ កំណត់ Environment Variables លើ Vercel

1. ចូលទៅកាន់ [Vercel Dashboard](https://vercel.com/) -> ជ្រើសរើស Project របស់អ្នក (`hun-sen-porieng-uss`)។
2. ចុចលើ **Settings** -> **Environment Variables**។
3. បញ្ចូល Variables ទាំងអស់តាមតារាងខាងក្រោម៖

| Variable Key Name | តម្លៃ (Value) | ប្រភេទលើ Vercel (Type) |
| :--- | :--- | :---: |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` *(ពី Supabase)* | **Config** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbG...` *(anon public key ពី Supabase)* | **Config** |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbG...` *(service_role secret ពី Supabase)* | **Secret** |
| `R2_ACCOUNT_ID` | `1234abcd...` *(ពី Cloudflare R2)* | **Secret** |
| `R2_ACCESS_KEY_ID` | `abcd123...` *(ពី Cloudflare R2)* | **Secret** |
| `R2_SECRET_ACCESS_KEY` | `abcxyz...` *(ពី Cloudflare R2)* | **Secret** |
| `R2_BUCKET_NAME` | `kru-ai-storage` | **Config** |

> [!IMPORTANT]
> **ចំណាំសំខាន់អំពី Vercel Warning:**  
> ចំពោះ Variables ដែលចាប់ផ្តើមដោយ `NEXT_PUBLIC_` ប្រសិនបើ Vercel លោតសារព្រមាន *"Keep This Value Private"* សូមចុចប៊ូតុង **"Change to Config"** ព្រោះ Next.js ត្រូវការបញ្ជូន Key នេះទៅ Browser ដើម្បីទាក់ទងជាមួយ Database។

4. បន្ទាប់ពីបញ្ចូល Keys ទាំងអស់រួចរាល់ សូមចុចលើ Menu **Deployments** ខាងលើ -> ចុចលើសញ្ញា **...** នៅក្បែរ Deployment ចុងក្រោយ -> ជ្រើសរើស **"Redeploy"** (ដោះធីក Use existing build cache) ដើម្បីឱ្យ Vercel ចាប់យក Environment Variables ថ្មី!

---

## 🔐 ជំហានទី ៥៖ គណនីចូលប្រើប្រាស់ដំបូង (Initial Default Accounts)

បន្ទាប់ពីដំណើរការ Script `full_schema_setup.sql` រួច អ្នកអាចប្រើប្រាស់គណនីខាងក្រោមដើម្បី Login ចូលប្រព័ន្ធភ្លាមៗ៖

| តួនាទី (Role) | ឈ្មោះគណនី (Username) | ពាក្យសម្ងាត់ (Password) | សិទ្ធិ និងផ្ទាំងគ្រប់គ្រង |
| :--- | :--- | :---: | :--- |
| 👑 **នាយកសាលា (Principal)** | `principal_porieng` | `password123` | ផ្ទាំងនាយកសាលា, មជ្ឈមណ្ឌលប្រតិបត្តិការ, របាយការណ៍សាលា |
| 🛠️ **អ្នកគ្រប់គ្រង ICT (Admin)** | `admin_porieng` | `password123` | ផ្ទាំងពិន្ទុសរុប 8-Tabs, បញ្ជីសិស្សទូទាំងសាលា, គ្រប់គ្រងគណនីគ្រូ |
| 👩‍🏫 **គ្រូបន្ទុកថ្នាក់ ១២ ក** | `teacher_12a` | `password123` | ថ្នាក់ទី ១២ ក (ស្រង់វត្តមាន, បញ្ចូលពិន្ទុ, បោះពុម្ពព្រឹត្តិបត្រពិន្ទុ) |
| 👩‍🏫 **គ្រូបន្ទុកថ្នាក់ ១១ ក** | `teacher_11a` | `password123` | ថ្នាក់ទី ១១ ក (ស្រង់វត្តមាន, បញ្ចូលពិន្ទុ, ករណីគាំទ្រ) |
| 👩‍🏫 **គ្រូបន្ទុកថ្នាក់ ១០ ក** | `teacher_10a` | `password123` | ថ្នាក់ទី ១០ ក |
| 👩‍🏫 **គ្រូបន្ទុកថ្នាក់ ៩ ក** | `teacher_9a` | `password123` | ថ្នាក់ទី ៩ ក |
| 👩‍🏫 **គ្រូបន្ទុកថ្នាក់ ៨ ក** | `teacher_8a` | `password123` | ថ្នាក់ទី ៨ ក |
| 👩‍🏫 **គ្រូបន្ទុកថ្នាក់ ៧ ក** | `teacher_7a` | `password123` | ថ្នាក់ទី ៧ ក |
| 📱 **ប្រធានថ្នាក់ (Monitor)** | `monitor` | `password123` | ផ្ទាំងស្រង់វត្តមានរហ័សប្រចាំថ្ងៃតាមទូរសព្ទ |

*(បន្ទាប់ពី Login រួច Admin អាចបង្កើតគណនីគ្រូថ្មីៗ ឬប្តូរពាក្យសម្ងាត់តាមរយៈទំព័រ `/admin/teachers` បានគ្រប់ពេល)*

---

## 🛠️ ជំហានទី ៦៖ ការដោះស្រាយបញ្ហាទូទៅ (Troubleshooting)

### ១. ហេតុអ្វី Login មិនចូល ឬ Redirect ត្រឡប់មកទំព័រ Login វិញ?
* **មូលហេតុ:** អ្នកមិនទាន់បាន Run Script [`supabase/full_schema_setup.sql`](file:///d:/Coding/kruai_antigravity/supabase/full_schema_setup.sql) ក្នុង Supabase SQL Editor ធ្វើឱ្យ Database មិនទាន់មានតារាង `profiles`។
* **ដំណោះស្រាយ:** ចូល Supabase SQL Editor -> Paste កូដក្នុង `full_schema_setup.sql` -> ចុច Run។

### ២. ហេតុអ្វី Admin មិនអាចបង្កើតគណនីគ្រូ ឬ Reset Password បាន?
* **មូលហេតុ:** ខ្វះ `SUPABASE_SERVICE_ROLE_KEY` នៅក្នុង Environment Variables របស់ Vercel។
* **ដំណោះស្រាយ:** ចម្លង `service_role secret` ពី Supabase API Settings យកទៅដាក់ក្នុង Vercel រួច Redeploy។

### ៣. ហេតុអ្វីទំព័រ Master Scores បង្ហាញ Error ពេលទាញយកទិន្នន័យ?
* **មូលហេតុ:** មិនទាន់មាន Academic Year សកម្មក្នុង Database។
* **ដំណោះស្រាយ:** Script `full_schema_setup.sql` បានបង្កើតឆ្នាំសិក្សា `២០២៥-២០២៦` (Active) ដោយស្វ័យប្រវត្តិ។ សូមប្រាកដថាបាន Run Script នោះរួចរាល់។

---

## 🔄 ការធ្វើបច្ចុប្បន្នភាពកូដទៅថ្ងៃមុខ (Future Updates)
រាល់ពេលដែលអ្នកកែប្រែកូដនៅលើកុំព្យូទ័ររបស់អ្នក រួចធ្វើការ `git push origin main` នោះ Vercel នឹងចាប់យកកូដថ្មីមក Build និង Update គេហទំព័រផ្ទាល់នៅលើ Internet ដោយស្វ័យប្រវត្តិក្នុរយៈពេល ២ នាទី!
