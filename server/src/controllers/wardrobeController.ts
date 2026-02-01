import { ClothingItemModel, IClothingItem } from "../models/clothModel";
import { OutfitModel } from "../models/outfitModel";
import { WearLogModel } from "../models/wearLogModel";
import { StyleProfileModel } from "../models/styleProfileModel";
import { UserModel } from "../models/userModel";
import { Request, Response } from "express";
import { AsyncHandler } from "../utils/AsyncHandler";
import { ApiError } from "../utils/apiError";
import { MasterEngine, StyleProfileInput } from "../AISugession/masterEngine";
import { OCCASIONS, OUTPUT_COLORS, SEASONS } from "../AISugession/shared";
import { resolveSeason } from "../utils/seasonResolver";
import NotificationService from "../services/notifications";
import * as fs from "fs";
import * as path from "path";

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
    const { type, subcategory, photoUrl, thumbnailUrl, color, pattern, fabric, brand, season, occasions, price, purchaseDate } = req.body;

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

    await ClothingItemModel.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Clothing item deleted" });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  OUTFITS
  // ═══════════════════════════════════════════════════════════════════

  private static async CreateOutfit(req: Request, res: Response) {
    const userId = req.user?._id;
    const { name, itemIds, occasion, season, tags, notes } = req.body;

    const items = await ClothingItemModel.find({ _id: { $in: itemIds }, user: userId });
    if (items.length !== itemIds.length) throw new ApiError(400, "One or more clothing items not found or not yours");

    const outfit = new OutfitModel({
      user: userId,
      name,
      items: itemIds,
      occasion,
      season,
      tags: tags || [],
      source: "manual",
      notes,
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
    const outfit = await OutfitModel.findById(req.params.id).populate("items");
    if (!outfit) throw new ApiError(404, "Outfit not found");
    if (userId?.toString() !== outfit.user.toString()) throw new ApiError(403, "Not authorized");
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
    if (userId?.toString() !== outfit.user.toString()) throw new ApiError(403, "Not authorized");

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
    if (!profile) throw new ApiError(404, "Style profile not found. Please set up your style profile first.");
    res.status(200).json({ success: true, data: profile });
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
    res.status(200).json({ success: true, data: enriched });
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
        _id: c._id, subcategory: c.subcategory, color: c.color, photoUrl: c.photoUrl, thumbnailUrl: c.thumbnailUrl, pattern: c.pattern,
      }));
    }

    // Attach product recommendations where wardrobe matches are empty
    const productRecommendations = Wardrobe.buildProductRecs(matched, wardrobeMatches, userDoc.gender);

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
        _id: c._id, subcategory: c.subcategory, color: c.color, photoUrl: c.photoUrl, thumbnailUrl: c.thumbnailUrl, pattern: c.pattern,
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
        _id: c._id, subcategory: c.subcategory, color: c.color, photoUrl: c.photoUrl, thumbnailUrl: c.thumbnailUrl, pattern: c.pattern,
      }));

      if (matches.length === 0) {
        const cleanName = key.replace(/\s*\[.*?\]\s*/g, "").replace(/\s*\(.*?\)\s*/g, "").trim();
        const products = catalog[cleanName]?.[gen] || catalog[key]?.[gen] || [];
        if (products.length > 0) productRecommendations[key] = products.slice(0, 3);
      }
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
        _id: c._id, subcategory: c.subcategory, color: c.color, photoUrl: c.photoUrl, thumbnailUrl: c.thumbnailUrl, pattern: c.pattern,
      }));

      if (matches.length === 0) {
        const cleanName = key.replace(/\s*\[.*?\]\s*/g, "").replace(/\s*\(.*?\)\s*/g, "").trim();
        const products = catalog[cleanName]?.[gen] || catalog[key]?.[gen] || [];
        if (products.length > 0) productRecommendations[key] = products.slice(0, 3);
      }
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
    suggestions: Array<{ item: string; color?: string; type?: "Top" | "Bottom" }>
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
    const toMatch: Array<{ item: string; color?: string; type?: "Top" | "Bottom" }> = [];

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
        pattern: c.pattern,
      }));
    }

    // Attach product recommendations where wardrobe matches are empty
    const productRecommendations: Record<string, any[]> = {};
    const catalog = getProductCatalog();
    const gen = gender || "Male";

    for (const m of matched) {
      const key = m.suggestion.item;
      if (wardrobeMatches[key] && wardrobeMatches[key].length > 0) continue;

      // Strip engine modifiers for catalog lookup: "Pajama (Straight) [Slim Fit]" → "Pajama"
      const cleanName = key.replace(/\s*\[.*?\]\s*/g, "").replace(/\s*\(.*?\)\s*/g, "").trim();
      const products = catalog[cleanName]?.[gen] || catalog[key]?.[gen] || [];
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
      if (wardrobeMatches[key] && wardrobeMatches[key].length > 0) continue;

      const cleanName = key.replace(/\s*\[.*?\]\s*/g, "").replace(/\s*\(.*?\)\s*/g, "").trim();
      const products = catalog[cleanName]?.[gen] || catalog[key]?.[gen] || [];
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
        types: ["Top", "Bottom", "Shoes", "Accessory", "Outerwear"],
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
    }).select("type subcategory color pattern photoUrl thumbnailUrl").lean();

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
        { _id: top._id, subcategory: top.subcategory, color: top.color, photoUrl: top.photoUrl, thumbnailUrl: top.thumbnailUrl, role: assignRole(top, "Top", top.subcategory, bot.subcategory) },
        { _id: bot._id, subcategory: bot.subcategory, color: bot.color, photoUrl: bot.photoUrl, thumbnailUrl: bot.thumbnailUrl, role: assignRole(bot, "Bottom", top.subcategory, bot.subcategory) },
      ];
      for (const l of ownedLayers) {
        items.push({ _id: l._id, subcategory: l.subcategory, color: l.color, photoUrl: l.photoUrl, thumbnailUrl: l.thumbnailUrl, role: "outer_layer" });
      }
      for (const f of ownedFootwear) {
        items.push({ _id: f._id, subcategory: f.subcategory, color: f.color, photoUrl: f.photoUrl, thumbnailUrl: f.thumbnailUrl, role: "footwear" });
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
            top: { _id: top._id, subcategory: top.subcategory, color: top.color, photoUrl: top.photoUrl, thumbnailUrl: top.thumbnailUrl },
            bottom: { _id: bot._id, subcategory: bot.subcategory, color: bot.color, photoUrl: bot.photoUrl, thumbnailUrl: bot.thumbnailUrl },
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
            top: { _id: top._id, subcategory: top.subcategory, color: top.color, photoUrl: top.photoUrl, thumbnailUrl: top.thumbnailUrl },
            bottom: { _id: bot._id, subcategory: bot.subcategory, color: bot.color, photoUrl: bot.photoUrl, thumbnailUrl: bot.thumbnailUrl },
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

    // Fire-and-forget: notify user about generated pairings
    if (totalPairings > 0) {
      setImmediate(async () => {
        try {
          const resolvedSeason = profileInput.season;
          // Collect up to 4 thumbnails from pairings for preview
          const thumbnails: string[] = [];
          for (const p of pairings) {
            if (p.top.thumbnailUrl && thumbnails.length < 4) thumbnails.push(p.top.thumbnailUrl);
            if (p.bottom.thumbnailUrl && thumbnails.length < 4) thumbnails.push(p.bottom.thumbnailUrl);
            if (thumbnails.length >= 4) break;
          }
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
        } catch (_) { /* notification failure should never break flow */ }
      });
    }
  }

  /**
   * POST /save-pairing
   * Saves an engine-suggested pairing as an Outfit.
   */
  private static async SavePairing(req: Request, res: Response) {
    const userId = req.user?._id;
    const { itemIds, occasion, season, name, tags, notes } = req.body;

    // Validate all items exist and belong to user
    const items = await ClothingItemModel.find({ _id: { $in: itemIds }, user: userId });
    if (items.length !== itemIds.length) throw new ApiError(400, "One or more clothing items not found or not yours");

    const outfit = new OutfitModel({
      user: userId,
      name: name || `Suggested Outfit`,
      items: itemIds,
      occasion,
      season,
      tags: tags || [],
      source: "engine_suggested",
      notes,
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
    const { outfitId, wornAt, occasion, notes, weather } = req.body;

    const outfit = await OutfitModel.findById(outfitId);
    if (!outfit) throw new ApiError(404, "Outfit not found");
    if (userId?.toString() !== outfit.user.toString()) throw new ApiError(403, "Not authorized");

    const log = new WearLogModel({
      user: userId,
      outfit: outfitId,
      wornAt: wornAt ? new Date(wornAt) : new Date(),
      occasion,
      notes,
      weather,
    });

    const saved = await log.save();
    res.status(201).json({ success: true, data: saved });
  }

  private static async GetWearHistory(req: Request, res: Response) {
    const userId = req.user?._id;
    const { outfitId, page = "1", limit = "20" } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));

    const filter: any = { user: userId };
    if (outfitId) filter.outfit = outfitId;

    const [logs, total] = await Promise.all([
      WearLogModel.find(filter)
        .populate({ path: "outfit", populate: { path: "items" } })
        .sort({ wornAt: -1 })
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

    const [mostWorn, leastWorn, monthlyCount, totalOutfitsWorn] = await Promise.all([
      // Most worn outfits (top 10)
      WearLogModel.aggregate([
        { $match: { user: userObjId } },
        { $group: { _id: "$outfit", wearCount: { $sum: 1 }, lastWorn: { $max: "$wornAt" } } },
        { $sort: { wearCount: -1 } },
        { $limit: 10 },
        { $lookup: { from: "outfits", localField: "_id", foreignField: "_id", as: "outfit" } },
        { $unwind: "$outfit" },
        { $project: { _id: 0, outfitId: "$_id", name: "$outfit.name", wearCount: 1, lastWorn: 1 } },
      ]),

      // Least worn outfits (top 10)
      WearLogModel.aggregate([
        { $match: { user: userObjId } },
        { $group: { _id: "$outfit", wearCount: { $sum: 1 }, lastWorn: { $max: "$wornAt" } } },
        { $sort: { wearCount: 1 } },
        { $limit: 10 },
        { $lookup: { from: "outfits", localField: "_id", foreignField: "_id", as: "outfit" } },
        { $unwind: "$outfit" },
        { $project: { _id: 0, outfitId: "$_id", name: "$outfit.name", wearCount: 1, lastWorn: 1 } },
      ]),

      // Total wears this month
      WearLogModel.countDocuments({ user: userId, wornAt: { $gte: startOfMonth } }),

      // Total distinct outfits worn
      WearLogModel.distinct("outfit", { user: userId }).then(arr => arr.length),
    ]);

    res.status(200).json({
      success: true,
      data: {
        mostWorn,
        leastWorn,
        totalWearsThisMonth: monthlyCount,
        totalOutfitsWorn,
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  PUBLIC WRAPPED HANDLERS
  // ═══════════════════════════════════════════════════════════════════

  // Clothing
  public static addCloth = AsyncHandler.wrap(Wardrobe.AddCloth);
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

  // Suggestions
  public static suggestFullOutfit = AsyncHandler.wrap(Wardrobe.SuggestFullOutfit);
  public static suggestFromItem = AsyncHandler.wrap(Wardrobe.SuggestFromItem);
  public static suggestTop = AsyncHandler.wrap(Wardrobe.SuggestTop);
  public static suggestLayer = AsyncHandler.wrap(Wardrobe.SuggestLayer);
  public static suggestFootwear = AsyncHandler.wrap(Wardrobe.SuggestFootwear);
}

export default Wardrobe;
