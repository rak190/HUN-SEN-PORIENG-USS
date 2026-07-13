# 🚀 Kru AI Deployment Guide (Beginner-Friendly)

Welcome to the deployment guide for **Kru AI**. This document will walk you through launching this project on the internet. Since this project is built with **Next.js**, we highly recommend **Vercel** for hosting (it is free, fast, and beginner-friendly). For our database and file storage, we use **Supabase** and **Cloudflare R2**.

---

## 🏗️ Architecture Overview
Before we begin, here is where everything lives:
1. **Frontend & Backend Logic (The Website)**: Hosted on **Vercel**.
2. **Database & User Accounts**: Hosted on **Supabase**.
3. **File Storage (PDFs, Images, Excel)**: Hosted on **Cloudflare R2** (to save costs).

---

## Step 1: Set up the Database (Supabase)

Supabase gives us a free Postgres database and user authentication system.

1. Go to [Supabase.com](https://supabase.com/) and create a free account.
2. Click **"New Project"**.
3. Name your project (e.g., `kru-ai`), choose a secure password, and select a region close to your users (e.g., Singapore). Click **Create**.
4. Wait a few minutes for the database to be provisioned.
5. Once ready, click on the **Project Settings** (gear icon at the bottom of the left menu).
6. Go to **API**. Here you will find your `Project URL` and `anon public key`.
   - **Save these somewhere safe!** You will need them in Step 4.

---

## Step 2: Set up File Storage (Cloudflare R2)

Cloudflare R2 is where we will store large files like student photos, report cards, and templates. It is 100% free for most use cases (zero egress fees).

1. Go to [Cloudflare.com](https://dash.cloudflare.com/) and create a free account.
2. On the left sidebar, click on **R2 Object Storage**. (You may need to add a payment method to unlock it, but the free tier gives you 10GB of storage and unlimited downloads for free).
3. Click **Create Bucket**.
4. Name your bucket (e.g., `kru-ai-storage`). Click **Create**.
5. Once created, go back to the R2 overview page and click **Manage R2 API Tokens** (top right).
6. Click **Create API token**. Give it a name (e.g., `Kru AI Token`), set Permissions to **Object Read & Write**, and click **Create**.
7. **Save these keys immediately!** You will get an `Access Key ID`, `Secret Access Key`, and your `Account ID` (found in the endpoint URL). You will need them in Step 4.

---

## Step 3: Push Your Code to GitHub

To host on Vercel, your code needs to be on GitHub.

1. Go to [GitHub.com](https://github.com/) and create an account if you don't have one.
2. Click the **+** icon in the top right and select **New repository**.
3. Name it `kru-ai` and set it to **Private**. Click **Create repository**.
4. Open your computer's terminal (or VS Code terminal) inside your project folder.
5. Run the following commands one by one to upload your code:
   ```bash
   git init
   git add .
   git commit -m "First commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/kru-ai.git
   git push -u origin main
   ```
   *(Replace `YOUR_USERNAME` with your actual GitHub username).*

---

## Step 4: Deploy the Website (Vercel)

Vercel will connect to your GitHub, build your code, and put it on the internet.

1. Go to [Vercel.com](https://vercel.com/) and sign up using your **GitHub account**.
2. Click **Add New...** -> **Project**.
3. You will see a list of your GitHub repositories. Click **Import** next to `kru-ai`.
4. In the "Configure Project" screen, leave everything as default, but scroll down to **Environment Variables**.
5. This is where you paste the keys you saved in Steps 1 and 2. Add the following keys one by one:

   | Name | Value | Where to find it |
   | :--- | :--- | :--- |
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` | Supabase -> Project Settings -> API |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbG...` | Supabase -> Project Settings -> API |
   | `R2_ACCOUNT_ID` | `1234abcd...` | Cloudflare R2 API Token Page |
   | `R2_ACCESS_KEY_ID` | `abcd123...` | Cloudflare R2 API Token Page |
   | `R2_SECRET_ACCESS_KEY` | `abcxyz...` | Cloudflare R2 API Token Page |
   | `R2_BUCKET_NAME` | `kru-ai-storage` | The name of the bucket you created |

6. Once all variables are added, click the big **Deploy** button.
7. Wait 2-3 minutes. Vercel is now building your website!
8. When it finishes, you will see a screen with confetti. Click **Continue to Dashboard** and click the generated link (e.g., `https://kru-ai.vercel.app`) to view your live website!

---

## 🎉 Congratulations!
Your app is now live on the internet! 

### Next Steps / Maintenance
- **Automatic Updates:** Every time you make changes to your code on your computer and `git push` to GitHub, Vercel will automatically detect the changes and update your live website instantly!
- **Custom Domain:** If you want a custom domain (like `www.kru-ai.edu.kh`), you can add it easily in the Vercel Dashboard under **Settings -> Domains**.
