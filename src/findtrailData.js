export const STORAGE_KEY = 'findtrail:history:v1'

export const ITEM_TYPES = [
  { id: 'money', label: 'Money', hint: 'Cash, cards, envelopes' },
  { id: 'keys', label: 'Keys', hint: 'House, car, work keys' },
  { id: 'phone', label: 'Phone', hint: 'Ring, chargers, seating areas' },
  { id: 'wallet', label: 'Wallet', hint: 'Pockets, car, entry spots' },
  { id: 'medicine', label: 'Medicine', hint: 'Usual spot, bag, safety plan' },
  { id: 'glasses', label: 'Glasses', hint: 'Head, bedside, counters' },
  { id: 'remote', label: 'Remote', hint: 'Couch, blankets, furniture' },
  { id: 'custom', label: 'Custom Item', hint: 'Build a simple route' },
]

const makeStep = (title, instruction, checklist, tag = 'home') => ({ title, instruction, checklist, tag })

export const ITEM_GUIDES = {
  money: {
    title: 'Money trail',
    subtitle: 'A calm route through pockets, paper, the car, and laundry.',
    foundOptions: ['Current pocket', 'Previous pocket', 'Wallet', 'Laundry', 'Car', 'Bag or receipt', 'Counter', 'Trash'],
    questions: [
      { id: 'moneyKind', title: 'What kind of money?', subtitle: 'Simple clue. No remembering required.', options: ['Cash', 'Card', 'Both', 'Not sure'] },
      { id: 'moneyContainer', title: 'Was it inside something?', subtitle: 'Pick the closest answer.', options: ['Loose', 'Wallet', 'Pocket', 'Envelope', 'Not sure'] },
      { id: 'moneyAmount', title: 'About how much?', subtitle: 'This only helps set the search pace.', options: ['Small amount', 'Larger amount', 'Not sure'] },
    ],
  },
  keys: {
    title: 'Keys trail',
    subtitle: 'A calm route through doors, pockets, counters, the car, and bags.',
    foundOptions: ['Door area', 'Pocket', 'Jacket', 'Counter', 'Car', 'Couch', 'Bag', 'Bathroom'],
    questions: [
      { id: 'keyType', title: 'Which keys?', subtitle: 'Choose the closest match.', options: ['Car keys', 'House keys', 'Work keys', 'Whole key ring'] },
      { id: 'keysUsed', title: 'Were they used recently?', subtitle: 'No details needed. Just a clue.', options: ['Yes', 'No', 'Not sure'] },
    ],
  },
  phone: {
    title: 'Phone trail',
    subtitle: 'Start with sound or chargers, then search the common slide spots.',
    foundOptions: ['Charger', 'Couch', 'Bed', 'Bathroom', 'Car', 'Kitchen', 'Laundry', 'Bag'],
    questions: [
      { id: 'phonePower', title: 'Can it ring?', subtitle: 'This changes the first step.', options: ['Yes', 'Maybe silent', 'Battery may be dead', 'Not sure'] },
    ],
  },
  wallet: {
    title: 'Wallet trail',
    subtitle: 'A simple route through pockets, the car, entry spots, bags, and seating areas.',
    foundOptions: ['Pants pocket', 'Jacket', 'Car', 'Entry area', 'Bedside', 'Couch', 'Bag', 'Store bag'],
    questions: [
      { id: 'walletKind', title: 'What kind of wallet?', subtitle: 'This helps choose the early stops.', options: ['Pocket wallet', 'Phone wallet', 'Bag wallet', 'Not sure'] },
    ],
  },
  medicine: {
    title: 'Medicine trail',
    subtitle: 'A careful route with safety first.',
    foundOptions: ['Usual medicine spot', 'Bathroom', 'Kitchen', 'Bedside', 'Bag', 'Car', 'Pharmacy plan'],
    questions: [
      { id: 'medicineUrgency', title: 'Is this medicine urgent?', subtitle: 'Safety first. Choose the closest answer.', options: ['Yes, urgent', 'Needed today', 'Routine', 'Not sure'] },
      { id: 'medicineContainer', title: 'What container?', subtitle: 'Pick the closest match.', options: ['Bottle', 'Pill organizer', 'Box or packet', 'Not sure'] },
    ],
  },
  glasses: {
    title: 'Glasses trail',
    subtitle: 'Start with the most common easy spots, then move outward.',
    foundOptions: ['On head', 'Bedside', 'Bathroom', 'Kitchen', 'Couch', 'Laundry', 'Car', 'Under papers'],
    questions: [
      { id: 'glassesKind', title: 'Which glasses?', subtitle: 'This changes the search spots.', options: ['Regular glasses', 'Readers', 'Sunglasses', 'Not sure'] },
    ],
  },
  remote: {
    title: 'Remote trail',
    subtitle: 'A focused route through seating areas, blankets, tables, and furniture.',
    foundOptions: ['Couch', 'Chair', 'Blanket', 'Table', 'Bed', 'Kitchen', 'Bathroom', 'Under furniture'],
    questions: [
      { id: 'remoteRoom', title: 'Which room is it for?', subtitle: 'Closest match is fine.', options: ['Living room', 'Bedroom', 'Other room', 'Not sure'] },
    ],
  },
  custom: {
    title: 'Custom trail',
    subtitle: 'A simple route from concrete clues.',
    foundOptions: ['Pocket', 'Usual spot', 'Activity area', 'Car', 'Seating area', 'Bag', 'Counter', 'Final sweep'],
    questions: [
      { id: 'customSize', title: 'How big is it?', subtitle: 'No perfect answer needed.', options: ['Small', 'Medium', 'Large', 'Not sure'] },
      { id: 'customUse', title: 'How is it usually used?', subtitle: 'Pick the closest one.', options: ['Carried', 'Worn', 'Used at home', 'Used in car'] },
    ],
  },
}

