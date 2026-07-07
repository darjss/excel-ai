# Excel Sample Fixtures — Manifest

Real-world business spreadsheets for testing structure/formula/business-logic extraction.
All files verified: `file` reports "Microsoft Excel 2007+" (OOXML zip, not HTML), each is non-empty and contains `xl/worksheets/`.
Counts below measured directly from the sheet XML (`<f>` formula tags, `<mergeCell>`, `dataValidation`).

Downloaded: 2026-07-06

| File | Wedge | KB | Sheets | Formulas | Merged | Validation | VBA |
|------|-------|----|--------|----------|--------|-----------|-----|
| sales-order-form.xlsx | order | 104 | 3 | 30 | 15 | 0 | no |
| purchase-order.xlsx | order | 362 | 1 | 12 | 41 | 0 | no |
| exceldatapro-purchase-order.xlsx | order | 30 | 1 | 24 | 23 | 1 | no |
| hubspot-order-form.xlsx | order | 150 | 2 | 9 | 40 | 0 | no |
| inventory-management-tracker.xlsx | inventory | 66 | 4 | 139 | 30 | 0 | no |
| clothing-inventory-list.xlsx | inventory | 384 | 6 | 202 | 16 | 0 | no |
| residential-construction-estimate.xlsx | quote | 328 | 2 | 1553 | 11 | 1 | no |
| group-room-reservation-list.xlsx | booking | 207 | 2+ | 6 | 16 | 10 | no |
| gov-rrf-budget-template.xlsx | gov budget | 159 | 5 | 4163 | 165 | 8 | no |
| gov-accountable-grant-budget.xlsx | grant tracker | 569 | 9 | 1084 | 34 | 17 | no |
| gov-innovate-finance-spreadsheet.xlsx | grant finance | 99 | 9 | 899 | 8 | 21 | no |
| gov-sipf-financial-costing.xlsx | grant costing | 74 | 9 | 172 | 20 | 2 | no |
| macro-workbook-vba.xlsm | VBA macro | 15 | 1 | 0 | 0 | 0 | **yes** |

## Per-file detail

### order sheets
- **sales-order-form.xlsx** — Smartsheet free template. Multi-sheet order form; line-item subtotal/tax/total formula chains + merged header blocks.
  - Source: https://www.smartsheet.com/content/sales-order-templates
  - Direct: https://www.smartsheet.com/sites/default/files/IC-Sales-Order-Form-Template-10543.xlsx
  - License: Smartsheet free template (free to use, no attribution required)
- **purchase-order.xlsx** — Smartsheet free template. Single sheet but 41 merged regions — stresses merged-region flattening.
  - Direct: https://www.smartsheet.com/sites/default/files/purchase-order-template.xlsx
  - License: Smartsheet free template
- **exceldatapro-purchase-order.xlsx** — ExcelDataPro. Compact PO, dense formula+merge mix, one data-validation dropdown.
  - Source: exceldatapro.com
  - Direct: https://d25skit2l41vkl.cloudfront.net/wp-content/uploads/2017/05/Purchase-Order-Template.xlsx
  - License: ExcelDataPro free (personal/commercial)
- **hubspot-order-form.xlsx** — HubSpot business templates. Instructions sheet + form sheet (40 merges); tests distinguishing a real-data sheet from boilerplate.
  - Direct: https://www.hubspot.com/hubfs/assets/directories/business-templates/files/EN/order-form-template-file-excel.xlsx
  - License: HubSpot free template

### inventory / stock lists
- **inventory-management-tracker.xlsx** — Smartsheet. 4-sheet workbook with reorder/stock-level formulas; cross-sheet references.
  - Source: https://www.smartsheet.com/content/inventory-tracking-spreadsheet-templates
  - Direct: https://www.smartsheet.com/sites/default/files/IC-Inventory-Management-Template-Updated-8857.xlsx
  - License: Smartsheet free template
- **clothing-inventory-list.xlsx** — Smartsheet. 6 sheets, 202 formulas — largest multi-sheet stock list in the set.
  - Direct: https://www.smartsheet.com/sites/default/files/2021-12/IC-Clothing-Inventory-List-11262.xlsx
  - License: Smartsheet free template

### quote / estimate calculators
- **residential-construction-estimate.xlsx** — Smartsheet. 1553 formulas: per-line labor+material cost, cost-per-sqft, rollup totals. Heaviest calculation graph in the set.
  - Source: https://www.smartsheet.com/content/construction-estimate-templates
  - Direct: https://www.smartsheet.com/sites/default/files/2025-06/IC-Residential-Construction-Estimate-Template-10964.xlsx
  - License: Smartsheet free template

### booking / scheduling
- **group-room-reservation-list.xlsx** — Real group room-reservation intake sheet. Heavy dropdown data-validation (10) driven off lookup sheets + merged headers. Named-range + validation mess. (Reports 2 primary worksheets plus lookup/list sheets.)
  - Source/direct: https://marchforlife.org/wp-content/uploads/2021/09/March-for-Life-Group-2022-Room-List-Template.xlsx
  - License: public template on a public site, no explicit license stated — treat as fixture-only.

