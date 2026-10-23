# Messages to send — v2 (23/10/2026, NOT sent yet — Bao sends them). v1 kept in MESSAGES-VIC-MILEY-2110.v1.md

## 1. Reply to Vic's chat line "Khai took a look and shared something abt it, pls read the email and maybe talk with Khai"

Thanks Vic, I read the email. In that thread (January 2025), Brayan asked to pull the 12-month closed loans automatically from the NMLS. Anh Khải reviewed only the Bonzo API, not MMI's ("did not check the MMI APIs yet"), and the integration was paused because of the issues with Bonzo (you mentioned thinking of quitting Bonzo). Anh Thuận's question "What about MMI? what type of API do they have?" was never answered. So the pause was about Bonzo, not MMI. We've now checked MMI: it has an API, but it isn't open to us without asking MMI, so for now we use what we already have: MMI can push a Loan Officer's data to a webhook.

## 2. Main message to Vic and Miley

Hi Vic and Miley, we're trying to automate Loan Officer production in the Recruit app, so recruiters no longer copy the NMLS into MMI and type numbers in by hand. A first version is already running on our test environment.

**MMI first, Modex later.** We built two connections into Recruit: MMI and Modex. While we wait for Modex to be ready, MMI is the main source and Modex is the backup. When Modex is ready, we will switch.

**The main limit: we don't have access to MMI's API yet.** MMI has an API, but it isn't open to us: there are no public docs and no API access in our account, so we would have to ask MMI for it (likely paid). So for now the goal is to cut the back-and-forth between Recruit and MMI, not to make it fully automatic. Later, if it makes sense (which source gives you enough data for your work, the cost of the API, etc.), we can ask MMI or Modex for API access. Anh Thuận will decide that.

**How it works today:** a recruiter clicks the NMLS link on a lead in Recruit → MMI opens on that Loan Officer → the recruiter clicks "Push to CRM" → within about 2 minutes, Recruit fills in the Loan Officer's data. MMI can then re-send updates monthly on its own.

**What Recruit gets from MMI this way:**
- Name, NMLS, company and company NMLS, branch NMLS, job title
- Email, work email, phone, work phone
- Branch address (street, city, state, zip)
- Loans and volume, last 14 months
- Loans and volume, year to date
- Links: MMI profile, LinkedIn search

**What it does NOT give:** an exact 12-month count (we use the 14-month number instead), loans since 2022, the list of licensed states and licence history, the transaction list, and the purchase/refi mix.

**Is this enough for your work, or do you need other data?** Please tell us what's missing.

For this to work, the "CRM Push URL" in Vic's MMI account (Settings → Webhooks) needs to point to Recruit instead of Bonzo. It currently points to Miley's Bonzo webhook named "MMI" (created 9/29/2024). That webhook shows 0 deliveries in the last 7 days, the last MMI push was on 10/4/2025 (real estate agents), and the Loan Officers in Bonzo campaigns come from CSV imports, not from MMI. A few questions:
1. Is it OK to replace that Bonzo URL with Recruit's address? If you still want MMI pushes to land in Bonzo, Recruit should be able to forward each push to the same Bonzo webhook (we haven't tested that yet).
2. Is anyone using the MMI → Bonzo push today?
3. MMI allows only one login at a time per account. Can we add more MMI seats so each recruiter has their own login? Who is our account manager at MMI, and who has admin access to add users?

Thanks!
