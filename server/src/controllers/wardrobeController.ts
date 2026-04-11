import { ClothingItemModel, IClothingItem } from "../models/clothModel";
import { CollectionModel } from "../models/collectionModel";
import { OutfitModel } from "../models/outfitModel";
import { WearLogModel } from "../models/wearLogModel";
import { StyleProfileModel } from "../models/styleProfileModel";
import { StyleDnaModel } from "../models/styleDnaModel";
import { UserModel } from "../models/userModel";
import { Request, Response } from "express";
import { AsyncHandler } from "../utils/AsyncHandler";
import { ApiError } from "../utils/apiError";
import { MasterEngine, StyleProfileInput } from "../AISugession/masterEngine";
import { OCCASIONS, OUTPUT_COLORS, SEASONS } from "../AISugession/shared";
import { resolveSeason } from "../utils/seasonResolver";
import NotificationService from "../services/notifications";
import { FileHandler } from "../helper/fileHandler";
import * as fs from "fs";
import * as path from "path";
import axios from "axios";
import crypto from "crypto";

// Lazy-init: engines load 1GB+ JSON files, only do it when first needed
let engine: MasterEngine | null = null;
function getEngine(): MasterEngine {
  if (!engine) engine = new MasterEngine();
  return engine;
}

// Lazy-load product catalog (demo JSON)
let productCatalog: Record<string, Record<string, any[]>> | null = null;
function getProductCatalog(): Record<string, Record<string, any[]>> {
  if (!productCatalog) {
    const catalogPath = path.join(__dirname, "../../product_catalog.json");
    if (fs.existsSync(catalogPath)) {
      productCatalog = JSON.parse(fs.readFileSync(catalogPath, "utf-8"));
    } else {
      productCatalog = {};
    }
  }
  return productCatalog!;
}

// ─── Profile Options (descriptions for every enum value) ──────────────────

const PROFILE_OPTIONS = {
  // Required fields (engine core)
  bodyShape: [
    { value: "Trapezoid", description: "Shoulders wider than hips, well-proportioned torso" },
    { value: "Rectangle", description: "Shoulders, waist, and hips are roughly the same width" },
    { value: "Triangle", description: "Hips wider than shoulders, defined waistline" },
    { value: "Inverted_Triangle", description: "Broad shoulders, narrow hips" },
    { value: "Oval", description: "Fuller midsection, narrower shoulders and hips" },
    { value: "Hourglass", description: "Balanced shoulders and hips with a defined waist" },
    { value: "Pear", description: "Hips noticeably wider than shoulders" },
    { value: "Apple", description: "Wider upper body, slimmer legs" },
  ],
  height: [
    { value: "Short", description: "Below average height (under 5'4\" / 163 cm)" },
    { value: "Medium", description: "Average height (5'4\" – 5'8\" / 163–173 cm)" },
    { value: "Tall", description: "Above average height (over 5'8\" / 173 cm)" },
  ],
  skinTone: [
    { value: "Fair", description: "Light complexion, burns easily" },
    { value: "Wheatish", description: "Medium complexion, warm golden tone" },
    { value: "Dusky", description: "Medium-dark complexion, rich warm tone" },
    { value: "Dark Brown", description: "Deep complexion, rich brown tone" },
  ],
  undertone: [
    { value: "Warm", description: "Yellow, golden, or peachy undertones. Veins appear greenish" },
    { value: "Cool", description: "Pink, red, or bluish undertones. Veins appear bluish-purple" },
    { value: "Olive", description: "Green or yellowish-gray undertone. Mix of warm and cool" },
    { value: "Neutral", description: "Mix of warm and cool. Veins appear blue-green" },
  ],
  ageGroup: [
    { value: "GenZ (16-25)", description: "Trend-forward, experimental style" },
    { value: "Young Adult (26-35)", description: "Establishing personal style, career dressing" },
    { value: "Mid-Aged (36-50)", description: "Refined taste, quality over quantity" },
    { value: "Senior (50+)", description: "Timeless elegance, comfort-focused" },
  ],
  fitPreference: [
    { value: "Slim Fit", description: "Close to body, tailored silhouette" },
    { value: "Regular Fit", description: "Comfortable, not too tight or loose" },
    { value: "Oversized", description: "Relaxed, loose-fitting silhouette" },
  ],
  styleVibe: [
    { value: "Classic", description: "Timeless pieces, neutral palette, structured silhouettes" },
    { value: "Trendy", description: "Current fashion trends, statement pieces" },
    { value: "Desi", description: "Traditional Indian wear, ethnic sensibility" },
    { value: "Fusion", description: "Mix of Indian and Western elements" },
    { value: "Old Money", description: "Understated luxury, heritage brands, muted tones" },
  ],

  // Optional Tier 1
  faceShape: [
    { value: "Oval", description: "Forehead slightly wider than chin, balanced proportions" },
    { value: "Round", description: "Equal width and length, soft angles" },
    { value: "Square", description: "Strong jawline, forehead and jaw similar width" },
    { value: "Heart", description: "Wider forehead, narrow chin, prominent cheekbones" },
    { value: "Diamond", description: "Narrow forehead and jaw, wide cheekbones" },
    { value: "Oblong", description: "Longer than wide, straight cheek lines" },
    { value: "Triangle", description: "Wider jawline, narrower forehead" },
  ],
  hairType: [
    { value: "Straight Fine", description: "Straight hair with thin, delicate strands" },
    { value: "Straight Medium", description: "Straight hair with medium thickness" },
    { value: "Straight Coarse", description: "Straight hair with thick, strong strands" },
    { value: "Wavy Fine", description: "Gentle S-shaped waves, fine texture" },
    { value: "Wavy Medium", description: "Defined waves, medium texture" },
    { value: "Wavy Coarse", description: "Strong waves, thick texture" },
    { value: "Curly Loose", description: "Large, loose curls or spirals" },
    { value: "Curly Springy", description: "Springy, well-defined curls" },
    { value: "Curly Tight", description: "Tight, compact curls" },
    { value: "Coily Soft", description: "Soft, S-shaped coils" },
    { value: "Coily Zigzag", description: "Z-shaped coils, sharp angles" },
    { value: "Coily Dense", description: "Dense, tightly packed coils" },
  ],
  hairLength: [
    { value: "Bald", description: "No hair or shaved" },
    { value: "Very Short", description: "Buzz cut or close-cropped" },
    { value: "Short", description: "Above ears (men) / above chin (women)" },
    { value: "Medium", description: "Ear to shoulder length" },
    { value: "Long", description: "Past shoulders" },
    { value: "Very Long", description: "Mid-back or longer" },
  ],
  hairColor: [
    { value: "Black", description: "Deep black hair" },
    { value: "Dark Brown", description: "Rich dark brown" },
    { value: "Medium Brown", description: "Warm medium brown" },
    { value: "Light Brown", description: "Light, sandy brown" },
    { value: "Blonde", description: "Golden to platinum blonde" },
    { value: "Red", description: "Natural red or auburn" },
    { value: "Gray/Silver", description: "Naturally gray or silver" },
    { value: "White", description: "Fully white hair" },
    { value: "Highlighted", description: "Multi-toned highlights" },
    { value: "Colored/Dyed", description: "Fashion-colored or dyed" },
  ],
  eyeShape: [
    { value: "Almond", description: "Pointed at both ends, widest in the middle" },
    { value: "Round", description: "Large, circular shape with visible white around iris" },
    { value: "Hooded", description: "Fold of skin covers the crease when eyes are open" },
    { value: "Upturned", description: "Outer corners lift higher than inner corners" },
    { value: "Downturned", description: "Outer corners dip below inner corners" },
    { value: "Monolid", description: "No visible crease on the eyelid" },
    { value: "Deep Set", description: "Eyes set further back in the skull" },
  ],
  lipShape: [
    { value: "Full", description: "Both lips are naturally plump and full" },
    { value: "Thin", description: "Both lips are naturally slim" },
    { value: "Cupids Bow", description: "Prominent double-peaked upper lip" },
    { value: "Heart", description: "Fuller in the center, thinner at edges" },
    { value: "Wide", description: "Lips extend wide across the face" },
    { value: "Round", description: "Rounded shape, equal proportions" },
    { value: "Bottom Heavy", description: "Lower lip is fuller than upper" },
    { value: "Top Heavy", description: "Upper lip is fuller than lower" },
  ],
  colorPaletteSeason: [
    { value: "Spring", description: "Warm + light: peach, coral, warm yellow, light green" },
    { value: "Summer", description: "Cool + muted: lavender, dusty rose, soft blue, mauve" },
    { value: "Autumn", description: "Warm + deep: rust, olive, mustard, burnt orange, chocolate" },
    { value: "Winter", description: "Cool + bright: jewel tones, black, white, icy pastels" },
  ],

  // Optional Tier 2
  fabricPreferences: [
    { value: "Natural & Breathable", description: "Cotton, linen, silk — comfort in warm weather" },
    { value: "Luxury", description: "Silk, cashmere, fine wool — premium feel" },
    { value: "Easy Care", description: "Wrinkle-free, machine washable, low maintenance" },
    { value: "Performance", description: "Moisture-wicking, stretch, athletic fabrics" },
    { value: "Sustainable", description: "Organic, recycled, eco-friendly materials" },
  ],
  fabricSensitivities: [
    { value: "Wool", description: "Itchy or allergic reaction to wool" },
    { value: "Synthetic", description: "Discomfort with polyester, nylon, etc." },
    { value: "Chemical Dye", description: "Skin reacts to chemical dyes" },
    { value: "Rough Texture", description: "Sensitive to coarse/scratchy fabrics" },
    { value: "None", description: "No fabric sensitivities" },
  ],
  colorPreferences: [
    { value: "Neutrals", description: "Black, white, gray, beige, navy" },
    { value: "Earth Tones", description: "Brown, olive, rust, tan, khaki" },
    { value: "Pastels", description: "Soft pink, baby blue, lavender, mint" },
    { value: "Jewel Tones", description: "Emerald, sapphire, ruby, amethyst" },
    { value: "Brights", description: "Bold red, electric blue, yellow, orange" },
    { value: "Metallics", description: "Gold, silver, rose gold, bronze" },
  ],
  budgetRange: [
    { value: "Ultra Budget", description: "Under ₹500 per piece" },
    { value: "Budget", description: "₹500 – ₹1,500 per piece" },
    { value: "Moderate", description: "₹1,500 – ₹5,000 per piece" },
    { value: "Mid Luxury", description: "₹5,000 – ₹15,000 per piece" },
    { value: "Luxury", description: "₹15,000+ per piece" },
  ],
  lifestyleTypes: [
    { value: "Office Formal", description: "Corporate dress code, suits, formals" },
    { value: "Office Casual", description: "Smart casual workplace attire" },
    { value: "Work From Home", description: "Comfortable yet presentable for video calls" },
    { value: "Casual", description: "Everyday relaxed wear" },
    { value: "Athletic", description: "Gym, sports, active lifestyle" },
    { value: "Social Events", description: "Parties, dinners, gatherings" },
    { value: "Parent Life", description: "Practical, comfortable, easy to move in" },
  ],
  fashionChallenges: [
    { value: "Finding Fit", description: "Difficulty finding clothes that fit well" },
    { value: "Body Confidence", description: "Unsure what flatters your body type" },
    { value: "Color Confusion", description: "Don't know which colors suit you" },
    { value: "Budget", description: "Want to look good on a tight budget" },
    { value: "Time", description: "Too busy to plan outfits" },
  ],
  favoritePatterns: [
    { value: "Solid", description: "Single color, no pattern" },
    { value: "Striped", description: "Horizontal or vertical stripes" },
    { value: "Checked", description: "Checkered or plaid pattern" },
    { value: "Floral", description: "Flower-based prints" },
    { value: "Embroidered", description: "Thread work or embellishments" },
    { value: "Polka Dot", description: "Circular dot pattern" },
    { value: "Abstract", description: "Non-representational artistic patterns" },
    { value: "Printed", description: "Digital or graphic prints" },
  ],
  necklinePreferences: [
    { value: "V-Neck", description: "V-shaped neckline, elongates the torso" },
    { value: "Scoop", description: "Wide, U-shaped neckline" },
    { value: "Crew", description: "Round, close-fitting neckline" },
    { value: "Boat", description: "Wide neckline that follows the collarbone" },
    { value: "Off-Shoulder", description: "Exposes shoulders, sits below collarbone" },
    { value: "Turtleneck", description: "High, close-fitting neckline covering the neck" },
    { value: "Mandarin", description: "Short, stand-up collar (band collar)" },
    { value: "Sweetheart", description: "Heart-shaped neckline, dips in the center" },
  ],
  modestyCoverage: [
    { value: "Very Modest", description: "Full coverage — long sleeves, high necklines, below knee" },
    { value: "Moderate", description: "Covers most areas, some flexibility" },
    { value: "Standard", description: "Typical coverage, open to most styles" },
    { value: "Less Coverage", description: "Comfortable with revealing styles" },
  ],
} as const;

class Wardrobe {

  // ═══════════════════════════════════════════════════════════════════
  //  CLOTHING ITEMS
  // ═══════════════════════════════════════════════════════════════════

  private static async AddCloth(req: Request, res: Response) {
    const userId = req.user?._id;
    const { type, subcategory, photoUrl, thumbnailUrl, color, pattern, fabric, brand, notes, season, occasions, price, purchaseDate } = req.body;

    const newCloth = new ClothingItemModel({
      user: userId,
      type,
      subcategory,
      photoUrl,
      thumbnailUrl,
      color,
      pattern,
      fabric,
      brand,
      notes,
      season: season || "All",
      occasions,
      price,
      purchaseDate,
    });

    const savedCloth = await newCloth.save();
    res.status(201).json({ success: true, data: savedCloth });

    // Fire-and-forget: notify user if this item can be paired
    if (type === "Top" || type === "Bottom") {
      setImmediate(async () => {
        try {
          const oppositeType = type === "Top" ? "Bottom" : "Top";
          const count = await ClothingItemModel.countDocuments({ user: userId, type: oppositeType, isArchived: false });
          if (count > 0) {
            await NotificationService.getInstance().emitUserNotification({
              recipientId: String(userId),
              type: "wardrobe",
              title: "New item added!",
              message: `Your new ${subcategory} can be paired with ${count} ${oppositeType.toLowerCase()}${count > 1 ? "s" : ""}. Generate pairings to see them!`,
              wardrobe: { pairingCount: count, actionType: "new_item" },
              stickyTime: 5000,
            });
          }
        } catch (_) { /* notification failure should never break flow */ }
      });
    }
  }

