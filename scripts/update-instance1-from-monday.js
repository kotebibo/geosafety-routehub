/**
 * update-instance1-from-monday.js
 *
 * Full refresh of first instance boards from Monday.com:
 *   1. კომპანიები — contracts from 3 Monday boards
 *   2. ინსპექტორები / ლოკაციები — inspector items grouped by inspector
 *   3. შემაჯამებელი — aggregated inspector totals
 *   4. Subitems on კომპანიები — inspector assignments per contract
 *   5. შეუთავსებელი კომპანიები — companies with no inspector match
 *   6. კოორდინატები - ინსპექტორები — GPS coordinates
 *
 * Retains all status column configs (options + colors).
 * Run: node scripts/update-instance1-from-monday.js
 */

require('dotenv').config({ path: 'apps/web/.env.local' });
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const CONTRACT_TOKEN = process.env.MONDAY_API_TOKEN;
const INSPECTOR_TOKEN = process.env.MONDAY_API_TOKEN_INSPECTORS;

// Monday contract board IDs
const CONTRACT_BOARDS = [
  { id: '1021299505', name: 'ჯეო სეიფთი' },
  { id: '2478314925', name: 'სეიფთი ქორფ' },
  { id: '6695638834', name: 'ბლექ სი სეიფთი' },
];

const CONTRACT_COL_MAP = {
  'ს/კ': 'sk',
  'სტატუსი': 'status',
  'გაფორმების თარიღი': 'start_date',
  'გაფორმების  თარიღი': 'start_date',
  'დასრულების თარიღი': 'end_date',
  'ყოველთვიური გადასახადი': 'monthly',
  'ინვოისის თანხა': 'invoice_amount',
  'აქტების თანხა': 'act_amount',
  'დღგ': 'vat',
  'გადახდის წესი': 'payment_method',
  'გაყიდვების მენეჯერი': 'sales_manager',
  'დღგ სტატუსი': 'vat_status',
  'ინვოისის სიხშირე': 'payment_frequency',
  'მიმღები ბანკი': 'bank',
  'მისამართი': 'address',
  'დირექტორი': 'director',
  'საკონტაქტო ნომერი': 'phone',
  'მეილი': 'email',
};

const skipPatterns = ['Subitems', 'Подэлементы', 'Start from scratch', 'kotes test',
  'Activities', 'Deals', 'Client Projects', 'Accounts', 'Contacts', 'Leads',
  'ნომრები', 'ბიბლიოთეკა', 'ქსელური კომპანიები-გეგმარება'];

// Boards to completely omit from import
const OMIT_BOARDS = [
  'ბორდი ოკ', 'ერთჯერადი მომსახურებები და გაზომვები', 'ერთჯერადი -დასრულებული',
  'შეწყვეტილი - HACCP', 'შეწყვეტილი  ქსელური ობიექტები', 'შეწყვეტილი-შეჩერებული  ობიექტები',
  'ქსელურები', 'სახანძრო მიმართულბა', 'HACCP',
  'შრომის ინსპექციის მიერ გაცემული მითითებები', 'ადგილზე მდგომი სპეციალისტები',
];

// Category boards where group name = inspector name (not the board name)
const USE_GROUP_NAME_BOARDS = [
  'მშენებლობა',
  'მძიმე მრეწველობა და სამთო ობიექტები',
  'მსუბუქი მრეწველობა და მომსახურება',
  'პერსონალური მონაცემების დაცვა',
  'აჭარა',
];

// Groups to skip inside category boards (not inspector names)
const SKIP_GROUPS = [
  'New Group', 'Group Title', 'ობიექტები',
  'შეჩერებული ან ველოდებით კომპანიას', 'შეჩერებული დროებით', 'შეჩერებულები',
  'ადგილზე მდგომი სპეციალისტების ობიექტები',
  'განმეორებითი ვიზიტები', 'ახალი კონტრაქტები', 'პროცესში', 'ერთჯერადები', 'სპარი/იოლი',
];

// Statuses that mean the contract is inactive — exclude from analytics
const EXCLUDED_STATUSES = ['შეწყვეტილი', 'შეჩერებულია', 'წყდება', 'შეჩერებული_(სეზონზე)'];

