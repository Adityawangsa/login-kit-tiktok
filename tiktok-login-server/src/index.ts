import express, { Application, Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 4000;

// Middlewares
app.use(json());
app.use(urlencoded({ extended: true }));
app.use(cookieParser());

// 404 Handler
app.use((req: Request, res: Response) => {
    res.status(404)
        .json({
            success: true,
            message: `Route not found ${req.method} ${req.originalUrl}`
        });
})

// Global Handler
app.use((err: Error, req: Request, res: Response) => {
    res.status(500)
        .json({
            success: false,
            message: 'Internal Server Error',
            error: err.message
        });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on PORT ${PORT}`);
});

export default app;