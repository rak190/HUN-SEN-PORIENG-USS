export type AddressParts = {
  village: string;
  commune: string;
  district: string;
  province: string;
};
export const ADDRESS_KEYS = [
  "addr_village",
  "addr_commune",
  "addr_district",
  "addr_province",
] as const;

/** Same address parsing contract used by the existing school workbook export. */
export function parseStudentAddress(addr?: string | null): AddressParts {
  if (!addr?.trim())
    return { village: "", commune: "", district: "", province: "" };
  const raw = addr.trim();
  let village = "",
    commune = "",
    district = "",
    province = "";
  const v = raw.match(
    /ភូមិ\s*([^,\s]+(?:\s+[^,\s]+)*?)(?=\s*(?:ឃុំ|សង្កាត់|ស្រុក|ក្រុង|ខណ្ឌ|ខេត្ត|រាជធានី|$))/,
  );
  const c = raw.match(
    /(?:ឃុំ|សង្កាត់)\s*([^,\s]+(?:\s+[^,\s]+)*?)(?=\s*(?:ស្រុក|ក្រុង|ខណ្ឌ|ខេត្ត|រាជធានី|$))/,
  );
  const d = raw.match(
    /(?:ស្រុក|ក្រុង|ខណ្ឌ)\s*([^,\s]+(?:\s+[^,\s]+)*?)(?=\s*(?:ខេត្ត|រាជធានី|$))/,
  );
  const p = raw.match(/(?:ខេត្ត|រាជធានី)\s*([^,\s]+(?:\s+[^,\s]+)*?)(?=\s*$)/);
  if (v) village = v[1].trim();
  if (c) commune = c[1].trim();
  if (d) district = d[1].trim();
  if (p) province = p[1].trim();
  if (!village && !commune && !district && !province) village = raw;
  return { village, commune, district, province };
}

export function addressCellValue(address: unknown, key: string): string {
  const parts = parseStudentAddress(
    typeof address === "string" ? address : null,
  );
  const index = ADDRESS_KEYS.indexOf(key as (typeof ADDRESS_KEYS)[number]);
  return Object.values(parts)[index] || "";
}

export function mergeAddressCells(
  address: unknown,
  patch: Record<string, unknown>,
): string | null {
  const parts = parseStudentAddress(
    typeof address === "string" ? address : null,
  );
  const names = ["village", "commune", "district", "province"] as const;
  const raw = typeof address === "string" ? address : "";
  const prefixes = [
    "ភូមិ",
    raw.match(/ឃុំ|សង្កាត់/)?.[0] || "ឃុំ",
    raw.match(/ស្រុក|ក្រុង|ខណ្ឌ/)?.[0] || "ស្រុក",
    raw.match(/ខេត្ត|រាជធានី/)?.[0] || "ខេត្ត",
  ];
  ADDRESS_KEYS.forEach((key, i) => {
    if (Object.hasOwn(patch, key))
      parts[names[i]] = String(patch[key] ?? "").trim();
  });
  const values = names.map((name, i) => {
    const value = parts[name];
    if (!value) return "";
    const alreadyPrefixed =
      i === 0
        ? /^ភូមិ/.test(value)
        : i === 1
          ? /^(ឃុំ|សង្កាត់)/.test(value)
          : i === 2
            ? /^(ស្រុក|ក្រុង|ខណ្ឌ)/.test(value)
            : /^(ខេត្ត|រាជធានី)/.test(value);
    return alreadyPrefixed ? value : prefixes[i] + value;
  });
  return values.filter(Boolean).join(" ") || null;
}
