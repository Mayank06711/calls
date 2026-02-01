/**
 * ===================================================================
 *  MASTER ENGINE — Orchestrator for the 4-stage suggestion pipeline
 * ===================================================================
 *
 *  Chains: engine_top → engine_pair → engine_layer → engine_footwear
 *  Handles all translation gaps between stages (P1/P2/P3).
 *  Allows entry at ANY pipeline stage.
 *
 *  When AI replaces engines, only the internals of this class change.
 *  The public interface stays the same.
 * ===================================================================
 */

import { ConsultantEngine, UserInput, OutfitOption } from "./engine_top";
import { FashionEngine, UserRequest } from "./engine_pair";
import { LayeringEngine, LayeringInput, LayeringResult } from "./engine_layer";
import { FootwearEngine, FootwearInput, FootwearResult } from "./engine.footwear";
import { stripFitSuffix, normalizeColorForPair } from "./shared";

// ─── Unified Profile (what the user sets once in StyleProfile) ──────────────

export interface StyleProfileInput {
    gender: "Male" | "Female";
    occasion: string;
    season: "Summer" | "Winter" | "Monsoon";
    styleVibe: string;
    ageGroup: string;
    fitPreference: string;
    undertone: string;
    skinTone: string;
    bodyShape: string;
    height: "Short" | "Medium" | "Tall";
}

// ─── Stage Outputs ──────────────────────────────────────────────────────────

export interface TopResult {
    item: string;
    color: string;
    vibe: string;
}

export interface PairResult {
    vibe: string;
    item: string;
    color: string;
    pattern: string;
    note: string;
}

export interface FullSuggestion {
    top: TopResult;
    bottom: PairResult[];
    layers: LayeringResult;
    footwear: FootwearResult;
}

// ─── The Orchestrator ───────────────────────────────────────────────────────

export class MasterEngine {
    private topEngine: ConsultantEngine;
    private pairEngine: FashionEngine;
    private layerEngine: LayeringEngine;
    private footwearEngine: FootwearEngine;

    constructor() {
        console.log("🎯 Initializing MasterEngine...");
        this.topEngine = new ConsultantEngine();
        this.pairEngine = new FashionEngine();
        this.layerEngine = new LayeringEngine();
        this.footwearEngine = new FootwearEngine();
        console.log("✅ MasterEngine ready.");
    }

    // ─── Helper: Build engine_top input from profile ────────────────────

    private toTopInput(p: StyleProfileInput): UserInput {
        return {
            gender: p.gender,
            occasion: p.occasion,
            season: p.season,
            styleVibe: p.styleVibe,
            ageGroup: p.ageGroup,
            fitPreference: p.fitPreference,
            undertone: p.undertone,
            skinTone: p.skinTone,
            bodyShape: p.bodyShape,
            height: p.height,
        };
    }

    // ─── Helper: Translate engine_top output → engine_pair input ────────
    // Handles P1 (fit suffix), P2 (color vocab), P3 (missing pattern)

    private topToPairInput(
        profile: StyleProfileInput,
        topItem: string,
        topColor: string,
        pattern?: string
    ): UserRequest {
        return {
            gender: profile.gender,
            category: "Top",
            type: stripFitSuffix(topItem),
            color: normalizeColorForPair(topColor),
            pattern: pattern || "Solid",
            season: profile.season,
            skinTone: profile.skinTone as UserRequest["skinTone"],
            bodyShape: profile.bodyShape as UserRequest["bodyShape"],
            height: profile.height,
        };
    }

    // ─── Helper: Build engine_layer input ───────────────────────────────

    private toLayerInput(
        profile: StyleProfileInput,
        topItem: string,
        topColor: string
    ): LayeringInput {
        return {
            gender: profile.gender,
            occasion: profile.occasion,
            season: profile.season,
            styleVibe: profile.styleVibe,
            ageGroup: profile.ageGroup,
            bodyShape: profile.bodyShape,
            height: profile.height,
            undertone: profile.undertone,
            skinTone: profile.skinTone,
            fitPreference: profile.fitPreference,
            topItemName: topItem,
            topItemColor: topColor,
        };
    }

    // ─── Helper: Build engine_footwear input ────────────────────────────

    private toFootwearInput(
        profile: StyleProfileInput,
        topItem: string,
        topColor: string,
        bottomItem: string,
        layerColor?: string
    ): FootwearInput {
        return {
            gender: profile.gender,
            occasion: profile.occasion,
            season: profile.season,
            styleVibe: profile.styleVibe,
            ageGroup: profile.ageGroup,
            bodyShape: profile.bodyShape,
            height: profile.height,
            undertone: profile.undertone,
            skinTone: profile.skinTone,
            fitPreference: profile.fitPreference,
            topItemName: topItem,
            topItemColor: topColor,
            bottomItemName: bottomItem,
            layerColor: layerColor,
        };
    }