  private static async AddClothBatch(req: Request, res: Response) {
    const userId = req.user?._id;
    const { items } = req.body; // validated by AddClothBatchSchema

    const docsToInsert = items.map((item: any) => ({
      user: userId,
      type: item.type,
      subcategory: item.subcategory,
      photoUrl: item.photoUrl,
      thumbnailUrl: item.thumbnailUrl,
      color: item.color,
      pattern: item.pattern,
      fabric: item.fabric,
      brand: item.brand,
      notes: item.notes,
      season: item.season || "All",
      occasions: item.occasions,
      price: item.price,
      purchaseDate: item.purchaseDate,
      hasPersonInPhoto: item.hasPersonInPhoto || false,
    }));

    const savedItems = await ClothingItemModel.insertMany(docsToInsert);
    res.status(201).json({ success: true, count: savedItems.length, data: savedItems });

    // Fire-and-forget: single notification for the batch
    setImmediate(async () => {
      try {
        const typeCount: Record<string, number> = {};
        for (const item of savedItems) {
          typeCount[item.type] = (typeCount[item.type] || 0) + 1;
        }
        const summary = Object.entries(typeCount)
          .map(([t, c]) => `${c} ${t.toLowerCase()}${c > 1 ? "s" : ""}`)
          .join(", ");

        await NotificationService.getInstance().emitUserNotification({
          recipientId: String(userId),
          type: "wardrobe",
          title: "Items added to closet!",
          message: `Added ${savedItems.length} item${savedItems.length > 1 ? "s" : ""} to your closet: ${summary}.`,
          wardrobe: { pairingCount: savedItems.length, actionType: "batch_add" },
          stickyTime: 5000,
        });
      } catch (_) { /* notification failure should never break flow */ }
    });
  }

