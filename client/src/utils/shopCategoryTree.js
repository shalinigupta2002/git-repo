/**
 * Nested “Shop by category” tree (Amazon-style drill-down in sidebar).
 * Nodes with `children` open a sub-menu; leaves end navigation.
 */

/** @typedef {{ id: string, label: string, menuTitle?: string, dividerAfter?: boolean, children?: CategoryNode[] }} CategoryNode */

/** @type {CategoryNode[]} */
export const SHOP_CATEGORY_TREE = [
  {
    id: 'mobiles',
    label: 'Moblie & accessories',
    menuTitle: 'Moblie & accessories',
    children: [
      { id: 'm-all-phones', label: 'All Mobile Phones' },
      {
        id: 'm-cases',
        label: 'Cases & Covers',
        children: [
          { id: 'm-case-all', label: 'All Cases & Covers' },
          { id: 'm-case-back', label: 'Back Covers' },
          { id: 'm-case-flip', label: 'Flip & Wallet Cases' },
          { id: 'm-case-bumper', label: 'Bumper & Rugged Cases' },
          { id: 'm-case-clear', label: 'Clear & Slim Cases' },
        ],
      },
      {
        id: 'm-screen',
        label: 'Screen Protectors',
        children: [
          { id: 'm-scr-all', label: 'All Screen Protectors' },
          { id: 'm-scr-temp', label: 'Tempered Glass' },
          { id: 'm-scr-film', label: 'Film & Matte Guards' },
          { id: 'm-scr-privacy', label: 'Privacy Screen Guards' },
        ],
      },
      {
        id: 'm-power',
        label: 'Power Banks',
        children: [
          { id: 'm-pw-all', label: 'All Power Banks' },
          { id: 'm-pw-compact', label: 'Compact (up to 10000mAh)' },
          { id: 'm-pw-high', label: 'High Capacity' },
          { id: 'm-pw-fast', label: 'Fast Charging' },
          { id: 'm-pw-wireless', label: 'Wireless Power Banks' },
        ],
      },
      {
        id: 'm-tablets',
        label: 'Tablets',
        children: [
          { id: 'm-tab-all', label: 'All Tablets' },
          { id: 'm-tab-android', label: 'Android Tablets' },
          { id: 'm-tab-ios', label: 'iOS Tablets' },
          { id: 'm-tab-kids', label: 'Kids Tablets' },
        ],
      },
      {
        id: 'm-wearable',
        label: 'Wearable Devices',
        children: [
          { id: 'm-wear-all', label: 'All Wearables' },
          { id: 'm-wear-watch', label: 'Smartwatches' },
          { id: 'm-wear-band', label: 'Fitness Bands' },
          { id: 'm-wear-vr', label: 'VR Headsets' },
        ],
      },
      {
        id: 'm-smarthome',
        label: 'Smart Home',
        children: [
          { id: 'm-sh-all', label: 'All Smart Home' },
          { id: 'm-sh-light', label: 'Smart Lighting' },
          { id: 'm-sh-plug', label: 'Smart Plugs & Switches' },
          { id: 'm-sh-cam', label: 'Security & Doorbells' },
          { id: 'm-sh-hub', label: 'Hubs & Voice Assistants' },
        ],
      },
      {
        id: 'm-office',
        label: 'Office Supplies & Stationery',
        children: [
          { id: 'm-of-all', label: 'All Office & Stationery' },
          { id: 'm-of-write', label: 'Pens, Pencils & Markers' },
          { id: 'm-of-note', label: 'Notebooks & Diaries' },
          { id: 'm-of-desk', label: 'Desk Organizers' },
          { id: 'm-of-file', label: 'Files & Folders' },
        ],
      },
      {
        id: 'm-software',
        label: 'Software',
        children: [
          { id: 'm-sw-all', label: 'All Software' },
          { id: 'm-sw-sec', label: 'Antivirus & Security' },
          { id: 'm-sw-prod', label: 'Productivity & Office' },
          { id: 'm-sw-creative', label: 'Creative & Design' },
          { id: 'm-sw-util', label: 'Utilities & Tools' },
        ],
      },
    ],
  },
  {
    id: 'computers',
    label: 'Computers & Accessories',
    menuTitle: 'Computers & Accessories',
    children: [
      { id: 'c-all', label: 'All Computers & Accessories' },
      {
        id: 'c-laptops',
        label: 'Laptops',
        children: [
          { id: 'c-lap-all', label: 'All Laptops' },
          { id: 'c-lap-gaming', label: 'Gaming Laptops' },
          { id: 'c-lap-thin', label: 'Thin & Light Laptops' },
          { id: 'c-lap-business', label: 'Business Laptops' },
          { id: 'c-lap-2in1', label: '2-in-1 Laptops' },
        ],
      },
      {
        id: 'c-storage',
        label: 'Drives & Storage',
        children: [
          { id: 'c-st-all', label: 'All Storage' },
          { id: 'c-st-ssd', label: 'Internal SSD' },
          { id: 'c-st-hdd', label: 'Internal Hard Drives' },
          { id: 'c-st-ext', label: 'External Hard Drives' },
          { id: 'c-st-pen', label: 'Pen Drives & OTG' },
          { id: 'c-st-memory', label: 'Memory Cards' },
        ],
      },
      {
        id: 'c-printers',
        label: 'Printers & Ink',
        children: [
          { id: 'c-pr-all', label: 'All Printers' },
          { id: 'c-pr-inkjet', label: 'Inkjet Printers' },
          { id: 'c-pr-laser', label: 'Laser Printers' },
          { id: 'c-pr-ink', label: 'Ink & Toners' },
        ],
      },
      {
        id: 'c-network',
        label: 'Networking Devices',
        children: [
          { id: 'c-nw-all', label: 'All Networking' },
          { id: 'c-nw-router', label: 'Routers' },
          { id: 'c-nw-modem', label: 'Modems' },
          { id: 'c-nw-switch', label: 'Switches' },
          { id: 'c-nw-adapter', label: 'Wi-Fi Adapters' },
        ],
      },
      {
        id: 'c-acc',
        label: 'Computer Accessories',
        children: [
          { id: 'c-ac-all', label: 'All Accessories' },
          { id: 'c-ac-mouse', label: 'Mice' },
          { id: 'c-ac-keyboard', label: 'Keyboards' },
          { id: 'c-ac-webcam', label: 'Webcams' },
          { id: 'c-ac-cable', label: 'Cables & Hubs' },
        ],
      },
      { id: 'c-games', label: 'Game Zone' },
      {
        id: 'c-monitors',
        label: 'Monitors',
        children: [
          { id: 'c-mo-all', label: 'All Monitors' },
          { id: 'c-mo-gaming', label: 'Gaming Monitors' },
          { id: 'c-mo-ultrawide', label: 'Ultrawide Monitors' },
          { id: 'c-mo-prof', label: 'Professional Monitors' },
        ],
      },
      {
        id: 'c-desktops',
        label: 'Desktops',
        children: [
          { id: 'c-dt-all', label: 'All Desktops' },
          { id: 'c-dt-tower', label: 'Tower PCs' },
          { id: 'c-dt-mini', label: 'Mini PCs' },
          { id: 'c-dt-aio', label: 'All-in-One PCs' },
        ],
      },
      {
        id: 'c-components',
        label: 'Components',
        children: [
          { id: 'c-cp-all', label: 'All Components' },
          { id: 'c-cp-cpu', label: 'Processors' },
          { id: 'c-cp-gpu', label: 'Graphics Cards' },
          { id: 'c-cp-ram', label: 'RAM' },
          { id: 'c-cp-mobo', label: 'Motherboards' },
          { id: 'c-cp-psu', label: 'Power Supplies' },
          { id: 'c-cp-case', label: 'PC Cases & Cooling' },
        ],
      },
      { id: 'c-electronics', label: 'All Electronics' },
    ],
  },
  {
    id: 'tv',
    label: 'TV, Appliances, Electronics',
    menuTitle: 'TV & Appliances',
    children: [
      { id: 'tv-all', label: 'All TVs & Appliances' },
      {
        id: 'tv-led',
        label: 'LED & Smart TVs',
        children: [
          { id: 'tv-led-all', label: 'All TVs' },
          { id: 'tv-led-4k', label: '4K Ultra HD' },
          { id: 'tv-led-oled', label: 'OLED TVs' },
          { id: 'tv-led-qled', label: 'QLED TVs' },
        ],
      },
      {
        id: 'tv-audio',
        label: 'Home Audio & Speakers',
        children: [
          { id: 'tv-au-all', label: 'All Audio' },
          { id: 'tv-au-soundbar', label: 'Soundbars' },
          { id: 'tv-au-home', label: 'Home Theatre Systems' },
          { id: 'tv-au-speaker', label: 'Speakers' },
        ],
      },
      {
        id: 'tv-kitchen',
        label: 'Kitchen Appliances',
        children: [
          { id: 'tv-ki-all', label: 'All Kitchen' },
          { id: 'tv-ki-microwave', label: 'Microwave Ovens' },
          { id: 'tv-ki-mixer', label: 'Mixer Grinders' },
          { id: 'tv-ki-air', label: 'Air Fryers' },
        ],
      },
      { id: 'tv-small', label: 'Small Appliances' },
      { id: 'tv-ac', label: 'Air Conditioners' },
      { id: 'tv-ref', label: 'Refrigerators' },
      { id: 'tv-wash', label: 'Washing Machines' },
    ],
  },
  {
    id: 'mens-fashion',
    label: "Men's Fashion",
    menuTitle: "Men's Fashion",
    children: [
      { id: 'mf-all', label: 'All Clothing' },
      {
        id: 'mf-shirts',
        label: 'Shirts & T-Shirts',
        children: [
          { id: 'mf-sh-all', label: 'All Shirts' },
          { id: 'mf-sh-casual', label: 'Casual Shirts' },
          { id: 'mf-sh-formal', label: 'Formal Shirts' },
          { id: 'mf-sh-tshirt', label: 'T-Shirts & Polos' },
        ],
      },
      { id: 'mf-trousers', label: 'Jeans & Trousers' },
      {
        id: 'mf-footwear',
        label: 'Footwear',
        children: [
          { id: 'mf-ft-all', label: 'All Footwear' },
          { id: 'mf-ft-sports', label: 'Sports Shoes' },
          { id: 'mf-ft-casual', label: 'Casual Shoes' },
          { id: 'mf-ft-formal', label: 'Formal Shoes' },
          { id: 'mf-ft-sandals', label: 'Sandals & Floaters' },
        ],
      },
      { id: 'mf-watches', label: 'Watches' },
      { id: 'mf-bags', label: 'Bags & Wallets' },
      { id: 'mf-inner', label: 'Innerwear' },
      { id: 'mf-winter', label: 'Winterwear' },
    ],
  },
  {
    id: 'womens-fashion',
    label: "Women's Fashion",
    menuTitle: "Women's Fashion",
    dividerAfter: true,
    children: [
      { id: 'wf-all', label: 'All Clothing' },
      {
        id: 'wf-ethnic',
        label: 'Ethnic Wear',
        children: [
          { id: 'wf-e-all', label: 'All Ethnic' },
          { id: 'wf-e-saree', label: 'Sarees' },
          { id: 'wf-e-suit', label: 'Salwar Suits' },
          { id: 'wf-e-kurti', label: 'Kurtis & Kurtas' },
        ],
      },
      {
        id: 'wf-western',
        label: 'Western Wear',
        children: [
          { id: 'wf-w-all', label: 'All Western' },
          { id: 'wf-w-dress', label: 'Dresses' },
          { id: 'wf-w-top', label: 'Tops & Tees' },
          { id: 'wf-w-jeans', label: 'Jeans & Jeggings' },
        ],
      },
      {
        id: 'wf-footwear',
        label: 'Footwear',
        children: [
          { id: 'wf-f-all', label: 'All Footwear' },
          { id: 'wf-f-heels', label: 'Heels' },
          { id: 'wf-f-flats', label: 'Flats & Bellies' },
          { id: 'wf-f-sports', label: 'Sports Shoes' },
        ],
      },
      { id: 'wf-jewelry', label: 'Jewelry' },
      { id: 'wf-handbags', label: 'Handbags & Clutches' },
    ],
  },
  {
    id: 'home-kitchen',
    label: 'Home, Kitchen, Pets',
    menuTitle: 'Home & Kitchen',
    children: [
      {
        id: 'hk-furniture',
        label: 'Furniture',
        children: [
          { id: 'hk-fu-all', label: 'All Furniture' },
          { id: 'hk-fu-living', label: 'Living Room' },
          { id: 'hk-fu-bedroom', label: 'Bedroom' },
          { id: 'hk-fu-office', label: 'Office Furniture' },
        ],
      },
      {
        id: 'hk-cookware',
        label: 'Cookware & Dining',
        children: [
          { id: 'hk-co-all', label: 'All Cookware' },
          { id: 'hk-co-pots', label: 'Pots & Pans' },
          { id: 'hk-co-dine', label: 'Dinnerware' },
          { id: 'hk-co-storage', label: 'Kitchen Storage' },
        ],
      },
      { id: 'hk-decor', label: 'Home Décor' },
      {
        id: 'hk-pets',
        label: 'Pet Supplies',
        children: [
          { id: 'hk-p-all', label: 'All Pet Supplies' },
          { id: 'hk-p-dog', label: 'Dogs' },
          { id: 'hk-p-cat', label: 'Cats' },
          { id: 'hk-p-bird', label: 'Birds & Small Pets' },
        ],
      },
      { id: 'hk-bedding', label: 'Bedding & Linen' },
      { id: 'hk-bath', label: 'Bath & Cleaning' },
    ],
  },
  {
    id: 'beauty',
    label: 'Beauty, Health, Grocery',
    menuTitle: 'Beauty & Health',
    children: [
      {
        id: 'b-makeup',
        label: 'Makeup',
        children: [
          { id: 'b-mu-all', label: 'All Makeup' },
          { id: 'b-mu-face', label: 'Face' },
          { id: 'b-mu-eye', label: 'Eyes' },
          { id: 'b-mu-lip', label: 'Lips' },
        ],
      },
      {
        id: 'b-skin',
        label: 'Skin Care',
        children: [
          { id: 'b-sk-all', label: 'All Skin Care' },
          { id: 'b-sk-clean', label: 'Cleansers' },
          { id: 'b-sk-moist', label: 'Moisturizers' },
          { id: 'b-sk-sun', label: 'Sunscreen' },
        ],
      },
      { id: 'b-health', label: 'Health & Wellness' },
      {
        id: 'b-grocery',
        label: 'Grocery',
        children: [
          { id: 'b-g-all', label: 'All Grocery' },
          { id: 'b-g-snack', label: 'Snacks & Beverages' },
          { id: 'b-g-staple', label: 'Staples' },
        ],
      },
    ],
  },
  {
    id: 'sports',
    label: 'Sports, Fitness, Bags, Luggage',
    menuTitle: 'Sports & Fitness',
    children: [
      { id: 's-cricket', label: 'Cricket' },
      {
        id: 's-fitness',
        label: 'Fitness Equipment',
        children: [
          { id: 's-fi-all', label: 'All Fitness' },
          { id: 's-fi-cardio', label: 'Cardio' },
          { id: 's-fi-strength', label: 'Strength Training' },
          { id: 's-fi-yoga', label: 'Yoga & Pilates' },
        ],
      },
      { id: 's-outdoor', label: 'Outdoor Recreation' },
      {
        id: 's-bags',
        label: 'Bags & Luggage',
        children: [
          { id: 's-b-all', label: 'All Bags' },
          { id: 's-b-backpack', label: 'Backpacks' },
          { id: 's-b-trolley', label: 'Trolley Bags' },
          { id: 's-b-duffel', label: 'Duffel & Gym Bags' },
        ],
      },
      { id: 's-cycling', label: 'Cycling' },
      { id: 's-team', label: 'Team Sports' },
    ],
  },
  {
    id: 'toys',
    label: "Toys, Baby Products, Kids' Fashion",
    menuTitle: 'Toys & Baby',
    children: [
      {
        id: 't-toys',
        label: 'Toys & Games',
        children: [
          { id: 't-to-all', label: 'All Toys' },
          { id: 't-to-action', label: 'Action Figures' },
          { id: 't-to-board', label: 'Board Games' },
          { id: 't-to-remote', label: 'Remote Control Toys' },
        ],
      },
      {
        id: 't-baby',
        label: 'Baby Products',
        children: [
          { id: 't-b-all', label: 'All Baby' },
          { id: 't-b-diaper', label: 'Diapers & Wipes' },
          { id: 't-b-feed', label: 'Feeding & Nursing' },
          { id: 't-b-gear', label: 'Strollers & Gear' },
        ],
      },
      {
        id: 't-kids',
        label: "Kids' Fashion",
        children: [
          { id: 't-k-all', label: "All Kids' Fashion" },
          { id: 't-k-boy', label: 'Boys Clothing' },
          { id: 't-k-girl', label: 'Girls Clothing' },
        ],
      },
    ],
  },
  {
    id: 'car',
    label: 'Car, Motorbike, Industrial',
    menuTitle: 'Automotive & Industrial',
    children: [
      {
        id: 'car-accessories',
        label: 'Car Accessories',
        children: [
          { id: 'car-a-all', label: 'All Accessories' },
          { id: 'car-a-interior', label: 'Interior Accessories' },
          { id: 'car-a-exterior', label: 'Exterior Accessories' },
          { id: 'car-a-electronics', label: 'Car Electronics' },
        ],
      },
      { id: 'car-care', label: 'Car Care' },
      { id: 'car-bike', label: 'Motorbike Accessories' },
      {
        id: 'car-industrial',
        label: 'Industrial Supplies',
        children: [
          { id: 'car-i-all', label: 'All Industrial' },
          { id: 'car-i-tools', label: 'Tools & Hardware' },
          { id: 'car-i-safety', label: 'Safety Equipment' },
        ],
      },
    ],
  },
  {
    id: 'books',
    label: 'Books',
    menuTitle: 'Books',
    children: [
      {
        id: 'bk-fiction',
        label: 'Fiction',
        children: [
          { id: 'bk-f-all', label: 'All Fiction' },
          { id: 'bk-f-lit', label: 'Literature' },
          { id: 'bk-f-crime', label: 'Crime & Mystery' },
          { id: 'bk-f-romance', label: 'Romance' },
        ],
      },
      {
        id: 'bk-nonfic',
        label: 'Non-Fiction',
        children: [
          { id: 'bk-n-all', label: 'All Non-Fiction' },
          { id: 'bk-n-bio', label: 'Biographies' },
          { id: 'bk-n-self', label: 'Self-Help' },
        ],
      },
      { id: 'bk-edu', label: 'Textbooks & Exam Prep' },
      { id: 'bk-kids', label: "Children's Books" },
    ],
  },
  {
    id: 'movies',
    label: 'Movies, Music & Video Games',
    menuTitle: 'Movies, Music & Games',
    children: [
      {
        id: 'mv-movies',
        label: 'Movies & TV',
        children: [
          { id: 'mv-mo-all', label: 'All Movies & TV' },
          { id: 'mv-mo-blu', label: 'Blu-ray & DVD' },
          { id: 'mv-mo-box', label: 'Box Sets' },
        ],
      },
      {
        id: 'mv-music',
        label: 'Music',
        children: [
          { id: 'mv-mu-all', label: 'All Music' },
          { id: 'mv-mu-cd', label: 'CDs & Vinyl' },
          { id: 'mv-mu-instr', label: 'Instruments' },
        ],
      },
      {
        id: 'mv-games',
        label: 'Video Games',
        children: [
          { id: 'mv-g-all', label: 'All Games' },
          { id: 'mv-g-console', label: 'Console Games' },
          { id: 'mv-g-pc', label: 'PC Games' },
          { id: 'mv-g-acc', label: 'Gaming Accessories' },
        ],
      },
    ],
  },
]