// Status column configs (preserved on every import, matched with instance 2)
const STATUS_OPTIONS = [
  // Core service types
  { key: 'შრომის_უსაფრთხოება', label: 'შრომის უსაფრთხოება', color: 'grass_green' },
  { key: 'სურსათის_უვნებლობა', label: 'სურსათის უვნებლობა', color: 'done_green' },
  { key: 'პერსონალური_მონაცემების_დაცვა', label: 'პერსონალური მონაცემების დაცვა', color: 'purple' },
  { key: 'შრომითი_უფლებები', label: 'შრომითი უფლებები', color: 'working_orange' },
  { key: 'იურიდიული_აუთსორსი', label: 'იურიდიული აუთსორსი', color: 'indigo' },
  // Combo service types
  { key: 'შრომის_უსაფრთხოება_და_სურსათის_უვნებლობა', label: 'შრომის უსაფრთხოება და სურსათის უვნებლობა', color: 'bright_green' },
  { key: 'შრომის_უსაფრთხოება_და_პერსონალური_მონაცემების_დაცვა', label: 'შრომის უსაფრთხოება და პერსონალური მონაცემების დაცვა', color: 'saladish' },
  { key: 'შრომის_უსაფრთხოება_შრომითი_უფლებები_და_სურსათის_უვნებლობა', label: 'შრომის უსაფრთხოება, შრომითი უფლებები და სურსათის უვნებლობა', color: 'lipstick' },
  { key: 'შრომის_უსაფრთხოება_და_გარემოს_დაცვა', label: 'შრომის უსაფრთხოება და გარემოს დაცვა', color: 'dark_orange' },
  // HACCP variants
  { key: 'სურსათის_უვნებლობა_(HACCP)', label: 'სურსათის უვნებლობა (HACCP)', color: 'lime_green' },
  { key: 'შრომის_უსაფრთხოება_და_სურსათის_უვნებლობა_(HACCP)', label: 'შრომის უსაფრთხოება და სურსათის უვნებლობა (HACCP)', color: 'egg_yolk' },
  { key: 'შრომის_უსაფრთხოება,_სურსათის_უვნებლობა_(HACCP),_პერსონალური_მონაცემების_დაცვა', label: 'შრომის უსაფრთხოება, სურსათის უვნებლობა (HACCP), პერსონალური მონაცემების დაცვა', color: 'sofia_pink' },
  // Typo variant from Monday (პერონალური instead of პერსონალური)
  { key: 'პერონალური_მონაცემების_დაცვა', label: 'პერსონალური მონაცემების დაცვა', color: 'purple' },
  // Status states
  { key: 'გასარკვევია', label: 'გასარკვევია', color: 'explosive' },
  { key: 'შეჩერებული_(სეზონზე)', label: 'შეჩერებული (სეზონზე)', color: 'winter' },
  { key: 'წყდება', label: 'წყდება', color: 'stuck_red' },
];

const PAYMENT_OPTIONS = [
  { key: 'წინასწარ', label: 'წინასწარ', color: 'grass_green' },
  { key: 'წინასწარი', label: 'წინასწარი', color: 'grass_green' },
  { key: 'მომდევნო_თვე', label: 'მომდევნო თვე', color: 'working_orange' },
  { key: 'ნაწილნაწილ', label: 'ნაწილნაწილ', color: 'purple' },
  { key: 'ნაწილ-ნაწილ', label: 'ნაწილ-ნაწილ', color: 'purple' },
  { key: 'ერთიანი_გადახდით', label: 'ერთიანი გადახდით', color: 'bright_blue' },
  { key: 'უსასყიდლო', label: 'უსასყიდლო', color: 'dark_indigo' },
];

const PAYMENT_FREQUENCY_OPTIONS = [
  { key: 'ყოველთვე', label: 'ყოველთვე', color: 'grass_green' },
  { key: 'წელიწადში_1', label: 'წელიწადში 1-ჯერ', color: 'working_orange' },
  { key: 'წელიწადში_2', label: 'წელიწადში 2-ჯერ', color: 'purple' },
  { key: 'წელიწადში_3', label: 'წელიწადში 3-ჯერ', color: 'bright_blue' },
  { key: 'წელიწადში_4', label: 'წელიწადში 4-ჯერ', color: 'indigo' },
];

const VAT_STATUS_OPTIONS = [
  { key: 'დღგ_ს_იხდის', label: 'დღგ-ს იხდის', color: 'grass_green' },
  { key: 'დღგ_ს_არ_იხდის', label: 'დღგ-ს არ იხდის', color: 'stuck_red' },
];

const BANK_OPTIONS = [
  { key: 'საქართველოს_ბანკი', label: 'საქართველოს ბანკი', color: 'bright_blue' },
  { key: 'თიბისი', label: 'თიბისი', color: 'stuck_red' },
];

// Service type UUIDs from the service_types table
const SVC_LABOR    = '9d4596d6-67cb-4dae-a1c9-f084ffc8023c'; // შრომის უსაფრთხოება
const SVC_FOOD     = 'a35438f5-3f7e-4e54-954d-f5a0c94882cc'; // სურსათის უვნებლობა
const SVC_PERSONAL = '5cb482b5-6077-43cb-b906-116517049754'; // პერსონალური მონაცემების დაცვა
const SVC_RIGHTS   = 'deb876b3-0152-4e8a-b81d-5441d50dfd30'; // შრომითი უფლებები
const SVC_LEGAL    = 'b5f554a0-4a66-4ab7-860f-f32321b02ee4'; // იურიდიული აუთსორსი

/**
 * Derive service type UUIDs from a compound status value.
 * e.g. 'შრომის_უსაფრთხოება_და_სურსათის_უვნებლობა' → [SVC_LABOR, SVC_FOOD]
 */
function getServicesFromStatus(status) {
  if (!status) return [];
  const services = [];
  if (status.includes('შრომის_უსაფრთხოება')) {
    services.push(SVC_LABOR);
  }
  if (status.includes('შრომითი_უფლებები')) {
    if (!services.includes(SVC_LABOR)) services.push(SVC_LABOR);
    services.push(SVC_RIGHTS);
  }
  if (status.includes('სურსათის_უვნებლობა')) {
    services.push(SVC_FOOD);
  }
  if (status.includes('პერსონალური_მონაცემების_დაცვა') || status.includes('პერონალური_მონაცემების_დაცვა')) {
    services.push(SVC_PERSONAL);
  }
  if (status.includes('იურიდიული_აუთსორსი')) {
    services.push(SVC_LEGAL);
  }
  return services;
}

// ── Monday API helpers ──

