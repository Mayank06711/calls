import { RequestHandler, Request, NextFunction, Response } from "express";
// import {newRequest} from "../types/express"
// Define a type for the request handler which can be an async or a normal function
type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => void | Promise<void | Response>;

class AsyncHandler {
  static wrap(requestHandler: AsyncRequestHandler) {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(requestHandler(req, res, next)).catch((err: any) => {
        console.log("ERROR FROM REQUEST HANDLER FUNCTION: " + err);
        next(err);
      });
    };
  }
}

export { AsyncHandler };