### government / operational financial models
- **gov-rrf-budget-template.xlsx** — UK gov RRF activation budget. Densest formula grid in set (~4163 formulas), 165 merged regions, cross-sheet budget rollups. Best recalc/dependency stress test.
  - Direct: https://assets.publishing.service.gov.uk/government/uploads/system/uploads/attachment_data/file/879433/Budget-template-RRF-activation-April2020.xlsx
  - License: UK Open Government Licence v3.0
- **gov-accountable-grant-budget.xlsx** — UK gov accountable grant budget. 9 sheets, 1084 formulas, 17 validations. Largest file (569 KB).
  - Direct: https://assets.publishing.service.gov.uk/media/68b821bd11b4ded2da19fd79/Accountable_Grant_Budget_Template.xlsx
  - License: UK Open Government Licence v3.0
- **gov-innovate-finance-spreadsheet.xlsx** — Innovate UK grant-application finance model. 9 sheets, 899 formulas, 21 validations, cross-sheet cost breakdown.
  - Direct: https://apply-for-innovation-funding.service.gov.uk/files/EOI_370_finance_spreadsheet.xlsx
  - License: UK Open Government Licence v3.0
- **gov-sipf-financial-costing.xlsx** — Innovate UK SIPF funding costing model. 9 linked sheets, mid-complexity (172 formulas).
  - Direct: https://apply-for-innovation-funding.service.gov.uk/files/SIPF_financial_costing.xlsx
  - License: UK Open Government Licence v3.0

### VBA macro
- **macro-workbook-vba.xlsm** — Macro-enabled workbook with a real compiled `xl/vbaProject.bin` (16.9 KB; Sub/Cells macro enumerating sheet names). Exercises the .xlsm/VBA extraction path.
  - Source: https://github.com/Parikshit-Hooda/VBA-excel-examples (raw `main/Macro-enabled_workbook1.xlsm`)
  - License: repo has NO license file — default copyright, educational sample. Fixture-only; swap if license cleanliness matters. BSD-clean alternative: jmcnamara/XlsxWriter `button07.xlsm` (but synthetic near-empty stub).

## License summary
- Smartsheet / HubSpot / ExcelDataPro: free templates, safe as internal test fixtures.
- UK gov files: Open Government Licence v3.0 — free reuse with attribution.
- group-room-reservation & macro-workbook-vba: no explicit license — keep as private fixtures only, do not redistribute.

---

## Large research corpora (NOT downloaded — fetch separately when needed)

- **Enron Spreadsheet Corpus** (Hermans & Murphy-Hill) — ~16,189 unique real Enron business spreadsheets (from 51,572 Excel attachments in the Enron email dump). The gold standard for real, messy corporate spreadsheets with formulas. Hosted on figshare.
  - Landing: https://figshare.com/articles/dataset/Enron_Spreadsheets_and_Emails/1221767
  - Analysis paper fileset: https://figshare.com/articles/journal_contribution/Enron_s_Spreadsheets_and_Related_Emails_A_Dataset_and_Analysis/1222882
  - Fetch: figshare download button, or API `https://api.figshare.com/v2/articles/1221767` for direct file URLs (figshare blocks plain WebFetch with 403; use curl -L or the API).
  - License: figshare CC-BY (public research dataset).
  - Why: real formulas, real mess, merged cells, cross-sheet refs — the closest match to target users' actual files.

- **EUSES Corpus** — ~4,498 unique spreadsheets, mostly scraped from Google top results by keyword (finance, inventory, etc.). Older (2005), less "corporate" than Enron but categorized by domain.
  - Download: http://openscience.us/repo/spreadsheet/euses.html (tera-PROMISE / OpenScience repo)
  - License: shared research resource, free for experimentation.
  - Why: domain-categorized, includes formula-bearing sheets; smaller/easier than Enron.

- **FUSE Corpus** — ~249,000 spreadsheets mined from Common Crawl; reproducible/extendable. Caveat: Common Crawl caps binaries at 1 MB (no large files) and only ~7% contain formulas; many files incomplete. Per-file JSON metadata (formulas, etc.) provided.
  - Paper: https://static.barik.net/barik/publications/msr2015/PID3640389.pdf
  - Project/data: search "FUSE spreadsheet corpus barik" — data distributed via Common Crawl S3 + metadata bundle.
  - License: derived from Common Crawl (open).
  - Why: internet-scale breadth; weaker on formulas/mess than Enron.

- **Sheetpedia** (NeurIPS 2025, Datasets & Benchmarks) — 290,509 unique worksheets from 324,988 workbooks. Aggregates Enron (62,612) + FUSE (182,784) + ExcelForum (320,489 raw), deduped, language-filtered. Ships NL2SR / NL2Formula benchmark tasks. Newest and largest.
  - Data (xlsx): https://huggingface.co/datasets/tianzl66/Sheetpedia_xlsx
  - Code: https://github.com/TTtianTT/Sheetpedia
  - Site: https://tttiantt.github.io/Sheetpedia/
  - Fetch: `huggingface-cli download tianzl66/Sheetpedia_xlsx --repo-type dataset`
  - Why: modern, formula-aware, already has NL→formula/range labels useful for benchmarking extraction.
