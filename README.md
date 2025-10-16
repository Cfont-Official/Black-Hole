# Black Hole — Replit-ready Image Search

This project is a small Bing image search demo that runs on Replit (no local commands required).
It includes a backend server that scrapes Bing Images and a frontend with a black theme and red particle
background.

## How to use on Replit

1. Go to https://replit.com/
2. Click **Create** → **Import from ZIP** and upload this project's ZIP.
3. Once imported, click the big **Run** button.
4. Open the Replit web view (the URL shown) and visit `/` which will load `index.html`.
   You can also open the Replit-provided public URL.

## Notes

- Default SafeSearch is **Moderate**. You can toggle to Strict or Off in the UI.
- The backend logs searches to the Replit console (search term, SafeSearch mode, number of results).
- This project scrapes Bing search pages. Use responsibly and don't run aggressive automated queries.
- If you want to deploy elsewhere, consider adding caching (Redis), better rate-limiting, or proxies.

