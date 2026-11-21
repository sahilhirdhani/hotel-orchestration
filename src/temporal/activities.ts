import axios from 'axios';
import { RawSupplierHotel, DeduplicatedHotel } from '../types';
import { config } from '../config';
import { saveHotelsToRedis } from '../redis/hotelCache';

export async function fetchSupplierA(city: string): Promise<RawSupplierHotel[]> {
  try {
    const url = `${config.supplierBaseUrl}/supplierA/hotels?city=${encodeURIComponent(city)}`;
    const response = await axios.get<RawSupplierHotel[]>(url, { timeout: 5000 });
    return response.data;
  } catch (error: any) {
    console.error(`[Activity] Supplier A error: ${error.message}`);
    return [];
  }
}

export async function fetchSupplierB(city: string): Promise<RawSupplierHotel[]> {
  try {
    const url = `${config.supplierBaseUrl}/supplierB/hotels?city=${encodeURIComponent(city)}`;
    const response = await axios.get<RawSupplierHotel[]>(url, { timeout: 5000 });
    return response.data;
  } catch (error: any) {
    console.error(`[Activity] Supplier B error: ${error.message}`);
    return [];
  }
}

export async function deduplicateHotels(
  supplierAOffers: RawSupplierHotel[],
  supplierBOffers: RawSupplierHotel[]
): Promise<DeduplicatedHotel[]> {
  const hotelMap = new Map<string, DeduplicatedHotel>();

  // Add all Supplier A offers
  for (const offer of supplierAOffers) {
    const key = offer.name.trim().toLowerCase();
    hotelMap.set(key, {
      name: offer.name,
      price: offer.price,
      supplier: 'Supplier A',
      commissionPct: offer.commissionPct,
    });
  }

  // Compare with Supplier B: pick cheaper price or add if missing
  for (const offer of supplierBOffers) {
    const key = offer.name.trim().toLowerCase();
    const existing = hotelMap.get(key);

    if (!existing) {
      hotelMap.set(key, {
        name: offer.name,
        price: offer.price,
        supplier: 'Supplier B',
        commissionPct: offer.commissionPct,
      });
    } else if (offer.price < existing.price) {
      hotelMap.set(key, {
        name: offer.name,
        price: offer.price,
        supplier: 'Supplier B',
        commissionPct: offer.commissionPct,
      });
    }
  }

  return Array.from(hotelMap.values());
}

export async function saveToRedisActivity(
  city: string,
  hotels: DeduplicatedHotel[]
): Promise<void> {
  await saveHotelsToRedis(city, hotels);
}
