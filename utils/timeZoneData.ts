

// A mapping of common US Area Codes to IANA Time Zones.
// Covers major metros and regions for accurate detection.

export const US_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)', short: 'ET' },
  { value: 'America/Chicago', label: 'Central Time (CT)', short: 'CT' },
  { value: 'America/Denver', label: 'Mountain Time (MT)', short: 'MT' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)', short: 'PT' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)', short: 'AKT' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)', short: 'HT' },
];

const AREA_CODE_MAP: Record<string, string> = {
  // --- EASTERN TIME (ET) ---
  '201': 'America/New_York', '202': 'America/New_York', '203': 'America/New_York', '212': 'America/New_York',
  '215': 'America/New_York', '216': 'America/New_York', '223': 'America/New_York', '234': 'America/New_York',
  '239': 'America/New_York', '240': 'America/New_York', '248': 'America/New_York', '252': 'America/New_York',
  '267': 'America/New_York', '272': 'America/New_York', '276': 'America/New_York', '301': 'America/New_York',
  '302': 'America/New_York', '304': 'America/New_York', '305': 'America/New_York', '313': 'America/New_York',
  '315': 'America/New_York', '321': 'America/New_York', '330': 'America/New_York', '336': 'America/New_York',
  '339': 'America/New_York', '347': 'America/New_York', '351': 'America/New_York', '352': 'America/New_York',
  '386': 'America/New_York', '401': 'America/New_York', '404': 'America/New_York', '407': 'America/New_York',
  '410': 'America/New_York', '412': 'America/New_York', '413': 'America/New_York', '419': 'America/New_York',
  '434': 'America/New_York', '440': 'America/New_York', '443': 'America/New_York', '470': 'America/New_York',
  '475': 'America/New_York', '478': 'America/New_York', '484': 'America/New_York', '508': 'America/New_York',
  '513': 'America/New_York', '516': 'America/New_York', '518': 'America/New_York', '540': 'America/New_York',
  '551': 'America/New_York', '561': 'America/New_York', '570': 'America/New_York', '571': 'America/New_York',
  '585': 'America/New_York', '603': 'America/New_York', '607': 'America/New_York', '609': 'America/New_York',
  '610': 'America/New_York', '614': 'America/New_York', '617': 'America/New_York', '631': 'America/New_York',
  '646': 'America/New_York', '678': 'America/New_York', '681': 'America/New_York', '703': 'America/New_York',
  '704': 'America/New_York', '706': 'America/New_York', '716': 'America/New_York', '717': 'America/New_York',
  '718': 'America/New_York', '724': 'America/New_York', '727': 'America/New_York', '732': 'America/New_York',
  '734': 'America/New_York', '740': 'America/New_York', '754': 'America/New_York', '757': 'America/New_York',
  '770': 'America/New_York', '772': 'America/New_York', '774': 'America/New_York', '781': 'America/New_York',
  '786': 'America/New_York', '802': 'America/New_York', '803': 'America/New_York', '804': 'America/New_York',
  '813': 'America/New_York', '814': 'America/New_York', '828': 'America/New_York', '835': 'America/New_York',
  '843': 'America/New_York', '845': 'America/New_York', '848': 'America/New_York', '856': 'America/New_York',
  '860': 'America/New_York', '862': 'America/New_York', '863': 'America/New_York', '864': 'America/New_York',
  '904': 'America/New_York', '908': 'America/New_York', '910': 'America/New_York', '912': 'America/New_York',
  '914': 'America/New_York', '917': 'America/New_York', '919': 'America/New_York', '929': 'America/New_York',
  '937': 'America/New_York', '941': 'America/New_York', '954': 'America/New_York', '959': 'America/New_York',
  '973': 'America/New_York', '978': 'America/New_York', '980': 'America/New_York', '984': 'America/New_York',

  // --- CENTRAL TIME (CT) ---
  '205': 'America/Chicago', '210': 'America/Chicago', '214': 'America/Chicago', '217': 'America/Chicago',
  '219': 'America/Chicago', '224': 'America/Chicago', '225': 'America/Chicago', '228': 'America/Chicago',
  '251': 'America/Chicago', '254': 'America/Chicago', '256': 'America/Chicago', '262': 'America/Chicago',
  '281': 'America/Chicago', '308': 'America/Chicago', '309': 'America/Chicago', '312': 'America/Chicago',
  '314': 'America/Chicago', '316': 'America/Chicago', '318': 'America/Chicago', '319': 'America/Chicago',
  '320': 'America/Chicago', '325': 'America/Chicago', '331': 'America/Chicago', '334': 'America/Chicago',
  '337': 'America/Chicago', '346': 'America/Chicago', '361': 'America/Chicago',
  '402': 'America/Chicago', '405': 'America/Chicago', '409': 'America/Chicago', '414': 'America/Chicago',
  '417': 'America/Chicago', '430': 'America/Chicago', '432': 'America/Chicago', '469': 'America/Chicago',
  '479': 'America/Chicago', '501': 'America/Chicago', '504': 'America/Chicago', '507': 'America/Chicago',
  '512': 'America/Chicago', '515': 'America/Chicago', '531': 'America/Chicago', '534': 'America/Chicago',
  '539': 'America/Chicago', '563': 'America/Chicago', '573': 'America/Chicago', '580': 'America/Chicago',
  '601': 'America/Chicago', '605': 'America/Chicago', '608': 'America/Chicago', '612': 'America/Chicago',
  '615': 'America/Chicago', '618': 'America/Chicago', '620': 'America/Chicago', '630': 'America/Chicago',
  '636': 'America/Chicago', '641': 'America/Chicago', '651': 'America/Chicago', '660': 'America/Chicago',
  '662': 'America/Chicago', '682': 'America/Chicago', '701': 'America/Chicago', '708': 'America/Chicago',
  '712': 'America/Chicago', '713': 'America/Chicago', '715': 'America/Chicago', '731': 'America/Chicago',
  '737': 'America/Chicago', '763': 'America/Chicago', '769': 'America/Chicago', '773': 'America/Chicago',
  '785': 'America/Chicago', '806': 'America/Chicago', '815': 'America/Chicago', '816': 'America/Chicago',
  '817': 'America/Chicago', '830': 'America/Chicago', '832': 'America/Chicago', '847': 'America/Chicago',
  '870': 'America/Chicago', '901': 'America/Chicago', '903': 'America/Chicago', '913': 'America/Chicago',
  '918': 'America/Chicago', '920': 'America/Chicago', '931': 'America/Chicago', '936': 'America/Chicago',
  '940': 'America/Chicago', '952': 'America/Chicago', '956': 'America/Chicago', '972': 'America/Chicago',
  '979': 'America/Chicago', '985': 'America/Chicago',

  // --- MOUNTAIN TIME (MT) ---
  '303': 'America/Denver', '307': 'America/Denver', '385': 'America/Denver', '406': 'America/Denver',
  '435': 'America/Denver', '480': 'America/Denver', '505': 'America/Denver', '520': 'America/Denver',
  '575': 'America/Denver', '602': 'America/Denver', '623': 'America/Denver', '719': 'America/Denver',
  '720': 'America/Denver', '801': 'America/Denver', '928': 'America/Denver', '970': 'America/Denver',
  '208': 'America/Denver', '986': 'America/Denver',

  // --- PACIFIC TIME (PT) ---
  '206': 'America/Los_Angeles', '209': 'America/Los_Angeles', '213': 'America/Los_Angeles', '253': 'America/Los_Angeles',
  '310': 'America/Los_Angeles', '323': 'America/Los_Angeles', '360': 'America/Los_Angeles', '408': 'America/Los_Angeles',
  '415': 'America/Los_Angeles', '424': 'America/Los_Angeles', '425': 'America/Los_Angeles', '442': 'America/Los_Angeles',
  '503': 'America/Los_Angeles', '509': 'America/Los_Angeles', '510': 'America/Los_Angeles', '530': 'America/Los_Angeles',
  '559': 'America/Los_Angeles', '562': 'America/Los_Angeles', '564': 'America/Los_Angeles', '619': 'America/Los_Angeles',
  '626': 'America/Los_Angeles', '628': 'America/Los_Angeles', '650': 'America/Los_Angeles', '657': 'America/Los_Angeles',
  '661': 'America/Los_Angeles', '669': 'America/Los_Angeles', '702': 'America/Los_Angeles', '707': 'America/Los_Angeles',
  '714': 'America/Los_Angeles', '725': 'America/Los_Angeles', '747': 'America/Los_Angeles', '760': 'America/Los_Angeles',
  '775': 'America/Los_Angeles', '805': 'America/Los_Angeles', '818': 'America/Los_Angeles', '831': 'America/Los_Angeles',
  '858': 'America/Los_Angeles', '909': 'America/Los_Angeles', '916': 'America/Los_Angeles', '925': 'America/Los_Angeles',
  '949': 'America/Los_Angeles', '951': 'America/Los_Angeles', '971': 'America/Los_Angeles',
  '989': 'America/Los_Angeles',

  // --- ALASKA & HAWAII ---
  '907': 'America/Anchorage',
  '808': 'Pacific/Honolulu'
};

