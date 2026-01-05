import { OutfitPairModel } from "../models/clothPairsModel";
import { ClothingItemModel } from "../models/clothModel";
import { Request, Response } from "express";
import { AsyncHandler } from "../utils/AsyncHandler";


class Wardrobe {



  private static async AddCloth(req: Request, res: Response) {

    try {
      const userId = req.user?._id;
      const {type, photoUrl, color, brand, season } = req.body;
      const newCloth = new ClothingItemModel({
        user: userId,
        type,
        photoUrl,
        color,
        brand,
        season: season || 'All',
        
      });


      const savedCloth = await newCloth.save();
      res.status(201).json({
        success: true,
        data: savedCloth
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: "Failed to add cloth",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private static async GetYourCloths(req: Request, res: Response) {
    const userId = req.user?._id;
    const cloths = await ClothingItemModel.find({ user: userId });
    res.status(200).json({
      success: true,
      data: cloths
    });
  }

  private static async GetYourClothById(req: Request, res: Response) {
    const userId = req.user?._id;
    const clothId = req.params.id;
    const cloth = await ClothingItemModel.findById(clothId);
    if (!cloth) {
      return res.status(404).json({
        success: false,
        message: "Cloth not found"
      });
    }
    if(userId?.toString() !== cloth.user.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to access this cloth"
      });
    }
    res.status(200).json({
      success: true,
      data: cloth
    });
  }

  private static async MakePair(req: Request, res: Response) {
    const userId = req.user?._id;
    const {clothIds} = req.body;
    const pair = new OutfitPairModel({
      user: userId,
      clothIds
    }); 
    const savedPair = await pair.save();
    if(!savedPair) {
      return res.status(400).json({
        success: false,
        message: "Failed to create pair"
      });
    }
    res.status(201).json({
      success: true,
      data: savedPair
    });
  }

  private static async GetYourPairs(req: Request, res: Response) {
    const userId = req.user?._id;
    const pairs = await OutfitPairModel.find({ user: userId });
    if(!pairs) {
      return res.status(404).json({
        success: false,
        message: "No pairs found"
      });
    }
    res.status(200).json({
      success: true,
      data: pairs
    });
  }

  private static async GetYourPairById(req: Request, res: Response) {
    const userId = req.user?._id;
    const pairId = req.params.id;
    const pair = await OutfitPairModel.findById(pairId);
    if(!pair) {
      return res.status(404).json({
        success: false,
        message: "Pair not found"
      });
    }
    if(userId?.toString() !== pair.user.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to access this pair"
      });
    }
    res.status(200).json({
      success: true,
      data: pair
    });
  }

  private static async UpdatePair(req: Request, res: Response) {
    const userId = req.user?._id;
    const pairId = req.params.id;
    const {clothIds} = req.body;
    const pair = await OutfitPairModel.findById(pairId);
    if(!pair) {
      return res.status(404).json({
        success: false,
        message: "Pair not found"
      });
    }
    if(clothIds.length !== 2) {
      return res.status(400).json({
        success: false,
        message: "Pair must have exactly 2 clothes"
      });
    }
    if(pair.user.toString() !== userId?.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this pair"
      });
    }
    if(userId?.toString() !== pair.user.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this pair"
      })
    }
    const updatedPair = await OutfitPairModel.findByIdAndUpdate(pairId, {clothIds}, {new: true});
    if(!updatedPair) {
      return res.status(400).json({
        success: false,
        message: "Failed to update pair"
      });
    }
    res.status(200).json({
      success: true,
      data: updatedPair
    });
  }

  public static addCloth = AsyncHandler.wrap(Wardrobe.AddCloth);
  public static getYourCloths = AsyncHandler.wrap(Wardrobe.GetYourCloths);
  public static getYourClothById = AsyncHandler.wrap(Wardrobe.GetYourClothById);
  public static makePair = AsyncHandler.wrap(Wardrobe.MakePair);
  public static getYourPairs = AsyncHandler.wrap(Wardrobe.GetYourPairs);
  public static getYourPairById = AsyncHandler.wrap(Wardrobe.GetYourPairById);
  public static updatePair = AsyncHandler.wrap(Wardrobe.UpdatePair);
}


export default Wardrobe;