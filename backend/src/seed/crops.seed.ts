import { pool } from '../db';

export async function seedCrops() {
  const crops = [
    // Kenyan staple crops
    {
      name: 'maize',
      swahili_name: 'mahindi',
      optimal_moisture_min: 50.0,
      optimal_moisture_max: 75.0,
      water_requirement_mm: 25.0,  // mm per week
      growth_days: 120,
      description: 'Kenyan staple food. Requires consistent moisture during tasseling.'
    },
    {
      name: 'kale',
      swahili_name: 'sukuma wiki',
      optimal_moisture_min: 60.0,
      optimal_moisture_max: 85.0,
      water_requirement_mm: 30.0,
      growth_days: 60,
      description: 'Leafy vegetable, needs frequent watering.'
    },
    {
      name: 'tomatoes',
      swahili_name: 'nyanya',
      optimal_moisture_min: 65.0,
      optimal_moisture_max: 80.0,
      water_requirement_mm: 35.0,
      growth_days: 90,
      description: 'Fruit vegetable, sensitive to water stress during flowering.'
    },
    {
      name: 'capsicum',
      swahili_name: 'pilipili hoho',
      optimal_moisture_min: 60.0,
      optimal_moisture_max: 80.0,
      water_requirement_mm: 30.0,
      growth_days: 80,
      description: 'Bell peppers, consistent moisture prevents blossom end rot.'
    },
    {
      name: 'watermelon',
      swahili_name: 'tikiti maji',
      optimal_moisture_min: 70.0,
      optimal_moisture_max: 90.0,
      water_requirement_mm: 40.0,
      growth_days: 85,
      description: 'High water requirement, especially during fruit development.'
    },
    {
      name: 'beans',
      swahili_name: 'maharagwe',
      optimal_moisture_min: 55.0,
      optimal_moisture_max: 75.0,
      water_requirement_mm: 25.0,
      growth_days: 70,
      description: 'Legume, fix nitrogen in soil.'
    },
    {
      name: 'onions',
      swahili_name: 'vitunguu',
      optimal_moisture_min: 55.0,
      optimal_moisture_max: 70.0,
      water_requirement_mm: 20.0,
      growth_days: 120,
      description: 'Reduce water during bulb formation.'
    },
    {
      name: 'irish_potatoes',
      swahili_name: 'viazi',
      optimal_moisture_min: 60.0,
      optimal_moisture_max: 80.0,
      water_requirement_mm: 30.0,
      growth_days: 100,
      description: 'Critical moisture during tuber formation.'
    }
  ];

  for (const crop of crops) {
    await pool.query(
      `
      INSERT INTO crops (name, swahili_name, optimal_moisture_min, optimal_moisture_max, 
                         water_requirement_mm, growth_days, description)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (name) DO NOTHING
    `,
      [
        crop.name,
        crop.swahili_name,
        crop.optimal_moisture_min,
        crop.optimal_moisture_max,
        crop.water_requirement_mm,
        crop.growth_days,
        crop.description,
      ],
    );
  }

  console.log('✅ Kenyan crops data seeded');
}

