# Link Tracking Application

A simple, file-based link tracking application for campaigns and analytics.

## How to Run Locally

1.  **Install Dependencies:**
    ```bash
    npm install
    ```
2.  **Start the Server:**
    ```bash
    node server.js
    ```
-   The application will be available at `http://localhost:3000`.
-   The admin panel is at `http://localhost:3000/admin.html`.
-   The default password is `password`.

## How to Host / Deploy

This application is designed to be hosted on a platform that supports Node.js and persistent storage for file-based data. It will **not** work on static hosting providers like GitHub Pages.

We recommend a service like [Render](https://render.com/) which offers a free tier for Node.js applications and persistent disks.

### Deploying on Vercel with Vercel KV (powered by Upstash)

This project is configured to deploy seamlessly on Vercel using its native KV storage, which is powered by Upstash.

#### Step-by-Step Deployment Guide

1.  **Push Your Code to GitHub:**
    *   Ensure all your project code is up-to-date in a GitHub repository.

2.  **Import Project into Vercel:**
    *   Log in to your Vercel account.
    *   From your dashboard, click **"Add New..."** -> **"Project"**.
    *   Import the GitHub repository containing your project.
    *   Vercel will automatically detect the correct settings. Click **"Deploy"** for the initial deployment.

3.  **Create and Connect Vercel KV Store:**
    *   After the first deployment is complete, navigate to your project's dashboard on Vercel.
    *   Click on the **"Storage"** tab.
    *   Locate **"KV (New)"** from the list of options and click **"Connect Store"**.
    *   In the dialog that appears, ensure your project is selected and click **"Connect"**.

4.  **Automatic Environment Variables:**
    *   Vercel will automatically create and link the necessary environment variables (`KV_REST_API_URL` and `KV_REST_API_TOKEN`) to your project. The application is already configured to use these variables.

5.  **Redeploy to Apply Changes:**
    *   To ensure your application can access the new KV store, you must trigger a new deployment.
    *   Go to the **"Deployments"** tab for your project.
    *   Find the latest deployment, click the three-dots menu (...) on the right, and select **"Redeploy"**.

Your application is now live and will use Vercel KV to store all its data.