/**
 * Extracts the 3-digit area code from a raw phone string and looks up the IANA time zone.
 */
export const getTimeZoneFromPhone = (phone: string): string | null => {
  const cleaned = phone.replace(/\D/g, ''); // Remove non-digits
  if (cleaned.length < 3) return null;
  
  // Handle case where country code '1' is included (e.g. 15551234567)
  let areaCode = '';
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    areaCode = cleaned.substring(1, 4);
  } else {
    areaCode = cleaned.substring(0, 3);
  }

  return AREA_CODE_MAP[areaCode] || null;
};

/**
 * Converts a "Client's Wall Clock Time" into a JS Date object (which effectively holds UTC).
 * 
 * Example:
 * Input: date="2023-01-01", time="14:00", zone="America/Chicago" (2PM CT)
 * Browser (assume in UTC for math): "2023-01-01T14:00:00Z"
 * We iterate to find the UTC timestamp that, when formatted in "America/Chicago", equals 14:00.
 */
export const dateFromClientTime = (dateStr: string, timeStr: string, timeZone: string): Date => {
  // 1. Start with a naive guess: treat input as UTC.
  //    e.g. User wants 2PM CT. We start with 2PM UTC.
  let guess = new Date(`${dateStr}T${timeStr}:00Z`);
  
  // Max iterations to converge (usually takes 1 or 2)
  for (let i = 0; i < 3; i++) {
    // 2. What time is 'guess' in the target timeZone?
    //    e.g. 2PM UTC is 8AM CT (difference of 6 hours)
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    }).formatToParts(guess);
    
    // Extract components from the formatted parts
    const p: any = {};
    parts.forEach(({ type, value }) => { p[type] = value; });
    
    // Construct a "wall clock" date from what the timezone thinks 'guess' is
    const guessWallClock = new Date(Date.UTC(
      parseInt(p.year), 
      parseInt(p.month) - 1, 
      parseInt(p.day), 
      parseInt(p.hour === '24' ? '0' : p.hour),
      parseInt(p.minute), 
      parseInt(p.second)
    ));

    // 3. Compare 'guessWallClock' to our 'Target Wall Clock'
    const targetWallClock = new Date(`${dateStr}T${timeStr}:00Z`);
    
    const diff = targetWallClock.getTime() - guessWallClock.getTime();
    
    if (Math.abs(diff) < 1000) {
       return guess; // Close enough
    }
    
    // 4. Adjust guess by the difference
    guess = new Date(guess.getTime() + diff);
  }
  
  return guess;
};