const PATHS = {
  money: [
    makeStep('Pocket Check', 'Search only pockets right now.', ['Current pants', 'Previous pants', 'Hoodie or jacket', 'Work clothes', 'Shoes or boots'], 'clothes'),
    makeStep('Wallet Check', 'Check each wallet section slowly.', ['Main cash area', 'Behind cards', 'Hidden zipper area', 'Folded receipts'], 'wallet'),
    makeStep('Laundry Check', 'Only check laundry right now.', ['Hamper', 'Washer', 'Dryer', 'Folded clothes', 'Floor near laundry'], 'laundry'),
    makeStep('Car Check', 'Use a flashlight if possible.', ['Driver seat gap', 'Passenger seat gap', 'Center console', 'Door pockets', 'Floorboards'], 'car'),
    makeStep('Counter Check', 'Check flat surfaces only.', ['Kitchen counter', 'Bathroom counter', 'Bedside table', 'Entry table'], 'home'),
    makeStep('Couch and Bed Check', 'Search slowly. No tearing things apart.', ['Couch cushions', 'Under couch', 'Bedside area', 'Under pillow or blanket'], 'home'),
    makeStep('Bags and Receipts', 'Cash often hides folded inside paper.', ['Grocery bags', 'Fast food bags', 'Work bag', 'Receipts', 'Envelopes'], 'paper'),
    makeStep('Trash Check', 'Check carefully before anything gets thrown out.', ['Top layer only first', 'Receipts', 'Napkins', 'Bags', 'Envelopes'], 'final'),
  ],
  keys: [
    makeStep('Door Area', 'Check the places keys land when entering or leaving.', ['Entry table', 'Door hook', 'Shoes area', 'Nearby shelf'], 'home'),
    makeStep('Pockets and Jacket', 'Only check clothing right now.', ['Current pants', 'Previous pants', 'Jacket', 'Hoodie', 'Work clothes'], 'clothes'),
    makeStep('Counters', 'Check flat surfaces only.', ['Kitchen counter', 'Bathroom counter', 'Bedside table', 'Coffee table'], 'home'),
    makeStep('Car', 'Keys can fall beside the seat.', ['Driver seat gap', 'Cup holders', 'Center console', 'Floorboards', 'Door pocket'], 'car'),
    makeStep('Couch', 'Check seating areas slowly.', ['Couch cushions', 'Under couch', 'Blankets', 'Side table'], 'home'),
    makeStep('Bags', 'Check bags one pocket at a time.', ['Work bag', 'Backpack', 'Grocery bag', 'Jacket pouch'], 'bags'),
    makeStep('Bathroom', 'Check small ledges and counters.', ['Sink counter', 'Shelf', 'Laundry pile', 'Towel area'], 'home'),
    makeStep('Unusual Spots', 'Check only these odd spots.', ['Fridge top', 'Pantry shelf', 'Trash top layer', 'Outside step'], 'final'),
  ],
  phone: [
    makeStep('Ring Phone', 'Try calling or pinging the phone first.', ['Call it', 'Ask another phone to ping it', 'Listen in quiet rooms'], 'tech'),
    makeStep('Chargers', 'Check charging places only.', ['Bedside charger', 'Kitchen charger', 'Car charger', 'Couch charger'], 'tech'),
    makeStep('Couch and Bed', 'Phones slide under soft things.', ['Couch cushions', 'Under couch', 'Bed covers', 'Under pillow'], 'home'),
    makeStep('Bathroom', 'Check counters and towel spots.', ['Sink counter', 'Shelf', 'Laundry pile', 'Towel area'], 'home'),
    makeStep('Car', 'Look where the phone can slide.', ['Seat gaps', 'Cup holders', 'Center console', 'Floorboards'], 'car'),
    makeStep('Kitchen', 'Check flat spots and bags.', ['Counter', 'Table', 'Pantry shelf', 'Grocery bags'], 'home'),
    makeStep('Laundry', 'Check clothes before washing.', ['Hamper', 'Pockets', 'Washer', 'Dryer'], 'laundry'),
    makeStep('Find My iPhone', 'Use Find My if the phone is still missing.', ['Open Find My', 'Play sound if possible', 'Check last location'], 'final'),
  ],
  wallet: [
    makeStep('Pockets and Jacket', 'Only check clothing right now.', ['Current pants', 'Previous pants', 'Jacket', 'Hoodie', 'Work clothes'], 'clothes'),
    makeStep('Car', 'Wallets can slide beside seats.', ['Driver seat gap', 'Passenger seat gap', 'Center console', 'Door pocket', 'Floorboards'], 'car'),
    makeStep('Entry Area', 'Check where things get dropped after coming in.', ['Entry table', 'Key area', 'Shoes area', 'Nearby shelf'], 'home'),
    makeStep('Bedside', 'Check resting spots.', ['Nightstand', 'Under pillow', 'Bed edge', 'Floor beside bed'], 'home'),
    makeStep('Couch', 'Search seating areas slowly.', ['Couch cushions', 'Under couch', 'Blankets', 'Side table'], 'home'),
    makeStep('Bags', 'Check one bag pocket at a time.', ['Work bag', 'Backpack', 'Grocery bag', 'Jacket pouch'], 'bags'),
    makeStep('Purchase Bags and Receipts', 'Check bags from recent purchases.', ['Receipts', 'Fast food bags', 'Grocery bags', 'Store bags'], 'paper'),
    makeStep('Call Last Store', 'If still missing, make one practical call.', ['Call recent store', 'Ask about wallet', 'Check card activity'], 'final'),
  ],
  medicine: [
    makeStep('Safety Check', 'If this is urgent medicine, ask for help now.', ['Tell another person', 'Check dose timing', 'Call pharmacy if needed'], 'urgent'),
    makeStep('Usual Medicine Spot', 'Check the normal place first.', ['Medicine cabinet', 'Organizer spot', 'Kitchen medicine area', 'Bedside medicine spot'], 'home'),
    makeStep('Bathroom', 'Check bathroom surfaces and storage.', ['Sink counter', 'Cabinet', 'Shelf', 'Laundry pile'], 'home'),
    makeStep('Kitchen', 'Check food and counter areas.', ['Counter', 'Table', 'Pantry shelf', 'Fridge door'], 'home'),
    makeStep('Bedside', 'Check sleep and rest areas.', ['Nightstand', 'Bed edge', 'Under pillow', 'Floor beside bed'], 'home'),
    makeStep('Bag', 'Check carried items one pocket at a time.', ['Work bag', 'Backpack', 'Purse or pouch', 'Grocery bag'], 'bags'),
    makeStep('Car', 'Check safe storage and seat areas.', ['Cup holder', 'Console', 'Glove box', 'Seat gap'], 'car'),
    makeStep('Pharmacy Reminder', 'If not found, contact the pharmacy or prescriber.', ['Call pharmacy', 'Ask about refill options', 'Ask another person for help'], 'final'),
  ],
  glasses: [
    makeStep('Face and Head Check', 'Start with the easiest check.', ['On face', 'On head', 'Hanging from shirt', 'In hand'], 'body'),
    makeStep('Bedside', 'Check resting spots.', ['Nightstand', 'Under pillow', 'Bed edge', 'Floor beside bed'], 'home'),
    makeStep('Bathroom', 'Check mirror and sink areas.', ['Sink counter', 'Shelf', 'Medicine cabinet', 'Towel area'], 'home'),
    makeStep('Kitchen', 'Check flat surfaces only.', ['Counter', 'Table', 'Window ledge', 'Pantry shelf'], 'home'),
    makeStep('Couch', 'Search seating areas slowly.', ['Couch cushions', 'Under couch', 'Blankets', 'Side table'], 'home'),
    makeStep('Laundry', 'Check cloth areas gently.', ['Hamper', 'Folded clothes', 'Washer top', 'Dryer top'], 'laundry'),
    makeStep('Car', 'Check common glasses spots.', ['Cup holder', 'Console', 'Dashboard area', 'Seat gap'], 'car'),
    makeStep('Under Papers', 'Lift stacks slowly.', ['Mail pile', 'Books', 'Receipts', 'Notebook'], 'final'),
  ],
  remote: [
    makeStep('Couch', 'Check the main seating area.', ['Cushions', 'Under couch', 'Between cushion and arm', 'Behind pillows'], 'home'),
    makeStep('Chair', 'Check other seating.', ['Chair cushions', 'Side pocket', 'Under chair', 'Nearby floor'], 'home'),
    makeStep('Blankets', 'Shake and fold slowly.', ['Couch blanket', 'Bed blanket', 'Throw pillows', 'Pet blanket'], 'home'),
    makeStep('Tables', 'Check flat surfaces nearby.', ['Coffee table', 'Side table', 'TV stand', 'Shelf'], 'home'),
    makeStep('Bed', 'Check sleep area.', ['Bedside table', 'Under pillow', 'Blankets', 'Floor beside bed'], 'home'),
    makeStep('Kitchen', 'Check accidental carry spots.', ['Counter', 'Table', 'Pantry shelf', 'Fridge top'], 'home'),
    makeStep('Bathroom', 'Check quick-drop spots.', ['Sink counter', 'Shelf', 'Laundry area', 'Towel area'], 'home'),
    makeStep('Under Furniture', 'Use a light and check slowly.', ['Under couch', 'Under chair', 'Under TV stand', 'Near wall edges'], 'final'),
  ],
  custom: [
    makeStep('Pockets or Carried Items', 'Check places that travel with you.', ['Current pockets', 'Previous pockets', 'Jacket', 'Bag'], 'clothes'),
    makeStep('Usual Home Spot', 'Check where it normally belongs.', ['Normal spot', 'Nearby shelf', 'Nearby drawer', 'Floor nearby'], 'home'),
    makeStep('Activity Area', 'Check where it is usually used.', ['Table', 'Counter', 'Desk', 'Chair area'], 'home'),
    makeStep('Car', 'Check common car drop spots.', ['Seat gaps', 'Console', 'Door pockets', 'Floorboards'], 'car'),
    makeStep('Seating Areas', 'Search slowly around rest spots.', ['Couch', 'Chair', 'Bed', 'Blankets'], 'home'),
    makeStep('Bags', 'Check one pocket at a time.', ['Work bag', 'Backpack', 'Grocery bag', 'Pouch'], 'bags'),
    makeStep('Counters', 'Check flat surfaces only.', ['Kitchen', 'Bathroom', 'Entry table', 'Bedside'], 'home'),
    makeStep('Final Sweep', 'Check only the small list.', ['Trash top layer', 'Under papers', 'Laundry', 'Unusual shelf'], 'final'),
  ],
}

