// Curated brand list for Romanian / European market.
// Sub-brands (BMW M, Alpina, Brabus, AMG etc.) are intentionally omitted —
// the car brand is the manufacturer (BMW, Mercedes-Benz) and the model covers the rest.
// slug maps to car-logos-dataset for logo lookup.

export interface CuratedBrand {
  name: string
  slug: string
}

const europeanBrands: CuratedBrand[] = [
  // --- Romanian / Most popular in RO ---
  { name: 'Dacia',          slug: 'dacia' },
  { name: 'Renault',        slug: 'renault' },
  { name: 'Volkswagen',     slug: 'volkswagen' },
  { name: 'Ford',           slug: 'ford' },
  { name: 'Opel',           slug: 'opel' },
  { name: 'BMW',            slug: 'bmw' },
  { name: 'Mercedes-Benz',  slug: 'mercedes-benz' },
  { name: 'Audi',           slug: 'audi' },
  { name: 'Skoda',          slug: 'skoda' },
  { name: 'Toyota',         slug: 'toyota' },
  { name: 'Hyundai',        slug: 'hyundai' },
  { name: 'Kia',            slug: 'kia' },
  { name: 'Peugeot',        slug: 'peugeot' },
  { name: 'Citroën',        slug: 'citroen' },
  { name: 'Fiat',           slug: 'fiat' },
  { name: 'Nissan',         slug: 'nissan' },
  { name: 'Seat',           slug: 'seat' },
  { name: 'Mazda',          slug: 'mazda' },
  { name: 'Honda',          slug: 'honda' },
  { name: 'Mitsubishi',     slug: 'mitsubishi' },
  { name: 'Suzuki',         slug: 'suzuki' },
  { name: 'Subaru',         slug: 'subaru' },
  { name: 'Volvo',          slug: 'volvo' },

  // --- Premium / Luxury ---
  { name: 'Porsche',        slug: 'porsche' },
  { name: 'Lexus',          slug: 'lexus' },
  { name: 'Land Rover',     slug: 'land-rover' },
  { name: 'Jaguar',         slug: 'jaguar' },
  { name: 'Alfa Romeo',     slug: 'alfa-romeo' },
  { name: 'Maserati',       slug: 'maserati' },
  { name: 'Mini',           slug: 'mini' },
  { name: 'Smart',          slug: 'smart' },
  { name: 'Cupra',          slug: 'cupra' },
  { name: 'DS',             slug: 'ds' },
  { name: 'Infiniti',       slug: 'infiniti' },
  { name: 'Genesis',        slug: 'genesis' },
  { name: 'Lancia',         slug: 'lancia' },

  // --- Supercar / Exotic ---
  { name: 'Ferrari',        slug: 'ferrari' },
  { name: 'Lamborghini',    slug: 'lamborghini' },
  { name: 'Bentley',        slug: 'bentley' },
  { name: 'Rolls-Royce',    slug: 'rolls-royce' },
  { name: 'Aston Martin',   slug: 'aston-martin' },
  { name: 'McLaren',        slug: 'mclaren' },

  // --- American ---
  { name: 'Jeep',           slug: 'jeep' },
  { name: 'Chevrolet',      slug: 'chevrolet' },
  { name: 'Dodge',          slug: 'dodge' },
  { name: 'Cadillac',       slug: 'cadillac' },
  { name: 'Lynk & Co',      slug: 'lynk-and-co' },

  // --- Electric / New ---
  { name: 'Tesla',          slug: 'tesla' },
  { name: 'Polestar',       slug: 'polestar' },
  { name: 'BYD',            slug: 'byd' },
]

export default europeanBrands
