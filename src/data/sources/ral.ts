import { define } from '../define';
import type { Material } from '../../domain/types';

/**
 * RAL Classic — the colour standard every EU paint supplier, powder coater and
 * spray-lacquer joinery shop will quote against, Bulgaria included. Because it
 * is a published standard rather than one supplier's range, it is the safest
 * way to specify a wall colour or a lacquered kitchen front and still have it
 * reproducible three years later.
 *
 * The hex values are the conventional sRGB approximations of each RAL chip.
 * RAL is defined by physical reference, not by RGB, so screen colour will drift
 * from the chip — order a fan deck for anything being signed off.
 */

const paintSurfaces = ['wall', 'ceiling', 'accent', 'furniture'] as const;

export const RAL_CLASSIC: Material[] = define(
  {
    brand: 'RAL',
    category: 'paint',
    provenance: 'standard',
    pattern: 'solid',
    sheen: 'matt',
    surfaces: [...paintSurfaces],
    collection: 'RAL Classic',
    idPrefix: 'ral',
    tags: ['paint', 'standard', 'lacquer'],
  },
  [
    // --- whites & off-whites -------------------------------------------------
    { code: 'RAL 9010', name: 'Pure white', hex: '#F1ECE1', tags: ['white'] },
    { code: 'RAL 9016', name: 'Traffic white', hex: '#F6F6F6', tags: ['white', 'cool'] },
    { code: 'RAL 9003', name: 'Signal white', hex: '#F4F4F4', tags: ['white'] },
    { code: 'RAL 9001', name: 'Cream', hex: '#EFEBDC', tags: ['white', 'warm'] },
    { code: 'RAL 9002', name: 'Grey white', hex: '#DFDED4', tags: ['white', 'neutral'] },
    { code: 'RAL 9018', name: 'Papyrus white', hex: '#CFD3CD', tags: ['white', 'cool'] },
    { code: 'RAL 1013', name: 'Oyster white', hex: '#E3D9C6', tags: ['warm', 'off-white'] },
    { code: 'RAL 1015', name: 'Light ivory', hex: '#E6D2B5', tags: ['warm', 'off-white'] },

    // --- warm neutrals -------------------------------------------------------
    { code: 'RAL 1014', name: 'Ivory', hex: '#DDC49A', tags: ['warm', 'beige'] },
    { code: 'RAL 1000', name: 'Green beige', hex: '#CDBA88', tags: ['warm', 'beige'] },
    { code: 'RAL 1001', name: 'Beige', hex: '#D0B084', tags: ['warm', 'beige'] },
    { code: 'RAL 1019', name: 'Grey beige', hex: '#A48F7A', tags: ['warm', 'greige'] },
    { code: 'RAL 1035', name: 'Pearl beige', hex: '#8A836E', tags: ['warm', 'greige'] },
    { code: 'RAL 7006', name: 'Beige grey', hex: '#7C6F64', tags: ['warm', 'greige'] },
    { code: 'RAL 7044', name: 'Silk grey', hex: '#B8B799', tags: ['warm', 'greige'] },
    { code: 'RAL 7032', name: 'Pebble grey', hex: '#B9B9A8', tags: ['neutral', 'greige'] },
    { code: 'RAL 7013', name: 'Brown grey', hex: '#55493D', tags: ['warm', 'dark'] },
    { code: 'RAL 8024', name: 'Beige brown', hex: '#79553D', tags: ['warm', 'brown'] },
    { code: 'RAL 8003', name: 'Clay brown', hex: '#814E30', tags: ['warm', 'brown'] },
    { code: 'RAL 8007', name: 'Fawn brown', hex: '#6C4A2E', tags: ['warm', 'brown'] },
    { code: 'RAL 8011', name: 'Nut brown', hex: '#5B3A29', tags: ['warm', 'brown'] },
    { code: 'RAL 8014', name: 'Sepia brown', hex: '#4A3526', tags: ['warm', 'brown', 'dark'] },
    { code: 'RAL 8017', name: 'Chocolate brown', hex: '#442F29', tags: ['warm', 'brown', 'dark'] },
    { code: 'RAL 8019', name: 'Grey brown', hex: '#3D3635', tags: ['dark', 'brown'] },
    { code: 'RAL 8022', name: 'Black brown', hex: '#1A1718', tags: ['dark', 'near-black'] },

    // --- cool & neutral greys ------------------------------------------------
    { code: 'RAL 7035', name: 'Light grey', hex: '#D7D7D7', tags: ['grey', 'cool'] },
    { code: 'RAL 7047', name: 'Telegrey 4', hex: '#C8C8C7', tags: ['grey', 'neutral'] },
    { code: 'RAL 7038', name: 'Agate grey', hex: '#B5B8B1', tags: ['grey', 'neutral'] },
    { code: 'RAL 7042', name: 'Traffic grey A', hex: '#8D948D', tags: ['grey', 'cool'] },
    { code: 'RAL 7004', name: 'Signal grey', hex: '#9B9B9B', tags: ['grey', 'neutral'] },
    { code: 'RAL 7036', name: 'Platinum grey', hex: '#979392', tags: ['grey', 'warm'] },
    { code: 'RAL 7040', name: 'Window grey', hex: '#9DA1AA', tags: ['grey', 'cool', 'blue'] },
    { code: 'RAL 7001', name: 'Silver grey', hex: '#8A9597', tags: ['grey', 'cool'] },
    { code: 'RAL 7037', name: 'Dusty grey', hex: '#7D7F7D', tags: ['grey', 'neutral'] },
    { code: 'RAL 7039', name: 'Quartz grey', hex: '#6B695F', tags: ['grey', 'warm'] },
    { code: 'RAL 7030', name: 'Stone grey', hex: '#8B8C7A', tags: ['grey', 'warm'] },
    { code: 'RAL 7033', name: 'Cement grey', hex: '#7D8471', tags: ['grey', 'green'] },
    { code: 'RAL 7009', name: 'Green grey', hex: '#4D5645', tags: ['grey', 'green', 'dark'] },
    { code: 'RAL 7015', name: 'Slate grey', hex: '#434B4D', tags: ['grey', 'dark'] },
    { code: 'RAL 7016', name: 'Anthracite grey', hex: '#383E42', tags: ['grey', 'dark', 'bestseller'] },
    { code: 'RAL 7021', name: 'Black grey', hex: '#2F3234', tags: ['grey', 'dark'] },
    { code: 'RAL 9007', name: 'Grey aluminium', hex: '#8F8F8C', tags: ['grey', 'metallic'] },
    { code: 'RAL 9006', name: 'White aluminium', hex: '#A5A5A5', tags: ['grey', 'metallic'] },
    { code: 'RAL 9004', name: 'Signal black', hex: '#282828', tags: ['black'] },
    { code: 'RAL 9005', name: 'Jet black', hex: '#0A0A0A', tags: ['black'] },
    { code: 'RAL 9017', name: 'Traffic black', hex: '#1E1E1E', tags: ['black'] },

    // --- greens --------------------------------------------------------------
    { code: 'RAL 6019', name: 'Pastel green', hex: '#BDECB6', tags: ['green', 'light'] },
    { code: 'RAL 6021', name: 'Pale green', hex: '#89AC76', tags: ['green'] },
    { code: 'RAL 6027', name: 'Light green', hex: '#81C0BB', tags: ['green', 'cool'] },
    { code: 'RAL 6034', name: 'Pastel turquoise', hex: '#7FB5B5', tags: ['green', 'cool'] },
    { code: 'RAL 6013', name: 'Reed green', hex: '#7E7B52', tags: ['green', 'muted'] },
    { code: 'RAL 6011', name: 'Reseda green', hex: '#587246', tags: ['green', 'muted'] },
    { code: 'RAL 6003', name: 'Olive green', hex: '#424632', tags: ['green', 'dark'] },
    { code: 'RAL 6005', name: 'Moss green', hex: '#2F4538', tags: ['green', 'dark', 'bestseller'] },
    { code: 'RAL 6009', name: 'Fir green', hex: '#27352A', tags: ['green', 'dark'] },

    // --- blues ---------------------------------------------------------------
    { code: 'RAL 5024', name: 'Pastel blue', hex: '#6C93A8', tags: ['blue', 'muted'] },
    { code: 'RAL 5014', name: 'Pigeon blue', hex: '#637D96', tags: ['blue', 'muted'] },
    { code: 'RAL 5023', name: 'Distant blue', hex: '#49678D', tags: ['blue'] },
    { code: 'RAL 5000', name: 'Violet blue', hex: '#354D73', tags: ['blue', 'dark'] },
    { code: 'RAL 5008', name: 'Grey blue', hex: '#26363C', tags: ['blue', 'dark'] },
    { code: 'RAL 5011', name: 'Steel blue', hex: '#1A2B3C', tags: ['blue', 'dark'] },
    { code: 'RAL 5013', name: 'Cobalt blue', hex: '#1E213D', tags: ['blue', 'dark'] },

    // --- reds, pinks, terracotta --------------------------------------------
    { code: 'RAL 3014', name: 'Antique pink', hex: '#D36E70', tags: ['red', 'pink'] },
    { code: 'RAL 3012', name: 'Beige red', hex: '#C1876B', tags: ['red', 'terracotta'] },
    { code: 'RAL 2003', name: 'Pastel orange', hex: '#F57F4B', tags: ['orange'] },
    { code: 'RAL 2001', name: 'Red orange', hex: '#C93C20', tags: ['orange', 'bold'] },
    { code: 'RAL 3009', name: 'Oxide red', hex: '#703731', tags: ['red', 'terracotta'] },
    { code: 'RAL 3011', name: 'Brown red', hex: '#792423', tags: ['red', 'dark'] },
    { code: 'RAL 3003', name: 'Ruby red', hex: '#A2231D', tags: ['red', 'bold'] },

    // --- yellows & ochres ----------------------------------------------------
    { code: 'RAL 1002', name: 'Sand yellow', hex: '#D2B04C', tags: ['yellow', 'ochre'] },
    { code: 'RAL 1011', name: 'Brown beige', hex: '#8A6642', tags: ['yellow', 'ochre'] },
    { code: 'RAL 1024', name: 'Ochre yellow', hex: '#BA8F4C', tags: ['yellow', 'ochre'] },
    { code: 'RAL 7034', name: 'Yellow grey', hex: '#8F8B66', tags: ['yellow', 'muted'] },

    // --- violets -------------------------------------------------------------
    { code: 'RAL 4009', name: 'Pastel violet', hex: '#A18594', tags: ['violet', 'muted'] },
    { code: 'RAL 4005', name: 'Blue lilac', hex: '#6C6874', tags: ['violet', 'muted'] },
  ],
);
