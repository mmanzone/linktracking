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

### Deploying on Vercel with Vercel KV and Vercel Blob

This project is configured to deploy seamlessly on Vercel using its native KV storage for data and Blob storage for file uploads.

#### Step-by-Step Deployment Guide

1.  **Push Your Code to GitHub:**
    *   Ensure all your project code is up-to-date in a GitHub repository.

2.  **Import Project into Vercel:**
    *   Log in to your Vercel account.
    *   From your dashboard, click **"Add New..."** -> **"Project"**.
    *   Import the GitHub repository containing your project.
    *   In the "Build & Development Settings", set the **"Framework Preset"** to **"Other"** and the **"Output Directory"** to **`public`**.
    *   Click **"Deploy"** for the initial deployment.

3.  **Create and Connect Vercel KV and Blob Stores:**
    *   After the first deployment is complete, navigate to your project's dashboard on Vercel.
    *   Click on the **"Storage"** tab.
    *   Connect a **"KV (New)"** store and a **"Blob"** store to your project.

4.  **Automatic Environment Variables:**
    *   Vercel will automatically create and link the necessary environment variables to your project.

5.  **Redeploy to Apply Changes:**
    *   To ensure your application can access the new stores, you must trigger a new deployment.
    *   Go to the **"Deployments"** tab for your project and select **"Redeploy"**.

Your application is now live and will use Vercel KV for data and Vercel Blob for file uploads.
