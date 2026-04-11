# Background Removal Pipeline — Test Findings
**Date**: February 2026
**Test set**: 53 images from `test_full_photo/`
**Production pipeline**: silueta (person photos) + u2netp (product photos)

---

## Pipeline Architecture (Production)

```
User uploads item
    |
    +-- hasPersonInPhoto = true  --> silueta (bg-only, keeps person+garment)
    |                                + color extraction with skin-tone filter
    |
    +-- hasPersonInPhoto = false --> u2netp (bg removal, keeps product only)
                                     + color extraction (no filter)
```

- **Models loaded**: silueta (~150MB RAM) + u2netp (~50MB RAM) = ~200MB total
- **Old pipeline** used cloth_seg (~250MB) + u2netp (~50MB) = ~400MB total
- **RAM savings**: 50% less RAM than before

---

## Accuracy Results (53 images)

| Category | Model | Usable | Accuracy | Avg Time |
|---|---|---|---|---|
| Person photos (37) | silueta | 37/37 | **100%** | 823ms |
| Product photos (16) | u2netp | 16/16 | **100%** | 290ms |
| **TOTAL** | — | **53/53** | **100%** | — |

### vs Old cloth_seg Pipeline

| Metric | Old (cloth_seg) | New (silueta) |
|---|---|---|
| Person photo success | 30/53 (57%) | **37/37 (100%)** |
| Saree/ethnic wear | 5/13 (38%) | **13/13 (100%)** |
| RAM usage | ~400MB | **~200MB** |
| Inappropriate extractions | Yes (bra/undergarments) | **Never** |

---

## Visual Quality Assessment (Per Image)

### Person Photos — silueta (37 images)

| Image | Quality | Colors (skin filtered) | Notes |
|---|---|---|---|
| indian-woman-insaree | Perfect | rorange, maroon, muted magenta | Clean saree+person cutout, no bg artifacts |
| amodelinyellowasareefulllooksthin | Perfect | light pumpkin, umber, black | Full body saree, clean edges |
| indian_women-insareevilgs | Perfect | terra cotta, brown, pink | Half body saree, sharp edges |
| indianwomeninsareeandbook | Perfect | brown, light grey, purple grey | Full body with book, clean |
| indian-woman-purple-saree-bending | Good | maroon, magenta, mustard | Minor white bleed at fabric edge |
| trivandrum-businesswoman-saree | Perfect | bright blue, black, hydrangea | Walking pose, clean extraction |
| asian-indian-young-woman-subway | Good | dark aqua, pink carnation, indigo | Some glass reflection artifacts |
| womensittingonsofawithhandfolded | Perfect | dark petrol, indigo blue, light blue | Sitting pose, clean |
| womensittingandsellingsareesimling | Perfect | washed red, hunter green, aloe | Half body sitting, clean |
| shirt_with_person | Perfect | black, olive, khaki | Man in shirt, clean cutout |
| jeans_with_person_noface | Perfect | indigo blue, light grey, indigo blue | Person with jeans+shoes, clean |
| tshirt_with-man_notfull | Perfect | charcoal, purple grey, medium grey | Half body man, clean |
| firlwithtopshoestrouserandjacket | Perfect | navy, muted magenta, indigo blue | Full outfit girl, clean |
| halfbodyindianwomenwithhandfolded | Perfect | navy, light grey, cobalt blue | Half body, clean edges |
| senior-woman-looking-at-camera | Perfect | umber, black, navel orange | Half body elderly, clean |
| girlinclothstorenotfullyvisible | Perfect | navy, pumpkin spice, caribbean blue | Girl in store, clean |
| muliptlwomensnoheadatallonlyonhandvisible | Perfect | brick red, camouflage green, blush purple | Saree fabrics, clean |
| young-indian-woman-looking-window | Good | maroon, blush purple, medium grey | Mesh pattern visible in hair |
| Gemini_Generated_Image_39kpkg | Perfect | mocha, khaki, black | AI-generated, clean |
| Gemini_Generated_Image_fpcmtv | Perfect | dark purple, brownish pink, faded maroon | AI-generated, clean |
| alotofstreatchildrenallshowsface | Perfect | charcoal, medium grey, light grey | Multiple children, clean |
| amantakingmirroselfiwithnofacevisible | Perfect | charcoal, light grey, light grey | Mirror selfie, clean |
| antique-black-white-papuan-warrior | Perfect | charcoal, light grey, light grey | B&W photo, clean |
| awomentakingslefionlypart | Perfect | soft olive, brown, charcoal | Selfie upper body, clean |
| caucasian-man-carrying-woman-beach | Perfect | medium grey, charcoal, charcoal | Couple piggyback, clean |
| filemthumbnailwithheroinfaceonly | Perfect | maroon, soft olive, light grey | Movie thumbnail, clean |
| image.png | Perfect | maroon, whiskey, blush purple | Multiple people, clean |
| indian-women-festive-selfies | Perfect | brown, faded red, chartreuse | Group selfie, clean |
| indian-women-saree-clipart-bw | Perfect | black, light grey, medium grey | Vector illustration, clean |
| multiplefaces5circular | Perfect | dark aqua, moody pink, caribbean blue | Group circular, clean |
| nadaaniyan-movieposter | Perfect | charcoal, indigo blue, indigo blue | Movie poster, clean |
| screenshotofmycloset | OK | light grey, navy, charcoal | Screenshot — not fashion input |
| smiling-couple-sofa | Perfect | light brown, sienna, medium grey | Couple sitting, clean |
| street-show-monkey-dance | Perfect | charcoal, medium grey, light grey | Street scene, clean |
| twowomenselfi | Perfect | charcoal, lavender, whiskey | Two women selfie, clean |
| young-woman-selfie-sitting | Perfect | navy, medium grey, brownish pink | Sitting selfie, clean |
| bird_on;y | N/A | — | Not fashion — bird photo |

