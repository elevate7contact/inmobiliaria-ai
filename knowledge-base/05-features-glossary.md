# Glosario de características y servicios

## Tipos de propiedad (valores exactos en DB)
- **APARTMENT** — Apartamento, departamento, depto, piso, unidad. Vive en edificio.
- **HOUSE** — Casa, vivienda, chalet, casa unifamiliar. Vive en lote propio.
- **LAND** — Lote, terreno, predio. Sin construcción.
- **OFFICE** — Oficina, despacho.
- **COMMERCIAL** — Local comercial, bodega comercial, espacio retail.

## Servicios del edificio / conjunto (campo `services[]`)
Valores que el sistema reconoce:

| Valor | Qué significa |
|---|---|
| `pool` | Piscina común del conjunto |
| `gym` | Gimnasio común |
| `sauna` | Sauna seco o de vapor en zona común |
| `canchas` | Canchas deportivas (tenis, pádel, fútbol, baloncesto) |
| `parking` | Parqueadero / cochera / estacionamiento |
| `bodega` | Espacio adicional de almacenamiento, típicamente en sótano |
| `elevator` | Ascensor / elevador |
| `security` | Seguridad 24/7, portería con personal o cámaras |
| `clubhouse` | Salón social común, espacio para reuniones / eventos |

## Características de la unidad (campo `features[]`)
| Valor | Qué significa |
|---|---|
| `terraza` | Espacio exterior privado grande, tipo deck. Mayor que balcón. |
| `balcon` | Espacio exterior privado pequeño con baranda. |
| `vista` | Panorámica abierta (montaña, ciudad, mar, lago). |
| `exterior` | Apartamento con ventanas hacia exterior del edificio (más luz). |
| `interior` | Apartamento orientado al patio interno (más silencioso, menos vista). |

## Cómo manejar sinónimos del usuario

| Lo que dice el usuario | Mapeo |
|---|---|
| "Apto", "depto", "piso", "unidad" | APARTMENT |
| "Casa", "vivienda" | HOUSE |
| "Terreno", "lote", "predio" | LAND |
| "Parqueadero", "cochera", "estacionamiento", "garaje" | services: parking |
| "Cuarto útil", "bodega de almacenamiento", "depósito" | services: bodega |
| "Salón comunal", "club house", "salón social" | services: clubhouse / features: clubhouse |
| "Vigilancia", "porteros", "celaduría", "cámaras" | services: security |
| "Vista a la montaña", "vista al mar", "panorámica" | features: vista |
| "Balcón", "balconcito" | features: balcon |
| "Terraza", "deck", "patio en piso alto" | features: terraza |

## Unidades y monedas

### Colombia (COP)
- "600 millones" = `600000000` COP
- "1.200 millones" = `1200000000` COP
- "850 mil" (en contexto de arriendo) = `850000` COP

### USA (USD)
- "350K" = `350000` USD
- "1.2M" = `1200000` USD

### Equivalencias rápidas (referencia interna, NO citar como conversión)
1 USD ≈ 4.000 COP (puede variar)
1 USD ≈ 17 MXN
1 USD ≈ 900 ARS oficial (mercado paralelo varía mucho)
1 USD ≈ 950 CLP

**Si el usuario habla en una moneda y los datos están en otra**: filtrá por la moneda del usuario explícitamente. NO conviertas mentalmente.

## Habitaciones y baños
- "1 hab", "monoambiente" → bedrooms: 1
- "2 cuartos", "2 dormitorios", "2 habitaciones", "2 alcobas" → bedrooms: 2
- "Baño social" + "baño principal" + "medio baño" → contá baños completos. Medio baño cuenta como 0.5 pero la mayoría redondea hacia abajo (1.5 → 1).

## Piso (campo `floor`)
- "Piso bajo", "PB", "primer piso" → floor: 1
- "Piso alto" → preferFloorMin: 5 o más, depende del contexto
- "Penthouse" → piso más alto del edificio (no es campo separado, está en title/description)
