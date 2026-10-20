export const APPEARANCE_LIMITS = [6, 5, 6, 6, 4];

export function loadAppearance(row) {
  const raw = [
    row.appear_skin,
    row.appear_hair_style,
    row.appear_hair_color,
    row.appear_top,
    row.appear_pants,
  ];

  return raw.map((value, index) => {
    const number = Number(value);
    return Number.isInteger(number) && number >= 0 && number < APPEARANCE_LIMITS[index] ? number : 0;
  });
}