  private static async GetYourCloths(req: Request, res: Response) {
    const userId = req.user?._id;
    const { type, season, isArchived } = req.query;

    const filter: any = { user: userId };
    if (type) filter.type = type;
    if (season) filter.season = season;
    filter.isArchived = isArchived === "true";

    const cloths = await ClothingItemModel.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: cloths.length, data: cloths });
  }

  private static async GetYourClothById(req: Request, res: Response) {
    const userId = req.user?._id;
    const cloth = await ClothingItemModel.findById(req.params.id);
    if (!cloth) throw new ApiError(404, "Clothing item not found");
    if (userId?.toString() !== cloth.user.toString()) throw new ApiError(403, "Not authorized");
    res.status(200).json({ success: true, data: cloth });
  }

  private static async UpdateCloth(req: Request, res: Response) {
    const userId = req.user?._id;
    const cloth = await ClothingItemModel.findById(req.params.id);
    if (!cloth) throw new ApiError(404, "Clothing item not found");
    if (userId?.toString() !== cloth.user.toString()) throw new ApiError(403, "Not authorized");

    const updated = await ClothingItemModel.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.status(200).json({ success: true, data: updated });
  }

  private static async ArchiveCloth(req: Request, res: Response) {
    const userId = req.user?._id;
    const cloth = await ClothingItemModel.findById(req.params.id);
    if (!cloth) throw new ApiError(404, "Clothing item not found");
    if (userId?.toString() !== cloth.user.toString()) throw new ApiError(403, "Not authorized");

    cloth.isArchived = !cloth.isArchived;
    await cloth.save();
    res.status(200).json({ success: true, data: cloth });
  }

  private static async DeleteCloth(req: Request, res: Response) {
    const userId = req.user?._id;
    const cloth = await ClothingItemModel.findById(req.params.id);
    if (!cloth) throw new ApiError(404, "Clothing item not found");
    if (userId?.toString() !== cloth.user.toString()) throw new ApiError(403, "Not authorized");

    const { photoUrl, thumbnailUrl } = cloth;
    await ClothingItemModel.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Clothing item deleted" });

    // Fire-and-forget: clean up cloud storage + remove from collections
    setImmediate(async () => {
      try {
        await Promise.allSettled([
          FileHandler.deleteFromUrl(photoUrl),
          thumbnailUrl ? FileHandler.deleteFromUrl(thumbnailUrl) : Promise.resolve(),
          CollectionModel.updateMany({ user: userId }, { $pull: { itemIds: req.params.id } }),
        ]);
      } catch (_) {}
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  OUTFITS
  // ═══════════════════════════════════════════════════════════════════

  private static async CreateOutfit(req: Request, res: Response) {
    const userId = req.user?._id;
    const { name, itemIds, occasion, season, tags, notes, screenshotUrl, source, flatlayUrl, colorPalette } = req.body;

    const items = await ClothingItemModel.find({ _id: { $in: itemIds }, user: userId });
    if (items.length !== itemIds.length) throw new ApiError(400, "One or more clothing items not found or not yours");

    // Outfit validation: must cover the body (Top+Bottom or Full Body) and have >= 2 items
    const types = new Set(items.map((i) => i.type));
    const hasFullBody = types.has("Full Body");
    const hasTop = types.has("Top");
    const hasBottom = types.has("Bottom");
    if (!hasFullBody && !(hasTop && hasBottom)) {
      throw new ApiError(400, "An outfit needs a Top + Bottom, or a Full Body item (dress, saree, jumpsuit, etc.)");
    }

    const outfit = new OutfitModel({
      user: userId,
      name,
      items: itemIds,
      occasion,
      season,
      tags: tags || [],
      source: source || "manual",
      notes,
      screenshotUrl: screenshotUrl || undefined,
      flatlayUrl: flatlayUrl || undefined,
      colorPalette: colorPalette || undefined,
    });

    const saved = await outfit.save();
    const populated = await saved.populate("items");
    res.status(201).json({ success: true, data: populated });
  }

  private static async GetYourOutfits(req: Request, res: Response) {
    const userId = req.user?._id;
    const { occasion, season, isFavorite, tag } = req.query;

    const filter: any = { user: userId };
    if (occasion) filter.occasion = occasion;
    if (season) filter.season = season;
    if (isFavorite === "true") filter.isFavorite = true;
    if (tag) filter.tags = tag;

    const outfits = await OutfitModel.find(filter)
      .populate("items")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: outfits.length, data: outfits });
  }

  private static async GetOutfitById(req: Request, res: Response) {
    const userId = req.user?._id;
    const outfit = await OutfitModel.findById(req.params.id)
      .populate("items")
      .populate({ path: "user", select: "username fullName" });
    if (!outfit) throw new ApiError(404, "Outfit not found");

    const isOwner = userId?.toString() === outfit.user?._id?.toString() || userId?.toString() === outfit.user?.toString();

    if (!isOwner) {
      // Allow access if outfit is in user's savedOutfits
      const user = await UserModel.findById(userId).select("savedOutfits").lean();
      const oid = (outfit._id as any).toString();
      const isSaved = (user?.savedOutfits || []).some((id: any) => id.toString() === oid);
      if (!isSaved) throw new ApiError(403, "Not authorized");
    }

    res.status(200).json({ success: true, data: outfit });
  }

  private static async UpdateOutfit(req: Request, res: Response) {
    const userId = req.user?._id;
    const outfit = await OutfitModel.findById(req.params.id);
    if (!outfit) throw new ApiError(404, "Outfit not found");
    if (userId?.toString() !== outfit.user.toString()) throw new ApiError(403, "Not authorized");

    const updateData: any = { ...req.body };
    if (req.body.itemIds) {
      const items = await ClothingItemModel.find({ _id: { $in: req.body.itemIds }, user: userId });
      if (items.length !== req.body.itemIds.length) throw new ApiError(400, "One or more items not found or not yours");
      updateData.items = req.body.itemIds;
      delete updateData.itemIds;
    }

    const updated = await OutfitModel.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true }).populate("items");
    res.status(200).json({ success: true, data: updated });
  }

  private static async ToggleFavorite(req: Request, res: Response) {
    const userId = req.user?._id;
    const outfit = await OutfitModel.findById(req.params.id);
    if (!outfit) throw new ApiError(404, "Outfit not found");

    // Allow owner OR anyone who has it in savedOutfits
    const isOwner = userId?.toString() === outfit.user.toString();
    if (!isOwner) {
      const hasSaved = await UserModel.exists({ _id: userId, savedOutfits: outfit._id });
      if (!hasSaved) throw new ApiError(403, "Not authorized");
    }

    outfit.isFavorite = !outfit.isFavorite;
    await outfit.save();
    res.status(200).json({ success: true, data: outfit });
  }

  private static async DeleteOutfit(req: Request, res: Response) {
    const userId = req.user?._id;
    const outfit = await OutfitModel.findById(req.params.id);
    if (!outfit) throw new ApiError(404, "Outfit not found");
    if (userId?.toString() !== outfit.user.toString()) throw new ApiError(403, "Not authorized");

    await OutfitModel.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Outfit deleted" });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  STYLE PROFILE
  // ═══════════════════════════════════════════════════════════════════

  private static async UpsertStyleProfile(req: Request, res: Response) {
    const userId = req.user?._id;
    const profile = await StyleProfileModel.findOneAndUpdate(
      { user: userId },
      { user: userId, ...req.body },
      { new: true, upsert: true, runValidators: true }
    );
    res.status(200).json({ success: true, data: profile });
  }

  private static async GetStyleProfile(req: Request, res: Response) {
    const userId = req.user?._id;
    const profile = await StyleProfileModel.findOne({ user: userId });
    res.status(200).json({ success: true, data: profile || null });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  SUGGESTIONS (MasterEngine)
  // ═══════════════════════════════════════════════════════════════════

  private static async buildProfileInput(
    userId: any,
    gender: string,
    overrides: { occasion: string; season: string },
    city: string = "Delhi",
    country: string = "India",
  ): Promise<StyleProfileInput> {
    const profile = await StyleProfileModel.findOne({ user: userId });
    if (!profile) throw new ApiError(400, "Style profile not set up. Please complete your style profile first.");

    const resolvedSeason = resolveSeason(overrides.season, city, country);

    return {
      gender: gender as "Male" | "Female",
      occasion: overrides.occasion,
      season: resolvedSeason,
      styleVibe: profile.styleVibe,
      ageGroup: profile.ageGroup,
      fitPreference: profile.fitPreference,
      undertone: profile.undertone,
      skinTone: profile.skinTone,
      bodyShape: profile.bodyShape,
      height: profile.height,
    };
  }

  private static async SuggestFullOutfit(req: Request, res: Response) {
    const userId = req.user?._id;
    const { occasion, season } = req.body;

    const userDoc = await UserModel.findById(userId).select("gender city country");
    if (!userDoc) throw new ApiError(404, "User not found");
    if (userDoc.gender === "Not to say") throw new ApiError(400, "Gender is required for outfit suggestions. Please update your profile.");

    const profileInput = await Wardrobe.buildProfileInput(userId, userDoc.gender, { occasion, season }, userDoc.city, userDoc.country);
    const result = getEngine().suggestFullOutfit(profileInput);

    if (!result) {
      return res.status(200).json({
        success: true,
        message: "No exact match found for this combination. Try a different occasion or season.",
        data: null,
      });
    }

    const enriched = await Wardrobe.enrichFullSuggestion(userId, result, userDoc.gender);

    // Generate flat-lay from wardrobe matches (if >= 2 items have nobgUrl)
    const flatlayPayload = Wardrobe.buildFlatlayFromSuggestion(enriched);
    let flatlayData: { flatlayUrl: string; colorPalette: any[] } | null = null;
    if (flatlayPayload) {
      flatlayData = await Wardrobe.callPythonFlatlay(flatlayPayload);
    }

    res.status(200).json({
      success: true,
      data: {
        ...enriched,
        ...(flatlayData && { flatlayUrl: flatlayData.flatlayUrl, colorPalette: flatlayData.colorPalette }),
      },
    });
  }

  private static async SuggestFromItem(req: Request, res: Response) {
    const userId = req.user?._id;
    const { clothingItemId, occasion, season } = req.body;

    const item = await ClothingItemModel.findById(clothingItemId) as IClothingItem | null;
    if (!item) throw new ApiError(404, "Clothing item not found");
    if (userId?.toString() !== item.user.toString()) throw new ApiError(403, "Not authorized");

    const userDoc = await UserModel.findById(userId).select("gender city country");
    if (!userDoc) throw new ApiError(404, "User not found");
    if (userDoc.gender === "Not to say") throw new ApiError(400, "Gender is required for outfit suggestions.");

    const profileInput = await Wardrobe.buildProfileInput(userId, userDoc.gender, { occasion, season }, userDoc.city, userDoc.country);
    const eng = getEngine();

    let result: any;

    if (item.type === "Top") {
      result = eng.suggestFromTop(
        profileInput,
        item.subcategory,
        item.color || "White",
        item.pattern
      );
    } else if (item.type === "Bottom") {
      result = eng.suggestFromBottom(
        profileInput,
        item.subcategory,
        item.color || "Navy",
        item.pattern
      );
    } else {
      throw new ApiError(400, "Suggestions are currently available for Top and Bottom items only.");
    }

    // Enrich with wardrobe matches
    const toMatch: Array<{ item: string; color?: string; type?: "Top" | "Bottom" }> = [];
    if (result.bottom && Array.isArray(result.bottom)) {
      for (const b of result.bottom) toMatch.push({ item: b.item, color: b.color, type: "Bottom" });
    }
    if (result.topSuggestions && Array.isArray(result.topSuggestions)) {
      for (const t of result.topSuggestions) toMatch.push({ item: t.item, color: t.color, type: "Top" });
    }

    const matched = await Wardrobe.matchWardrobe(userId, toMatch);
    const wardrobeMatches: Record<string, any[]> = {};
    for (const m of matched) {
      wardrobeMatches[m.suggestion.item] = m.matches.map(c => ({
        _id: c._id, subcategory: c.subcategory, color: c.color, photoUrl: c.photoUrl, thumbnailUrl: c.thumbnailUrl, nobgUrl: c.nobgUrl, dominantColors: c.dominantColors, pattern: c.pattern,
      }));
    }

    // Attach product recommendations for primary matches (bottom/top)
    const productRecommendations = Wardrobe.buildProductRecs(matched, wardrobeMatches, userDoc.gender);

    // Also attach product recs for layers and footwear (engine returns these bundled)
    const catalog = getProductCatalog();
    const gen = userDoc.gender || "Male";
    if (result.layers?.options) {
      for (const opt of result.layers.options) {
        const key = opt.item;
        if (!productRecommendations[key]) {
          const products = Wardrobe.findCatalogProducts(catalog, key, gen);
          if (products.length > 0) productRecommendations[key] = products.slice(0, 3);
        }
      }
    }
    if (result.footwear?.options) {
      for (const opt of result.footwear.options) {
        const key = opt.item;
        if (!productRecommendations[key]) {
          const products = Wardrobe.findCatalogProducts(catalog, key, gen);
          if (products.length > 0) productRecommendations[key] = products.slice(0, 3);
        }
      }
    }

    res.status(200).json({ success: true, data: { ...result, wardrobeMatches, productRecommendations } });
  }

  private static async SuggestTop(req: Request, res: Response) {
    const userId = req.user?._id;
    const { occasion, season } = req.body;

    const userDoc = await UserModel.findById(userId).select("gender city country");
    if (!userDoc) throw new ApiError(404, "User not found");
    if (userDoc.gender === "Not to say") throw new ApiError(400, "Gender is required for outfit suggestions.");

    const profileInput = await Wardrobe.buildProfileInput(userId, userDoc.gender, { occasion, season }, userDoc.city, userDoc.country);
    const result = getEngine().suggestTop(profileInput);

    // result is OutfitOption[] — each has { label, vibe, top: { item, color } }
    const toMatch: Array<{ item: string; color?: string; type?: "Top" | "Bottom" }> = [];
    for (const opt of result) {
      if (opt.top) toMatch.push({ item: opt.top.item, color: opt.top.color, type: "Top" });
    }

    const matched = await Wardrobe.matchWardrobe(userId, toMatch);
    const wardrobeMatches: Record<string, any[]> = {};
    for (const m of matched) {
      wardrobeMatches[m.suggestion.item] = m.matches.map(c => ({
        _id: c._id, subcategory: c.subcategory, color: c.color, photoUrl: c.photoUrl, thumbnailUrl: c.thumbnailUrl, nobgUrl: c.nobgUrl, dominantColors: c.dominantColors, pattern: c.pattern,
      }));
    }

    const productRecommendations = Wardrobe.buildProductRecs(matched, wardrobeMatches, userDoc.gender);

    res.status(200).json({ success: true, data: { options: result, wardrobeMatches, productRecommendations } });
  }

  private static async SuggestLayer(req: Request, res: Response) {
    const userId = req.user?._id;
    const { clothingItemId, occasion, season } = req.body;

    const item = await ClothingItemModel.findById(clothingItemId) as IClothingItem | null;
    if (!item) throw new ApiError(404, "Clothing item not found");
    if (userId?.toString() !== item.user.toString()) throw new ApiError(403, "Not authorized");
    if (item.type !== "Top") throw new ApiError(400, "Layer suggestions require a Top item.");

    const userDoc = await UserModel.findById(userId).select("gender city country");
    if (!userDoc) throw new ApiError(404, "User not found");
    if (userDoc.gender === "Not to say") throw new ApiError(400, "Gender is required for outfit suggestions.");

    const profileInput = await Wardrobe.buildProfileInput(userId, userDoc.gender, { occasion, season }, userDoc.city, userDoc.country);
    const result = getEngine().suggestLayer(profileInput, item.subcategory, item.color || "White");

    // Wardrobe matching for layer options against user's Outerwear items
    const engineOptions = result.options || [];
    const allOuterwear = await ClothingItemModel.find({ user: userId, type: "Outerwear", isArchived: false });

    const wardrobeMatches: Record<string, any[]> = {};
    const productRecommendations: Record<string, any[]> = {};
    const catalog = getProductCatalog();
    const gen = userDoc.gender || "Male";

    for (const opt of engineOptions) {
      const key = opt.item;
      const matches = allOuterwear.filter(ow => Wardrobe.isSubcategoryMatch(ow.subcategory, opt.item));
      wardrobeMatches[key] = matches.map(c => ({
        _id: c._id, subcategory: c.subcategory, color: c.color, photoUrl: c.photoUrl, thumbnailUrl: c.thumbnailUrl, nobgUrl: c.nobgUrl, dominantColors: c.dominantColors, pattern: c.pattern,
      }));

      // TODO: Re-enable for production — always send product recs for now
      // if (matches.length === 0) {
      const products = Wardrobe.findCatalogProducts(catalog, key, gen);
      if (products.length > 0) productRecommendations[key] = products.slice(0, 3);
      // }
    }

    res.status(200).json({ success: true, data: { ...result, wardrobeMatches, productRecommendations } });
  }

  private static async SuggestFootwear(req: Request, res: Response) {
    const userId = req.user?._id;
    const { topItemId, bottomItemId, occasion, season, layerColor } = req.body;

    const topItem = await ClothingItemModel.findById(topItemId) as IClothingItem | null;
    if (!topItem) throw new ApiError(404, "Top clothing item not found");
    if (userId?.toString() !== topItem.user.toString()) throw new ApiError(403, "Not authorized");
    if (topItem.type !== "Top") throw new ApiError(400, "First item must be a Top.");

    const bottomItem = await ClothingItemModel.findById(bottomItemId) as IClothingItem | null;
    if (!bottomItem) throw new ApiError(404, "Bottom clothing item not found");
    if (userId?.toString() !== bottomItem.user.toString()) throw new ApiError(403, "Not authorized");
    if (bottomItem.type !== "Bottom") throw new ApiError(400, "Second item must be a Bottom.");

    const userDoc = await UserModel.findById(userId).select("gender city country");
    if (!userDoc) throw new ApiError(404, "User not found");
    if (userDoc.gender === "Not to say") throw new ApiError(400, "Gender is required for outfit suggestions.");

    const profileInput = await Wardrobe.buildProfileInput(userId, userDoc.gender, { occasion, season }, userDoc.city, userDoc.country);
    const result = getEngine().suggestFootwear(
      profileInput,
      topItem.subcategory,
      topItem.color || "White",
      bottomItem.subcategory,
      layerColor
    );

    // Wardrobe matching for footwear options against user's Shoes items
    const engineOptions = result.options || [];
    const allShoes = await ClothingItemModel.find({ user: userId, type: "Shoes", isArchived: false });

    const wardrobeMatches: Record<string, any[]> = {};
    const productRecommendations: Record<string, any[]> = {};
    const catalog = getProductCatalog();
    const gen = userDoc.gender || "Male";

    for (const opt of engineOptions) {
      const key = opt.item;
      const matches = allShoes.filter(sh => Wardrobe.isSubcategoryMatch(sh.subcategory, opt.item));
      wardrobeMatches[key] = matches.map(c => ({
        _id: c._id, subcategory: c.subcategory, color: c.color, photoUrl: c.photoUrl, thumbnailUrl: c.thumbnailUrl, nobgUrl: c.nobgUrl, dominantColors: c.dominantColors, pattern: c.pattern,
      }));

      // TODO: Re-enable for production — always send product recs for now
      // if (matches.length === 0) {
      const products = Wardrobe.findCatalogProducts(catalog, key, gen);
      if (products.length > 0) productRecommendations[key] = products.slice(0, 3);
      // }
    }

    res.status(200).json({ success: true, data: { ...result, wardrobeMatches, productRecommendations } });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  WARDROBE MATCHING — bridge engine text output ↔ actual user items
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Given a suggestion item name + color from the engine, find matching items
   * in the user's wardrobe. Uses fuzzy subcategory matching (engine may output
   * "Pajama (Straight)" but user stored "Pajama") and optional color matching.
   */
  private static async matchWardrobe(
    userId: any,
    suggestions: Array<{ item: string; color?: string; type?: string }>
  ): Promise<Array<{ suggestion: { item: string; color?: string }; matches: IClothingItem[] }>> {
    // Fetch all non-archived items for this user in one query
    const allItems = await ClothingItemModel.find({ user: userId, isArchived: false });

    return suggestions.map(({ item, color, type }) => {
      const suggLower = item.toLowerCase().replace(/\s*\[.*?\]\s*/g, "").replace(/\s*\(.*?\)\s*/g, "").trim();

      const matches = allItems.filter(cloth => {
        // Type filter if provided
        if (type && cloth.type !== type) return false;

        // Subcategory fuzzy match: "Pajama (Straight) [Slim/Regular Fit]" should match "Pajama"
        const clothSub = cloth.subcategory.toLowerCase();
        if (clothSub === suggLower) return true;
        if (suggLower.includes(clothSub) || clothSub.includes(suggLower)) return true;

        return false;
      });

      // Sort: exact color matches first
      if (color) {
        const colorLower = color.toLowerCase();
        matches.sort((a, b) => {
          const aMatch = a.color?.toLowerCase() === colorLower ? 0 : 1;
          const bMatch = b.color?.toLowerCase() === colorLower ? 0 : 1;
          return aMatch - bMatch;
        });
      }

      return { suggestion: { item, color }, matches };
    });
  }

  /**
   * Enriches a full suggestion response with wardrobe matches.
   * When no wardrobe match exists for a slot, attaches product recommendations
   * from the demo catalog so the frontend can show "Buy this" options.
   */
  private static async enrichFullSuggestion(userId: any, result: any, gender?: string) {
    const toMatch: Array<{ item: string; color?: string; type?: string }> = [];

    // Top
    if (result.top) {
      toMatch.push({ item: result.top.item, color: result.top.color, type: "Top" });
    }

    // Bottom recommendations
    if (result.bottom && Array.isArray(result.bottom)) {
      for (const b of result.bottom) {
        toMatch.push({ item: b.item, color: b.color, type: "Bottom" });
      }
    }

    // Layer options
    const layerOptions = result.layers?.options || [];
    for (const l of layerOptions) {
      toMatch.push({ item: l.item, color: l.color, type: "Outerwear" });
    }

    // Footwear options
    const footwearOptions = result.footwear?.options || [];
    for (const f of footwearOptions) {
      toMatch.push({ item: f.item, color: f.color, type: "Shoes" });
    }

    const matched = await Wardrobe.matchWardrobe(userId, toMatch);

    // Build a lookup: suggestion item → matches
    const wardrobeMatches: Record<string, any[]> = {};
    for (const m of matched) {
      const key = m.suggestion.item;
      wardrobeMatches[key] = m.matches.map(c => ({
        _id: c._id,
        subcategory: c.subcategory,
        color: c.color,
        photoUrl: c.photoUrl,
        thumbnailUrl: c.thumbnailUrl,
        nobgUrl: c.nobgUrl,
        dominantColors: c.dominantColors,
        pattern: c.pattern,
      }));
    }

    // Type-based fallback: if no exact subcategory match, find ANY item of same type with nobgUrl
    const fallbackItems = await ClothingItemModel.find({
      user: userId,
      isArchived: false,
      nobgUrl: { $exists: true, $ne: null },
    }).select("_id subcategory color photoUrl thumbnailUrl nobgUrl dominantColors pattern type").lean();

    for (const m of matched) {
      const key = m.suggestion.item;
      if (wardrobeMatches[key] && wardrobeMatches[key].length > 0) continue;

      const type = toMatch.find(t => t.item === key)?.type;
      if (!type) continue;

      const fallback = fallbackItems.find((item: any) => item.type === type);
      if (fallback) {
        wardrobeMatches[key] = [{
          _id: fallback._id,
          subcategory: fallback.subcategory,
          color: fallback.color,
          photoUrl: fallback.photoUrl,
          thumbnailUrl: fallback.thumbnailUrl,
          nobgUrl: fallback.nobgUrl,
          dominantColors: fallback.dominantColors,
          pattern: fallback.pattern,
        }];
      }
    }

    // Attach product recommendations — always send for now (frontend decides display)
    const productRecommendations: Record<string, any[]> = {};
    const catalog = getProductCatalog();
    const gen = gender || "Male";

    for (const m of matched) {
      const key = m.suggestion.item;
      // TODO: Re-enable for production
      // if (wardrobeMatches[key] && wardrobeMatches[key].length > 0) continue;

      const products = Wardrobe.findCatalogProducts(catalog, key, gen);
      if (products.length > 0) {
        productRecommendations[key] = products.slice(0, 3);
      }
    }

    return { ...result, wardrobeMatches, productRecommendations };
  }

  /**
   * Shared helper: build product recommendations for unmatched wardrobe items.
   * Used by SuggestFromItem, SuggestTop, and enrichFullSuggestion.
   */
  private static buildProductRecs(
    matched: Array<{ suggestion: { item: string; color?: string }; matches: IClothingItem[] }>,
    wardrobeMatches: Record<string, any[]>,
    gender: string,
  ): Record<string, any[]> {
    const productRecommendations: Record<string, any[]> = {};
    const catalog = getProductCatalog();
    const gen = gender || "Male";

    for (const m of matched) {
      const key = m.suggestion.item;
      // TODO: Re-enable for production — always send product recs for now (frontend decides display)
      // if (wardrobeMatches[key] && wardrobeMatches[key].length > 0) continue;

      const products = Wardrobe.findCatalogProducts(catalog, key, gen);
      if (products.length > 0) {
        productRecommendations[key] = products.slice(0, 3);
      }
    }
    return productRecommendations;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  PROFILE OPTIONS (enum values + descriptions for rich profile)
  // ═══════════════════════════════════════════════════════════════════

  /**
   * GET /profile-options
   * Returns all valid enum values with descriptions for the style profile form.
   * Frontend uses this to render dropdowns, multi-selects, and info tooltips.
   */
  private static async GetProfileOptions(_req: Request, res: Response) {
    res.status(200).json({
      success: true,
      data: {
        required: {
          bodyShape: PROFILE_OPTIONS.bodyShape,
          height: PROFILE_OPTIONS.height,
          skinTone: PROFILE_OPTIONS.skinTone,
          undertone: PROFILE_OPTIONS.undertone,
          ageGroup: PROFILE_OPTIONS.ageGroup,
          fitPreference: PROFILE_OPTIONS.fitPreference,
          styleVibe: PROFILE_OPTIONS.styleVibe,
        },
        optionalTier1: {
          faceShape: PROFILE_OPTIONS.faceShape,
          hairType: PROFILE_OPTIONS.hairType,
          hairLength: PROFILE_OPTIONS.hairLength,
          hairColor: PROFILE_OPTIONS.hairColor,
          eyeShape: PROFILE_OPTIONS.eyeShape,
          lipShape: PROFILE_OPTIONS.lipShape,
          colorPaletteSeason: PROFILE_OPTIONS.colorPaletteSeason,
        },
        optionalTier2: {
          fabricPreferences: PROFILE_OPTIONS.fabricPreferences,
          fabricSensitivities: PROFILE_OPTIONS.fabricSensitivities,
          colorPreferences: PROFILE_OPTIONS.colorPreferences,
          budgetRange: PROFILE_OPTIONS.budgetRange,
          lifestyleTypes: PROFILE_OPTIONS.lifestyleTypes,
          fashionChallenges: PROFILE_OPTIONS.fashionChallenges,
          favoritePatterns: PROFILE_OPTIONS.favoritePatterns,
          necklinePreferences: PROFILE_OPTIONS.necklinePreferences,
          modestyCoverage: PROFILE_OPTIONS.modestyCoverage,
          measurements: {
            fields: ["bust", "waist", "hips", "inseam", "shoulderWidth"],
            unit: "cm",
            description: "All measurements in centimeters. All fields are optional.",
          },
          heightExact: { unit: "cm", min: 50, max: 250, description: "Exact height in centimeters" },
          weight: { unit: "kg", min: 20, max: 300, description: "Weight in kilograms" },
          favoriteBrands: { type: "text", description: "Comma-separated list of favorite brands" },
          styleInspiration: { type: "text", description: "Free text tags for style inspiration" },
        },
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  PRODUCT CATALOG (demo — attach buyable products to suggestions)
  // ═══════════════════════════════════════════════════════════════════

  /**
   * GET /product-catalog?subcategory=Short+Kurta&gender=Male&limit=3
   * Returns demo products for a given subcategory + gender.
   */
  private static async GetProductCatalog(req: Request, res: Response) {
    const { subcategory, gender, limit: limitStr } = req.query;
    if (!subcategory) throw new ApiError(400, "subcategory query parameter is required");

    const catalog = getProductCatalog();
    const sub = subcategory as string;
    const gen = (gender as string) || "Male";
    const limitNum = Math.min(10, Math.max(1, parseInt(limitStr as string, 10) || 3));

    const products = catalog[sub]?.[gen] || [];
    res.status(200).json({
      success: true,
      data: products.slice(0, limitNum),
      meta: { subcategory: sub, gender: gen, totalAvailable: products.length },
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  CLOTH OPTIONS (guided metadata for uploads)
  // ═══════════════════════════════════════════════════════════════════

  // Engine-recognized subcategories — kept in sync with builder_pair item lists
  private static readonly SUBCATEGORIES: Record<string, Record<string, string[]>> = {
    Top: {
      Male: [
        "Short Kurta", "Long Kurta", "Pathani Kurta", "Nehru Jacket",
        "Formal Shirt", "Casual Shirt", "Polo T-Shirt", "Round Neck T-Shirt",
        "Hoodie", "Sherwani", "Bandhgala Jacket", "Sweatshirt", "Winter Coat",
      ],
      Female: [
        "Kurti (Short)", "Kurti (Long/Straight)", "Kurti (Frock Style)",
        "Anarkali", "Saree Blouse", "Sharara Top (Short)", "Kaftan", "Ethnic Jacket",
        "Formal Shirt", "Casual Top/T-Shirt", "Crop Top", "Peplum Top",
        "Tube/Off-Shoulder Top", "Blazer", "Winter Long Coat", "Sweater",
      ],
    },
    Bottom: {
      Male: [
        "Jeans", "Chinos", "Formal Trousers", "Joggers", "Cargo Pants",
        "Pajama", "Churidar", "Dhoti Pants", "Salwar", "Shorts",
      ],
      Female: [
        "Leggings", "Churidar", "Palazzo", "Sharara Pants", "Gharara Pants",
        "Patiala Salwar", "Dhoti Pants", "Lehenga Skirt", "Saree (Drape)",
        "Jeans", "Jeans (High-Waist)", "Cigarette Pants", "Formal Trousers",
        "Long Skirt", "Short Skirt/Shorts", "Joggers",
      ],
    },
    Shoes: {
      Male: [
        "Oxford Shoes", "Derby Shoes", "Loafers", "Mojaris", "Kolhapuris",
        "Sneakers", "Chelsea Boots", "Desert Boots", "Slides", "Sandals",
      ],
      Female: [
        "Heels", "Block Heels", "Wedges", "Juttis", "Kolhapuris",
        "Sneakers", "Flats", "Ankle Boots", "Stilettos", "Mules", "Sandals",
      ],
    },
    Accessory: {
      Male: ["Watch", "Bracelet", "Pocket Square", "Tie", "Cufflinks", "Sunglasses", "Belt", "Brooch"],
      Female: ["Earrings", "Necklace", "Bangles", "Clutch", "Watch", "Sunglasses", "Belt", "Hair Accessory"],
    },
    Outerwear: {
      Male: ["Blazer", "Waistcoat", "Bomber Jacket", "Leather Jacket", "Denim Jacket", "Overcoat", "Windbreaker"],
      Female: ["Blazer", "Shrug", "Cape", "Denim Jacket", "Leather Jacket", "Trench Coat", "Poncho"],
    },
    "Full Body": {
      Male: ["Sherwani Set", "Kurta Pajama Set", "Achkan Set", "Jumpsuit", "Overalls"],
      Female: [
        "Saree", "Anarkali Suit", "Lehenga Set", "Salwar Kameez Set", "Co-ord Set",
        "Gown", "Maxi Dress", "Midi Dress", "Mini Dress", "A-Line Dress",
        "Bodycon Dress", "Wrap Dress", "Shift Dress", "Shirt Dress",
        "Jumpsuit", "Romper", "Kaftan",
      ],
    },
  };

  private static readonly PATTERNS = [
    "Solid", "Striped", "Checked", "Floral", "Embroidered", "Polka Dot", "Abstract", "Printed",
  ];

  private static readonly FABRICS = [
    "Cotton", "Silk", "Linen", "Denim", "Wool", "Polyester",
    "Chiffon", "Velvet", "Satin", "Leather", "Georgette", "Crepe", "Khadi", "Other",
  ];

  private static readonly OCCASION_TAGS = [
    "Wedding", "Office", "Casual", "Party", "Travel", "Festive", "Date Night", "Sports", "Lounge",
  ];

  /**
   * GET /cloth-options?gender=Male
   * Returns all valid options for guided metadata input during photo upload.
   * If gender is provided, subcategories are filtered to that gender.
   * If not, both Male and Female subcategories are returned.
   */
  private static async GetClothOptions(req: Request, res: Response) {
    const gender = req.query.gender as string | undefined;

    // Build subcategories — filter by gender if provided
    const subcategories: Record<string, string[] | Record<string, string[]>> = {};
    for (const [type, genderMap] of Object.entries(Wardrobe.SUBCATEGORIES)) {
      if (gender && (gender === "Male" || gender === "Female")) {
        subcategories[type] = genderMap[gender] || [];
      } else {
        subcategories[type] = genderMap;
      }
    }

    res.status(200).json({
      success: true,
      data: {
        types: ["Top", "Bottom", "Shoes", "Accessory", "Outerwear", "Full Body"],
        subcategories,
        colors: [...OUTPUT_COLORS],
        patterns: Wardrobe.PATTERNS,
        fabrics: Wardrobe.FABRICS,
        seasons: ["Summer", "Winter", "Monsoon", "All"],
        occasions: Wardrobe.OCCASION_TAGS,
        engineOccasions: [...OCCASIONS],
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  GENERATE PAIRINGS — scan wardrobe + engine → ready-made outfits
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Helper: strip engine modifiers for fuzzy matching.
   * "Pajama (Straight) [Slim/Regular Fit]" → "pajama"
   */
  private static normalizeForMatch(name: string): string {
    return name.toLowerCase().replace(/\s*\[.*?\]\s*/g, "").replace(/\s*\(.*?\)\s*/g, "").trim();
  }

  /**
   * Helper: check if a wardrobe item matches an engine suggestion name.
   */
  private static isSubcategoryMatch(clothSub: string, engineSugg: string): boolean {
    const a = clothSub.toLowerCase();
    const b = Wardrobe.normalizeForMatch(engineSugg);
    return a === b || b.includes(a) || a.includes(b);
  }

  /**
   * Helper: fuzzy lookup in product catalog.
   * Engine may output "Blue Jeans / Black Trousers" but catalog key is "Jeans".
   * Tries: exact → contains match → "/" split parts.
   */
  // Map generic engine archetype names to specific catalog keys
  private static readonly GENERIC_TO_CATALOG: Record<string, string> = {
    // Layers
    "standard layer": "Blazer",
    "contrast layer": "Denim Jacket",
    "statement layer": "Nehru Jacket",
    "classic layer": "Blazer",
    "neutral layer": "Blazer",
    "bold layer": "Leather Biker Jacket",
    // Shoes
    "classic shoes": "Oxford Shoes",
    "statement shoes": "Sneakers",
    "comfort shoes": "Loafers",
    "formal shoes": "Oxford Shoes",
    "casual shoes": "Sneakers",
    "trendy shoes": "Sneakers",
    // Common engine color+garment outputs
    "white shirt": "Formal Shirt",
    "light shirt": "Formal Shirt",
    "dark shirt": "Casual Shirt",
    "colored shirt": "Casual Shirt",
    "plain shirt": "Formal Shirt",
    "printed shirt": "Casual Shirt",
    "black jeans": "Jeans",
    "blue jeans": "Jeans",
    "dark jeans": "Jeans",
    "slim jeans": "Jeans",
    "skinny jeans": "Jeans",
    "dark trousers": "Formal Trousers",
    "light trousers": "Formal Trousers",
    "black trousers": "Formal Trousers",
    "navy blazer": "Blazer",
    "black blazer": "Blazer",
    "dark blazer": "Blazer",
    "brown boots": "Chelsea Boots",
    "black boots": "Chelsea Boots",
    "leather boots": "Chelsea Boots",
    "white sneakers": "Sneakers",
    "black sneakers": "Sneakers",
    "casual sneakers": "Sneakers",
    "white t-shirt": "Round Neck T-Shirt",
    "black t-shirt": "Round Neck T-Shirt",
    "plain t-shirt": "Round Neck T-Shirt",
    "graphic tee": "Graphic T-Shirt",
  };

  // Garment-type keyword → default catalog category (fallback when all else fails)
  private static readonly GARMENT_DEFAULTS: Record<string, string> = {
    "shirt": "Casual Shirt",
    "jeans": "Jeans",
    "trouser": "Formal Trousers",
    "pant": "Formal Trousers",
    "chino": "Chinos",
    "blazer": "Blazer",
    "jacket": "Denim Jacket",
    "boot": "Chelsea Boots",
    "sneaker": "Sneakers",
    "loafer": "Loafers",
    "hoodie": "Hoodie",
    "kurta": "Short Kurta",
    "kurti": "Kurti (Short)",
    "t-shirt": "Round Neck T-Shirt",
    "tee": "Round Neck T-Shirt",
    "coat": "Winter Coat",
    "shorts": "Shorts",
    "jogger": "Joggers",
    "oxford": "Oxford Shoes",
    "mojari": "Mojaris",
    "sandal": "Leather Sandals",
    "heel": "Heels",
    "flat": "Flats",
    "saree": "Saree (Drape)",
    "lehenga": "Lehenga Skirt",
  };

  private static findCatalogProducts(
    catalog: Record<string, Record<string, any[]>>,
    engineName: string,
    gender: string,
  ): any[] {
    const clean = engineName.replace(/\s*\[.*?\]\s*/g, "").replace(/\s*\(.*?\)\s*/g, "").trim();

    // 1. Exact match
    const exact = catalog[clean]?.[gender] || catalog[engineName]?.[gender];
    if (exact && exact.length > 0) return exact;

    // 2. Generic engine archetype → specific catalog key
    const mapped = Wardrobe.GENERIC_TO_CATALOG[clean.toLowerCase()];
    if (mapped) {
      const products = catalog[mapped]?.[gender];
      if (products && products.length > 0) return products;
    }

    // 3. Fuzzy: catalog key contained in engine name or vice-versa
    const lower = clean.toLowerCase();
    for (const ck of Object.keys(catalog)) {
      const ckl = ck.toLowerCase();
      if (lower.includes(ckl) || ckl.includes(lower)) {
        const products = catalog[ck]?.[gender];
        if (products && products.length > 0) return products;
      }
    }

    // 4. Split on "/" and try each alternative
    const parts = lower.split(/\s*\/\s*/);
    if (parts.length > 1) {
      for (const part of parts) {
        const trimmed = part.trim();
        for (const ck of Object.keys(catalog)) {
          const ckl = ck.toLowerCase();
          if (trimmed.includes(ckl) || ckl.includes(trimmed)) {
            const products = catalog[ck]?.[gender];
            if (products && products.length > 0) return products;
          }
        }
      }
    }

    // 5. Garment-type keyword fallback: "White Shirt" → keyword "shirt" → "Casual Shirt"
    for (const [keyword, defaultCat] of Object.entries(Wardrobe.GARMENT_DEFAULTS)) {
      if (lower.includes(keyword)) {
        const products = catalog[defaultCat]?.[gender];
        if (products && products.length > 0) return products;
      }
    }

    return [];
  }

  /**
   * POST /generate-pairings
   * Scans user's wardrobe, runs each Top through the engine pipeline,
   * matches bottom suggestions against user's owned Bottoms.
   * Returns ready-made pairings + unpaired items.
   */
  private static async GeneratePairings(req: Request, res: Response) {
    const userId = req.user?._id;
    const { occasion, season, page, limit } = req.body;

    // 1. Fetch user + profile
    const userDoc = await UserModel.findById(userId).select("gender city country");
    if (!userDoc) throw new ApiError(404, "User not found");
    if (userDoc.gender === "Not to say") throw new ApiError(400, "Gender is required for outfit suggestions.");

    const profileInput = await Wardrobe.buildProfileInput(userId, userDoc.gender, { occasion, season }, userDoc.city, userDoc.country);

    // 2. Fetch ALL non-archived items (lean + projection for perf)
    //    We need Shoes + Outerwear too, to match layer/footwear suggestions
    const allItems = await ClothingItemModel.find({
      user: userId,
      isArchived: false,
    }).select("type subcategory color pattern photoUrl thumbnailUrl nobgUrl dominantColors").lean();

    const tops = allItems.filter(i => i.type === "Top");
    const bottoms = allItems.filter(i => i.type === "Bottom");
    const shoes = allItems.filter(i => i.type === "Shoes");
    const outerwear = allItems.filter(i => i.type === "Outerwear");

    if (tops.length === 0 && bottoms.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No clothing items in wardrobe. Add some tops and bottoms first.",
        data: { pairings: [], unpaired: { tops: [], bottoms: [] } },
      });
    }

    const eng = getEngine();
    const seen = new Set<string>(); // "topId|bottomId" dedup
    const pairings: any[] = [];
    const pairedTopIds = new Set<string>();
    const pairedBottomIds = new Set<string>();

    // Helper: match engine layer suggestions against user's Outerwear items
    const matchLayers = (layerResult: any) => {
      const engineOptions = layerResult.options || [];
      const owned: any[] = [];
      for (const opt of engineOptions) {
        for (const ow of outerwear) {
          if (Wardrobe.isSubcategoryMatch(ow.subcategory, opt.item)) {
            owned.push({
              _id: ow._id, subcategory: ow.subcategory, color: ow.color, photoUrl: ow.photoUrl, thumbnailUrl: ow.thumbnailUrl,
              nobgUrl: ow.nobgUrl, dominantColors: ow.dominantColors,
              matchedSuggestion: opt.type, // "Classic" | "Contrast" | "Statement"
            });
          }
        }
      }
      return { suggestions: engineOptions, owned };
    };

    // Helper: match engine footwear suggestions against user's Shoes items
    const matchFootwear = (footwearResult: any) => {
      const engineOptions = footwearResult.options || [];
      const owned: any[] = [];
      for (const opt of engineOptions) {
        for (const sh of shoes) {
          if (Wardrobe.isSubcategoryMatch(sh.subcategory, opt.item)) {
            owned.push({
              _id: sh._id, subcategory: sh.subcategory, color: sh.color, photoUrl: sh.photoUrl, thumbnailUrl: sh.thumbnailUrl,
              nobgUrl: sh.nobgUrl, dominantColors: sh.dominantColors,
              matchedSuggestion: opt.type, // "Classic" | "Trendy" | "Comfort"
            });
          }
        }
      }
      return { suggestions: engineOptions, owned };
    };

    // Helper: assign role to an item for the unified items array
    const assignRole = (item: any, type: string, topSub?: string, botSub?: string): string => {
      if (type === "Top") return "base_top";
      if (type === "Bottom") {
        // Saree detection: if top is "Saree Blouse" and bottom is "Saree (Drape)"
        if (topSub && botSub) {
          const tl = topSub.toLowerCase();
          const bl = botSub.toLowerCase();
          if (tl.includes("saree blouse") && bl.includes("saree")) return "drape";
        }
        return "bottom";
      }
      if (type === "Outerwear") return "outer_layer";
      if (type === "Shoes") return "footwear";
      return "base_top";
    };

    // Helper: build unified items array for a pairing
    const buildItems = (top: any, bot: any, ownedLayers: any[], ownedFootwear: any[]) => {
      const items: any[] = [
        { _id: top._id, subcategory: top.subcategory, color: top.color, photoUrl: top.photoUrl, thumbnailUrl: top.thumbnailUrl, nobgUrl: top.nobgUrl, dominantColors: top.dominantColors, role: assignRole(top, "Top", top.subcategory, bot.subcategory) },
        { _id: bot._id, subcategory: bot.subcategory, color: bot.color, photoUrl: bot.photoUrl, thumbnailUrl: bot.thumbnailUrl, nobgUrl: bot.nobgUrl, dominantColors: bot.dominantColors, role: assignRole(bot, "Bottom", top.subcategory, bot.subcategory) },
      ];
      for (const l of ownedLayers) {
        items.push({ _id: l._id, subcategory: l.subcategory, color: l.color, photoUrl: l.photoUrl, thumbnailUrl: l.thumbnailUrl, nobgUrl: l.nobgUrl, dominantColors: l.dominantColors, role: "outer_layer" });
      }
      for (const f of ownedFootwear) {
        items.push({ _id: f._id, subcategory: f.subcategory, color: f.color, photoUrl: f.photoUrl, thumbnailUrl: f.thumbnailUrl, nobgUrl: f.nobgUrl, dominantColors: f.dominantColors, role: "footwear" });
      }
      return items;
    };

    // 3. Forward pass: each Top → engine suggests bottoms → match against user's bottoms
    for (const top of tops) {
      const result = eng.suggestFromTop(
        profileInput,
        top.subcategory,
        top.color || "White",
        top.pattern as string | undefined,
      );

      const bottomSuggs = result.bottom || [];

      for (const sugg of bottomSuggs) {
        for (const bot of bottoms) {
          if (!Wardrobe.isSubcategoryMatch(bot.subcategory, sugg.item)) continue;

          const key = `${top._id}|${bot._id}`;
          if (seen.has(key)) continue;
          seen.add(key);

          // Get layer + footwear for this pair, then match against wardrobe
          const layerResult = eng.suggestLayer(profileInput, top.subcategory, top.color || "White");
          const footwearResult = eng.suggestFootwear(
            profileInput,
            top.subcategory,
            top.color || "White",
            bot.subcategory,
            layerResult.options?.[0]?.color,
          );

          const layers = matchLayers(layerResult);
          const footwear = matchFootwear(footwearResult);

          pairings.push({
            id: `pairing_${pairings.length}`,
            vibe: sugg.vibe,
            top: { _id: top._id, subcategory: top.subcategory, color: top.color, photoUrl: top.photoUrl, thumbnailUrl: top.thumbnailUrl, nobgUrl: top.nobgUrl, dominantColors: top.dominantColors },
            bottom: { _id: bot._id, subcategory: bot.subcategory, color: bot.color, photoUrl: bot.photoUrl, thumbnailUrl: bot.thumbnailUrl, nobgUrl: bot.nobgUrl, dominantColors: bot.dominantColors },
            items: buildItems(top, bot, layers.owned, footwear.owned),
            layers,
            footwear,
            occasion,
            season: profileInput.season,
          });

          pairedTopIds.add(String(top._id));
          pairedBottomIds.add(String(bot._id));
        }
      }
    }

    // 4. Reverse pass: each Bottom → engine suggests tops → match against user's tops
    for (const bot of bottoms) {
      const result = eng.suggestFromBottom(
        profileInput,
        bot.subcategory,
        bot.color || "Navy",
        bot.pattern as string | undefined,
      );

      const topSuggs = result.topSuggestions || [];

      for (const sugg of topSuggs) {
        for (const top of tops) {
          if (!Wardrobe.isSubcategoryMatch(top.subcategory, sugg.item)) continue;

          const key = `${top._id}|${bot._id}`;
          if (seen.has(key)) continue;
          seen.add(key);

          const layerResult = eng.suggestLayer(profileInput, top.subcategory, top.color || "White");
          const footwearResult = eng.suggestFootwear(
            profileInput,
            top.subcategory,
            top.color || "White",
            bot.subcategory,
            layerResult.options?.[0]?.color,
          );

          const layers = matchLayers(layerResult);
          const footwear = matchFootwear(footwearResult);

          pairings.push({
            id: `pairing_${pairings.length}`,
            vibe: sugg.vibe,
            top: { _id: top._id, subcategory: top.subcategory, color: top.color, photoUrl: top.photoUrl, thumbnailUrl: top.thumbnailUrl, nobgUrl: top.nobgUrl, dominantColors: top.dominantColors },
            bottom: { _id: bot._id, subcategory: bot.subcategory, color: bot.color, photoUrl: bot.photoUrl, thumbnailUrl: bot.thumbnailUrl, nobgUrl: bot.nobgUrl, dominantColors: bot.dominantColors },
            items: buildItems(top, bot, layers.owned, footwear.owned),
            layers,
            footwear,
            occasion,
            season: profileInput.season,
          });

          pairedTopIds.add(String(top._id));
          pairedBottomIds.add(String(bot._id));
        }
      }
    }

    // 5. Collect unpaired items
    const unpairedTops = tops
      .filter(t => !pairedTopIds.has(String(t._id)))
      .map(t => ({ _id: t._id, subcategory: t.subcategory, color: t.color, reason: "No matching bottom in wardrobe" }));

    const unpairedBottoms = bottoms
      .filter(b => !pairedBottomIds.has(String(b._id)))
      .map(b => ({ _id: b._id, subcategory: b.subcategory, color: b.color, reason: "No matching top in wardrobe" }));

    // 6. Paginate pairings
    const totalPairings = pairings.length;
    const totalPages = Math.ceil(totalPairings / limit);
    const start = (page - 1) * limit;
    const paginatedPairings = pairings.slice(start, start + limit);

    res.status(200).json({
      success: true,
      data: {
        pairings: paginatedPairings,
        unpaired: { tops: unpairedTops, bottoms: unpairedBottoms },
        pagination: {
          page,
          limit,
          totalPairings,
          totalPages,
          hasNextPage: page < totalPages,
        },
      },
    });

    // Fire-and-forget: generate flat-lays for top pairings + notify user
    if (totalPairings > 0) {
      setImmediate(async () => {
        try {
          const resolvedSeason = profileInput.season;

          // Attempt to generate flat-lays for up to 3 pairings that have nobgUrl items
          const flatlayPayloads = paginatedPairings
            .slice(0, 3)
            .map(p => Wardrobe.buildFlatlayPayload(p))
            .filter((p): p is NonNullable<typeof p> => p !== null);

          let flatlayThumbnails: string[] = [];
          if (flatlayPayloads.length > 0) {
            const results = await Promise.allSettled(
              flatlayPayloads.map(payload => Wardrobe.callPythonFlatlay(payload))
            );
            flatlayThumbnails = results
              .filter((r): r is PromiseFulfilledResult<NonNullable<Awaited<ReturnType<typeof Wardrobe.callPythonFlatlay>>>> =>
                r.status === "fulfilled" && r.value?.flatlayUrl != null
              )
              .map(r => r.value.flatlayUrl);
          }

          // Fallback to individual item thumbnails if no flat-lays generated
          const thumbnails = flatlayThumbnails.length > 0 ? flatlayThumbnails : (() => {
            const thumbs: string[] = [];
            for (const p of pairings) {
              if (p.top.thumbnailUrl && thumbs.length < 4) thumbs.push(p.top.thumbnailUrl);
              if (p.bottom.thumbnailUrl && thumbs.length < 4) thumbs.push(p.bottom.thumbnailUrl);
              if (thumbs.length >= 4) break;
            }
            return thumbs;
          })();

          await NotificationService.getInstance().emitUserNotification({
            recipientId: String(userId),
            type: "wardrobe",
            title: "Pairings ready!",
            message: `We found ${totalPairings} outfit pairings for ${occasion} (${resolvedSeason})!`,
            wardrobe: {
              pairingCount: totalPairings,
              occasion,
              season: resolvedSeason,
              thumbnails,
              actionType: "pairings_generated",
            },
            stickyTime: 5000,
          });
        } catch (_) { /* background failure should never break flow */ }
      });
    }
  }

  /**
   * POST /save-pairing
   * Saves an engine-suggested pairing as an Outfit.
   */
  private static async SavePairing(req: Request, res: Response) {
    const userId = req.user?._id;
    const { itemIds, occasion, season, name, tags, notes, flatlayUrl: providedFlatlayUrl, colorPalette: providedColorPalette } = req.body;

    // Validate all items exist and belong to user
    const items = await ClothingItemModel.find({ _id: { $in: itemIds }, user: userId });
    if (items.length !== itemIds.length) throw new ApiError(400, "One or more clothing items not found or not yours");

    // Generate flat-lay: use provided URL, or generate from items with nobgUrl
    let flatlayUrl = providedFlatlayUrl || undefined;
    let colorPalette = providedColorPalette || undefined;
    let generatedAt: Date | undefined;

    if (!flatlayUrl) {
      const payload = Wardrobe.buildFlatlayFromItems(items);
      if (payload) {
        const result = await Wardrobe.callPythonFlatlay(payload);
        if (result) {
          flatlayUrl = result.flatlayUrl;
          colorPalette = result.colorPalette;
          generatedAt = new Date();
        }
      }
    }

    const outfit = new OutfitModel({
      user: userId,
      name: name || `Suggested Outfit`,
      items: itemIds,
      occasion,
      season,
      tags: tags || [],
      source: "engine_suggested",
      notes,
      ...(flatlayUrl && { flatlayUrl }),
      ...(colorPalette && { colorPalette }),
      ...(generatedAt && { generatedAt }),
    });

    const saved = await outfit.save();
    const populated = await saved.populate("items");
    res.status(201).json({ success: true, data: populated });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  WEAR TRACKING
  // ═══════════════════════════════════════════════════════════════════

  private static async LogWear(req: Request, res: Response) {
    const userId = req.user?._id;
    const { outfitId, wornAt, occasion, notes, weather, status, plannedFor } = req.body;

    const outfit = await OutfitModel.findById(outfitId);
    if (!outfit) throw new ApiError(404, "Outfit not found");
    if (userId?.toString() !== outfit.user.toString()) throw new ApiError(403, "Not authorized");

    const logStatus = status || 'worn';

    const log = new WearLogModel({
      user: userId,
      outfit: outfitId,
      wornAt: logStatus === 'planned' ? undefined : (wornAt ? new Date(wornAt) : new Date()),
      occasion,
      notes,
      weather,
      status: logStatus,
      plannedFor: logStatus === 'planned' && plannedFor ? new Date(plannedFor) : undefined,
    });

    const saved = await log.save();

    // Check streak milestone (only for actual wears)
    if (logStatus === 'worn') {
      try {
        const now = new Date();
        const recentLogs = await WearLogModel.find(
          { user: userId, status: { $in: ['worn', null] }, wornAt: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } },
          { wornAt: 1 }
        ).lean();
        const dateSet = new Set(recentLogs.map((d: any) => new Date(d.wornAt).toDateString()));
        let streak = 0;
        const cursor = new Date(now);
        while (dateSet.has(cursor.toDateString())) {
          streak++;
          cursor.setDate(cursor.getDate() - 1);
        }
        if (streak === 7 || streak === 14 || streak === 30) {
          const notifService = NotificationService.getInstance();
          await notifService.emitUserNotification({
            recipientId: userId!.toString(),
            type: 'wardrobe',
            title: `${streak}-Day Streak!`,
            message: `You've logged outfits for ${streak} days in a row. Keep it up!`,
            wardrobe: { actionType: 'new_item' },
          });
        }
      } catch (_) { /* streak check failure is non-critical */ }
    }

    // Create a notification for planned wears
    if (logStatus === 'planned' && plannedFor) {
      try {
        const notifService = NotificationService.getInstance();
        const plannedDate = new Date(plannedFor);
        const dayStr = plannedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        await notifService.emitUserNotification({
          recipientId: userId!.toString(),
          type: 'wardrobe',
          title: 'Outfit Planned',
          message: `You planned to wear "${outfit.name || 'an outfit'}" on ${dayStr}`,
          wardrobe: {
            actionType: 'new_item',
            occasion: occasion || undefined,
            thumbnails: outfit.flatlayUrl ? [outfit.flatlayUrl] : [],
          },
        });
      } catch (_) { /* notification failure is non-critical */ }
    }

    res.status(201).json({ success: true, data: saved });
  }

  private static async GetWearHistory(req: Request, res: Response) {
    const userId = req.user?._id;
    const { outfitId, page = "1", limit = "20", status } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));

    const filter: any = { user: userId };
    if (outfitId) filter.outfit = outfitId;
    // Default to only worn entries (backwards compatible)
    filter.status = status === 'planned' ? 'planned' : { $in: ['worn', null, undefined] };

    const sortField = status === 'planned' ? 'plannedFor' : 'wornAt';

    const [logs, total] = await Promise.all([
      WearLogModel.find(filter)
        .populate({ path: "outfit", populate: { path: "items" } })
        .sort({ [sortField]: status === 'planned' ? 1 : -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      WearLogModel.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNextPage: pageNum < Math.ceil(total / limitNum),
      },
    });
  }

  private static async GetWearStats(req: Request, res: Response) {
    const userId = req.user?._id;
    const userObjId = new (require("mongoose").Types.ObjectId)(userId);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Only count actual wears (not planned)
    const wornMatch = { user: userObjId, status: { $in: ['worn', null] } };

    const [mostWorn, leastWorn, monthlyCount, totalOutfitsWorn, upcomingPlanned, allWornDates] = await Promise.all([
      // Most worn outfits (top 10)
      WearLogModel.aggregate([
        { $match: wornMatch },
        { $group: { _id: "$outfit", wearCount: { $sum: 1 }, lastWorn: { $max: "$wornAt" } } },
        { $sort: { wearCount: -1 } },
        { $limit: 10 },
        { $lookup: { from: "outfits", localField: "_id", foreignField: "_id", as: "outfit" } },
        { $unwind: "$outfit" },
        { $project: { _id: 0, outfitId: "$_id", name: "$outfit.name", wearCount: 1, lastWorn: 1 } },
      ]),

      // Least worn outfits (top 10)
      WearLogModel.aggregate([
        { $match: wornMatch },
        { $group: { _id: "$outfit", wearCount: { $sum: 1 }, lastWorn: { $max: "$wornAt" } } },
        { $sort: { wearCount: 1 } },
        { $limit: 10 },
        { $lookup: { from: "outfits", localField: "_id", foreignField: "_id", as: "outfit" } },
        { $unwind: "$outfit" },
        { $project: { _id: 0, outfitId: "$_id", name: "$outfit.name", wearCount: 1, lastWorn: 1 } },
      ]),

      // Total wears this month (only worn, not planned)
      WearLogModel.countDocuments({ user: userId, status: { $in: ['worn', null] }, wornAt: { $gte: startOfMonth } }),

      // Total distinct outfits worn
      WearLogModel.distinct("outfit", { user: userId, status: { $in: ['worn', null] } }).then(arr => arr.length),

      // Upcoming planned wears count
      WearLogModel.countDocuments({ user: userId, status: 'planned', plannedFor: { $gte: now } }),

      // All worn dates for streak calculation (last 90 days for efficiency)
      WearLogModel.find(
        { user: userId, status: { $in: ['worn', null] }, wornAt: { $gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) } },
        { wornAt: 1, _id: 0 }
      ).lean(),
    ]);

    // ── Compute streak server-side ──
    const dateSet = new Set(
      allWornDates.map((d: any) => new Date(d.wornAt).toDateString())
    );
    let currentStreak = 0;
    const cursor = new Date(now);
    // If no log today, start from yesterday
    if (!dateSet.has(cursor.toDateString())) {
      cursor.setDate(cursor.getDate() - 1);
      if (!dateSet.has(cursor.toDateString())) {
        currentStreak = 0;
      }
    }
    if (currentStreak === 0 && dateSet.has(cursor.toDateString())) {
      while (dateSet.has(cursor.toDateString())) {
        currentStreak++;
        cursor.setDate(cursor.getDate() - 1);
      }
    }

    res.status(200).json({
      success: true,
      data: {
        mostWorn,
        leastWorn,
        totalWearsThisMonth: monthlyCount,
        totalOutfitsWorn,
        upcomingPlanned,
        currentStreak,
      },
    });
  }

  // ─── Get Planned Wears (upcoming) ─────────────────────────────────

  private static async GetPlannedWears(req: Request, res: Response) {
    const userId = req.user?._id;

    const logs = await WearLogModel.find({
      user: userId,
      status: 'planned',
    })
      .populate({ path: "outfit", populate: { path: "items" } })
      .sort({ plannedFor: 1 })
      .limit(50);

    res.status(200).json({ success: true, data: logs });
  }

  // ─── Mark planned wear as worn ──────────────────────────────────

  private static async MarkPlannedAsWorn(req: Request, res: Response) {
    const userId = req.user?._id;
    const { id } = req.params;

    const log = await WearLogModel.findById(id);
    if (!log) throw new ApiError(404, "Planned wear not found");
    if (userId?.toString() !== log.user.toString()) throw new ApiError(403, "Not authorized");
    if (log.status !== 'planned') throw new ApiError(400, "This entry is already marked as worn");

    log.status = 'worn';
    log.wornAt = new Date();
    await log.save();

    res.status(200).json({ success: true, data: log });
  }

  // ─── Update a planned wear ──────────────────────────────────────

  private static async UpdatePlannedWear(req: Request, res: Response) {
    const userId = req.user?._id;
    const { id } = req.params;
    const { status, plannedFor, occasion, notes } = req.body;

    const log = await WearLogModel.findById(id);
    if (!log) throw new ApiError(404, "Planned wear not found");
    if (userId?.toString() !== log.user.toString()) throw new ApiError(403, "Not authorized");

    if (plannedFor) log.plannedFor = new Date(plannedFor);
    if (occasion !== undefined) log.occasion = occasion;
    if (notes !== undefined) log.notes = notes;
    if (status === 'worn') {
      log.status = 'worn';
      log.wornAt = new Date();
    }
    await log.save();

    res.status(200).json({ success: true, data: log });
  }

  // ─── Delete a planned wear ──────────────────────────────────────

  private static async DeletePlannedWear(req: Request, res: Response) {
    const userId = req.user?._id;
    const { id } = req.params;

    const log = await WearLogModel.findById(id);
    if (!log) throw new ApiError(404, "Planned wear not found");
    if (userId?.toString() !== log.user.toString()) throw new ApiError(403, "Not authorized");

    await WearLogModel.findByIdAndDelete(id);

    res.status(200).json({ success: true, message: "Planned wear deleted" });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  SHARING
  // ═══════════════════════════════════════════════════════════════════

  /**
   * PATCH /outfits/:id/share
   * Generates a share token (or returns existing one). Sets outfit as public.
   */
  private static async ShareOutfit(req: Request, res: Response) {
    const userId = req.user?._id;
    const outfit = await OutfitModel.findById(req.params.id);
    if (!outfit) throw new ApiError(404, "Outfit not found");

    // Allow owner OR anyone who has it in savedOutfits
    const isOwner = userId?.toString() === outfit.user.toString();
    if (!isOwner) {
      const hasSaved = await UserModel.exists({ _id: userId, savedOutfits: outfit._id });
      if (!hasSaved) throw new ApiError(403, "Not authorized");
    }

    // Return existing share link if already shared
    if (outfit.shareToken) {
      outfit.shareCount = (outfit.shareCount || 0) + 1;
      await outfit.save();
      return res.status(200).json({
        success: true,
        data: { shareToken: outfit.shareToken, shareUrl: `/outfit/${outfit.shareToken}` },
      });
    }

    // Generate a URL-safe token (10 chars, ~60 bits of entropy)
    const token = crypto.randomBytes(8).toString('base64url').slice(0, 10);

    outfit.shareToken = token;
    outfit.isPublic = true;
    outfit.shareCount = 1;
    outfit.sharedAt = new Date();
    await outfit.save();

    res.status(200).json({
      success: true,
      data: { shareToken: token, shareUrl: `/outfit/${token}` },
    });
  }

  /**
   * GET /public/outfits/:shareToken
   * Returns public outfit data. NO AUTH REQUIRED.
   */
  private static async GetSharedOutfit(req: Request, res: Response) {
    const { shareToken } = req.params;
    const outfit = await OutfitModel.findOne({ shareToken, isPublic: true })
      .populate({
        path: 'items',
        select: 'type subcategory nobgUrl thumbnailUrl dominantColors brand',
      })
      .populate({
        path: 'user',
        select: 'username profilePhotoId',
      })
      .lean();

    if (!outfit) throw new ApiError(404, "Outfit not found or no longer shared");

    // Deduplicate view count — only increment once per visitor session
    const viewCookieName = `ov_${outfit._id}`;
    const alreadyViewed = req.cookies?.[viewCookieName];
    if (!alreadyViewed) {
      OutfitModel.updateOne({ _id: outfit._id }, { $inc: { viewCount: 1 } }).catch(() => {});
      // Set a cookie that lasts 24h so the same browser doesn't re-increment
      res.cookie(viewCookieName, "1", { maxAge: 86400000, httpOnly: true, sameSite: "lax" });
    }

    res.status(200).json({
      success: true,
      data: {
        name: outfit.name,
        occasion: outfit.occasion,
        season: outfit.season,
        tags: outfit.tags,
        source: outfit.source,
        flatlayUrl: outfit.flatlayUrl,
        screenshotUrl: outfit.screenshotUrl,
        colorPalette: outfit.colorPalette,
        items: outfit.items,
        user: outfit.user,
        createdAt: (outfit as any).createdAt,
        shareCount: outfit.shareCount,
        viewCount: (outfit.viewCount || 0) + (alreadyViewed ? 0 : 1),
        publicLikes: outfit.publicLikes || 0,
        hasLiked: !!req.cookies?.[`ol_${outfit._id}`],
        isSaved: !!req.cookies?.[`os_${outfit._id}`],
      },
    });
  }

  /**
   * POST /public/outfits/:shareToken/like
   * Toggle like on a shared outfit (cookie-based dedup for anonymous visitors).
   */
  private static async LikeSharedOutfit(req: Request, res: Response) {
    const { shareToken } = req.params;
    const outfit = await OutfitModel.findOne({ shareToken, isPublic: true });
    if (!outfit) throw new ApiError(404, "Outfit not found");

    const likeCookieName = `ol_${outfit._id}`;
    const alreadyLiked = req.cookies?.[likeCookieName];

    if (alreadyLiked) {
      // Unlike
      outfit.publicLikes = Math.max(0, (outfit.publicLikes || 0) - 1);
      await outfit.save();
      res.clearCookie(likeCookieName);
      res.status(200).json({ success: true, data: { liked: false, publicLikes: outfit.publicLikes } });
    } else {
      // Like
      outfit.publicLikes = (outfit.publicLikes || 0) + 1;
      await outfit.save();
      res.cookie(likeCookieName, "1", { maxAge: 365 * 86400000, httpOnly: true, sameSite: "lax" });
      res.status(200).json({ success: true, data: { liked: true, publicLikes: outfit.publicLikes } });
    }
  }

  /**
   * POST /public/outfits/:shareToken/save
   * Toggle bookmark on a shared outfit (authenticated users only).
   */
  private static async ToggleSaveOutfit(req: Request, res: Response) {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Login required");

    const { shareToken } = req.params;
    const outfit = await OutfitModel.findOne({ shareToken, isPublic: true }).select('_id').lean();
    if (!outfit) throw new ApiError(404, "Outfit not found");

    const outfitId = (outfit._id as any).toString();
    const user = await UserModel.findById(userId).select('savedOutfits');
    if (!user) throw new ApiError(404, "User not found");

    const alreadySaved = (user.savedOutfits || []).some(
      (id: any) => id.toString() === outfitId
    );

    const saveCookieName = `os_${outfitId}`;

    if (alreadySaved) {
      await UserModel.updateOne({ _id: userId }, { $pull: { savedOutfits: outfitId } });
      res.clearCookie(saveCookieName);
      res.status(200).json({ success: true, data: { saved: false } });
    } else {
      await UserModel.updateOne({ _id: userId }, { $addToSet: { savedOutfits: outfitId } });
      res.cookie(saveCookieName, "1", { maxAge: 365 * 86400000, httpOnly: true, sameSite: "lax" });
      res.status(200).json({ success: true, data: { saved: true } });
    }
  }

  /**
   * DELETE /wardrobe/saved-outfits/:id
   * Remove an outfit from user's savedOutfits (unsave).
   */
  private static async UnsaveOutfit(req: Request, res: Response) {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Login required");

    const outfitId = req.params.id;
    await UserModel.updateOne({ _id: userId }, { $pull: { savedOutfits: outfitId } });
    res.status(200).json({ success: true, message: "Outfit removed" });
  }

  /**
   * GET /wardrobe/saved-outfits
   * Returns bookmarked outfits for the authenticated user.
   */
  private static async GetSavedOutfits(req: Request, res: Response) {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Login required");

    const user = await UserModel.findById(userId).select('savedOutfits');
    if (!user || !user.savedOutfits?.length) {
      return res.status(200).json({ success: true, data: [] });
    }

    const outfits = await OutfitModel.find({
      _id: { $in: user.savedOutfits },
      isPublic: true,
    })
      .populate({
        path: 'items',
        select: 'type subcategory brand thumbnailUrl nobgUrl dominantColors photoUrl',
      })
      .populate({
        path: 'user',
        select: 'username fullName',
      })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ success: true, data: outfits });
  }

  /**
   * POST /outfits/:id/send
   * Sends outfit to another KYF user as a notification.
   */
  private static async SendOutfitToUser(req: Request, res: Response) {
    const userId = req.user?._id;
    const { recipientUsername, skipNotification } = req.body;

    if (skipNotification !== undefined && typeof skipNotification !== 'boolean') {
      throw new ApiError(400, "skipNotification must be a boolean");
    }

    const outfit = await OutfitModel.findById(req.params.id);
    if (!outfit) throw new ApiError(404, "Outfit not found");

    // Allow owner OR anyone who has it in savedOutfits
    const isOwner = userId?.toString() === outfit.user.toString();
    if (!isOwner) {
      const hasSaved = await UserModel.exists({ _id: userId, savedOutfits: outfit._id });
      if (!hasSaved) throw new ApiError(403, "Not authorized");
    }

    const recipient = await UserModel.findOne({ username: recipientUsername }).select('_id username').lean();
    if (!recipient) throw new ApiError(404, "User not found");
    if (recipient._id.toString() === userId?.toString()) throw new ApiError(400, "Cannot send outfit to yourself");

    // Ensure outfit has share token for linking
    if (!outfit.shareToken) {
      outfit.shareToken = crypto.randomBytes(8).toString('base64url').slice(0, 10);
      outfit.isPublic = true;
      outfit.sharedAt = new Date();
    }
    outfit.shareCount = (outfit.shareCount || 0) + 1;
    await outfit.save();

    // Auto-add to recipient's savedOutfits
    await UserModel.updateOne({ _id: recipient._id }, { $addToSet: { savedOutfits: outfit._id } });

    if (!skipNotification) {
      const sender = await UserModel.findById(userId).select('username fullName').lean();

      await NotificationService.getInstance().emitUserNotification({
        recipientId: recipient._id.toString(),
        type: 'wardrobe',
        title: 'Outfit shared with you',
        message: `${sender?.fullName || sender?.username || 'Someone'} shared "${outfit.name || 'an outfit'}" with you`,
        wardrobe: {
          actionType: 'new_item',
          thumbnails: outfit.flatlayUrl ? [outfit.flatlayUrl] : [],
        },
        extLink: `/wardrobe/outfits/${outfit._id}`,
      });
    }

    res.status(200).json({ success: true, message: "Outfit sent" });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  FLAT-LAY GENERATION HELPERS
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Builds a Python flat-lay request payload from a pairing object.
   * Collects items that have nobgUrl (background-removed image).
   * Returns null if fewer than 2 items have nobgUrl.
   */
  private static buildFlatlayPayload(pairing: any): { items: any[]; canvasSize: number } | null {
    const flatlayItems: any[] = [];

    // Top — only include product photos (no person in photo)
    if (pairing.top?.nobgUrl && !pairing.top?.hasPersonInPhoto) {
      flatlayItems.push({
        itemId: String(pairing.top._id),
        nobgUrl: pairing.top.nobgUrl,
        itemType: "Top",
        dominantColors: pairing.top.dominantColors || [],
      });
    }

    // Bottom — only product photos
    if (pairing.bottom?.nobgUrl && !pairing.bottom?.hasPersonInPhoto) {
      flatlayItems.push({
        itemId: String(pairing.bottom._id),
        nobgUrl: pairing.bottom.nobgUrl,
        itemType: "Bottom",
        dominantColors: pairing.bottom.dominantColors || [],
      });
    }

    // Layer — first owned outerwear with nobgUrl that is a product photo
    const layer = pairing.layers?.owned?.find((l: any) => l.nobgUrl && !l.hasPersonInPhoto);
    if (layer) {
      flatlayItems.push({
        itemId: String(layer._id),
        nobgUrl: layer.nobgUrl,
        itemType: "Outerwear",
        dominantColors: layer.dominantColors || [],
      });
    }

    // Footwear — first owned shoes with nobgUrl that is a product photo
    const shoe = pairing.footwear?.owned?.find((f: any) => f.nobgUrl && !f.hasPersonInPhoto);
    if (shoe) {
      flatlayItems.push({
        itemId: String(shoe._id),
        nobgUrl: shoe.nobgUrl,
        itemType: "Shoes",
        dominantColors: shoe.dominantColors || [],
      });
    }

    // Need at least 2 product-photo items for a meaningful flat-lay
    if (flatlayItems.length < 2) return null;
    return { items: flatlayItems, canvasSize: 1080 };
  }

  /**
   * Builds a flat-lay request from an enriched suggestion (SuggestFullOutfit).
   * Picks the first wardrobe match with nobgUrl for each slot.
   * The engine result has: top.item, bottom[].item, layers.options[].item, footwear.options[].item
   * wardrobeMatches maps those names to actual user items.
   */
  private static buildFlatlayFromSuggestion(enriched: any): { items: any[]; canvasSize: number } | null {
    const wm = enriched.wardrobeMatches || {};
    const items: any[] = [];

    // Top — only product photos (no person)
    if (enriched.top?.item) {
      const match = (wm[enriched.top.item] || []).find((m: any) => m.nobgUrl && !m.hasPersonInPhoto);
      if (match) {
        items.push({ itemId: String(match._id), nobgUrl: match.nobgUrl, itemType: "Top", dominantColors: match.dominantColors || [] });
      }
    }

    // Bottom — first suggestion with a product-photo wardrobe match
    if (Array.isArray(enriched.bottom)) {
      for (const b of enriched.bottom) {
        const match = (wm[b.item] || []).find((m: any) => m.nobgUrl && !m.hasPersonInPhoto);
        if (match) {
          items.push({ itemId: String(match._id), nobgUrl: match.nobgUrl, itemType: "Bottom", dominantColors: match.dominantColors || [] });
          break;
        }
      }
    }

    // Layer — first option with a product-photo wardrobe match
    if (enriched.layers?.options) {
      for (const opt of enriched.layers.options) {
        const match = (wm[opt.item] || []).find((m: any) => m.nobgUrl && !m.hasPersonInPhoto);
        if (match) {
          items.push({ itemId: String(match._id), nobgUrl: match.nobgUrl, itemType: "Outerwear", dominantColors: match.dominantColors || [] });
          break;
        }
      }
    }

    // Footwear — first option with a product-photo wardrobe match
    if (enriched.footwear?.options) {
      for (const opt of enriched.footwear.options) {
        const match = (wm[opt.item] || []).find((m: any) => m.nobgUrl && !m.hasPersonInPhoto);
        if (match) {
          items.push({ itemId: String(match._id), nobgUrl: match.nobgUrl, itemType: "Shoes", dominantColors: match.dominantColors || [] });
          break;
        }
      }
    }

    // Need at least 2 product-photo items for a meaningful flat-lay
    if (items.length < 2) return null;
    return { items, canvasSize: 1080 };
  }

  /**
   * Builds flat-lay payload from a plain array of ClothingItem documents.
   * Used by SavePairing where we have full item documents.
   */
  private static buildFlatlayFromItems(
    clothingItems: any[]
  ): { items: any[]; canvasSize: number } | null {
    // Only include product photos (no person) — person photos use CSS flat-lay on frontend
    const flatlayItems = clothingItems
      .filter((i) => i.nobgUrl && !i.hasPersonInPhoto)
      .map((i) => ({
        itemId: String(i._id),
        nobgUrl: i.nobgUrl,
        itemType: i.type,
        dominantColors: i.dominantColors || [],
      }));

    // Need at least 2 product-photo items for a meaningful flat-lay
    if (flatlayItems.length < 2) return null;
    return { items: flatlayItems, canvasSize: 1080 };
  }

  /**
   * Calls Python AI service to generate a flat-lay image.
   * Returns flatlayUrl + colorPalette, or null on failure.
   */
  private static async callPythonFlatlay(
    payload: { items: any[]; canvasSize: number }
  ): Promise<{ flatlayUrl: string; colorPalette: any[] } | null> {
    const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || "http://localhost:8001";
    const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY;
    if (!INTERNAL_SERVICE_KEY) return null;

    try {
      const response = await axios.post(
        `${PYTHON_SERVICE_URL}/api/v1/generate-flatlay`,
        payload,
        {
          headers: {
            "Content-Type": "application/json",
            "X-Internal-Service-Key": INTERNAL_SERVICE_KEY,
          },
          timeout: 45000,
        }
      );
      return {
        flatlayUrl: response.data?.flatlayUrl,
        colorPalette: response.data?.colorPalette || [],
      };
    } catch {
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  PYTHON AI SERVICE PROXY (Phase 7)
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Proxy endpoint: Process single clothing item via Python AI service.
   *
   * Security:
   * - Authenticated via JWT (handled by middleware)
   * - Adds X-Internal-Service-Key header for Python service
   *
   * Flow:
   * 1. Receives request from client with itemId, photoUrl, itemType, hasPersonInPhoto
   * 2. Forwards to Python service with security header
   * 3. Python service removes background, extracts colors, uploads to Cloudinary
   * 4. Returns nobgUrl, dominantColors, processingMeta to client
   * 5. Client updates MongoDB with received data
   */
  private static async ProcessItem(req: Request, res: Response) {
    const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || "http://localhost:8001";
    const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY;

    if (!INTERNAL_SERVICE_KEY) {
      throw new ApiError(500, "INTERNAL_SERVICE_KEY not configured");
    }

    try {
      // Forward request to Python service with security header
      const response = await axios.post(
        `${PYTHON_SERVICE_URL}/api/v1/process-item`,
        req.body,
        {
          headers: {
            "Content-Type": "application/json",
            "X-Internal-Service-Key": INTERNAL_SERVICE_KEY,
          },
          timeout: 30000, // 30s timeout (processing can take 8-15s for person photos)
        }
      );

      const result = response.data;

      // Persist processing results to MongoDB and auto-set color from AI
      let updatedItem = null;
      if (result.itemId && result.dominantColors) {
        const updateFields: Record<string, any> = {
          nobgUrl: result.nobgUrl,
          dominantColors: result.dominantColors,
          processingMeta: result.processingMeta,
          processingStatus: "completed",
        };
        // Auto-set color to the AI-detected primary color name (e.g. "navy" instead of user-entered "blue")
        if (result.dominantColors.length > 0 && result.dominantColors[0].name) {
          updateFields.color = result.dominantColors[0].name;
        }
        // Return the updated document so frontend gets complete item state
        updatedItem = await ClothingItemModel.findByIdAndUpdate(
          result.itemId,
          updateFields,
          { new: true }
        ).lean();
      }

      res.status(200).json({
        success: true,
        data: updatedItem || result,
      });
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status || 500;
        const message = error.response?.data?.detail || "Python service error";
        throw new ApiError(status, message);
      }
      throw error;
    }
  }

  /**
   * Proxy endpoint: Generate flat-lay preview via Python AI service.
   *
   * Security:
   * - Authenticated via JWT (handled by middleware)
   * - Adds X-Internal-Service-Key header for Python service
   *
   * Flow:
   * 1. Receives request from client with items[], canvasSize, includePalette
   * 2. Forwards to Python service with security header
   * 3. Python service downloads nobg images, composes flat-lay, uploads to Cloudinary
   * 4. Returns flatlayUrl, colorPalette to client
   * 5. Client can save to outfit document in MongoDB
   */
  private static async GenerateFlatlay(req: Request, res: Response) {
    const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || "http://localhost:8001";
    const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY;

    if (!INTERNAL_SERVICE_KEY) {
      throw new ApiError(500, "INTERNAL_SERVICE_KEY not configured");
    }

    try {
      // Forward request to Python service with security header
      const response = await axios.post(
        `${PYTHON_SERVICE_URL}/api/v1/generate-flatlay`,
        req.body,
        {
          headers: {
            "Content-Type": "application/json",
            "X-Internal-Service-Key": INTERNAL_SERVICE_KEY,
          },
          timeout: 45000, // 45s timeout (flat-lay can take longer with multiple items)
        }
      );

      // Return Python service response
      res.status(200).json({
        success: true,
        data: response.data,
      });
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status || 500;
        const message = error.response?.data?.detail || "Python service error";
        throw new ApiError(status, message);
      }
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  STYLE DNA (AI Photo Analysis)
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Maps raw Style DNA analysis results → StyleProfile enum values.
   * Used to compute which fields *could* be auto-filled.
   */
  private static computeAutoFillMapping(result: any): Record<string, string> {
    const mapping: Record<string, string> = {};

    // body.shape → bodyShape
    if (result.body?.shape) {
      const shapeMap: Record<string, string> = {
        trapezoid: "Trapezoid", rectangle: "Rectangle", triangle: "Triangle",
        inverted_triangle: "Inverted_Triangle", oval: "Oval",
        hourglass: "Hourglass", pear: "Pear", apple: "Apple",
      };
      const key = result.body.shape.toLowerCase().replace(/\s+/g, "_");
      if (shapeMap[key]) mapping.bodyShape = shapeMap[key];
    }

    // body.heightCategory → height
    if (result.body?.heightCategory) {
      const hMap: Record<string, string> = { short: "Short", medium: "Medium", tall: "Tall" };
      const h = hMap[result.body.heightCategory.toLowerCase()];
      if (h) mapping.height = h;
    }

    // skin.monkTone → skinTone (1-3=Fair, 4-6=Wheatish, 7-8=Dusky, 9-10=Dark Brown)
    if (result.skin?.monkTone) {
      const tone = result.skin.monkTone;
      if (tone <= 3) mapping.skinTone = "Fair";
      else if (tone <= 6) mapping.skinTone = "Wheatish";
      else if (tone <= 8) mapping.skinTone = "Dusky";
      else mapping.skinTone = "Dark Brown";
    }

    // skin.undertone → undertone
    if (result.skin?.undertone) {
      const utMap: Record<string, string> = { warm: "Warm", cool: "Cool", olive: "Olive", neutral: "Neutral" };
      const ut = utMap[result.skin.undertone.toLowerCase()];
      if (ut) mapping.undertone = ut;
    }

    // face.estimatedAge → ageGroup
    if (result.face?.estimatedAge) {
      const age = result.face.estimatedAge;
      if (age < 26) mapping.ageGroup = "GenZ (16-25)";
      else if (age <= 35) mapping.ageGroup = "Young Adult (26-35)";
      else if (age <= 50) mapping.ageGroup = "Mid-Aged (36-50)";
      else mapping.ageGroup = "Senior (50+)";
    }

    // face.faceShape → faceShape
    if (result.face?.faceShape) {
      const fsMap: Record<string, string> = {
        oval: "Oval", round: "Round", square: "Square", heart: "Heart",
        diamond: "Diamond", oblong: "Oblong", triangle: "Triangle",
      };
      const fs = fsMap[result.face.faceShape.toLowerCase()];
      if (fs) mapping.faceShape = fs;
    }

    // face.eyeShape → eyeShape
    if (result.face?.eyeShape) {
      const esMap: Record<string, string> = {
        almond: "Almond", round: "Round", hooded: "Hooded", upturned: "Upturned",
        downturned: "Downturned", monolid: "Monolid", "deep set": "Deep Set", deep_set: "Deep Set",
      };
      const es = esMap[result.face.eyeShape.toLowerCase().replace(/-/g, " ")];
      if (es) mapping.eyeShape = es;
    }

    // face.lipFullness → lipShape
    if (result.face?.lipFullness) {
      const lpMap: Record<string, string> = {
        thin: "Thin", medium: "Cupids Bow", full: "Full",
      };
      const lp = lpMap[result.face.lipFullness.toLowerCase()];
      if (lp) mapping.lipShape = lp;
    }

    // hair.type → hairType
    if (result.hair?.type) {
      const htMap: Record<string, string> = {
        straight: "Straight Medium", wavy: "Wavy Medium",
        curly: "Curly Springy", coily: "Coily Soft",
        "straight fine": "Straight Fine", "straight medium": "Straight Medium", "straight coarse": "Straight Coarse",
        "wavy fine": "Wavy Fine", "wavy medium": "Wavy Medium", "wavy coarse": "Wavy Coarse",
        "curly loose": "Curly Loose", "curly springy": "Curly Springy", "curly tight": "Curly Tight",
        "coily soft": "Coily Soft", "coily zigzag": "Coily Zigzag", "coily dense": "Coily Dense",
      };
      const ht = htMap[result.hair.type.toLowerCase()];
      if (ht) mapping.hairType = ht;
    }

    // hair.color.name → hairColor
    if (result.hair?.color?.name) {
      const hcMap: Record<string, string> = {
        black: "Black", "dark brown": "Dark Brown", "medium brown": "Medium Brown",
        "light brown": "Light Brown", blonde: "Blonde", red: "Red",
        gray: "Gray/Silver", silver: "Gray/Silver", "gray/silver": "Gray/Silver",
        white: "White", highlighted: "Highlighted",
      };
      const hc = hcMap[result.hair.color.name.toLowerCase()];
      if (hc) mapping.hairColor = hc;
    }

    // colorSeason.season → colorPaletteSeason
    if (result.colorSeason?.season) {
      const csMap: Record<string, string> = {
        spring: "Spring", summer: "Summer", autumn: "Autumn", fall: "Autumn", winter: "Winter",
      };
      const cs = csMap[result.colorSeason.season.toLowerCase()];
      if (cs) mapping.colorPaletteSeason = cs;
    }

    return mapping;
  }

  /**
   * Analyze user's profile photo via Python Style DNA pipeline.
   *
   * Flow:
   * 1. Fetch user's profile photo URL from Media model
   * 2. Send thumbnailUrl (preferred) + imageUrl to Python service
   * 3. Python runs 6-stage pipeline: person → body → face → geometry → skin → hair
   * 4. No face detected → return { skipped: true } silently (photo may be of someone else)
   * 5. Upsert results to StyleDna model (one per user)
   * 6. Compute autoFillMapping for client-side auto-fill
   */
  private static async AnalyzeStyleDna(req: Request, res: Response) {
    const userId = req.user?._id;
    const user = await UserModel.findById(userId);
    if (!user) throw new ApiError(404, "User not found");

    let imageUrl: string;
    let thumbnailUrl: string | null = null;

    if (req.body.imageUrl) {
      // Client provided a separate photo URL (uploaded via Cloudinary)
      imageUrl = req.body.imageUrl;
    } else {
      // Use profile photo
      const profileMedia = await user.getProfileMedia();
      if (!profileMedia?.photo?.url) {
        throw new ApiError(400, "No profile photo found. Please upload a profile photo first.");
      }
      imageUrl = profileMedia.photo.url;
      thumbnailUrl = profileMedia.photo.thumbnail_url || null;
    }

    // Call Python Style DNA service
    const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || "http://localhost:8001";
    const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY;
    if (!INTERNAL_SERVICE_KEY) {
      throw new ApiError(500, "INTERNAL_SERVICE_KEY not configured");
    }

    try {
      const response = await axios.post(
        `${PYTHON_SERVICE_URL}/api/v1/analyze-style-dna`,
        { userId: userId!.toString(), imageUrl, thumbnailUrl },
        {
          headers: {
            "Content-Type": "application/json",
            "X-Internal-Service-Key": INTERNAL_SERVICE_KEY,
          },
          timeout: 60000, // 60s — pipeline runs 6 stages sequentially
        }
      );

      const result = response.data;
      const warnings: string[] = result.warnings || [];

      // ── Guard: skip if no face or multiple people detected ────────────
      // Photo might be of someone else, or has multiple people → results unreliable
      if (!result.face || warnings.includes("NO_FACE") || warnings.includes("NO_PERSON")) {
        return res.status(200).json({ success: true, skipped: true, reason: "no_face" });
      }
      if (warnings.includes("MULTIPLE_PEOPLE_CROP_SUGGESTED")) {
        return res.status(200).json({ success: true, skipped: true, reason: "multiple_people" });
      }

      // ── Compute autoFillMapping for client-side auto-fill ────────────
      const autoFillMapping = Wardrobe.computeAutoFillMapping(result);

      // Preserve existing autoFilledValues from previous analysis
      const existing = await StyleDnaModel.findOne({ user: userId }, "meta").lean();
      const prevAutoFilledValues = existing?.meta?.autoFilledValues || null;
      const prevAutoFilledAt = existing?.meta?.autoFilledAt || null;

      const enrichedMeta = {
        ...(result.meta || {}),
        autoFillMapping,
        // Carry forward previous tracking data (client will update via MarkAutoFillApplied)
        ...(prevAutoFilledValues && { autoFilledValues: prevAutoFilledValues }),
        ...(prevAutoFilledAt && { autoFilledAt: prevAutoFilledAt }),
      };

      // Upsert to StyleDna model (one per user, replaces on re-analysis)
      const styleDna = await StyleDnaModel.findOneAndUpdate(
        { user: userId },
        {
          user: userId,
          body: result.body || null,
          face: result.face || null,
          eyes: result.eyes || null,
          skin: result.skin || null,
          hair: result.hair || null,
          colorSeason: result.colorSeason || null,
          descriptions: result.descriptions || {},
          confidence: result.confidence || {},
          warnings,
          imageUrl,
          pipelineVersion: "v6",
          meta: enrichedMeta,
          analyzedAt: new Date(),
        },
        { upsert: true, new: true }
      ).lean();

      res.status(200).json({ success: true, data: styleDna });
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status || 500;
        const message = error.response?.data?.detail || "Style DNA analysis failed";
        throw new ApiError(status, message);
      }
      throw error;
    }
  }

  /**
   * Get user's saved Style DNA analysis.
   */
  private static async GetStyleDna(req: Request, res: Response) {
    const userId = req.user?._id;
    const styleDna = await StyleDnaModel.findOne({ user: userId }).lean();
    if (!styleDna) {
      return res.status(200).json({ success: true, data: null });
    }
    res.status(200).json({ success: true, data: styleDna });
  }

  /**
   * Record which auto-fill values were actually applied to StyleProfile.
   * Client calls this after silently auto-filling fields so we can track
   * which ones the user later edits manually (for conflict detection on re-analysis).
   */
  private static async MarkAutoFillApplied(req: Request, res: Response) {
    const userId = req.user?._id;
    const { autoFilledValues } = req.body;

    if (!autoFilledValues || typeof autoFilledValues !== "object") {
      throw new ApiError(400, "autoFilledValues object is required");
    }

    const styleDna = await StyleDnaModel.findOneAndUpdate(
      { user: userId },
      {
        $set: {
          "meta.autoFilledValues": autoFilledValues,
          "meta.autoFilledAt": new Date().toISOString(),
        },
      },
      { new: true }
    ).lean();

    if (!styleDna) {
      throw new ApiError(404, "No Style DNA analysis found");
    }

    res.status(200).json({ success: true });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  COLLECTIONS
  // ═══════════════════════════════════════════════════════════════════

  private static async CreateCollection(req: Request, res: Response) {
    const userId = req.user?._id;
    const { name, description, emoji, color } = req.body;

    const exists = await CollectionModel.findOne({ user: userId, name });
    if (exists) throw new ApiError(409, "A collection with that name already exists");

    const collection = await CollectionModel.create({ user: userId, name, description, emoji, color, itemIds: [] });
    res.status(201).json({ success: true, data: collection });
  }

  private static async GetCollections(req: Request, res: Response) {
    const userId = req.user?._id;
    const collections = await CollectionModel.find({ user: userId }).sort({ createdAt: -1 }).lean();
    res.status(200).json({ success: true, data: collections });
  }

  private static async GetCollectionById(req: Request, res: Response) {
    const userId = req.user?._id;
    const collection = await CollectionModel.findById(req.params.id).populate("itemIds").lean();
    if (!collection) throw new ApiError(404, "Collection not found");
    if (userId?.toString() !== collection.user.toString()) throw new ApiError(403, "Not authorized");
    res.status(200).json({ success: true, data: collection });
  }

  private static async UpdateCollection(req: Request, res: Response) {
    const userId = req.user?._id;
    const collection = await CollectionModel.findById(req.params.id);
    if (!collection) throw new ApiError(404, "Collection not found");
    if (userId?.toString() !== collection.user.toString()) throw new ApiError(403, "Not authorized");

    // Check name uniqueness on rename
    if (req.body.name && req.body.name !== collection.name) {
      const dup = await CollectionModel.findOne({ user: userId, name: req.body.name });
      if (dup) throw new ApiError(409, "A collection with that name already exists");
    }

    const updated = await CollectionModel.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true }).lean();
    res.status(200).json({ success: true, data: updated });
  }

  private static async DeleteCollection(req: Request, res: Response) {
    const userId = req.user?._id;
    const collection = await CollectionModel.findById(req.params.id);
    if (!collection) throw new ApiError(404, "Collection not found");
    if (userId?.toString() !== collection.user.toString()) throw new ApiError(403, "Not authorized");

    await CollectionModel.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Collection deleted" });
  }

  private static async AddItemsToCollection(req: Request, res: Response) {
    const userId = req.user?._id;
    const collection = await CollectionModel.findById(req.params.id);
    if (!collection) throw new ApiError(404, "Collection not found");
    if (userId?.toString() !== collection.user.toString()) throw new ApiError(403, "Not authorized");

    // Verify all items belong to the user
    const { itemIds } = req.body;
    const count = await ClothingItemModel.countDocuments({ _id: { $in: itemIds }, user: userId });
    if (count !== itemIds.length) throw new ApiError(400, "Some items were not found in your closet");

    const updated = await CollectionModel.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { itemIds: { $each: itemIds } } },
      { new: true }
    ).lean();
    res.status(200).json({ success: true, data: updated });
  }

  private static async RemoveItemsFromCollection(req: Request, res: Response) {
    const userId = req.user?._id;
    const collection = await CollectionModel.findById(req.params.id);
    if (!collection) throw new ApiError(404, "Collection not found");
    if (userId?.toString() !== collection.user.toString()) throw new ApiError(403, "Not authorized");

    const updated = await CollectionModel.findByIdAndUpdate(
      req.params.id,
      { $pull: { itemIds: { $in: req.body.itemIds } } },
      { new: true }
    ).lean();
    res.status(200).json({ success: true, data: updated });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  PUBLIC WRAPPED HANDLERS
  // ═══════════════════════════════════════════════════════════════════

  // Clothing
  public static addCloth = AsyncHandler.wrap(Wardrobe.AddCloth);
  public static addClothBatch = AsyncHandler.wrap(Wardrobe.AddClothBatch);
  public static getYourCloths = AsyncHandler.wrap(Wardrobe.GetYourCloths);
  public static getYourClothById = AsyncHandler.wrap(Wardrobe.GetYourClothById);
  public static updateCloth = AsyncHandler.wrap(Wardrobe.UpdateCloth);
  public static archiveCloth = AsyncHandler.wrap(Wardrobe.ArchiveCloth);
  public static deleteCloth = AsyncHandler.wrap(Wardrobe.DeleteCloth);

  // Outfits
  public static createOutfit = AsyncHandler.wrap(Wardrobe.CreateOutfit);
  public static getYourOutfits = AsyncHandler.wrap(Wardrobe.GetYourOutfits);
  public static getOutfitById = AsyncHandler.wrap(Wardrobe.GetOutfitById);
  public static updateOutfit = AsyncHandler.wrap(Wardrobe.UpdateOutfit);
  public static toggleFavorite = AsyncHandler.wrap(Wardrobe.ToggleFavorite);
  public static deleteOutfit = AsyncHandler.wrap(Wardrobe.DeleteOutfit);

  // Style Profile
  public static upsertStyleProfile = AsyncHandler.wrap(Wardrobe.UpsertStyleProfile);
  public static getStyleProfile = AsyncHandler.wrap(Wardrobe.GetStyleProfile);

  // Cloth Options
  public static getClothOptions = AsyncHandler.wrap(Wardrobe.GetClothOptions);

  // Profile Options
  public static getProfileOptions = AsyncHandler.wrap(Wardrobe.GetProfileOptions);

  // Product Catalog
  public static getProductCatalog = AsyncHandler.wrap(Wardrobe.GetProductCatalog);

  // Pairings
  public static generatePairings = AsyncHandler.wrap(Wardrobe.GeneratePairings);
  public static savePairing = AsyncHandler.wrap(Wardrobe.SavePairing);

  // Wear Tracking
  public static logWear = AsyncHandler.wrap(Wardrobe.LogWear);
  public static getWearHistory = AsyncHandler.wrap(Wardrobe.GetWearHistory);
  public static getWearStats = AsyncHandler.wrap(Wardrobe.GetWearStats);
  public static getPlannedWears = AsyncHandler.wrap(Wardrobe.GetPlannedWears);
  public static markPlannedAsWorn = AsyncHandler.wrap(Wardrobe.MarkPlannedAsWorn);
  public static updatePlannedWear = AsyncHandler.wrap(Wardrobe.UpdatePlannedWear);
  public static deletePlannedWear = AsyncHandler.wrap(Wardrobe.DeletePlannedWear);

  // Suggestions
  public static suggestFullOutfit = AsyncHandler.wrap(Wardrobe.SuggestFullOutfit);
  public static suggestFromItem = AsyncHandler.wrap(Wardrobe.SuggestFromItem);
  public static suggestTop = AsyncHandler.wrap(Wardrobe.SuggestTop);
  public static suggestLayer = AsyncHandler.wrap(Wardrobe.SuggestLayer);
  public static suggestFootwear = AsyncHandler.wrap(Wardrobe.SuggestFootwear);

  // Phase 7: Python AI Service Proxy
  public static processItem = AsyncHandler.wrap(Wardrobe.ProcessItem);
  public static generateFlatlay = AsyncHandler.wrap(Wardrobe.GenerateFlatlay);

  // Style DNA
  public static analyzeStyleDna = AsyncHandler.wrap(Wardrobe.AnalyzeStyleDna);
  public static getStyleDna = AsyncHandler.wrap(Wardrobe.GetStyleDna);
  public static markAutoFillApplied = AsyncHandler.wrap(Wardrobe.MarkAutoFillApplied);

  // Sharing
  public static shareOutfit = AsyncHandler.wrap(Wardrobe.ShareOutfit);
  public static getSharedOutfit = AsyncHandler.wrap(Wardrobe.GetSharedOutfit);
  public static likeSharedOutfit = AsyncHandler.wrap(Wardrobe.LikeSharedOutfit);
  public static toggleSaveOutfit = AsyncHandler.wrap(Wardrobe.ToggleSaveOutfit);
  public static getSavedOutfits = AsyncHandler.wrap(Wardrobe.GetSavedOutfits);
  public static unsaveOutfit = AsyncHandler.wrap(Wardrobe.UnsaveOutfit);
  public static sendOutfitToUser = AsyncHandler.wrap(Wardrobe.SendOutfitToUser);

  // Collections
  public static createCollection = AsyncHandler.wrap(Wardrobe.CreateCollection);
  public static getCollections = AsyncHandler.wrap(Wardrobe.GetCollections);
  public static getCollectionById = AsyncHandler.wrap(Wardrobe.GetCollectionById);
  public static updateCollection = AsyncHandler.wrap(Wardrobe.UpdateCollection);
  public static deleteCollection = AsyncHandler.wrap(Wardrobe.DeleteCollection);
  public static addItemsToCollection = AsyncHandler.wrap(Wardrobe.AddItemsToCollection);
  public static removeItemsFromCollection = AsyncHandler.wrap(Wardrobe.RemoveItemsFromCollection);
}

export default Wardrobe;