    // ═══════════════════════════════════════════════════════════════════
    //  PUBLIC API — Entry at any pipeline stage
    // ═══════════════════════════════════════════════════════════════════

    /**
     * FULL PIPELINE: Profile → Top → Bottom → Layer → Footwear
     * "I need a complete outfit for this occasion"
     */
    public suggestFullOutfit(profile: StyleProfileInput): FullSuggestion | null {
        // Stage 1: Top
        const topInput = this.toTopInput(profile);
        const topResults = this.topEngine.getDualSuggestions(topInput);
        if (topResults.length === 0) return null;

        const primary = topResults[0];
        const topItem = primary.top.item;
        const topColor = primary.top.color;

        // Stage 2: Bottom (pair)
        const pairInput = this.topToPairInput(profile, topItem, topColor);
        const pairResult = this.pairEngine.getAdvice(pairInput);
        const bottomRecs = pairResult.recommendations || [];

        // Pick the classic bottom for downstream stages
        const classicBottom = bottomRecs[0];
        const bottomItem = classicBottom?.item || "Jeans";

        // Stage 3: Layer
        const layerResult = this.layerEngine.getLayeringOptions(
            this.toLayerInput(profile, topItem, topColor)
        );

        // Pick classic layer color for footwear sandwich method
        const classicLayerColor = layerResult.options[0]?.color;

        // Stage 4: Footwear
        const footwearResult = this.footwearEngine.getFootwearOptions(
            this.toFootwearInput(profile, topItem, topColor, bottomItem, classicLayerColor)
        );

        return {
            top: { item: topItem, color: topColor, vibe: primary.vibe },
            bottom: bottomRecs,
            layers: layerResult,
            footwear: footwearResult,
        };
    }

    /**
     * FROM TOP: User has a top item → suggest bottom + layer + footwear
     * "I have this kurta, what goes with it?"
     */
    public suggestFromTop(
        profile: StyleProfileInput,
        topItem: string,
        topColor: string,
        topPattern?: string
    ) {
        // Stage 2: Bottom
        const pairInput = this.topToPairInput(profile, topItem, topColor, topPattern);
        const pairResult = this.pairEngine.getAdvice(pairInput);
        const bottomRecs = pairResult.recommendations || [];
        const bottomItem = bottomRecs[0]?.item || "Jeans";

        // Stage 3: Layer
        const layerResult = this.layerEngine.getLayeringOptions(
            this.toLayerInput(profile, topItem, topColor)
        );
        const classicLayerColor = layerResult.options[0]?.color;

        // Stage 4: Footwear
        const footwearResult = this.footwearEngine.getFootwearOptions(
            this.toFootwearInput(profile, topItem, topColor, bottomItem, classicLayerColor)
        );

        return {
            bottom: bottomRecs,
            layers: layerResult,
            footwear: footwearResult,
        };
    }

    /**
     * FROM BOTTOM: User has a bottom item → suggest top pairing
     * "I have these jeans, what top should I wear?"
     */
    public suggestFromBottom(
        profile: StyleProfileInput,
        bottomItem: string,
        bottomColor: string,
        bottomPattern?: string
    ) {
        const pairInput: UserRequest = {
            gender: profile.gender,
            category: "Bottom",
            type: bottomItem,
            color: normalizeColorForPair(bottomColor),
            pattern: bottomPattern || "Solid",
            season: profile.season,
            skinTone: profile.skinTone as UserRequest["skinTone"],
            bodyShape: profile.bodyShape as UserRequest["bodyShape"],
            height: profile.height,
        };

        const pairResult = this.pairEngine.getAdvice(pairInput);
        return { topSuggestions: pairResult.recommendations || [] };
    }

    /**
     * LAYER ONLY: User has top + bottom, just needs layer suggestion
     */
    public suggestLayer(
        profile: StyleProfileInput,
        topItem: string,
        topColor: string
    ) {
        return this.layerEngine.getLayeringOptions(
            this.toLayerInput(profile, topItem, topColor)
        );
    }

    /**
     * FOOTWEAR ONLY: User has top + bottom, just needs shoe suggestion
     */
    public suggestFootwear(
        profile: StyleProfileInput,
        topItem: string,
        topColor: string,
        bottomItem: string,
        layerColor?: string
    ) {
        return this.footwearEngine.getFootwearOptions(
            this.toFootwearInput(profile, topItem, topColor, bottomItem, layerColor)
        );
    }

    /**
     * TOP ONLY: Just suggest what top to wear for this occasion
     */
    public suggestTop(profile: StyleProfileInput) {
        const topInput = this.toTopInput(profile);
        return this.topEngine.getDualSuggestions(topInput);
    }
}
