import { RequestHandler, Request, NextFunction, Response } from "express";
// import {newRequest} from "../types/express"
// Define a type for the request handler which can be an async or a normal function
type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => void | Promise<void|Response>;

class AsyncHandler {
  static wrap(requestHandler: AsyncRequestHandler) {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(requestHandler(req, res, next)).catch((err: any) => {
        console.log("ERROR FROM REQUEST HANDLER FUNCTION: " + err);
        if (next) next(err);
        else {
          res.status(500).send("An error occurred");
          console.log(
            "ERROR FROM REQUEST HANDLER FUNCTION when next does not exist if using middleware"
          );
        }
      });
    };
  }

}

export  {AsyncHandler};
