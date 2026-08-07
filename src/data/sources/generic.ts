import { define } from '../define';
import type { Material } from '../../domain/types';

/**
 * Representative finishes, not purchasable SKUs.
 *
 * Tile, stone, worktop and textile ranges turn over fast and vary by importer,
 * so pinning the seed catalogue to specific SKUs would age badly. These entries
 * describe a *finish family* — "honed travertine", "boucle wool" — at a
 * realistic colour, which is what the palette maths actually needs. Swap them
 * for your supplier's range via Library → Import catalogue.
 */

export const GENERIC: Material[] = [
  ...define(
    {
      brand: 'Generic',
      category: 'tile',
      provenance: 'generic',
      surfaces: ['floor', 'wall'],
      collection: 'Porcelain stoneware',
      idPrefix: 'tile',
      sheen: 'matt',
      tags: ['tile', 'porcelain'],
    },
    [
      { code: 'PS-CAL', name: 'Calacatta marble effect', hex: '#EDEAE4', pattern: 'stone', tags: ['marble', 'light'] },
      { code: 'PS-CAR', name: 'Carrara marble effect', hex: '#DEDEDA', pattern: 'stone', tags: ['marble', 'cool'] },
      { code: 'PS-TRV', name: 'Travertine effect', hex: '#CFBEA4', pattern: 'stone', tags: ['travertine', 'warm'] },
      { code: 'PS-LIM', name: 'Limestone effect', hex: '#C6BCAB', pattern: 'stone', tags: ['limestone', 'warm'] },
      { code: 'PS-CON', name: 'Light concrete effect', hex: '#BCBAB5', pattern: 'concrete', tags: ['concrete', 'urban'] },
      { code: 'PS-CND', name: 'Dark concrete effect', hex: '#6E6E6B', pattern: 'concrete', tags: ['concrete', 'dark'] },
      { code: 'PS-SAN', name: 'Sand microcement', hex: '#C3B49C', pattern: 'concrete', tags: ['microcement', 'warm'] },
      { code: 'PS-TER', name: 'Warm terrazzo', hex: '#D3C7B6', pattern: 'terrazzo', tags: ['terrazzo'] },
      { code: 'PS-TEG', name: 'Grey terrazzo', hex: '#B4B4AF', pattern: 'terrazzo', tags: ['terrazzo', 'cool'] },
      { code: 'PS-SLA', name: 'Slate effect', hex: '#4A4B4C', pattern: 'stone', tags: ['slate', 'dark'] },
      { code: 'PS-BAS', name: 'Basalt effect', hex: '#3E4042', pattern: 'stone', tags: ['basalt', 'dark'] },
      { code: 'PS-TRC', name: 'Terracotta / cotto', hex: '#B0704E', pattern: 'stone', tags: ['terracotta', 'warm'] },
    ],
  ),

  ...define(
    {
      brand: 'Generic',
      category: 'wood-floor',
      provenance: 'generic',
      surfaces: ['floor'],
      collection: 'Engineered timber',
      idPrefix: 'wood',
      pattern: 'woodgrain',
      sheen: 'natural',
      tags: ['timber', 'engineered', 'parquet'],
    },
    [
      { code: 'EW-OAK-W', name: 'White-oiled oak', hex: '#D2C4AE', species: 'oak', tags: ['oak', 'light', 'nordic'] },
      { code: 'EW-OAK-N', name: 'Natural oak, matt lacquer', hex: '#C0A379', species: 'oak', tags: ['oak', 'warm'] },
      { code: 'EW-OAK-R', name: 'Rustic oak, oiled', hex: '#A9855C', species: 'oak', tags: ['oak', 'rustic'] },
      { code: 'EW-OAK-S', name: 'Smoked oak', hex: '#7A5C41', species: 'oak', tags: ['oak', 'dark'] },
      { code: 'EW-OAK-G', name: 'Grey-washed oak', hex: '#A8A296', species: 'oak', tags: ['oak', 'grey'] },
      { code: 'EW-WAL-N', name: 'American walnut', hex: '#71503A', species: 'walnut', tags: ['walnut', 'dark', 'warm'] },
      { code: 'EW-ASH-N', name: 'Natural ash', hex: '#CBB99B', species: 'ash', tags: ['ash', 'light'] },
    ],
  ),

  ...define(
    {
      brand: 'Generic',
      category: 'vinyl-floor',
      provenance: 'generic',
      surfaces: ['floor'],
      collection: 'LVT / SPC',
      idPrefix: 'lvt',
      pattern: 'woodgrain',
      sheen: 'textured',
      tags: ['lvt', 'spc', 'vinyl', 'wet-area'],
    },
    [
      { code: 'LVT-OAK-L', name: 'Light oak plank', hex: '#C7B295', species: 'oak', tags: ['oak', 'light'] },
      { code: 'LVT-OAK-M', name: 'Mid oak plank', hex: '#A98C68', species: 'oak', tags: ['oak', 'warm'] },
      { code: 'LVT-STN-G', name: 'Grey stone tile', hex: '#A5A6A3', pattern: 'stone', tags: ['stone', 'cool'] },
      { code: 'LVT-CON', name: 'Concrete tile', hex: '#9B9A97', pattern: 'concrete', tags: ['concrete'] },
    ],
  ),

  ...define(
    {
      brand: 'Generic',
      category: 'worktop',
      provenance: 'generic',
      surfaces: ['worktop', 'wall'],
      collection: 'Quartz / sintered stone',
      idPrefix: 'wt',
      pattern: 'stone',
      sheen: 'matt',
      tags: ['worktop', 'quartz', 'kitchen'],
    },
    [
      { code: 'WT-WHT', name: 'Pure white quartz', hex: '#F0EFEB', tags: ['white'] },
      { code: 'WT-CAL', name: 'Calacatta veined quartz', hex: '#E8E5DE', tags: ['marble', 'veined'] },
      { code: 'WT-CON', name: 'Concrete-look quartz', hex: '#A9A8A4', tags: ['concrete'] },
      { code: 'WT-GRY', name: 'Mid grey quartz', hex: '#8C8C89', tags: ['grey'] },
      { code: 'WT-ANT', name: 'Anthracite sintered stone', hex: '#3F4144', tags: ['dark'] },
      { code: 'WT-BLK', name: 'Nero marquina effect', hex: '#222324', tags: ['black'] },
    ],
  ),

  ...define(
    {
      brand: 'Generic',
      category: 'textile',
      provenance: 'generic',
      surfaces: ['textile', 'accent'],
      collection: 'Upholstery & soft furnishing',
      idPrefix: 'tex',
      pattern: 'fabric',
      sheen: 'natural',
      tags: ['textile', 'upholstery'],
    },
    [
      { code: 'TX-BOU-CR', name: 'Cream bouclé', hex: '#E0D8C8', tags: ['boucle', 'warm', 'light'] },
      { code: 'TX-BOU-SA', name: 'Sand bouclé', hex: '#C9B79C', tags: ['boucle', 'warm'] },
      { code: 'TX-LIN-NA', name: 'Natural linen', hex: '#D6CBB6', tags: ['linen', 'warm'] },
      { code: 'TX-LIN-GY', name: 'Grey linen', hex: '#A9A69E', tags: ['linen', 'neutral'] },
      { code: 'TX-WOL-CH', name: 'Charcoal wool', hex: '#4B4C4E', tags: ['wool', 'dark'] },
      { code: 'TX-VEL-GR', name: 'Forest green velvet', hex: '#3C5347', tags: ['velvet', 'green', 'accent'] },
      { code: 'TX-VEL-BL', name: 'Petrol blue velvet', hex: '#2F4E5C', tags: ['velvet', 'blue', 'accent'] },
      { code: 'TX-VEL-RU', name: 'Rust velvet', hex: '#9C5537', tags: ['velvet', 'orange', 'accent'] },
      { code: 'TX-VEL-MU', name: 'Mustard velvet', hex: '#B08A3C', tags: ['velvet', 'yellow', 'accent'] },
      { code: 'TX-VEL-PL', name: 'Plum velvet', hex: '#5B3B4C', tags: ['velvet', 'violet', 'accent'] },
      { code: 'TX-WOL-TE', name: 'Terracotta wool', hex: '#A8603F', tags: ['wool', 'orange', 'accent'] },
      { code: 'TX-COT-OL', name: 'Olive cotton', hex: '#6E6F4B', tags: ['cotton', 'green'] },
    ],
  ),

  ...define(
    {
      brand: 'Generic',
      category: 'metal',
      provenance: 'generic',
      surfaces: ['accent', 'furniture'],
      collection: 'Ironmongery & trim',
      idPrefix: 'met',
      pattern: 'metallic',
      sheen: 'satin',
      tags: ['metal', 'hardware', 'tapware'],
    },
    [
      { code: 'MT-BRS', name: 'Brushed brass', hex: '#B49A63', tags: ['brass', 'warm'] },
      { code: 'MT-BRZ', name: 'Antique bronze', hex: '#6E5A44', tags: ['bronze', 'warm', 'dark'] },
      { code: 'MT-COP', name: 'Brushed copper', hex: '#B0765A', tags: ['copper', 'warm'] },
      { code: 'MT-STL', name: 'Brushed stainless', hex: '#ACACAA', tags: ['steel', 'cool'] },
      { code: 'MT-BLK', name: 'Matt black metal', hex: '#2B2B2C', tags: ['black', 'dark'] },
      { code: 'MT-CHR', name: 'Polished chrome', hex: '#C6CACC', sheen: 'gloss', tags: ['chrome', 'cool'] },
    ],
  ),
];
