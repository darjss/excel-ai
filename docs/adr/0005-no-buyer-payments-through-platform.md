# Buyer payments never flow through Sheetstand

The Portal records Orders; money moves between Buyer and Supplier exactly as it does today (invoice, net terms, bank transfer, cash on delivery). PortalConfig carries a Supplier-written payment-instructions field rendered on the confirmation screen, Buyer email, and Orders Tab row — extraction pre-fills it when the Source Sheet contains payment terms.

Deliberately rejected: processing Buyer payments. Touching the money makes Sheetstand a marketplace/payment facilitator — chargebacks, KYC, payout compliance, refund support — which is Faire's 15%-commission cost structure; flat $29/49 pricing is only possible because payments stay out. If card payment demand materializes, the path is the Supplier's own Stripe (payment links per order, their account, their liability), never marketplace mechanics.
