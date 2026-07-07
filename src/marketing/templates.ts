export interface TemplateLineItem {
  product: string;
  unit: string;
  unitPrice: number;
  sampleQuantity: number;
}

export interface TemplateFaq {
  question: string;
  answer: string;
}

export interface TemplateSpec {
  slug: string;
  niche: string;
  templateFamily: "order-portal";
  cardTitle: string;
  cardSummary: string;
  seoTitle: string;
  metaDescription: string;
  intro: string;
  businessName: string;
  formTitle: string;
  currencyCode: string;
  currencySymbol: string;
  taxRatePercent: number | null;
  taxLabel: string | null;
  paymentTerms: string;
  lineItems: TemplateLineItem[];
  faq: TemplateFaq[];
}

const usd = { currencyCode: "USD", currencySymbol: "$" } as const;

export const templates: TemplateSpec[] = [
  {
    slug: "bakery-order-form",
    niche: "Bakery",
    templateFamily: "order-portal",
    cardTitle: "Bakery order form",
    cardSummary: "Wholesale bread and pastry orders with per-dozen pricing and line totals.",
    seoTitle: "Free Bakery Order Form Template — Excel & Google Sheets",
    metaDescription:
      "A working bakery order form in Excel and Google Sheets. Real products, per-unit pricing, automatic line totals and subtotal. Download free or turn it into an order portal.",
    intro:
      "A wholesale bakery order sheet your cafe and grocery accounts can fill in. Products, units, and prices are set up with working line-total and subtotal formulas, so a buyer only enters quantities.",
    businessName: "Sunrise Bakehouse",
    formTitle: "Wholesale Order Form",
    ...usd,
    taxRatePercent: null,
    taxLabel: null,
    paymentTerms: "Net 7. Delivery Tuesday and Friday. Order cutoff 4pm the day before.",
    lineItems: [
      { product: "Sourdough loaf", unit: "each", unitPrice: 4.5, sampleQuantity: 12 },
      { product: "Baguette", unit: "each", unitPrice: 3.25, sampleQuantity: 20 },
      { product: "Ciabatta roll", unit: "dozen", unitPrice: 9.0, sampleQuantity: 6 },
      { product: "Butter croissant", unit: "dozen", unitPrice: 18.0, sampleQuantity: 8 },
      { product: "Pain au chocolat", unit: "dozen", unitPrice: 21.0, sampleQuantity: 5 },
      { product: "Cinnamon roll", unit: "dozen", unitPrice: 24.0, sampleQuantity: 4 },
      { product: "Focaccia tray", unit: "tray", unitPrice: 16.0, sampleQuantity: 3 },
      { product: "Bagel", unit: "dozen", unitPrice: 12.0, sampleQuantity: 10 },
    ],
    faq: [
      {
        question: "Is this bakery order form really free?",
        answer:
          "Yes. Download the .xlsx and use it in Excel or Google Sheets with no account and no watermark. The prices and formulas are examples you replace with your own.",
      },
      {
        question: "How do the totals work?",
        answer:
          "Each line multiplies unit price by quantity. The subtotal adds every line. Edit a quantity and the totals recalculate the way any spreadsheet does.",
      },
      {
        question: "Can my wholesale accounts order from this without Excel?",
        answer:
          "Not from the file itself. If you want buyers to order online, Sheetstand turns this exact sheet into a hosted order portal where they pick quantities and you get the order back in your sheet.",
      },
      {
        question: "How do I add my own products?",
        answer:
          "Replace the product names, units, and unit prices in the rows. Add rows as needed; the subtotal formula covers the whole line-total column.",
      },
    ],
  },
  {
    slug: "wholesale-price-list-order-sheet",
    niche: "Wholesale",
    templateFamily: "order-portal",
    cardTitle: "Wholesale price list & order sheet",
    cardSummary: "A case-priced product list buyers order from, with tax and order total.",
    seoTitle: "Free Wholesale Order Form Template — Excel & Google Sheets",
    metaDescription:
      "A wholesale price list and order sheet in Excel and Google Sheets. Case pricing, line totals, tax, and order total built in. Download free or publish it as an order portal.",
    intro:
      "A combined price list and order sheet for wholesale accounts. Every product is priced by the case with a working line total, subtotal, tax, and order total.",
    businessName: "Harbor Wholesale Co.",
    formTitle: "Price List & Order Sheet",
    ...usd,
    taxRatePercent: 8.5,
    taxLabel: "Sales tax (8.5%)",
    paymentTerms:
      "Net 30 for approved accounts. Minimum order $250. Freight added on orders under 5 cases.",
    lineItems: [
      { product: "Olive oil, 1L", unit: "case of 12", unitPrice: 96.0, sampleQuantity: 4 },
      { product: "Canned tomatoes, 800g", unit: "case of 24", unitPrice: 42.0, sampleQuantity: 6 },
      { product: "Dried pasta, 500g", unit: "case of 20", unitPrice: 28.0, sampleQuantity: 8 },
      { product: "Sea salt, 1kg", unit: "case of 12", unitPrice: 30.0, sampleQuantity: 3 },
      {
        product: "Balsamic vinegar, 500ml",
        unit: "case of 12",
        unitPrice: 78.0,
        sampleQuantity: 2,
      },
      { product: "Chickpeas, 800g", unit: "case of 24", unitPrice: 38.0, sampleQuantity: 5 },
      { product: "Arborio rice, 1kg", unit: "case of 10", unitPrice: 45.0, sampleQuantity: 4 },
      { product: "Espresso beans, 1kg", unit: "case of 6", unitPrice: 108.0, sampleQuantity: 3 },
    ],
    faq: [
      {
        question: "Does this work as both a price list and an order form?",
        answer:
          "Yes. Buyers read the case price and enter a quantity in the same row. The sheet totals the order and adds tax so both sides see the same number.",
      },
      {
        question: "How is tax calculated?",
        answer:
          "The tax line multiplies the subtotal by the rate in the label. Change the rate to match your region and the order total updates.",
      },
      {
        question: "Can I set a minimum order?",
        answer:
          "The template notes a minimum in the terms line. If you publish it as a Sheetstand portal, order minimums become an enforced rule at checkout.",
      },
      {
        question: "How do buyers send it back to me?",
        answer:
          "By email or a shared Google Sheet if you use the file. If you want quantities, contact details, and totals to arrive as a clean order, publish it as an order portal.",
      },
    ],
  },
  {
    slug: "farm-csa-weekly-order",
    niche: "Farm / CSA",
    templateFamily: "order-portal",
    cardTitle: "Farm & CSA weekly order",
    cardSummary: "A weekly produce share order sheet priced by unit, bunch, and pound.",
    seoTitle: "Free Farm & CSA Order Form Template — Excel & Google Sheets",
    metaDescription:
      "A weekly farm and CSA order form in Excel and Google Sheets. Real produce, unit pricing, line totals and subtotal. Download free or turn it into a members' order portal.",
    intro:
      "A weekly order sheet for a farm stand or CSA. Members pick quantities against this week's harvest; line totals and the subtotal add up automatically.",
    businessName: "Ridgeline Farm",
    formTitle: "Weekly Harvest Order",
    ...usd,
    taxRatePercent: null,
    taxLabel: null,
    paymentTerms: "Order by Wednesday for Saturday pickup. Pay at pickup or on account.",
    lineItems: [
      { product: "Salad mix", unit: "bag", unitPrice: 6.0, sampleQuantity: 2 },
      { product: "Carrots", unit: "bunch", unitPrice: 3.5, sampleQuantity: 3 },
      { product: "Heirloom tomatoes", unit: "lb", unitPrice: 4.0, sampleQuantity: 4 },
      { product: "Rainbow chard", unit: "bunch", unitPrice: 3.0, sampleQuantity: 2 },
      { product: "New potatoes", unit: "lb", unitPrice: 2.5, sampleQuantity: 5 },
      { product: "Free-range eggs", unit: "dozen", unitPrice: 7.0, sampleQuantity: 2 },
      { product: "Strawberries", unit: "pint", unitPrice: 5.5, sampleQuantity: 3 },
      { product: "Sweet corn", unit: "each", unitPrice: 0.75, sampleQuantity: 12 },
    ],
    faq: [
      {
        question: "Can I change the produce list every week?",
        answer:
          "Yes. Replace the rows with this week's harvest and prices before you send it out. The totals formula covers whatever rows you keep.",
      },
      {
        question: "Does it handle pay-at-pickup?",
        answer:
          "The terms line states when and how members pay. Sheetstand portals carry the same payment instructions onto the buyer's confirmation.",
      },
      {
        question: "How do members order without printing it?",
        answer:
          "Share the Google Sheet, or publish it as a Sheetstand order portal so members order from a link on their phone and you get a clean weekly list.",
      },
      {
        question: "Can I price by weight and by unit in the same sheet?",
        answer:
          "Yes. Each row has its own unit — bunch, lb, dozen, each — and its own price. The line total is price times quantity regardless of the unit.",
      },
    ],
  },
  {
    slug: "coffee-roaster-order-form",
    niche: "Coffee roaster",
    templateFamily: "order-portal",
    cardTitle: "Coffee roaster order form",
    cardSummary: "Wholesale roasted coffee orders by the bag, priced per pound.",
    seoTitle: "Free Coffee Roaster Order Form Template — Excel & Google Sheets",
    metaDescription:
      "A wholesale coffee roaster order form in Excel and Google Sheets. Single-origin and blend pricing, line totals, subtotal and tax. Download free or publish an order portal.",
    intro:
      "A wholesale order sheet for a coffee roaster. Cafes and offices order roasted coffee by the bag with working line totals, subtotal, and tax.",
    businessName: "Cardinal Coffee Roasters",
    formTitle: "Wholesale Coffee Order",
    ...usd,
    taxRatePercent: 7.0,
    taxLabel: "Sales tax (7%)",
    paymentTerms: "Roasted to order Monday and Thursday. Net 15. Freight free over $200.",
    lineItems: [
      { product: "House blend, 5lb bag", unit: "bag", unitPrice: 62.0, sampleQuantity: 4 },
      { product: "Espresso blend, 5lb bag", unit: "bag", unitPrice: 68.0, sampleQuantity: 3 },
      { product: "Colombia single origin, 5lb", unit: "bag", unitPrice: 74.0, sampleQuantity: 2 },
      { product: "Ethiopia single origin, 5lb", unit: "bag", unitPrice: 82.0, sampleQuantity: 2 },
      { product: "Decaf, 5lb bag", unit: "bag", unitPrice: 66.0, sampleQuantity: 1 },
      { product: "Cold brew blend, 5lb", unit: "bag", unitPrice: 58.0, sampleQuantity: 3 },
      { product: "Retail 12oz, house", unit: "case of 6", unitPrice: 72.0, sampleQuantity: 2 },
      { product: "Retail 12oz, espresso", unit: "case of 6", unitPrice: 78.0, sampleQuantity: 2 },
    ],
    faq: [
      {
        question: "Can I keep single origins and blends in one order form?",
        answer:
          "Yes. Each coffee is its own row with its own price. Add or remove origins as your offerings rotate.",
      },
      {
        question: "Does it separate wholesale bags from retail cases?",
        answer:
          "Both live in the same order sheet with their own units and prices. The line total is price times quantity either way.",
      },
      {
        question: "How do cafes reorder every week?",
        answer:
          "Sharing the sheet works, but reordering is faster from a link. Publish this as a Sheetstand order portal and cafes reorder in a minute on their phone.",
      },
      {
        question: "Can I change the tax rate?",
        answer:
          "Yes. Edit the rate in the tax label and the order total recalculates from the subtotal.",
      },
    ],
  },
  {
    slug: "florist-standing-order",
    niche: "Florist",
    templateFamily: "order-portal",
    cardTitle: "Florist standing order",
    cardSummary: "A recurring stems-and-arrangements order for shops and event clients.",
    seoTitle: "Free Florist Order Form Template — Excel & Google Sheets",
    metaDescription:
      "A florist standing order form in Excel and Google Sheets. Stems and arrangements priced per unit, with line totals and subtotal. Download free or publish an order portal.",
    intro:
      "A standing order sheet for a florist supplying shops, hotels, and event clients. Stems and arrangements are priced per unit with automatic line totals.",
    businessName: "Fern & Fig Florals",
    formTitle: "Standing Order",
    ...usd,
    taxRatePercent: null,
    taxLabel: null,
    paymentTerms:
      "Standing order delivered every Monday. Confirm changes by Friday. Invoiced monthly.",
    lineItems: [
      { product: "Garden roses", unit: "stem", unitPrice: 3.5, sampleQuantity: 40 },
      { product: "Ranunculus", unit: "stem", unitPrice: 2.75, sampleQuantity: 30 },
      { product: "Eucalyptus", unit: "bunch", unitPrice: 8.0, sampleQuantity: 6 },
      { product: "Seasonal foliage", unit: "bunch", unitPrice: 7.0, sampleQuantity: 8 },
      { product: "Lisianthus", unit: "stem", unitPrice: 2.5, sampleQuantity: 25 },
      { product: "Table arrangement, small", unit: "each", unitPrice: 35.0, sampleQuantity: 6 },
      { product: "Table arrangement, large", unit: "each", unitPrice: 65.0, sampleQuantity: 3 },
      { product: "Reception installation", unit: "each", unitPrice: 250.0, sampleQuantity: 1 },
    ],
    faq: [
      {
        question: "Is a standing order different from a one-off order?",
        answer:
          "The sheet is the same. A standing order is one you send on a repeating schedule; the terms line records the schedule and how changes are confirmed.",
      },
      {
        question: "Can I mix stems and finished arrangements?",
        answer:
          "Yes. Stems are priced per stem or bunch and arrangements are priced each. Every row totals price times quantity.",
      },
      {
        question: "How do event clients approve the order?",
        answer:
          "They can review the shared sheet, or order from a link if you publish it as a Sheetstand portal, which sends a confirmation with the totals.",
      },
      {
        question: "Can I invoice monthly from this?",
        answer:
          "The terms line states monthly invoicing. The subtotal gives you the order value to invoice against.",
      },
    ],
  },
  {
    slug: "butcher-meat-order",
    niche: "Butcher",
    templateFamily: "order-portal",
    cardTitle: "Butcher & meat order",
    cardSummary: "Wholesale cuts priced per pound and per case for restaurant accounts.",
    seoTitle: "Free Butcher & Meat Order Form Template — Excel & Google Sheets",
    metaDescription:
      "A wholesale butcher and meat order form in Excel and Google Sheets. Cuts priced per pound and case, with line totals, subtotal and tax. Download free or publish an order portal.",
    intro:
      "A wholesale order sheet for a butcher supplying restaurants and grocers. Cuts are priced per pound or per case with working line totals and tax.",
    businessName: "Meridian Meats",
    formTitle: "Wholesale Meat Order",
    ...usd,
    taxRatePercent: 6.0,
    taxLabel: "Sales tax (6%)",
    paymentTerms:
      "Cut to order. Delivery Wednesday and Saturday. Net 14. Cold-chain surcharge on rush orders.",
    lineItems: [
      { product: "Ribeye, boneless", unit: "lb", unitPrice: 16.5, sampleQuantity: 20 },
      { product: "Beef short rib", unit: "lb", unitPrice: 9.5, sampleQuantity: 15 },
      { product: "Ground beef, 80/20", unit: "lb", unitPrice: 5.75, sampleQuantity: 40 },
      { product: "Pork belly", unit: "lb", unitPrice: 7.25, sampleQuantity: 25 },
      {
        product: "Chicken thigh, boneless",
        unit: "case of 40lb",
        unitPrice: 118.0,
        sampleQuantity: 2,
      },
      { product: "Bacon, sliced", unit: "case of 15lb", unitPrice: 84.0, sampleQuantity: 3 },
      { product: "Lamb rack", unit: "each", unitPrice: 38.0, sampleQuantity: 6 },
      { product: "House sausage", unit: "lb", unitPrice: 6.5, sampleQuantity: 30 },
    ],
    faq: [
      {
        question: "Can I price by the pound and by the case together?",
        answer:
          "Yes. Each cut carries its own unit and price. The line total multiplies price by quantity whether the unit is a pound, a case, or each.",
      },
      {
        question: "How do restaurants send their standing weekly order?",
        answer:
          "By shared sheet or email with the file. If you publish it as a Sheetstand portal, chefs order from a link and the order lands back in your sheet.",
      },
      {
        question: "Does it handle a surcharge?",
        answer:
          "The terms line notes surcharges. Sheetstand can add fixed or percentage rules at checkout if you publish the sheet as a portal.",
      },
      {
        question: "Can I change cuts and prices weekly?",
        answer:
          "Yes. Update the rows before sending. The subtotal and tax formulas cover the whole table.",
      },
    ],
  },
  {
    slug: "produce-distributor-order",
    niche: "Produce distributor",
    templateFamily: "order-portal",
    cardTitle: "Produce distributor sheet",
    cardSummary: "A case-and-carton produce order sheet for restaurant and grocer accounts.",
    seoTitle: "Free Produce Order Form Template — Excel & Google Sheets",
    metaDescription:
      "A produce distributor order form in Excel and Google Sheets. Cases and cartons priced per unit, with line totals, subtotal and tax. Download free or publish an order portal.",
    intro:
      "An order sheet for a produce distributor supplying restaurants and grocers. Cases and cartons are priced per unit with working totals and tax.",
    businessName: "Greenline Produce",
    formTitle: "Produce Order Sheet",
    ...usd,
    taxRatePercent: 5.0,
    taxLabel: "Sales tax (5%)",
    paymentTerms: "Order by 6pm for next-day delivery. Net 21. Minimum $150 per delivery.",
    lineItems: [
      { product: "Romaine", unit: "case of 24", unitPrice: 34.0, sampleQuantity: 4 },
      { product: "Roma tomatoes", unit: "case of 25lb", unitPrice: 28.0, sampleQuantity: 6 },
      { product: "Yellow onions", unit: "sack of 50lb", unitPrice: 22.0, sampleQuantity: 3 },
      { product: "Russet potatoes", unit: "case of 50lb", unitPrice: 26.0, sampleQuantity: 4 },
      { product: "Bell peppers, mixed", unit: "case of 30", unitPrice: 31.0, sampleQuantity: 3 },
      { product: "Baby spinach", unit: "carton of 4x2.5lb", unitPrice: 24.0, sampleQuantity: 5 },
      { product: "Lemons", unit: "case of 40", unitPrice: 36.0, sampleQuantity: 2 },
      { product: "Avocados", unit: "case of 48", unitPrice: 52.0, sampleQuantity: 3 },
    ],
    faq: [
      {
        question: "Does the sheet handle mixed units like cases and sacks?",
        answer:
          "Yes. Each product has its own pack size and price. The line total is price times quantity, so units can differ row to row.",
      },
      {
        question: "How do accounts place a next-day order?",
        answer:
          "They fill the quantities and send it back before cutoff. Publish it as a Sheetstand portal and accounts order from a link with the cutoff and minimum enforced.",
      },
      {
        question: "Can I enforce the delivery minimum?",
        answer:
          "The terms line states it in the file. As a Sheetstand order portal, the minimum becomes a rule the buyer sees at checkout.",
      },
      {
        question: "How often can I change prices?",
        answer:
          "As often as you like. Produce prices move; update the unit price column and the totals follow.",
      },
    ],
  },
  {
    slug: "catering-order-form",
    niche: "Catering",
    templateFamily: "order-portal",
    cardTitle: "Catering order form",
    cardSummary: "Platters and packages priced per person and per tray, with tax and total.",
    seoTitle: "Free Catering Order Form Template — Excel & Google Sheets",
    metaDescription:
      "A catering order form in Excel and Google Sheets. Platters and per-person packages, line totals, subtotal and tax. Download free or turn it into a live order portal.",
    intro:
      "An order sheet for a catering business. Platters, trays, and per-person packages are priced and totaled automatically, with a tax line and order total.",
    businessName: "Alder & Oak Catering",
    formTitle: "Catering Order",
    ...usd,
    taxRatePercent: 8.0,
    taxLabel: "Sales tax (8%)",
    paymentTerms: "Confirm headcount 72 hours ahead. 50% deposit on booking. Delivery fee by zone.",
    lineItems: [
      { product: "Breakfast package", unit: "per person", unitPrice: 14.0, sampleQuantity: 25 },
      { product: "Sandwich lunch", unit: "per person", unitPrice: 18.0, sampleQuantity: 30 },
      { product: "Hot buffet", unit: "per person", unitPrice: 28.0, sampleQuantity: 40 },
      { product: "Cheese & charcuterie board", unit: "tray", unitPrice: 85.0, sampleQuantity: 2 },
      { product: "Seasonal salad", unit: "tray", unitPrice: 45.0, sampleQuantity: 3 },
      { product: "Dessert platter", unit: "tray", unitPrice: 55.0, sampleQuantity: 2 },
      { product: "Coffee & tea service", unit: "per person", unitPrice: 4.0, sampleQuantity: 40 },
      { product: "Staffing, per server", unit: "each", unitPrice: 180.0, sampleQuantity: 2 },
    ],
    faq: [
      {
        question: "Can I price per person and per tray in one form?",
        answer:
          "Yes. Per-person packages and per-tray items each have their own unit and price. The line total is price times quantity for both.",
      },
      {
        question: "Does the total include tax and staffing?",
        answer:
          "Staffing is a line item and tax is a line on the subtotal. The order total sums the subtotal and tax.",
      },
      {
        question: "How do clients confirm a booking?",
        answer:
          "They return the sheet, or confirm from a Sheetstand order portal that carries the deposit and headcount terms onto their confirmation.",
      },
      {
        question: "Can I add a delivery fee?",
        answer:
          "Add it as a line item, or set it as a rule at checkout if you publish the form as a Sheetstand order portal.",
      },
    ],
  },
];

export const templateBySlug = (slug: string): TemplateSpec | undefined =>
  templates.find((template) => template.slug === slug);

export const templateSlugs = (): string[] => templates.map((template) => template.slug);