const normalize = (value = '') => value.toLowerCase()

export function buildPath(itemId, answers = {}, history = []) {
  let path = [...(PATHS[itemId] || PATHS.custom)]
  const recent = history.find((entry) => entry.itemId === itemId && entry.foundLocation)

  if (itemId === 'money') {
    const kind = normalize(answers.moneyKind)
    const container = normalize(answers.moneyContainer)
    if (container.includes('wallet')) path = moveStep(path, 'Wallet Check', 0)
    if (container.includes('pocket')) path = moveStep(path, 'Pocket Check', 0)
    if (container.includes('envelope')) path = moveStep(path, 'Bags and Receipts', 1)
    if (kind.includes('card') || kind.includes('both')) {
      path.push(makeStep('Card Safety', 'If a card is missing, check activity and lock it if needed.', ['Open bank app', 'Check recent activity', 'Lock card if needed'], 'final'))
    }
  }

  if (itemId === 'phone') {
    const power = normalize(answers.phonePower)
    if (power.includes('dead')) path = moveStep(path, 'Chargers', 0)
  }

  if (itemId === 'medicine') {
    const urgency = normalize(answers.medicineUrgency)
    if (!urgency.includes('urgent') && !urgency.includes('not sure')) {
      path = path.filter((item) => item.title !== 'Safety Check')
    }
  }

  if (itemId === 'custom') {
    const use = normalize(answers.customUse)
    if (use.includes('car')) path = moveStep(path, 'Car', 0)
    if (use.includes('worn')) path = moveStep(path, 'Pockets or Carried Items', 0)
    if (use.includes('home')) path = moveStep(path, 'Usual Home Spot', 0)
  }

  if (recent) {
    const first = makeStep('Recent Found Place', `Last time this was found in: ${recent.foundLocation}. Check that early.`, [recent.foundLocation, 'Nearby surface', 'Nearby floor'], 'recent')
    path = [first, ...path]
  }

  return path.map((item, index) => ({ ...item, id: `${item.title}-${index}` }))
}

function moveStep(path, title, targetIndex) {
  const index = path.findIndex((item) => item.title === title)
  if (index < 0) return path
  const copy = [...path]
  const [picked] = copy.splice(index, 1)
  copy.splice(targetIndex, 0, picked)
  return copy
}
