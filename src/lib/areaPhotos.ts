/**
 * Area-name → district-photo lookup.
 *
 * Source images live in `public/images/areas/{slug}.webp` (1600×900,
 * cinematic golden-hour shots generated for the V3 imagery rollout).
 * Per the imagery plan: each photo is paired with a recognizable Dubai
 * landmark (Burj Khalifa, Cayan Tower, the Palm, etc.) and uses a slight
 * teal/cyan cast that matches the V3 mint accent.
 *
 * The lookup is forgiving — DLD area names come in slightly varied forms
 * ("Dubai Marina" vs "Marina"; "JBR" vs "Jumeirah Beach Residence"). We
 * normalize on lowercase + trim, then check a handful of common aliases.
 *
 * Returns `null` for any area we don't have a shot of yet — callers should
 * fall back to the existing gradient treatment.
 */

const SLUG_BY_NAME: Record<string, string> = {
  'dubai marina':                'marina',
  'marina':                      'marina',
  'downtown':                    'downtown',
  'downtown dubai':              'downtown',
  'palm jumeirah':               'palm-jumeirah',
  'palm':                        'palm-jumeirah',
  'jbr':                         'jbr',
  'jumeirah beach residence':    'jbr',
  'business bay':                'business-bay',
  'jvc':                         'jvc',
  'jumeirah village circle':     'jvc',
  'jlt':                         'jlt',
  'jumeirah lakes towers':       'jlt',
  'dubai hills':                 'dubai-hills',
  'dubai hills estate':          'dubai-hills',
  'damac lagoons':               'damac-lagoons',
  'mbr city':                    'mbr-city',
  'mohammed bin rashid city':    'mbr-city',
  'mohammed bin rashid':         'mbr-city',
  'mbr':                         'mbr-city',
  'creek harbour':               'creek-harbour',
  'dubai creek harbour':         'creek-harbour',
};

/** Returns a public path to the area photo, or `null` if we don't have one. */
export function getAreaPhotoUrl(name: string | undefined | null): string | null {
  if (!name) return null;
  const key = name.toLowerCase().trim();
  const slug = SLUG_BY_NAME[key];
  return slug ? `/images/areas/${slug}.webp` : null;
}

/** True if we have a shot for this area name. */
export function hasAreaPhoto(name: string | undefined | null): boolean {
  return getAreaPhotoUrl(name) !== null;
}
