// AIS ship type code to engine specs mapping
// Based on IMO Fourth GHG Study vessel type averages

const VESSEL_SPECS = {
  // Cargo/Container (70-79)
  container: { avgEngineMCR_kW: 25000, maxSpeedKnots: 22 },
  // Tanker (80-89)
  tanker: { avgEngineMCR_kW: 15000, maxSpeedKnots: 15 },
  // General Cargo (70)
  generalCargo: { avgEngineMCR_kW: 8000, maxSpeedKnots: 14 },
  // Fishing (30)
  fishing: { avgEngineMCR_kW: 1500, maxSpeedKnots: 12 },
  // Military (35)
  military: { avgEngineMCR_kW: 20000, maxSpeedKnots: 28 },
  // Sailing/Pleasure (36-37)
  pleasure: { avgEngineMCR_kW: 500, maxSpeedKnots: 10 },
  // Pilot/SAR/Tug (50-59)
  service: { avgEngineMCR_kW: 3000, maxSpeedKnots: 13 },
  // Passenger (60-69)
  passenger: { avgEngineMCR_kW: 30000, maxSpeedKnots: 22 },
  // Default
  default: { avgEngineMCR_kW: 10000, maxSpeedKnots: 14 },
}

export function getVesselSpecs(typeCode) {
  if (typeCode >= 70 && typeCode <= 79) {
    return typeCode === 70 ? VESSEL_SPECS.generalCargo : VESSEL_SPECS.container
  }
  if (typeCode >= 80 && typeCode <= 89) return VESSEL_SPECS.tanker
  if (typeCode >= 60 && typeCode <= 69) return VESSEL_SPECS.passenger
  if (typeCode >= 50 && typeCode <= 59) return VESSEL_SPECS.service
  if (typeCode >= 36 && typeCode <= 37) return VESSEL_SPECS.pleasure
  if (typeCode === 35) return VESSEL_SPECS.military
  if (typeCode === 30) return VESSEL_SPECS.fishing
  return VESSEL_SPECS.default
}

// Returns a stable key used for type filtering
export function getVesselTypeKey(typeCode) {
  if (typeCode >= 70 && typeCode <= 79) return 'CONTAINER'
  if (typeCode >= 80 && typeCode <= 89) return 'TANKER'
  if (typeCode >= 60 && typeCode <= 69) return 'PASSENGER'
  if (typeCode === 30) return 'FISHING'
  if (typeCode >= 50 && typeCode <= 59) return 'SERVICE'
  return 'CARGO'
}

export function getVesselTypeName(typeCode) {
  if (typeCode >= 70 && typeCode <= 79) return 'Container Ship'
  if (typeCode >= 80 && typeCode <= 89) return 'Tanker'
  if (typeCode >= 60 && typeCode <= 69) return 'Passenger Vessel'
  if (typeCode >= 50 && typeCode <= 59) return 'Service Vessel'
  if (typeCode === 30) return 'Fishing Vessel'
  if (typeCode >= 36 && typeCode <= 37) return 'Pleasure Craft'
  if (typeCode === 35) return 'Military'
  return 'Cargo Vessel'
}

export function getVesselTypeEmoji(typeCode) {
  if (typeCode >= 70 && typeCode <= 79) return '📦'
  if (typeCode >= 80 && typeCode <= 89) return '🛢️'
  if (typeCode >= 60 && typeCode <= 69) return '🚢'
  if (typeCode === 30) return '🐟'
  if (typeCode >= 50 && typeCode <= 59) return '🚤'
  if (typeCode >= 36 && typeCode <= 37) return '⛵'
  if (typeCode === 35) return '⚓'
  return '🚢'
}

