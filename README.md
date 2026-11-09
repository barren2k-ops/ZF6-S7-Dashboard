# Total Hero Power Leaderboard — Live Alliance Dashboard

An interactive web dashboard that visualizes the **Total Hero Power Leaderboard** directly from Google Sheets (`1mau9UHauEc8T02kXYvkY34s9fMEakZEsiJj_ox8GmxA`) with live synchronization, alliance analytics, power distribution curves, and full commander search/filtering.

## Features

- **Live Google Sheets Sync**: Automatically pulls real-time data from the shared Google Sheet CSV endpoint (`/api/data`), with a local snapshot fallback (`fallback-data.csv`).
- **Executive KPIs & Top 3 Podium**: Displays combined server Hero Power (`42.76B`), #1 Commander (`Crop Duster`), dominant alliance (`M8F`), average power (`213.8M`), and #200 rank floor (`183.2M`).
- **Interactive Charts**:
  - **Alliance Power Share**: Doughnut chart of total hero power per alliance (click a slice to filter).
  - **Alliance Strength & Average Power**: Dual-axis comparison of ranked member count vs. average commander power.
  - **Top 15 Commanders**: Horizontal bar chart color-coded by alliance.
  - **Rank #1–#200 Power Curve & Power Tiers**: Switchable view between rank decay curve and power bracket histogram.
- **Alliance Intelligence Matrix**: Breakdown of member counts, power share, total/average/median power, and strongest commander per alliance.
- **Commander Leaderboard Explorer**: Search by commander name or rank, filter by alliance or power tier, sort columns, and export filtered views to CSV.

## Local Development

```bash
npm start
```

Then open `http://localhost:3000`.

## Deploying to Render

This repository includes a [`render.yaml`](./render.yaml) Blueprint for one-click deployment on Render:

1. Push this repository to GitHub / GitLab.
2. In your [Render Dashboard](https://dashboard.render.com/), click **New +** &rarr; **Web Service** (or **Blueprint**).
3. Connect your repository:
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Click **Deploy Web Service**.