async function mondayQuery(token, query, variables = {}) {
  const res = await fetch('https://api.monday.com/v2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: token },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}

async function fetchAllItems(token, boardId) {
  let allItems = [];
  const first = await mondayQuery(token, `
    query($boardId: [ID!]!) {
      boards(ids: $boardId) {
        columns { id title type }
        groups { id title }
        items_page(limit: 500) {
          cursor
          items { id name group { id title } column_values { id text value type column { title } } }
        }
      }
    }
  `, { boardId: [boardId] });

  const board = first.boards[0];
  allItems = board.items_page.items;
  let cursor = board.items_page.cursor;

  while (cursor) {
    const next = await mondayQuery(token, `
      query($cursor: String!) {
        next_items_page(limit: 500, cursor: $cursor) {
          cursor
          items { id name group { id title } column_values { id text value type column { title } } }
        }
      }
    `, { cursor });
    allItems = allItems.concat(next.next_items_page.items);
    cursor = next.next_items_page.cursor;
  }

  return { columns: board.columns, groups: board.groups, items: allItems };
}

function extractValue(cv) {
  const text = (cv.text || '').trim();

  if (cv.type === 'status' || cv.type === 'color') {
    if (cv.value) {
      try {
        const parsed = JSON.parse(cv.value);
        if (parsed.label) return parsed.label.replace(/\s+/g, '_');
      } catch {}
    }
    return text.replace(/\s+/g, '_');
  }

  if (cv.type === 'date') {
    if (cv.value) {
      try {
        const parsed = JSON.parse(cv.value);
        return parsed.date || text;
      } catch {}
    }
    return text;
  }

  if (cv.type === 'numeric' || cv.type === 'numbers') {
    const num = parseFloat(text.replace(/,/g, ''));
    return isNaN(num) ? 0 : num;
  }

  if (cv.type === 'formula') {
    const num = parseFloat(text.replace(/,/g, ''));
    return isNaN(num) ? text : num;
  }

  return text;
}

async function batchInsert(table, items, batchSize = 200) {
  let inserted = 0;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const { error } = await sb.from(table).insert(batch);
    if (error) throw error;
    inserted += batch.length;
    process.stdout.write(`\r  Inserted ${inserted}/${items.length}`);
  }
  console.log('');
  return inserted;
}

// ── Step 1: Fetch contracts ──

async function fetchContracts() {
  console.log('\n=== Step 1: Fetching contracts from Monday ===\n');
  const allContracts = [];

  for (const board of CONTRACT_BOARDS) {
    console.log(`Fetching ${board.name} (${board.id})...`);
    const { items } = await fetchAllItems(CONTRACT_TOKEN, board.id);
    console.log(`  ${items.length} items`);

    for (const item of items) {
      const data = { source_board: board.name };
      let sk = '';

      for (const cv of item.column_values) {
        const title = cv.column?.title || '';
        const key = CONTRACT_COL_MAP[title];
        if (key) {
          data[key] = extractValue(cv);
          if (key === 'sk') sk = data[key];
        }
      }

      for (const numKey of ['act_amount', 'monthly', 'invoice_amount', 'vat']) {
        if (typeof data[numKey] === 'string') data[numKey] = parseFloat(data[numKey]) || 0;
      }

      allContracts.push({ name: item.name, group: item.group?.title || '', sk, data });
    }
  }

  console.log(`Total contracts: ${allContracts.length}`);
  return allContracts;
}

// ── Step 2: Fetch inspector items ──

async function fetchInspectorItems() {
  console.log('\n=== Step 2: Fetching inspector boards from Monday ===\n');

  let allBoards = [];
  let page = 1;
  while (true) {
    const data = await mondayQuery(INSPECTOR_TOKEN, `{ boards(limit: 100, page: ${page}) { id name } }`);
    if (!data.boards || data.boards.length === 0) break;
    allBoards = allBoards.concat(data.boards);
    if (data.boards.length < 100) break;
    page++;
  }

  const inspectorBoards = allBoards.filter(b =>
    !skipPatterns.some(p => b.name.includes(p)) && !OMIT_BOARDS.includes(b.name)
  );
  console.log(`Inspector boards: ${inspectorBoards.length} (omitted ${OMIT_BOARDS.length})`);

  const inspectorItems = [];
  const useGroupName = new Set(USE_GROUP_NAME_BOARDS);
  const skipGroupSet = new Set(SKIP_GROUPS);

  for (const board of inspectorBoards) {
    process.stdout.write(`  ${board.name}...`);
    const isGroupBoard = useGroupName.has(board.name);
    try {
      const { items } = await fetchAllItems(INSPECTOR_TOKEN, board.id);
      let count = 0;
      for (const item of items) {
        const groupName = item.group?.title || '';

        // For category boards, skip non-inspector groups
        if (isGroupBoard && skipGroupSet.has(groupName)) continue;

        const skCol = item.column_values.find(cv =>
          /ს\/კ|საიდენტიფიკაციო/.test(cv.column?.title || '')
        );
        const saqCol = item.column_values.find(cv =>
          /საქმიანობა/.test(cv.column?.title || '')
        );
        const sk = (skCol?.text || '').trim();
        if (!sk) continue;

        // Use group name as inspector for category boards, board name otherwise
        const inspector = isGroupBoard ? groupName : board.name;

        inspectorItems.push({
          name: item.name,
          sk,
          saqmianoba: (saqCol?.text || '').trim(),
          inspector,
        });
        count++;
      }
      console.log(` ${count}`);
    } catch (err) {
      console.log(` ERROR: ${err.message}`);
    }
  }

  console.log(`Total inspector items with ს/კ: ${inspectorItems.length}`);
  return inspectorItems;
}

// ── Step 3: Fetch coordinates ──

async function fetchCoordinates(inspectorBoards) {
  console.log('\n=== Step 3: Collecting coordinates ===\n');

  // Re-fetch boards to get column info for coordinate columns
  let allBoards = [];
  let page = 1;
  while (true) {
    const data = await mondayQuery(INSPECTOR_TOKEN, `{ boards(limit: 100, page: ${page}) { id name } }`);
    if (!data.boards || data.boards.length === 0) break;
    allBoards = allBoards.concat(data.boards);
    if (data.boards.length < 100) break;
    page++;
  }

  const boards = allBoards.filter(b =>
    !skipPatterns.some(p => b.name.includes(p)) && !OMIT_BOARDS.includes(b.name)
  );

  const coordItems = [];
  const useGroupName = new Set(USE_GROUP_NAME_BOARDS);
  const skipGroupSet = new Set(SKIP_GROUPS);

  for (const board of boards) {
    process.stdout.write(`  ${board.name}...`);
    const isGroupBoard = useGroupName.has(board.name);
    try {
      const { items, columns } = await fetchAllItems(INSPECTOR_TOKEN, board.id);
      // Find coordinate column by title
      const coordCol = columns.find(c =>
        /კო+რდინატ|coordinate|GPS/i.test(c.title)
      );
      if (!coordCol) {
        console.log(' no coord column');
        continue;
      }

      let count = 0;
      for (const item of items) {
        const groupName = item.group?.title || '';
        if (isGroupBoard && skipGroupSet.has(groupName)) continue;

        const cv = item.column_values.find(v => v.id === coordCol.id);
        const raw = (cv?.text || '').trim();
        if (!raw) continue;

        const skCol = item.column_values.find(v =>
          /ს\/კ|საიდენტიფიკაციო/.test(v.column?.title || '')
        );

        const parsed = parseCoordinates(raw);
        if (!parsed) continue;

        const inspector = isGroupBoard ? groupName : board.name;

        coordItems.push({
          name: item.name,
          inspector,
          coordinates: raw,
          lat: parsed.lat,
          lng: parsed.lng,
          sk: (skCol?.text || '').trim(),
        });
        count++;
      }
      console.log(` ${count}`);
    } catch (err) {
      console.log(` ERROR`);
    }
  }

  console.log(`Total coordinates: ${coordItems.length}`);
  return coordItems;
}

function parseCoordinates(raw) {
  // Google Maps URL with query param: ?query=lat,lng
  let match = raw.match(/query=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (match) return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };

  // Google Maps URL: /@lat,lng
  match = raw.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (match) return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };

  // ll=lat,lng
  match = raw.match(/ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (match) return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };

  // DMS format: N 42°15'13.26096" / E 42°41'41.20224"
  const latDms = raw.match(/[NS]\s*(\d+)°(\d+)'([\d.]+)"/);
  const lngDms = raw.match(/[EW]\s*(\d+)°(\d+)'([\d.]+)"/);
  if (latDms && lngDms) {
    let lat = parseInt(latDms[1]) + parseInt(latDms[2]) / 60 + parseFloat(latDms[3]) / 3600;
    let lng = parseInt(lngDms[1]) + parseInt(lngDms[2]) / 60 + parseFloat(lngDms[3]) / 3600;
    if (raw.includes('S')) lat = -lat;
    if (raw.includes('W')) lng = -lng;
    return { lat: Math.round(lat * 1e7) / 1e7, lng: Math.round(lng * 1e7) / 1e7 };
  }

  // Cyrillic DMS: Широта: N 42°... Долгота: E 42°...
  const latCyr = raw.match(/[NS]\s*(\d+)[°](\d+)'([\d.]+)"/);
  const lngCyr = raw.match(/[EW]\s*(\d+)[°](\d+)'([\d.]+)"/);
  if (latCyr && lngCyr && latCyr !== latDms) {
    let lat = parseInt(latCyr[1]) + parseInt(latCyr[2]) / 60 + parseFloat(latCyr[3]) / 3600;
    let lng = parseInt(lngCyr[1]) + parseInt(lngCyr[2]) / 60 + parseFloat(lngCyr[3]) / 3600;
    return { lat: Math.round(lat * 1e7) / 1e7, lng: Math.round(lng * 1e7) / 1e7 };
  }

  // Plain "lat, lng" or "lat lng"
  match = raw.match(/^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/);
  if (match) return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };

  // Semicolon or dot separated: "41.447170 ; 45.097715" or "41.491203. 44.795587"
  match = raw.match(/(-?\d+\.\d+)\s*[;.]\s+(-?\d+\.\d+)/);
  if (match) return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };

  return null;
}

// ── Step 4: Write to Supabase ──

async function writeCompaniesBoard(contracts, inspectorItems, workspaceId, ownerId) {
  console.log('\n=== Step 4: Writing კომპანიები board ===\n');

  const skToInspectors = {};
  for (const item of inspectorItems) {
    if (!skToInspectors[item.sk]) skToInspectors[item.sk] = [];
    skToInspectors[item.sk].push(item);
  }

  let enriched = 0;
  for (const contract of contracts) {
    if (contract.sk && skToInspectors[contract.sk]) {
      const saq = skToInspectors[contract.sk].find(i => i.saqmianoba);
      if (saq) { contract.data.saqmianoba = saq.saqmianoba; enriched++; }
    }
  }
  console.log(`Enriched ${enriched}/${contracts.length} with საქმიანობა`);

  // Collect any new status values from the data
  const seenStatuses = new Set(STATUS_OPTIONS.map(o => o.key));
  const seenPayments = new Set(PAYMENT_OPTIONS.map(o => o.key));
  const newStatuses = [...STATUS_OPTIONS];
  const newPayments = [...PAYMENT_OPTIONS];

  for (const c of contracts) {
    const s = c.data.status;
    if (s && !seenStatuses.has(s)) {
      seenStatuses.add(s);
      newStatuses.push({ key: s, label: s.replace(/_/g, ' '), color: 'grey' });
      console.log(`  New status option found: ${s}`);
    }
    const p = c.data.payment_method;
    if (p && !seenPayments.has(p)) {
      seenPayments.add(p);
      newPayments.push({ key: p, label: p.replace(/_/g, ' '), color: 'grey' });
      console.log(`  New payment option found: ${p}`);
    }
  }

  const { data: existing } = await sb.from('boards').select('id').eq('name', 'კომპანიები').maybeSingle();

  let boardId;
  if (existing) {
    boardId = existing.id;
    console.log(`Board exists: ${boardId}, clearing items/columns/groups...`);
    await sb.from('board_subitems').delete().eq('board_id', boardId);
    await sb.from('board_subitem_columns').delete().eq('board_id', boardId);
    await sb.from('board_items').delete().eq('board_id', boardId);
    await sb.from('board_columns').delete().eq('board_id', boardId);
    await sb.from('board_groups').delete().eq('board_id', boardId);
    await sb.from('boards').update({ workspace_id: workspaceId }).eq('id', boardId);
  } else {
    const { data: newBoard, error } = await sb.from('boards').insert({
      name: 'კომპანიები', board_type: 'custom', owner_id: ownerId, workspace_id: workspaceId,
    }).select('id').single();
    if (error) throw error;
    boardId = newBoard.id;
    console.log(`Created board: ${boardId}`);
  }

  // Columns with preserved status configs
  const columns = [
    { column_id: 'sk', column_name: 'ს/კ', column_type: 'text', position: 1 },
    { column_id: 'status', column_name: 'სტატუსი', column_type: 'status', position: 2,
      config: { options: newStatuses } },
    { column_id: 'start_date', column_name: 'გაფორმების თარიღი', column_type: 'date', position: 3 },
    { column_id: 'end_date', column_name: 'დასრულების თარიღი', column_type: 'date', position: 4 },
    { column_id: 'monthly', column_name: 'ყოველთვიური', column_type: 'number', position: 5 },
    { column_id: 'invoice_amount', column_name: 'ინვოისის თანხა', column_type: 'number', position: 6 },
    { column_id: 'act_amount', column_name: 'აქტების თანხა', column_type: 'number', position: 7 },
    { column_id: 'vat', column_name: 'დღგ', column_type: 'number', position: 8 },
    { column_id: 'payment_method', column_name: 'გადახდის წესი', column_type: 'status', position: 9,
      config: { options: newPayments } },
    { column_id: 'sales_manager', column_name: 'გაყიდვების მენეჯერი', column_type: 'text', position: 10 },
    { column_id: 'service_type', column_name: 'მომსახურების ტიპი', column_type: 'service_type', position: 11 },
    { column_id: 'saqmianoba', column_name: 'საქმიანობა', column_type: 'text', position: 12 },
    { column_id: 'source_board', column_name: 'წყარო', column_type: 'text', position: 13 },
  ].map(c => ({ ...c, board_id: boardId, board_type: 'custom' }));

  const { error: colErr } = await sb.from('board_columns').insert(columns);
  if (colErr) throw colErr;

  // Groups
  const groupNames = [...new Set(contracts.map(c => c.data.source_board))];
  const groups = groupNames.map((name, i) => ({
    board_id: boardId, name, position: i,
    color: ['#00C875', '#FDAB3D', '#E2445C'][i] || '#579BFC',
  }));
  const { data: insertedGroups, error: groupErr } = await sb.from('board_groups').insert(groups).select('id, name');
  if (groupErr) throw groupErr;
  const groupMap = new Map(insertedGroups.map(g => [g.name, g.id]));

  // Derive service_type UUIDs from status for each contract
  let serviceTyped = 0;
  for (const c of contracts) {
    const serviceIds = getServicesFromStatus(c.data.status);
    if (serviceIds.length > 0) {
      c.data.service_type = serviceIds; // Array of service_type UUIDs
      serviceTyped++;
    } else {
      c.data.service_type = [];
    }
  }
  console.log(`Derived service_type for ${serviceTyped}/${contracts.length} contracts`);

  // Items
  const items = contracts.map((c, idx) => ({
    board_id: boardId, name: c.name, position: idx,
    group_id: groupMap.get(c.data.source_board) || null, data: c.data,
  }));
  await batchInsert('board_items', items);

  console.log(`კომპანიები: ${contracts.length} items`);
  return { boardId, skToInspectors };
}

async function writeSubitems(boardId, contracts, skToInspectors) {
  console.log('\n=== Step 5: Writing subitems ===\n');

  // Subitem columns
  const subCols = [
    { board_id: boardId, column_id: 'status', column_name: 'სტატუსი', column_type: 'status', position: 0,
      config: { options: STATUS_OPTIONS } },
    { board_id: boardId, column_id: 'act_amount', column_name: 'აქტების თანხა', column_type: 'number', position: 1 },
    { board_id: boardId, column_id: 'saqmianoba', column_name: 'საქმიანობა', column_type: 'text', position: 2 },
    { board_id: boardId, column_id: 'source_board', column_name: 'წყარო ბორდი', column_type: 'text', position: 3 },
  ];
  const { error: colErr } = await sb.from('board_subitem_columns').insert(subCols);
  if (colErr) throw colErr;

  // Get inserted parent items to get their IDs
  const PAGE = 1000;
  let parentItems = [];
  let from = 0;
  while (true) {
    const { data, error } = await sb.from('board_items')
      .select('id, name, data')
      .eq('board_id', boardId)
      .is('deleted_at', null)
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    parentItems = parentItems.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }

  const allSubitems = [];
  let matchedParents = 0;

  for (const item of parentItems) {
    const sk = (item.data?.sk || '').trim();
    if (!sk || !skToInspectors[sk]) continue;

    const inspItems = skToInspectors[sk];
    matchedParents++;
    const parentStatus = item.data?.status || '';
    const actAmount = item.data?.act_amount || 0;
    const dividedAmount = Math.round((actAmount / inspItems.length) * 100) / 100;

    for (let idx = 0; idx < inspItems.length; idx++) {
      const insp = inspItems[idx];
      allSubitems.push({
        parent_item_id: item.id,
        board_id: boardId,
        name: insp.inspector,
        position: idx,
        data: {
          status: parentStatus,
          act_amount: dividedAmount,
          saqmianoba: insp.saqmianoba,
          source_board: insp.inspector,
        },
      });
    }
  }

  console.log(`Matched parents: ${matchedParents}/${parentItems.length}`);
  await batchInsert('board_subitems', allSubitems);
  console.log(`Subitems: ${allSubitems.length}`);

  return { parentItems, matchedParents };
}

async function writeUnmatchedBoard(boardId, contracts, skToInspectors, workspaceId, ownerId) {
  console.log('\n=== Step 6: Writing შეუთავსებელი კომპანიები ===\n');

  // Get parent items with their IDs
  const PAGE = 1000;
  let parentItems = [];
  let from = 0;
  while (true) {
    const { data, error } = await sb.from('board_items')
      .select('id, name, data, group_id')
      .eq('board_id', boardId)
      .is('deleted_at', null)
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    parentItems = parentItems.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }

  // Get which parents have subitems
  const { data: subs } = await sb.from('board_subitems')
    .select('parent_item_id')
    .eq('board_id', boardId);
  const matchedIds = new Set((subs || []).map(s => s.parent_item_id));
  const unmatched = parentItems.filter(i => !matchedIds.has(i.id));

  console.log(`Unmatched: ${unmatched.length}/${parentItems.length}`);
  if (unmatched.length === 0) { console.log('No unmatched companies.'); return; }

  // Get groups from source board
  const { data: srcGroups } = await sb.from('board_groups').select('id, name').eq('board_id', boardId);
  const srcGroupMap = new Map((srcGroups || []).map(g => [g.id, g.name]));

  const BOARD_NAME = 'შეუთავსებელი კომპანიები';
  const { data: existing } = await sb.from('boards').select('id').eq('name', BOARD_NAME).maybeSingle();

  let targetBoardId;
  if (existing) {
    targetBoardId = existing.id;
    console.log(`Board exists: ${targetBoardId}, clearing...`);
    await sb.from('board_items').delete().eq('board_id', targetBoardId);
    await sb.from('board_columns').delete().eq('board_id', targetBoardId);
    await sb.from('board_groups').delete().eq('board_id', targetBoardId);
  } else {
    const { data: newBoard, error } = await sb.from('boards').insert({
      name: BOARD_NAME, board_type: 'custom', owner_id: ownerId, workspace_id: workspaceId,
    }).select('id').single();
    if (error) throw error;
    targetBoardId = newBoard.id;
    console.log(`Created board: ${targetBoardId}`);
  }

  const columns = [
    { column_id: 'sk', column_name: 'ს/კ', column_type: 'text', position: 1 },
    { column_id: 'status', column_name: 'სტატუსი', column_type: 'status', position: 2,
      config: { options: STATUS_OPTIONS } },
    { column_id: 'start_date', column_name: 'გაფორმების თარიღი', column_type: 'date', position: 3 },
    { column_id: 'end_date', column_name: 'დასრულების თარიღი', column_type: 'date', position: 4 },
    { column_id: 'monthly', column_name: 'ყოველთვიური', column_type: 'number', position: 5 },
    { column_id: 'act_amount', column_name: 'აქტების თანხა', column_type: 'number', position: 6 },
    { column_id: 'payment_method', column_name: 'გადახდის წესი', column_type: 'status', position: 7,
      config: { options: PAYMENT_OPTIONS } },
    { column_id: 'sales_manager', column_name: 'გაყიდვების მენეჯერი', column_type: 'text', position: 8 },
    { column_id: 'source_board', column_name: 'წყარო', column_type: 'text', position: 9 },
  ].map(c => ({ ...c, board_id: targetBoardId, board_type: 'custom' }));

  const { error: colErr } = await sb.from('board_columns').insert(columns);
  if (colErr) throw colErr;

  const sourceNames = [...new Set(unmatched.map(i => srcGroupMap.get(i.group_id) || i.data?.source_board || 'უცნობი'))];
  const groups = sourceNames.map((name, i) => ({ board_id: targetBoardId, name, position: i }));
  const { data: insertedGroups, error: groupErr } = await sb.from('board_groups').insert(groups).select('id, name');
  if (groupErr) throw groupErr;
  const newGroupMap = new Map(insertedGroups.map(g => [g.name, g.id]));

  const items = unmatched.map((item, idx) => {
    const sourceName = srcGroupMap.get(item.group_id) || item.data?.source_board || 'უცნობი';
    return {
      board_id: targetBoardId, name: item.name, position: idx,
      group_id: newGroupMap.get(sourceName) || null, data: item.data,
    };
  });
  await batchInsert('board_items', items);
  console.log(`შეუთავსებელი: ${unmatched.length} items`);
}

async function writeLocationsBoard(contracts, inspectorItems, skToInspectors, workspaceId, ownerId) {
  console.log('\n=== Step 7: Writing ინსპექტორები / ლოკაციები ===\n');

  const skToAmount = {};
  for (const c of contracts) {
    if (c.sk) {
      if (!skToAmount[c.sk]) skToAmount[c.sk] = 0;
      skToAmount[c.sk] += c.data.act_amount || 0;
    }
  }

  const locationItems = [];
  const inspectorStats = {};

  for (const item of inspectorItems) {
    const siblingCount = skToInspectors[item.sk]?.length || 1;
    const totalAmount = skToAmount[item.sk] || 0;
    const dividedAmount = totalAmount / siblingCount;

    locationItems.push({ name: item.name, inspector: item.inspector, col_20: Math.round(dividedAmount * 100) / 100 });

    if (!inspectorStats[item.inspector]) inspectorStats[item.inspector] = { locations: 0, total_amount: 0 };
    inspectorStats[item.inspector].locations++;
    inspectorStats[item.inspector].total_amount += dividedAmount;
  }

  const { data: existing } = await sb.from('boards').select('id').eq('name', 'ინსპექტორები / ლოკაციები').maybeSingle();

  let boardId;
  if (existing) {
    boardId = existing.id;
    console.log(`Board exists: ${boardId}, clearing...`);
    await sb.from('board_items').delete().eq('board_id', boardId);
    await sb.from('board_columns').delete().eq('board_id', boardId);
    await sb.from('board_groups').delete().eq('board_id', boardId);
    await sb.from('boards').update({ workspace_id: workspaceId }).eq('id', boardId);
  } else {
    const { data: newBoard, error } = await sb.from('boards').insert({
      name: 'ინსპექტორები / ლოკაციები', board_type: 'custom', owner_id: ownerId, workspace_id: workspaceId,
    }).select('id').single();
    if (error) throw error;
    boardId = newBoard.id;
  }

  const columns = [
    { column_id: 'col_20', column_name: 'აქტების თანხა', column_type: 'number', position: 1 },
  ].map(c => ({ ...c, board_id: boardId, board_type: 'custom' }));
  const { error: colErr } = await sb.from('board_columns').insert(columns);
  if (colErr) throw colErr;

  const sortedInspectors = Object.entries(inspectorStats).sort((a, b) => b[1].locations - a[1].locations);
  const groups = sortedInspectors.map(([name], i) => ({ board_id: boardId, name, position: i }));
  const { data: insertedGroups, error: groupErr } = await sb.from('board_groups').insert(groups).select('id, name');
  if (groupErr) throw groupErr;
  const groupMap = new Map(insertedGroups.map(g => [g.name, g.id]));

  const items = locationItems.map((item, idx) => ({
    board_id: boardId, name: item.name, position: idx,
    group_id: groupMap.get(item.inspector) || null, data: { col_20: item.col_20 },
  }));
  await batchInsert('board_items', items);

  console.log(`ინსპექტორები / ლოკაციები: ${locationItems.length} items, ${sortedInspectors.length} groups`);
  return inspectorStats;
}

async function writeSummaryBoard(inspectorStats, workspaceId, ownerId) {
  console.log('\n=== Step 8: Writing შემაჯამებელი ===\n');

  const grandTotal = Object.values(inspectorStats).reduce((s, v) => s + v.total_amount, 0);

  const { data: existing } = await sb.from('boards').select('id').eq('name', 'შემაჯამებელი').maybeSingle();

  let boardId;
  if (existing) {
    boardId = existing.id;
    console.log(`Board exists: ${boardId}, clearing...`);
    await sb.from('board_items').delete().eq('board_id', boardId);
    await sb.from('board_columns').delete().eq('board_id', boardId);
    await sb.from('boards').update({ workspace_id: workspaceId }).eq('id', boardId);
  } else {
    const { data: newBoard, error } = await sb.from('boards').insert({
      name: 'შემაჯამებელი', board_type: 'custom', owner_id: ownerId, workspace_id: workspaceId,
    }).select('id').single();
    if (error) throw error;
    boardId = newBoard.id;
  }

  const columns = [
    { column_id: 'locations', column_name: 'ლოკაციები', column_type: 'number', position: 1 },
    { column_id: 'total_amount', column_name: 'ჯამი', column_type: 'number', position: 2 },
    { column_id: 'pct_amount', column_name: '%', column_type: 'number', position: 3 },
  ].map(c => ({ ...c, board_id: boardId, board_type: 'custom' }));
  const { error: colErr } = await sb.from('board_columns').insert(columns);
  if (colErr) throw colErr;

  const sorted = Object.entries(inspectorStats).sort((a, b) => b[1].total_amount - a[1].total_amount);
  const items = sorted.map(([name, stats], idx) => ({
    board_id: boardId, name, position: idx,
    data: {
      locations: stats.locations,
      total_amount: Math.round(stats.total_amount * 100) / 100,
      pct_amount: grandTotal > 0 ? Math.round((stats.total_amount / grandTotal) * 10000) / 100 : 0,
    },
  }));

  const { error: itemErr } = await sb.from('board_items').insert(items);
  if (itemErr) throw itemErr;

  console.log(`შემაჯამებელი: ${items.length} inspectors, total ₾${Math.round(grandTotal)}`);
}

async function writeCoordinatesBoard(coordItems, workspaceId, ownerId) {
  console.log('\n=== Step 9: Writing კოორდინატები - ინსპექტორები ===\n');

  // Find or use coordinates workspace
  const { data: coordWs } = await sb.from('workspaces').select('id').eq('name', 'კოორდინატები').maybeSingle();
  const coordWsId = coordWs?.id || workspaceId;

  const BOARD_NAME = 'კოორდინატები - ინსპექტორები';
  const { data: existing } = await sb.from('boards').select('id').eq('name', BOARD_NAME).maybeSingle();

  let boardId;
  if (existing) {
    boardId = existing.id;
    console.log(`Board exists: ${boardId}, clearing...`);
    await sb.from('board_items').delete().eq('board_id', boardId);
    await sb.from('board_columns').delete().eq('board_id', boardId);
    await sb.from('board_groups').delete().eq('board_id', boardId);
  } else {
    const { data: newBoard, error } = await sb.from('boards').insert({
      name: BOARD_NAME, board_type: 'custom', owner_id: ownerId, workspace_id: coordWsId,
    }).select('id').single();
    if (error) throw error;
    boardId = newBoard.id;
    console.log(`Created board: ${boardId}`);
  }

  const columns = [
    { column_id: 'inspector', column_name: 'ინსპექტორი', column_type: 'text', position: 1 },
    { column_id: 'coordinates', column_name: 'კოორდინატები', column_type: 'text', position: 2 },
    { column_id: 'lat', column_name: 'Latitude', column_type: 'text', position: 3 },
    { column_id: 'lng', column_name: 'Longitude', column_type: 'text', position: 4 },
    { column_id: 'sk', column_name: 'ს/კ', column_type: 'text', position: 5 },
  ].map(c => ({ ...c, board_id: boardId, board_type: 'custom' }));
  const { error: colErr } = await sb.from('board_columns').insert(columns);
  if (colErr) throw colErr;

  // Groups by inspector
  const inspectors = [...new Set(coordItems.map(i => i.inspector))];
  const groups = inspectors.map((name, i) => ({ board_id: boardId, name, position: i }));
  const { data: insertedGroups, error: groupErr } = await sb.from('board_groups').insert(groups).select('id, name');
  if (groupErr) throw groupErr;
  const groupMap = new Map(insertedGroups.map(g => [g.name, g.id]));

  const items = coordItems.map((item, idx) => ({
    board_id: boardId, name: item.name, position: idx,
    group_id: groupMap.get(item.inspector) || null,
    data: {
      inspector: item.inspector,
      coordinates: item.coordinates,
      lat: String(item.lat),
      lng: String(item.lng),
      sk: item.sk,
    },
  }));
  await batchInsert('board_items', items);
  console.log(`კოორდინატები: ${coordItems.length} items`);
}

// ── Main ──

async function run() {
  const startTime = Date.now();
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  First Instance Full Refresh from Monday.com    ║');
  console.log('╚══════════════════════════════════════════════════╝');

  const { data: admin } = await sb.from('user_roles').select('user_id').eq('role', 'admin').limit(1).single();
  const ownerId = admin.user_id;

  const { data: existingWs } = await sb.from('workspaces').select('id').eq('name', 'ანალიტიკა').maybeSingle();
  let workspaceId;
  if (existingWs) {
    workspaceId = existingWs.id;
  } else {
    const { data: ws, error } = await sb.from('workspaces').insert({
      name: 'ანალიტიკა', name_ka: 'ანალიტიკა',
      description: 'Analytics boards', icon: 'bar-chart', color: 'purple', owner_id: ownerId,
    }).select('id').single();
    if (error) throw error;
    workspaceId = ws.id;
  }

  // Fetch everything from Monday
  const contracts = await fetchContracts();
  const inspectorItems = await fetchInspectorItems();
  const coordItems = await fetchCoordinates();

  // Build ს/კ lookup
  const skToInspectors = {};
  for (const item of inspectorItems) {
    if (!skToInspectors[item.sk]) skToInspectors[item.sk] = [];
    skToInspectors[item.sk].push(item);
  }

  // Write boards
  const { boardId: companiesBoardId } = await writeCompaniesBoard(contracts, inspectorItems, workspaceId, ownerId);
  await writeSubitems(companiesBoardId, contracts, skToInspectors);
  await writeUnmatchedBoard(companiesBoardId, contracts, skToInspectors, workspaceId, ownerId);
  const inspectorStats = await writeLocationsBoard(contracts, inspectorItems, skToInspectors, workspaceId, ownerId);
  await writeSummaryBoard(inspectorStats, workspaceId, ownerId);
  await writeCoordinatesBoard(coordItems, workspaceId, ownerId);

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n╔══════════════════════════════════════════════════╗`);
  console.log(`║  ALL DONE in ${elapsed}s                              `);
  console.log(`║  Contracts: ${contracts.length}`);
  console.log(`║  Inspectors: ${Object.keys(inspectorStats).length}`);
  console.log(`║  Locations: ${inspectorItems.length}`);
  console.log(`║  Coordinates: ${coordItems.length}`);
  console.log(`╚══════════════════════════════════════════════════╝`);
}

run().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