// MMSI prefix (MID code) to flag emoji
const MID_TO_FLAG = {
  201: '🇦🇱', 211: '🇩🇪', 212: '🇨🇾', 215: '🇲🇹', 218: '🇩🇪', 219: '🇩🇰',
  220: '🇩🇰', 224: '🇪🇸', 225: '🇪🇸', 226: '🇫🇷', 227: '🇫🇷', 228: '🇫🇷',
  229: '🇲🇹', 230: '🇫🇮', 231: '🇫🇴', 232: '🇬🇧', 233: '🇬🇧', 234: '🇬🇧',
  235: '🇬🇧', 236: '🇬🇮', 237: '🇬🇷', 238: '🇭🇷', 239: '🇬🇷', 240: '🇬🇷',
  241: '🇬🇷', 242: '🇲🇦', 243: '🇭🇺', 244: '🇳🇱', 245: '🇳🇱', 246: '🇳🇱',
  247: '🇮🇹', 248: '🇲🇹', 249: '🇲🇹', 250: '🇮🇪', 251: '🇮🇸', 252: '🇮🇹',
  253: '🇮🇹', 254: '🇮🇹', 255: '🇵🇹', 256: '🇲🇹', 257: '🇳🇴', 258: '🇳🇴',
  259: '🇳🇴', 261: '🇵🇱', 262: '🇲🇪', 263: '🇵🇹', 264: '🇷🇴', 265: '🇸🇪',
  266: '🇸🇪', 267: '🇸🇰', 268: '🇸🇲', 269: '🇨🇭', 270: '🇨🇿', 271: '🇹🇷',
  272: '🇺🇦', 273: '🇷🇺', 274: '🇲🇰', 275: '🇱🇻', 276: '🇪🇪', 277: '🇱🇹',
  278: '🇸🇮', 279: '🇷🇸', 303: '🇺🇸', 304: '🇺🇸', 305: '🇺🇸', 306: '🇺🇸',
  307: '🇺🇸', 308: '🇺🇸', 309: '🇺🇸', 310: '🇺🇸', 311: '🇺🇸', 312: '🇺🇸',
  316: '🇨🇦', 319: '🇨🇦', 338: '🇺🇸', 339: '🇺🇸', 341: '🇲🇽', 345: '🇲🇽',
  351: '🇲🇽', 352: '🇲🇽', 353: '🇲🇽', 354: '🇵🇦', 355: '🇵🇦', 356: '🇵🇦',
  357: '🇵🇦', 370: '🇵🇦', 371: '🇵🇦', 372: '🇵🇦', 373: '🇵🇦', 374: '🇵🇦',
  375: '🇵🇦', 376: '🇵🇦', 377: '🇵🇦', 378: '🇻🇮', 379: '🇻🇮',
  401: '🇦🇫', 403: '🇸🇦', 405: '🇧🇩', 408: '🇧🇭', 410: '🇧🇹', 412: '🇨🇳',
  413: '🇨🇳', 414: '🇨🇳', 416: '🇹🇼', 417: '🇱🇰', 419: '🇮🇳', 422: '🇮🇷',
  423: '🇦🇿', 425: '🇮🇶', 428: '🇮🇱', 431: '🇯🇵', 432: '🇯🇵', 434: '🇹🇲',
  436: '🇰🇿', 437: '🇺🇿', 438: '🇯🇴', 440: '🇰🇷', 441: '🇰🇷', 443: '🇵🇸',
  445: '🇰🇵', 447: '🇰🇼', 450: '🇱🇧', 451: '🇰🇬', 453: '🇲🇴', 455: '🇲🇻',
  457: '🇲🇳', 459: '🇳🇵', 461: '🇴🇲', 463: '🇵🇰', 466: '🇶🇦', 468: '🇸🇾',
  470: '🇦🇪', 472: '🇹🇯', 473: '🇾🇪', 475: '🇾🇪', 477: '🇭🇰', 478: '🇧🇦',
  501: '🇫🇷', 503: '🇦🇺', 506: '🇲🇲', 508: '🇧🇳', 510: '🇫🇲', 511: '🇵🇼',
  512: '🇳🇿', 514: '🇰🇭', 515: '🇰🇭', 516: '🇨🇽', 518: '🇨🇰', 520: '🇫🇯',
  523: '🇨🇨', 525: '🇮🇩', 529: '🇰🇮', 531: '🇱🇦', 533: '🇲🇾', 536: '🇳🇷',
  538: '🇲🇭', 540: '🇳🇨', 542: '🇳🇺', 544: '🇳🇷', 546: '🇫🇷', 548: '🇵🇭',
  553: '🇵🇬', 555: '🇵🇳', 557: '🇸🇧', 559: '🇦🇸', 561: '🇼🇸', 563: '🇸🇬',
  564: '🇸🇬', 565: '🇸🇬', 566: '🇸🇬', 567: '🇹🇭', 570: '🇹🇴', 572: '🇹🇻',
  574: '🇻🇳', 576: '🇻🇺', 577: '🇻🇺', 578: '🇼🇫',
  601: '🇿🇦', 603: '🇦🇴', 605: '🇩🇿', 607: '🇫🇷', 608: '🇬🇧', 609: '🇧🇮',
  610: '🇧🇯', 611: '🇧🇼', 612: '🇨🇫', 613: '🇨🇲', 615: '🇨🇬', 616: '🇰🇲',
  617: '🇨🇻', 618: '🇫🇷', 619: '🇨🇮', 620: '🇰🇲', 621: '🇩🇯', 622: '🇪🇬',
  624: '🇪🇹', 625: '🇪🇷', 626: '🇬🇦', 627: '🇬🇭', 629: '🇬🇲', 630: '🇬🇼',
  631: '🇬🇶', 632: '🇬🇳', 633: '🇧🇫', 634: '🇰🇪', 635: '🇫🇷', 636: '🇱🇷',
  637: '🇱🇷', 638: '🇸🇸', 642: '🇱🇾', 644: '🇱🇸', 645: '🇲🇺', 647: '🇲🇬',
  649: '🇲🇱', 650: '🇲🇿', 654: '🇲🇷', 655: '🇲🇼', 656: '🇳🇪', 657: '🇳🇬',
  659: '🇳🇦', 660: '🇫🇷', 661: '🇷🇼', 662: '🇸🇩', 663: '🇸🇳', 664: '🇸🇨',
  665: '🇸🇭', 666: '🇸🇴', 667: '🇸🇱', 668: '🇸🇹', 669: '🇸🇿', 670: '🇹🇩',
  671: '🇹🇬', 672: '🇹🇳', 674: '🇹🇿', 675: '🇺🇬', 676: '🇨🇩', 677: '🇹🇿',
  678: '🇿🇲', 679: '🇿🇼',
  701: '🇦🇷', 710: '🇧🇷', 720: '🇧🇴', 725: '🇨🇱', 730: '🇨🇴', 735: '🇪🇨',
  740: '🇬🇾', 745: '🇬🇫', 750: '🇵🇾', 755: '🇵🇪', 760: '🇸🇷', 765: '🇺🇾',
  770: '🇻🇪',
}

