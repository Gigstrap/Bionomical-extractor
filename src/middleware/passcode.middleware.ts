import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class PasscodeMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction) {
        const passcode = req.headers['x-passcode'];
        if (passcode !== process.env.PASSCODE) {
            throw new UnauthorizedException('Invalid passcode');
        }
        next();
    }
} 