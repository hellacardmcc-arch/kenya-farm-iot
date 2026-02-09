// Production backend on Render; override with VITE_API_URL in .env for local dev
export const API_URL =
  import.meta.env.VITE_API_URL || 'https://kenya-farm-backend.onrender.com';

export async function registerFarmer(
  phone: string,
  name: string,
  county: string
): Promise<{ success: boolean; message?: string; farmer?: unknown }> {
  const response = await fetch(`${API_URL}/api/farmers/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, name, county }),
  });
  return response.json();
}

export async function submitReading(
  phone: string,
  moisture: number,
  temperature?: number
): Promise<{ success: boolean; reading?: unknown; advice?: string }> {
  const response = await fetch(`${API_URL}/api/sensor/reading`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, moisture, temperature }),
  });
  return response.json();
}

export async function getFarmerReadings(
  phone: string
): Promise<{ success: boolean; readings?: unknown[] }> {
  const response = await fetch(`${API_URL}/api/farmer/${encodeURIComponent(phone)}/readings`);
  return response.json();
}