export function mmsiToFlag(mmsi) {
  if (!mmsi) return '🏳️'
  const mid = parseInt(String(mmsi).substring(0, 3), 10)
  return MID_TO_FLAG[mid] || '🏳️'
}

const MID_TO_COUNTRY = {
  201: 'Albania', 211: 'Germany', 212: 'Cyprus', 215: 'Malta', 218: 'Germany', 219: 'Denmark',
  220: 'Denmark', 224: 'Spain', 225: 'Spain', 226: 'France', 227: 'France', 228: 'France',
  229: 'Malta', 230: 'Finland', 231: 'Faroe Islands', 232: 'United Kingdom', 233: 'United Kingdom',
  234: 'United Kingdom', 235: 'United Kingdom', 236: 'Gibraltar', 237: 'Greece', 238: 'Croatia',
  239: 'Greece', 240: 'Greece', 241: 'Greece', 242: 'Morocco', 243: 'Hungary', 244: 'Netherlands',
  245: 'Netherlands', 246: 'Netherlands', 247: 'Italy', 248: 'Malta', 249: 'Malta', 250: 'Ireland',
  251: 'Iceland', 252: 'Italy', 253: 'Italy', 254: 'Italy', 255: 'Portugal', 256: 'Malta',
  257: 'Norway', 258: 'Norway', 259: 'Norway', 261: 'Poland', 262: 'Montenegro', 263: 'Portugal',
  264: 'Romania', 265: 'Sweden', 266: 'Sweden', 267: 'Slovakia', 268: 'San Marino',
  269: 'Switzerland', 270: 'Czech Republic', 271: 'Turkey', 272: 'Ukraine', 273: 'Russia',
  274: 'North Macedonia', 275: 'Latvia', 276: 'Estonia', 277: 'Lithuania', 278: 'Slovenia',
  279: 'Serbia',
  303: 'USA', 304: 'Antigua & Barbuda', 305: 'Antigua & Barbuda', 306: 'Neth. Antilles',
  307: 'Aruba', 308: 'Bahamas', 309: 'Bahamas', 310: 'Bermuda', 311: 'Bahamas', 312: 'Belize',
  316: 'Canada', 319: 'Cayman Islands', 338: 'USA', 339: 'USA', 341: 'Mexico', 345: 'Mexico',
  351: 'Panama', 352: 'Panama', 353: 'Panama', 354: 'Panama', 355: 'Panama', 356: 'Panama',
  357: 'Panama', 370: 'Panama', 371: 'Panama', 372: 'Panama', 373: 'Panama', 374: 'Panama',
  375: 'Panama', 376: 'Panama', 377: 'Panama', 378: 'US Virgin Islands', 379: 'US Virgin Islands',
  401: 'Afghanistan', 403: 'Saudi Arabia', 405: 'Bangladesh', 408: 'Bahrain', 410: 'Bhutan',
  412: 'China', 413: 'China', 414: 'China', 416: 'Taiwan', 417: 'Sri Lanka', 419: 'India',
  422: 'Iran', 423: 'Azerbaijan', 425: 'Iraq', 428: 'Israel', 431: 'Japan', 432: 'Japan',
  434: 'Turkmenistan', 436: 'Kazakhstan', 437: 'Uzbekistan', 438: 'Jordan', 440: 'South Korea',
  441: 'South Korea', 443: 'Palestine', 445: 'North Korea', 447: 'Kuwait', 450: 'Lebanon',
  451: 'Kyrgyzstan', 453: 'Macao', 455: 'Maldives', 457: 'Mongolia', 459: 'Nepal', 461: 'Oman',
  463: 'Pakistan', 466: 'Qatar', 468: 'Syria', 470: 'UAE', 472: 'Tajikistan', 473: 'Yemen',
  475: 'Yemen', 477: 'Hong Kong', 478: 'Bosnia',
  501: 'France', 503: 'Australia', 506: 'Myanmar', 508: 'Brunei', 510: 'Micronesia',
  511: 'Palau', 512: 'New Zealand', 514: 'Cambodia', 515: 'Cambodia', 516: 'Christmas Island',
  518: 'Cook Islands', 520: 'Fiji', 523: 'Cocos Islands', 525: 'Indonesia', 529: 'Kiribati',
  531: 'Laos', 533: 'Malaysia', 536: 'Nauru', 538: 'Marshall Islands', 540: 'New Caledonia',
  542: 'Niue', 544: 'Nauru', 546: 'French Polynesia', 548: 'Philippines', 553: 'Papua New Guinea',
  555: 'Pitcairn', 557: 'Solomon Islands', 559: 'American Samoa', 561: 'Samoa', 563: 'Singapore',
  564: 'Singapore', 565: 'Singapore', 566: 'Singapore', 567: 'Thailand', 570: 'Tonga',
  572: 'Tuvalu', 574: 'Vietnam', 576: 'Vanuatu', 577: 'Vanuatu', 578: 'Wallis & Futuna',
  601: 'South Africa', 603: 'Angola', 605: 'Algeria', 607: 'France', 608: 'United Kingdom',
  609: 'Burundi', 610: 'Benin', 611: 'Botswana', 612: 'Central African Rep.', 613: 'Cameroon',
  615: 'Congo', 616: 'Comoros', 617: 'Cabo Verde', 618: 'France', 619: "Côte d'Ivoire",
  620: 'Comoros', 621: 'Djibouti', 622: 'Egypt', 624: 'Ethiopia', 625: 'Eritrea', 626: 'Gabon',
  627: 'Ghana', 629: 'Gambia', 630: 'Guinea-Bissau', 631: 'Equatorial Guinea', 632: 'Guinea',
  633: 'Burkina Faso', 634: 'Kenya', 635: 'France', 636: 'Liberia', 637: 'Liberia',
  638: 'South Sudan', 642: 'Libya', 644: 'Lesotho', 645: 'Mauritius', 647: 'Madagascar',
  649: 'Mali', 650: 'Mozambique', 654: 'Mauritania', 655: 'Malawi', 656: 'Niger', 657: 'Nigeria',
  659: 'Namibia', 660: 'France', 661: 'Rwanda', 662: 'Sudan', 663: 'Senegal', 664: 'Seychelles',
  665: 'Saint Helena', 666: 'Somalia', 667: 'Sierra Leone', 668: 'São Tomé & Príncipe',
  669: 'Eswatini', 670: 'Chad', 671: 'Togo', 672: 'Tunisia', 674: 'Tanzania', 675: 'Uganda',
  676: 'DR Congo', 677: 'Tanzania', 678: 'Zambia', 679: 'Zimbabwe',
  701: 'Argentina', 710: 'Brazil', 720: 'Bolivia', 725: 'Chile', 730: 'Colombia', 735: 'Ecuador',
  740: 'Guyana', 745: 'French Guiana', 750: 'Paraguay', 755: 'Peru', 760: 'Suriname',
  765: 'Uruguay', 770: 'Venezuela',
}

export function mmsiToCountry(mmsi) {
  if (!mmsi) return 'Unknown'
  const mid = parseInt(String(mmsi).substring(0, 3), 10)
  return MID_TO_COUNTRY[mid] || 'Unknown'
}
