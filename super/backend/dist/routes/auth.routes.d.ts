import { Request, Response } from 'express';
declare const router: import("express-serve-static-core").Router;
export declare const verifySuperAdmin: (req: Request, res: Response, next: any) => Promise<Response<any, Record<string, any>> | undefined>;
export default router;
