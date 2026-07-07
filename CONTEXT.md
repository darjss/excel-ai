# Sheetstand

Platform that turns a business's existing spreadsheet into a hosted, customer-facing order portal. The spreadsheet stays the business's admin surface; the portal is what their customers see.

## Language

### People

**Supplier**:
The business that pays for the platform and owns a Source Sheet — a wholesaler, bakery, farm, or similar.
_Avoid_: tenant, merchant, owner, customer

**Buyer**:
A person or organization that places Orders with a Supplier through their Portal.
_Avoid_: customer, end-user, client

### Artifacts

**Source Sheet**:
The Supplier's spreadsheet (Google Sheet in v1) that defines their Portal and remains their day-to-day admin surface after publishing.
_Avoid_: workbook, excel file, database

**Extraction**:
The process of deriving a Source Sheet's structure, pricing rules, and validations into a draft PortalConfig, with a confidence level per finding.

**PortalConfig**:
The typed artifact produced by Extraction and confirmed on the Review Screen; the single input from which a Portal is rendered.
_Avoid_: generated code, site config

**Review Screen**:
Where the Supplier confirms or corrects the Extraction draft before publishing. Nothing goes live unconfirmed.
_Avoid_: mapping UI, wizard

**Portal**:
The hosted customer-facing site rendered from a Supplier's PortalConfig.
_Avoid_: app, website, storefront

### Portal concepts

**Catalog**:
The browsable list of a Supplier's products/prices, rendered from the Source Sheet's data.
_Avoid_: product list, inventory

**Order Form**:
The Portal screen where a Buyer selects line items and quantities; totals and constraints come from the extracted rules.

**Order**:
A Buyer's submitted Order Form (or a manual entry by the Supplier), stored by the platform, editable from the dashboard, and mirrored to the Orders Tab. Lifecycle: received → confirmed → fulfilled, or cancelled. An Order records prices as they stood at submit time; later Source Sheet changes never alter an existing Order.
_Avoid_: purchase, transaction, submission

**Orders Tab**:
A platform-owned tab in the Source Sheet where each Order lands as a row and is updated by order ID (never row position) when it changes. The only tab the platform writes; Suppliers read it but don't edit it.
_Avoid_: write-back, sync-back

**Import**:
The one-way refresh of Portal data from the Source Sheet (polling plus manual "sync now"). There is no two-way sync.
_Avoid_: sync (alone), mirror

**Publish**:
Making a Portal live at its subdomain after Review Screen confirmation.
