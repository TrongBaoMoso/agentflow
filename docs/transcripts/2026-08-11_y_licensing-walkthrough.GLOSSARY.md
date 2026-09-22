# Licensing walkthrough (2026-08-11) — ASR damage glossary

Source engine: local `faster-whisper` large-v3 (int8), language forced `vi`, VAD on.
NOT Zoom. Two runs were made over the SAME audio — run 1 unprimed, run 2 with a
vocabulary `initial_prompt`. Run 2 is the shipped transcript.

**Two passes over one audio file are ONE sample, not two.** Where the runs disagree,
the term is unreliable regardless of which reading looks more sensible. Where they
agree, that only shows the engine fails consistently.

The `clean form observed?` column is the column that matters. "Nowhere" means the
correct form appears in NO sample — this file, the unprimed baseline, or the four
existing transcripts. For those rows the reconstruction is a guess, not a correction.

| Reconstruction (INFERRED, not ground truth) | Run 1 (unprimed) | Run 2 (shipped) | Clean form observed? |
|---|---|---|---|
| NMLS | NMS, ns, NUS | NMS ×9, NUS ×2, NL ×1, NOS ×1 | **YES — but NOT in this file.** 5× in Zoom transcripts: Recruiting 05/08 ×4, HR 06/08 ×1 |
| grant access | "real estate" | "re-assess" | **NOWHERE** |
| granted | — | "Crane" | **NOWHERE** |
| Access Not Granted | "no accept price" | "No Assets Price" | **NOWHERE** |
| Access Granted / access is given | "accept price is given" | "Assets Price is Given", "Assess right e-given" | **NOWHERE** |
| Apply for Sponsorship | "apply for sponsorship" | "Apply for Sponsorship" | YES — both runs, clean |
| NMLS Sponsored | "NMS Sponsor" | "NMS Sponsor" | Partially — "Sponsor" clean, "NMLS" never |
| HR Onboarding (status) | n/a (past baseline) | "HR all morning" @8:15, **"HR onboarding" @8:58** | **YES — in this file.** Clean form and corruption from the same speaker ~40s apart |
| automate | n/a | "ultimate được" @35:19 | NOWHERE in this file |
| Ý (licensing lead) | "ý" | "ý", "ấy" | YES — consistent |
| Thuận (CEO) | n/a | "anh Thuận" @35:56 | YES |

## Vocabulary priming did NOT fix domain nouns

The run-2 prompt explicitly listed `NMLS`, `Access Granted`, `Access Not Granted`.
None of the three came back. Priming changed the damage and improved Vietnamese
sentence structure and punctuation markedly — it is a readability fix, not a
correctness fix. `real estate` → `re-assess` is the same failure wearing a new coat.

## Corollary for load-bearing single phrases

When the clean form appears in NO sample and the corruption is stable, confidence
should go to zero rather than to the most plausible reconstruction. A stable wrong
token (NMS) and scatter-around-a-clean-centre (`HR onboarding` / "HR all morning")
are opposite signatures and must not be treated alike.
