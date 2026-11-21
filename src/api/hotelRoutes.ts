import { Router, Request, Response } from 'express';
import { getHotelsFromRedis } from '../redis/hotelCache';
import { runHotelWorkflow } from '../temporal/client';

export const hotelRouter = Router();

// GET /api/hotels?city=delhi&minPrice=<min>&maxPrice=<max>
hotelRouter.get('/hotels', async (req: Request, res: Response): Promise<void> => {
  const city = (req.query.city as string)?.toLowerCase();

  if (!city) {
    res.status(400).json({ error: 'Query parameter "city" is required.' });
    return;
  }

  const minPrice = req.query.minPrice !== undefined ? parseFloat(req.query.minPrice as string) : undefined;
  const maxPrice = req.query.maxPrice !== undefined ? parseFloat(req.query.maxPrice as string) : undefined;

  try {
    // 1. Check Redis cache first
    let hotels = await getHotelsFromRedis(city, minPrice, maxPrice);

    // 2. Cache miss -> orchestrate via Temporal workflow
    if (hotels === null) {
      console.log(`[API] Cache miss for city "${city}". Triggering Temporal workflow...`);
      await runHotelWorkflow(city);

      // 3. Query Redis with price filter after workflow has saved to Redis
      hotels = await getHotelsFromRedis(city, minPrice, maxPrice);
    }

    res.json(hotels || []);
  } catch (error: any) {
    console.error('[API] Error handling hotel search:', error.message);
    res.status(500).json({ error: 'Internal server error during hotel search.' });
  }
});
