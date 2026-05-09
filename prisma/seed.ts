import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  // ============ COUNTRIES ============
  const countries = [
    { code: "CO", name: "Colombia", currency: "COP", language: "es" },
    { code: "US", name: "Estados Unidos", currency: "USD", language: "en" },
    { code: "MX", name: "México", currency: "MXN", language: "es" },
    { code: "AR", name: "Argentina", currency: "ARS", language: "es" },
    { code: "CL", name: "Chile", currency: "CLP", language: "es" },
  ];

  for (const country of countries) {
    await prisma.country.upsert({
      where: { code: country.code },
      update: {},
      create: country,
    });
  }
  console.log("✅ Countries seeded");

  // ============ CITIES ============
  const co = await prisma.country.findUnique({ where: { code: "CO" } });
  const us = await prisma.country.findUnique({ where: { code: "US" } });
  const mx = await prisma.country.findUnique({ where: { code: "MX" } });
  const ar = await prisma.country.findUnique({ where: { code: "AR" } });
  const cl = await prisma.country.findUnique({ where: { code: "CL" } });

  const cities = [
    // Colombia
    { countryId: co!.id, name: "Bogotá", lat: 4.711, lng: -74.0721 },
    { countryId: co!.id, name: "Medellín", lat: 6.2442, lng: -75.5812 },
    { countryId: co!.id, name: "Cali", lat: 3.4516, lng: -76.532 },
    { countryId: co!.id, name: "Barranquilla", lat: 10.9685, lng: -74.7813 },
    { countryId: co!.id, name: "Cartagena", lat: 10.391, lng: -75.4794 },
    { countryId: co!.id, name: "Bucaramanga", lat: 7.1193, lng: -73.1227 },
    { countryId: co!.id, name: "Pereira", lat: 4.8087, lng: -75.6906 },
    { countryId: co!.id, name: "Manizales", lat: 5.0703, lng: -75.5138 },
    { countryId: co!.id, name: "Santa Marta", lat: 11.2408, lng: -74.199 },
    { countryId: co!.id, name: "Cúcuta", lat: 7.8939, lng: -72.5078 },
    // USA
    { countryId: us!.id, name: "Miami", lat: 25.7617, lng: -80.1918 },
    { countryId: us!.id, name: "New York", lat: 40.7128, lng: -74.006 },
    { countryId: us!.id, name: "Los Angeles", lat: 34.0522, lng: -118.2437 },
    { countryId: us!.id, name: "Houston", lat: 29.7604, lng: -95.3698 },
    { countryId: us!.id, name: "Chicago", lat: 41.8781, lng: -87.6298 },
    { countryId: us!.id, name: "Orlando", lat: 28.5383, lng: -81.3792 },
    { countryId: us!.id, name: "Dallas", lat: 32.7767, lng: -96.797 },
    { countryId: us!.id, name: "Atlanta", lat: 33.749, lng: -84.388 },
    { countryId: us!.id, name: "Las Vegas", lat: 36.1699, lng: -115.1398 },
    { countryId: us!.id, name: "Phoenix", lat: 33.4484, lng: -112.074 },
    // México
    { countryId: mx!.id, name: "Ciudad de México", lat: 19.4326, lng: -99.1332 },
    { countryId: mx!.id, name: "Guadalajara", lat: 20.6597, lng: -103.3496 },
    { countryId: mx!.id, name: "Monterrey", lat: 25.6866, lng: -100.3161 },
    { countryId: mx!.id, name: "Cancún", lat: 21.1619, lng: -86.8515 },
    { countryId: mx!.id, name: "Puebla", lat: 19.0414, lng: -98.2063 },
    { countryId: mx!.id, name: "Tijuana", lat: 32.5027, lng: -117.0037 },
    { countryId: mx!.id, name: "Mérida", lat: 20.9674, lng: -89.5926 },
    { countryId: mx!.id, name: "León", lat: 21.1221, lng: -101.6824 },
    { countryId: mx!.id, name: "Querétaro", lat: 20.5888, lng: -100.3899 },
    { countryId: mx!.id, name: "Playa del Carmen", lat: 20.6296, lng: -87.0739 },
    // Argentina
    { countryId: ar!.id, name: "Buenos Aires", lat: -34.6037, lng: -58.3816 },
    { countryId: ar!.id, name: "Córdoba", lat: -31.4201, lng: -64.1888 },
    { countryId: ar!.id, name: "Rosario", lat: -32.9442, lng: -60.6505 },
    { countryId: ar!.id, name: "Mendoza", lat: -32.8908, lng: -68.8272 },
    { countryId: ar!.id, name: "Tucumán", lat: -26.8241, lng: -65.2226 },
    { countryId: ar!.id, name: "Mar del Plata", lat: -38.0023, lng: -57.5575 },
    { countryId: ar!.id, name: "Salta", lat: -24.7859, lng: -65.4117 },
    { countryId: ar!.id, name: "Santa Fe", lat: -31.6333, lng: -60.7 },
    { countryId: ar!.id, name: "Bariloche", lat: -41.1335, lng: -71.3103 },
    { countryId: ar!.id, name: "Neuquén", lat: -38.9516, lng: -68.0591 },
    // Chile
    { countryId: cl!.id, name: "Santiago", lat: -33.4489, lng: -70.6693 },
    { countryId: cl!.id, name: "Valparaíso", lat: -33.0472, lng: -71.6127 },
    { countryId: cl!.id, name: "Concepción", lat: -36.8201, lng: -73.0444 },
    { countryId: cl!.id, name: "Antofagasta", lat: -23.6509, lng: -70.3975 },
    { countryId: cl!.id, name: "Temuco", lat: -38.7359, lng: -72.5904 },
    { countryId: cl!.id, name: "Rancagua", lat: -34.1703, lng: -70.7444 },
    { countryId: cl!.id, name: "Iquique", lat: -20.2307, lng: -70.1357 },
    { countryId: cl!.id, name: "Puerto Montt", lat: -41.4717, lng: -72.9367 },
    { countryId: cl!.id, name: "Viña del Mar", lat: -33.0245, lng: -71.5518 },
    { countryId: cl!.id, name: "La Serena", lat: -29.9027, lng: -71.2519 },
  ];

  for (const city of cities) {
    await prisma.city.upsert({
      where: { countryId_name: { countryId: city.countryId, name: city.name } },
      update: {},
      create: city,
    });
  }
  console.log("✅ Cities seeded (50 cities across 5 countries)");

  console.log("🎉 Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
