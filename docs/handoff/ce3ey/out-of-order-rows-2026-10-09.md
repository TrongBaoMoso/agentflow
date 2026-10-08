# LO rows out of order (prod, read 09/10/2026 ~03:00 +07)

Source: every registration key seen in prod request logs since 08/09 (121 readable rows), read through the public getRegisterLoanOfficer. Call = onboarding_meeting_status pre_onboarding_done/setup_done.

| Name | Meeting | Paid | Waived | Signed | Live link | Note |
|---|---|---|---|---|---|---|
| Kara Wilson | pre_onboarding_done | False | False | True | True | signed before paying |
| Brayan Suarez (TEST TRAINING) | unselect | False | False | False | True | can still sign before the call |
| Aman Singh | unselect | True | False | False | False | paid before the call |
| Jessica Phan | unselect | False | False | False | True | can still sign before the call |
| Areg Akopyan  | unselect | True | False | True | True | signed before the call |
| Nicholas McKinney | unselect | True | False | True | True | signed before the call |
| Brisaly Gonzalez | unselect | True | False | False | True | can still sign before the call |
| Larry Salaets | unselect | True | False | False | False | paid before the call |
| Steve Hutchins | unselect | False | False | False | True | can still sign before the call |
