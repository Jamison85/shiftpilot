const RULES = [
  { pattern: /\b(bookwork|books|daily books|cash reconciliation|reconcile cash)\b/i, minutes: 45, label: 'Bookwork' },
  { pattern: /\bsmart counts?\b/i, minutes: 30, label: 'Smart Counts' },
  { pattern: /\b(daily walk|store walk|walk routine|walkthrough)\b/i, minutes: 20, label: 'Store walk' },
  { pattern: /\b(truck|put away delivery|unload|freight)\b/i, minutes: 90, label: 'Truck work' },
  { pattern: /\b(reset|planogram|pog|set display|power wing|endcap)\b/i, minutes: 45, label: 'Reset or display' },
  { pattern: /\b(candy backstock|work candy|stock candy|candy aisle)\b/i, minutes: 30, label: 'Candy stocking' },
  { pattern: /\b(beer cooler|stock beer|fill beer)\b/i, minutes: 30, label: 'Beer cooler' },
  { pattern: /\b(cooler|freezer)\b.*\b(stock|fill|work|organize)\b|\b(stock|fill|work|organize)\b.*\b(cooler|freezer)\b/i, minutes: 25, label: 'Cooler or freezer' },
  { pattern: /\b(cigarette|tobacco)\b.*\b(count|audit|inventory)\b|\b(count|audit|inventory)\b.*\b(cigarette|tobacco)\b/i, minutes: 25, label: 'Tobacco count' },
  { pattern: /\b(count|audit|inventory)\b/i, minutes: 20, label: 'Count or audit' },
  { pattern: /\b(price tags?|shelf tags?|missing tags?|map|signage)\b/i, minutes: 25, label: 'Tags and signage' },
  { pattern: /\b(bibs?|bag[- ]?in[- ]?box|soda boxes?)\b/i, minutes: 12, label: 'BIBs' },
  { pattern: /\b(food warmers?|warmer)\b/i, minutes: 10, label: 'Food warmers' },
  { pattern: /\b(coffee|fountain)\b/i, minutes: 15, label: 'Coffee and fountain' },
  { pattern: /\b(cups?|lids?|straws?)\b.*\b(fill|stock|refill)\b|\b(fill|stock|refill)\b.*\b(cups?|lids?|straws?)\b/i, minutes: 10, label: 'Fountain supplies' },
  { pattern: /\b(restrooms?|bathrooms?)\b/i, minutes: 15, label: 'Restrooms' },
  { pattern: /\b(trash|garbage)\b/i, minutes: 10, label: 'Trash' },
  { pattern: /\b(sweep|mop|floors?)\b/i, minutes: 20, label: 'Floors' },
  { pattern: /\b(clean|wipe|sanitize)\b/i, minutes: 15, label: 'Cleaning' },
  { pattern: /\b(backstock|stock|fill|face|front)\b/i, minutes: 25, label: 'Stocking' },
  { pattern: /\b(order|vendor|receive|invoice)\b/i, minutes: 20, label: 'Vendor or order' },
  { pattern: /\b(call|text|email|message)\b/i, minutes: 5, label: 'Communication' },
  { pattern: /\b(check|inspect|verify|review)\b/i, minutes: 10, label: 'Check or review' },
]

const SMALL_WORDS = /\b(quick|small|few|one shelf|one section)\b/i
const LARGE_WORDS = /\b(all|entire|whole|full|complete|every|deep clean|major)\b/i

export function estimateTaskMinutes(title, fallback = 15) {
  const text = String(title || '').trim()
  if (!text) return Math.max(5, Number(fallback) || 15)

  const explicit = text.match(/\b(\d+(?:\.\d+)?)\s*(minutes?|mins?|hours?|hrs?)\b/i)
  if (explicit) {
    const amount = Number(explicit[1])
    return /hour|hr/i.test(explicit[2]) ? Math.round(amount * 60) : Math.round(amount)
  }

  const matched = RULES.find(rule => rule.pattern.test(text))
  let minutes = matched?.minutes || Math.max(10, Number(fallback) || 15)

  if (SMALL_WORDS.test(text)) minutes = Math.max(5, Math.round(minutes * 0.65 / 5) * 5)
  if (LARGE_WORDS.test(text)) minutes = Math.round(minutes * 1.5 / 5) * 5

  return Math.max(5, minutes)
}

export function estimateTaskInfo(title, fallback = 15) {
  const text = String(title || '').trim()
  const matched = RULES.find(rule => rule.pattern.test(text))
  return {
    minutes: estimateTaskMinutes(text, fallback),
    category: matched?.label || 'General task',
    confidence: matched ? 'high' : 'standard',
  }
}
