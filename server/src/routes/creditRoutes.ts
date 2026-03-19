import express from "express";
import CreditController from "../controllers/creditController";
import { Middleware } from "../middlewares/middlewares";
import { validate, PurchaseCreditPackSchema, VerifyCreditPurchaseSchema } from "../validation/zodSchema";

const router = express.Router();

// All routes require authentication
router.use(Middleware.VerifyJWT);

router.get("/balance", CreditController.getBalance);
router.get("/transactions", CreditController.getTransactions);
router.get("/packs", CreditController.getPacks);
router.post("/purchase", validate(PurchaseCreditPackSchema), CreditController.purchasePack);
router.post("/verify-purchase", validate(VerifyCreditPurchaseSchema), CreditController.verifyPurchase);

export default router;
