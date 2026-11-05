# Connecting the order page to your Google Sheet

About 10 minutes, done once, on a computer (not a phone). You need to be signed in to the Google account that owns your order sheet.

Until this is done, the website's "Order" page simply sends people to your current Google Form, so nothing breaks in the meantime.

## 1. Open the sheet and the script editor
1. Open the Google Sheet where your form responses go (or make a new empty sheet called "The Bread Club orders").
2. In the menu, click **Extensions → Apps Script**. A new tab opens with a file called `Code.gs`.

## 2. Paste the code
1. In this project, open `apps-script/dist/Code.gs` and copy **everything** in it.
2. In the Apps Script tab, select everything in `Code.gs`, delete it, and paste.
3. Click the **save** icon (or Ctrl/Cmd + S).
4. Click the **gear icon (Project Settings)** on the left and set **Time zone** to `(GMT+02:00) Jerusalem`.

## 3. Create the tabs
1. Back in the editor, in the toolbar choose the function **`setup`** and click **Run**.
2. Google asks for permission. Click **Review permissions**, choose your account.
   If you see "Google hasn't verified this app", click **Advanced → Go to (your project) (unsafe)**. This warning appears for every personal script; the script is yours and only touches this sheet.
3. Your sheet now has four new tabs: **Website orders**, **Test orders**, **Bake summary** and **Settings**. Your existing form responses are not touched.

## 4. Publish it as a web app
1. Click **Deploy → New deployment**.
2. Click the gear next to "Select type" and choose **Web app**.
3. Description: `Bread Club orders`. **Execute as: Me**. **Who has access: Anyone**.
   ("Anyone" means the website can send orders in. It does *not* let anyone see your sheet. The only thing anyone can read back is how many loaves are left per bake day.)
4. Click **Deploy** and copy the **Web app URL** (it starts with `https://script.google.com/macros/s/`).
5. Send that URL to Claude, or paste it into `site/assets/js/config.js` as `apiUrl: '...'`.

## 5. Test before you switch
1. Open the order page with `?test=1` at the end of the address, for example `https://…/order.html?test=1`.
2. Place a pretend order (made-up name, your own phone number).
3. Check that it appears in the **Test orders** tab (not in Website orders).
4. Delete test rows whenever you like.

## Changing the script later
If Claude gives you a new `Code.gs`: paste it in the same way, save, then **Deploy → Manage deployments → pencil icon → Version: New version → Deploy**. The web address stays the same.