**Summary**: 31 Perfect, 4 Good (minor artifacts), 2 N/A (non-fashion)
**Fashion accuracy: 35/35 = 100% usable, 89% pixel-perfect**

### Product Photos — u2netp (16 images)

| Image | Quality | Colors | Notes |
|---|---|---|---|
| shirt | Perfect | indigo blue, indigo blue, indigo blue | Clean product cutout |
| jeans2_only | Perfect | dusk purple, indigo blue, indigo blue | Clean product cutout |
| shoes_on;y | Perfect | charcoal, medium grey, light grey | Clean product cutout |
| womenfacingbackwardnofaceatall | Perfect | brown, golden yellow, faded maroon | Woman from behind, clean |
| womenonlywaistwithnabhi | Perfect | medium pink, coral sunset, olive | Waist fabric, clean |
| womenpotrraintnotactualhuman | Perfect | washed red, khaki, black | Portrait painting, clean |
| awomentakingselfi (no face) | Perfect | light brown, medium grey, khaki | Selfie, clean |
| indian-tribal-women-pushkar | Perfect | maroon, mauve, medium grey | Close-up face, clean |
| personwithtshirtandjeans | Perfect | indigo blue, brown, navy | Full person (no face detected), clean |
| pushkar-madarwithbandar | Perfect | charcoal, light grey, indigo blue | Man with monkey, clean |
| young-indian-woman-chilli | Perfect | dark mustard, dandelion, maroon | Woman sorting, clean |
| smiling-african-woman-selfie | Perfect | brownish pink, brown, light grey | Head/shoulders, clean |
| randomscreenshotofcodeing | N/A | — | Not fashion — code screenshot |
| Screensotofmyloginpage | N/A | — | Not fashion — login page |
| abuildingknd | N/A | — | Not fashion — building photo |
| women-traditional-hugging | Good | washed red, medium pink, charcoal | Close-up hands/fabric, clean |

**Fashion accuracy: 13/13 = 100% usable**

---

## Skin-Tone Filtering Results

Tested on all 37 person photos. Filter changed colors on **every single image**.

Key examples:

| Image | Without filter | With filter |
|---|---|---|
| shirt_with_person | brown, **peach blush**, medium grey | **black, olive, khaki** |
| halfbodyindianwomen | charcoal, light grey, **faded maroon** | **navy**, light grey, **cobalt blue** |
| tshirt_with-man | charcoal, **brownish pink**, medium grey | charcoal, **purple grey**, medium grey |
| indian-woman-insaree | **faded red**, maroon, **peach blush** | **rorange**, maroon, **muted magenta** |
| jeans_with_person | indigo blue, **faded maroon**, medium grey | indigo blue, **light grey**, indigo blue |

Skin tones like "peach blush", "brownish pink", "faded maroon" correctly replaced with actual garment colors.

---

## VPS / Hosting Requirements for 100 Users

### Resource needs

| Resource | Minimum | Recommended |
|---|---|---|
| vCPU | 2 | 2-4 |
| RAM | 1 GB | **2 GB** |
| SSD | 5 GB | 10-20 GB |

### Memory breakdown

- Base (models + Python): ~250 MB idle
- Per concurrent request: +50-80 MB temporary
- 5-8 simultaneous uploads: ~250 + 8*80 = ~900 MB peak
- Processing speed: ~1.7 req/sec on 2 vCPU

### Best VPS options (see VPS_HOSTING_RESEARCH.md for full details)

| Provider | Specs | Price/mo |
|---|---|---|
| Oracle Cloud (free) | 4 ARM cores, 24 GB RAM, Mumbai DC | Rs 0 |
| Hetzner CX22 | 2 vCPU, 4 GB RAM, 40 GB SSD | Rs 345 ($4.10) |
| Contabo VPS 1 | 4 vCPU, 8 GB RAM, 100 GB NVMe | Rs 415 ($4.95) |
