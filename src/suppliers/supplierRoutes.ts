import { Router, Request, Response } from 'express';
import { supplierAHotels, supplierBHotels } from './mockData';

export const supplierRouter = Router();

supplierRouter.get('/supplierA/hotels', (req: Request, res: Response): void => {
    if (req.query.simulateDown === 'true') {
        res.status(503).json({ error: 'Supplier A service is temporarily unavailable' });
        return;
    }
    const city = (req.query.city as string)?.toLowerCase();
    const results = city
        ? supplierAHotels.filter(h => h.city.toLowerCase() === city)
        : supplierAHotels;
    res.json(results);
})

supplierRouter.get('/supplierB/hotels', (req: Request, res: Response): void => {
    if (req.query.simulateDown === 'true') {
        res.status(503).json({ error: 'Supplier B service is temporarily unavailable' });
        return;
    }
    const city = (req.query.city as string)?.toLowerCase();
    const results = city
        ? supplierBHotels.filter(h => h.city.toLowerCase() === city)
        : supplierBHotels;
    res.json(results);
});