/**
 * @param {CategoryNode[]} tree
 * @param {string[]} pathIds - ancestor ids from root
 * @returns {{ level: 'root' | 'sub', sectionTitle: string, items: CategoryNode[], parentIds: string[] }}
 */
export function getCategoryLevel(tree, pathIds) {
  if (!pathIds.length) {
    return { level: 'root', sectionTitle: 'Shop by Category', items: tree, parentIds: [] }
  }
  let level = tree
  let node = null
  for (let i = 0; i < pathIds.length; i++) {
    const id = pathIds[i]
    node = level.find((n) => n.id === id)
    if (!node) {
      return { level: 'root', sectionTitle: 'Shop by Category', items: tree, parentIds: [] }
    }
    level = node.children || []
  }
  return {
    level: 'sub',
    sectionTitle: node.menuTitle || node.label,
    items: level,
    parentIds: pathIds.slice(0, -1),
  }
}

/**
 * @param {CategoryNode[]} tree
 * @param {string} id
 * @returns {CategoryNode | null}
 */
export function findCategoryNode(tree, id) {
  for (const n of tree) {
    if (n.id === id) return n
    if (n.children?.length) {
      const found = findCategoryNode(n.children, id)
      if (found) return found
    }
  }
  return null
}

export function normalizeCategoryName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/moblie/g, 'mobile')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function slugifyCategoryLabel(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Match a top-level tree node by label, menu title, or id. */
export function findTopLevelCategoryByName(tree, parentName) {
  if (!parentName?.trim()) return null
  const needle = normalizeCategoryName(parentName)
  return (
    tree.find(
      (node) =>
        normalizeCategoryName(node.label) === needle ||
        normalizeCategoryName(node.menuTitle || node.label) === needle ||
        normalizeCategoryName(node.id) === needle,
    ) ?? null
  )
}

/**
 * Merge admin-approved category requests into the static shop tree.
 * @param {CategoryNode[]} baseTree
 * @param {Array<{ requestType?: string, categoryName?: string, parentCategoryName?: string|null, id?: string }>} approvedRequests
 */
export function mergeApprovedCategoryRequests(baseTree, approvedRequests = []) {
  const tree = structuredClone(baseTree)

  for (const req of approvedRequests) {
    const name = req?.categoryName?.trim()
    if (!name) continue

    const nodeId = `approved-${slugifyCategoryLabel(name)}`

    if (req.requestType === 'SUBCATEGORY') {
      const parent = findTopLevelCategoryByName(tree, req.parentCategoryName)
      if (!parent) continue
      parent.children = parent.children ?? []
      const exists = parent.children.some(
        (child) => normalizeCategoryName(child.label) === normalizeCategoryName(name),
      )
      if (exists) continue
      parent.children.push({ id: nodeId, label: name, approved: true })
      continue
    }

    const existsTop = tree.some(
      (node) => normalizeCategoryName(node.label) === normalizeCategoryName(name),
    )
    if (existsTop) continue
    tree.push({
      id: nodeId,
      label: name,
      menuTitle: name,
      children: [],
      approved: true,
    })
  }

  return tree
}
