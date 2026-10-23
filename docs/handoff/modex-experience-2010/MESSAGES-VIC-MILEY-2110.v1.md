# Messages to send (drafted 21/10/2026, NOT sent yet — Bao sends them)

## 1. Reply to Vic's chat line "Khai took a look and shared something abt it, pls read the email and maybe talk with Khai"

Thanks Vic, I read the email. In that thread (January 2025), Brayan asked to pull the 12-month closed loans automatically from the NMLS. Anh Khải reviewed only the Bonzo API, not MMI's ("did not check the MMI APIs yet"), and the integration was paused because of the issues with Bonzo (you mentioned thinking of quitting Bonzo). Anh Thuận's question "What about MMI? what type of API do they have?" was never answered. So the pause was about Bonzo, not MMI. We've now checked MMI: it has no public API, but it can push a Loan Officer's data to a webhook, and that's what we're using.

## 2. Main message to Vic and Miley

Hi Vic and Miley, we're automating Loan Officer production in the Recruit app using MMI, so recruiters no longer copy the NMLS into MMI and type numbers in by hand. It is already built and running on our test environment.

How it would work: a recruiter clicks the NMLS link on a lead in Recruit → MMI opens on that Loan Officer → the recruiter clicks "Push to CRM" → within about 2 minutes, Recruit fills in the Loan Officer's production (YTD and 14-month loans/volume), email and phone. MMI can then re-send updates monthly on its own.

For this, the "CRM Push URL" in Vic's MMI account (Settings → Webhooks) needs to point to Recruit instead of Bonzo. It currently points to Miley's Bonzo webhook named "MMI" (created 9/29/2024). That webhook shows 0 deliveries in the last 7 days, the last MMI push was on 10/4/2025 (real estate agents), and the Loan Officers in Bonzo campaigns come from CSV imports, not from MMI. A few questions:
1. Is it OK to replace that Bonzo URL with Recruit's address? If you still want MMI pushes to land in Bonzo, Recruit should be able to forward each push to the same Bonzo webhook (we haven't tested that yet).
2. Is anyone using the MMI → Bonzo push today?
3. MMI allows only one login at a time per account. Can we add more MMI seats so each recruiter has their own login? Who is our account manager at MMI, and who has admin access to add users?

Thanks!
