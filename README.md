# Greg & Bek — Budget Tracker

A personal fortnightly budget tracker with a notebook theme. Built for two users (Greg & Bek) to track spending, savings goals, and financial progress together.

## Features

- **Two-user support** — Greg and Bek each log their own purchases, tagged with who spent what
- **13 spending categories** with budgets pre-loaded from your real numbers
- **Fortnightly tracking** — navigate between fortnights, close them off and start fresh
- **Savings goals** — progress bars, fortnightly contributions, countdowns to target date
- **Stats dashboard** — spending vs budget charts, savings history, who's spending what
- **Notebook theme** — ruled paper, spiral binding, handwritten fonts
- **Local storage** — all data saved in your browser, nothing leaves your device

## How to deploy to GitHub Pages

### Step 1 — Create a GitHub account
If you don't have one, go to [github.com](https://github.com) and sign up (free).

### Step 2 — Create a new repository
1. Click the **+** button top right → **New repository**
2. Name it something like `budget-tracker`
3. Set it to **Public**
4. Click **Create repository**

### Step 3 — Upload the files
1. On your new repository page, click **Add file → Upload files**
2. Upload all three files:
   - `index.html`
   - `style.css`
   - `app.js`
3. Click **Commit changes**

### Step 4 — Enable GitHub Pages
1. Go to your repository **Settings** (tab at the top)
2. Scroll down to **Pages** in the left sidebar
3. Under **Source**, select **Deploy from a branch**
4. Set branch to **main** and folder to **/ (root)**
5. Click **Save**

### Step 5 — Open your app
After about 60 seconds, your app will be live at:
```
https://YOUR-GITHUB-USERNAME.github.io/budget-tracker/
```

Bookmark this on both your phones and you're good to go!

## How to use

### Opening the app
Each time you open it, you choose whether you're Greg or Bek. This tags your purchases to you.

### Adding a purchase
1. Go to the **Spending** tab
2. Tap **+ add a purchase**
3. Fill in what you bought, how much, and which category
4. It'll appear under that category, tagged with your name

### Tracking goals
- Go to **Goals** to see your savings goals with progress bars
- Tap **+ add money** to manually add savings to a goal
- Add new goals (holidays, car, etc.) with the **+ add a goal** button

### Closing a fortnight
When the fortnight ends, tap **close fortnight ✓** in the top right. This:
- Saves the fortnight to your history
- Moves you to the next fortnight
- Keeps all your data for the stats charts

### Stats
The **Stats** tab shows you:
- Average and total saved over time
- Spending vs budget bar chart
- Savings history line chart
- Who between Greg & Bek is spending more
- All-time top spending categories

## Notes

- All data is stored in your browser's local storage — it stays on whichever device you use
- For shared data across both phones, you'd need a backend (not included) — for now, use it on a shared device or each track separately
- Bek's overtime can be entered each fortnight on the Overview tab

## Customising

To change budgets, income figures, or categories, edit the top of `app.js`:
- `GREG_INCOME` and `BEK_INCOME` — fortnightly take-home
- `MORTGAGE` — fortnightly mortgage payment
- `CATEGORIES` array — names, budgets, icons and colours per category
