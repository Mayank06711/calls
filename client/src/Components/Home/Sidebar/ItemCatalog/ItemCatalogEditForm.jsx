import React, { useState, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowBack,
  AddPhotoAlternateOutlined,
  CloseOutlined,
  CheckroomOutlined,
  ContentCutOutlined,
  FaceRetouchingNaturalOutlined,
} from "@mui/icons-material";
import { useSubscriptionColors, toRgba } from "../../../../utils/getSubscriptionColors";
import { fetchItemCatalogDetail, updateCatalogItem } from "../../../../redux/thunks/itemCatalog.thunks";
import { clearItemCatalogDetail } from "../../../../redux/actions/itemCatalog.actions";
import { makeRequest } from "../../../../utils/apiHandlers";
import { uploadFile } from "../../../../utils/cloudinaryUtils";
import { ENDPOINTS, HTTP_METHODS } from "../../../../constants/apiEndpoints";
import { showNotification } from "../../../../redux/actions";
import { LOADER_TYPES } from "../../../../redux/action_creators";

// ─── Constants ──────────────────────────────────────────────────────────────

const CATEGORY_META = {
  clothing: { label: "Clothing", icon: <CheckroomOutlined sx={{ fontSize: 18 }} /> },
  hair: { label: "Hair", icon: <ContentCutOutlined sx={{ fontSize: 18 }} /> },
  makeup: { label: "Makeup", icon: <FaceRetouchingNaturalOutlined sx={{ fontSize: 18 }} /> },
};

const CLOTHING_TYPES = ["Top", "Bottom", "Shoes", "Accessory", "Outerwear", "Full Body"];
const FABRICS = ["Cotton", "Silk", "Linen", "Denim", "Wool", "Polyester", "Chiffon", "Velvet", "Satin", "Leather", "Georgette", "Crepe", "Khadi", "Other"];
const PATTERNS = ["Solid", "Striped", "Checked", "Floral", "Embroidered", "Polka Dot", "Abstract", "Printed"];
const SEASONS = ["Summer", "Winter", "Monsoon", "All"];
const OCCASIONS = ["Wedding", "Office", "Casual", "Party", "Travel", "Festive", "Date Night", "Sports", "Lounge"];
const GENDERS = ["Male", "Female", "Unisex"];

const HAIR_TYPES = ["Straight", "Wavy", "Curly", "Coily"];
const HAIR_LENGTHS = ["Short", "Medium", "Long", "Very Long"];
const FACE_SHAPES = ["Oval", "Round", "Square", "Heart", "Diamond", "Oblong"];
const MAINTENANCE_LEVELS = ["Low", "Medium", "High"];

const LOOK_TYPES = ["Everyday", "Bridal", "Party", "Office", "Editorial", "Natural", "Glam", "Festive"];
const SKIN_TONES = ["Fair", "Light", "Medium", "Olive", "Tan", "Dark", "Deep"];

// ─── Component ──────────────────────────────────────────────────────────────

const ItemCatalogEditForm = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { itemId } = useParams();
  const colors = useSubscriptionColors();
  const fileInputRef = useRef(null);

  const existingItem = useSelector((state) => state.itemCatalog?.detail);
  const isLoadingDetail = useSelector((state) => state.loaderState?.loaders?.[LOADER_TYPES.ITEM_CATALOG_DETAIL]);

  // State
  const [initialized, setInitialized] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [gender, setGender] = useState("Unisex");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState([]);
  const [images, setImages] = useState([]); // [{ file?, preview?, url }]
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Clothing fields
  const [clothingType, setClothingType] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [fabric, setFabric] = useState("");
  const [pattern, setPattern] = useState("");
  const [season, setSeason] = useState("");
  const [occasions, setOccasions] = useState([]);
  const [colorsInput, setColorsInput] = useState("");
  const [brand, setBrand] = useState("");
  const [priceRange, setPriceRange] = useState("");
  const [styleVibe, setStyleVibe] = useState("");

  // Hair fields
  const [hairType, setHairType] = useState("");
  const [hairLength, setHairLength] = useState("");
  const [faceShapes, setFaceShapes] = useState([]);
  const [maintenanceLevel, setMaintenanceLevel] = useState("");

  // Makeup fields
  const [lookType, setLookType] = useState("");
  const [skinTones, setSkinTones] = useState([]);
  const [products, setProducts] = useState([]);

  // Fetch item on mount
  useEffect(() => {
    if (itemId) dispatch(fetchItemCatalogDetail(itemId));
    return () => dispatch(clearItemCatalogDetail());
  }, [itemId, dispatch]);

  // Populate form when data loads
  useEffect(() => {
    if (existingItem && !initialized) {
      setTitle(existingItem.title || "");
      setDescription(existingItem.description || "");
      setGender(existingItem.gender || "Unisex");
      setTags(existingItem.tags || []);
      setImages((existingItem.images || []).map((url) => ({ url, preview: null, file: null })));

      // Clothing
      setClothingType(existingItem.clothingType || "");
      setSubcategory(existingItem.subcategory || "");
      setFabric(existingItem.fabric || "");
      setPattern(existingItem.pattern || "");
      setSeason(existingItem.season || "");
      setOccasions(existingItem.occasions || []);
      setColorsInput((existingItem.colors || []).join(", "));
      setBrand(existingItem.brand || "");
      setPriceRange(existingItem.priceRange || "");
      setStyleVibe(existingItem.styleVibe || "");

      // Hair
      setHairType(existingItem.hairType || "");
      setHairLength(existingItem.hairLength || "");
      setFaceShapes(existingItem.faceShapes || []);
      setMaintenanceLevel(existingItem.maintenanceLevel || "");

      // Makeup
      setLookType(existingItem.lookType || "");
      setSkinTones(existingItem.skinTones || []);
      setProducts(existingItem.products || []);

      setInitialized(true);
    }
  }, [existingItem, initialized]);

  const category = existingItem?.category;
  const catMeta = CATEGORY_META[category] || {};

  // ── Handlers ──

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    const remaining = 10 - images.length;
    const toAdd = files.slice(0, remaining).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      url: null,
    }));
    setImages((prev) => [...prev, ...toAdd]);
    e.target.value = "";
  };

  const removeImage = (index) => {
    setImages((prev) => {
      const copy = [...prev];
      if (copy[index].preview) URL.revokeObjectURL(copy[index].preview);
      copy.splice(index, 1);
      return copy;
    });
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && tags.length < 15 && !tags.includes(tag)) {
      setTags((prev) => [...prev, tag]);
    }
    setTagInput("");
  };

  const toggleMultiSelect = (value, state, setter) => {
    setter(state.includes(value) ? state.filter((v) => v !== value) : [...state, value]);
  };

  const addProduct = () => {
    setProducts((prev) => [...prev, { name: "", brand: "", shade: "" }]);
  };

  const updateProduct = (index, field, value) => {
    setProducts((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const removeProduct = (index) => {
    setProducts((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Upload & Submit ──

  const handleSubmit = async () => {
    if (!title.trim()) return dispatch(showNotification("Title is required", 400));
    if (!description.trim()) return dispatch(showNotification("Description is required", 400));
    if (images.length < 2) return dispatch(showNotification("At least 2 images required", 400));

    setSaving(true);

    // Separate existing URLs from new files needing upload
    const existingUrls = images.filter((img) => img.url).map((img) => img.url);
    const needUpload = images.filter((img) => img.file && !img.url);
    let allUrls = [...existingUrls];

    if (needUpload.length > 0) {
      setUploading(true);
      try {
        const result = await makeRequest(HTTP_METHODS.POST, ENDPOINTS.WARDROBE.GENERATE_UPLOAD_URLS, {
          files: needUpload.map((img) => ({ fileName: img.file.name, contentType: img.file.type })),
        });

        if (result.error || !result.data?.success) {
          dispatch(showNotification("Failed to get upload URLs", 500));
          setSaving(false);
          setUploading(false);
          return;
        }

        const uploadPromises = result.data.data.urls.map((uploadData, i) =>
          uploadFile(needUpload[i].file, uploadData)
        );
        const urls = await Promise.all(uploadPromises);
        allUrls = [...allUrls, ...urls];
      } catch (err) {
        console.error("Upload error:", err);
        dispatch(showNotification("Image upload failed", 500));
        setSaving(false);
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    // Build payload
    const payload = {
      title: title.trim(),
      description: description.trim(),
      images: allUrls,
      gender,
      tags,
    };

    if (category === "clothing") {
      if (clothingType) payload.clothingType = clothingType;
      if (subcategory) payload.subcategory = subcategory;
      if (fabric) payload.fabric = fabric;
      if (pattern) payload.pattern = pattern;
      if (season) payload.season = season;
      if (occasions.length) payload.occasions = occasions;
      if (colorsInput.trim()) payload.colors = colorsInput.split(",").map((c) => c.trim()).filter(Boolean);
      if (brand) payload.brand = brand;
      if (priceRange) payload.priceRange = priceRange;
      if (styleVibe) payload.styleVibe = styleVibe;
    } else if (category === "hair") {
      if (hairType) payload.hairType = hairType;
      if (hairLength) payload.hairLength = hairLength;
      if (faceShapes.length) payload.faceShapes = faceShapes;
      if (maintenanceLevel) payload.maintenanceLevel = maintenanceLevel;
    } else if (category === "makeup") {
      if (lookType) payload.lookType = lookType;
      if (skinTones.length) payload.skinTones = skinTones;
      const validProducts = products.filter((p) => p.name.trim());
      if (validProducts.length) payload.products = validProducts;
    }

    await dispatch(
      updateCatalogItem(itemId, payload, (item) => {
        navigate(`/item-catalog/${item._id}`);
      })
    );
    setSaving(false);
  };

  // ── Loading State ──

  if (isLoadingDetail || !existingItem) {
    return (
      <div className="min-h-screen bg-light-secondary dark:bg-dark-secondary">
        <div className="sticky top-0 z-10">
          <div className="px-6 py-4 shadow-sm" style={{ backgroundColor: colors.fourth }}>
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="text-white hover:opacity-80">
                <ArrowBack />
              </button>
              <h1 className="text-xl font-semibold text-white">Loading...</h1>
            </div>
          </div>
        </div>
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: colors.fourth }} />
        </div>
      </div>
    );
  }

  // ── Render ──

  return (
    <div className="min-h-screen bg-light-secondary dark:bg-dark-secondary">
      {/* Header */}
      <div className="sticky top-0 z-10">
        <div className="px-6 py-4 shadow-sm" style={{ backgroundColor: colors.fourth }}>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-white hover:opacity-80">
              <ArrowBack />
            </button>
            <h1 className="text-xl font-semibold text-white">Edit Catalog Item</h1>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 max-w-3xl mx-auto space-y-6">
        {/* Category badge (not editable) */}
        <div
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full capitalize"
          style={{ backgroundColor: toRgba(colors.fourth, 0.1), color: colors.fourth }}
        >
          {catMeta.icon}
          {catMeta.label}
        </div>

        {/* Common Fields */}
        <Card title="Basic Info">
          <Field label="Title *">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Summer Casual Linen Outfit"
              className="input-field"
              maxLength={150}
            />
          </Field>
          <Field label="Description *">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the item, why it works, styling tips..."
              className="input-field min-h-[80px] resize-y"
              maxLength={2000}
            />
          </Field>
          <Field label="Gender *">
            <PillGroup options={GENDERS} selected={gender} onSelect={setGender} colors={colors} />
          </Field>
          <Field label="Tags">
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                placeholder="Add tag & press Enter"
                className="input-field flex-1"
              />
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
                    style={{ backgroundColor: toRgba(colors.fourth, 0.1), color: colors.fourth }}
                  >
                    {tag}
                    <CloseOutlined
                      sx={{ fontSize: 12 }}
                      className="cursor-pointer"
                      onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                    />
                  </span>
                ))}
              </div>
            )}
          </Field>
        </Card>

        {/* Image Management */}
        <Card title={`Images (${images.length}/10, min 2)`}>
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
            {images.map((img, i) => (
              <div key={i} className="relative rounded-lg overflow-hidden h-24 bg-gray-100 dark:bg-gray-800">
                <img src={img.preview || img.url} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => removeImage(i)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 text-white flex items-center justify-center"
                >
                  <CloseOutlined sx={{ fontSize: 12 }} />
                </button>
              </div>
            ))}
            {images.length < 10 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="h-24 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-gray-400 transition-colors"
              >
                <AddPhotoAlternateOutlined sx={{ fontSize: 24 }} />
                <span className="text-[10px]">Add</span>
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </Card>

        {/* Category-Specific Fields */}
        {category === "clothing" && (
          <Card title="Clothing Details">
            <Field label="Clothing Type">
              <PillGroup options={CLOTHING_TYPES} selected={clothingType} onSelect={setClothingType} colors={colors} />
            </Field>
            <Field label="Subcategory">
              <input type="text" value={subcategory} onChange={(e) => setSubcategory(e.target.value)} placeholder="e.g., Blazer, Chinos, Sneakers" className="input-field" />
            </Field>
            <Field label="Fabric">
              <PillGroup options={FABRICS} selected={fabric} onSelect={setFabric} colors={colors} wrap />
            </Field>
            <Field label="Pattern">
              <PillGroup options={PATTERNS} selected={pattern} onSelect={setPattern} colors={colors} wrap />
            </Field>
            <Field label="Season">
              <PillGroup options={SEASONS} selected={season} onSelect={setSeason} colors={colors} />
            </Field>
            <Field label="Occasions">
              <PillGroupMulti options={OCCASIONS} selected={occasions} onToggle={(v) => toggleMultiSelect(v, occasions, setOccasions)} colors={colors} wrap />
            </Field>
            <Field label="Colors (comma separated)">
              <input type="text" value={colorsInput} onChange={(e) => setColorsInput(e.target.value)} placeholder="e.g., Navy, White, Beige" className="input-field" />
            </Field>
            <Field label="Brand">
              <input type="text" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Brand name" className="input-field" />
            </Field>
            <Field label="Price Range">
              <input type="text" value={priceRange} onChange={(e) => setPriceRange(e.target.value)} placeholder="e.g., Budget, Mid-range, Premium" className="input-field" />
            </Field>
            <Field label="Style Vibe">
              <input type="text" value={styleVibe} onChange={(e) => setStyleVibe(e.target.value)} placeholder="e.g., Minimalist, Bohemian, Classic" className="input-field" />
            </Field>
          </Card>
        )}

        {category === "hair" && (
          <Card title="Hair Details">
            <Field label="Hair Type">
              <PillGroup options={HAIR_TYPES} selected={hairType} onSelect={setHairType} colors={colors} />
            </Field>
            <Field label="Hair Length">
              <PillGroup options={HAIR_LENGTHS} selected={hairLength} onSelect={setHairLength} colors={colors} />
            </Field>
            <Field label="Suitable Face Shapes">
              <PillGroupMulti options={FACE_SHAPES} selected={faceShapes} onToggle={(v) => toggleMultiSelect(v, faceShapes, setFaceShapes)} colors={colors} wrap />
            </Field>
            <Field label="Maintenance Level">
              <PillGroup options={MAINTENANCE_LEVELS} selected={maintenanceLevel} onSelect={setMaintenanceLevel} colors={colors} />
            </Field>
          </Card>
        )}

        {category === "makeup" && (
          <Card title="Makeup Details">
            <Field label="Look Type">
              <PillGroup options={LOOK_TYPES} selected={lookType} onSelect={setLookType} colors={colors} wrap />
            </Field>
            <Field label="Suitable Skin Tones">
              <PillGroupMulti options={SKIN_TONES} selected={skinTones} onToggle={(v) => toggleMultiSelect(v, skinTones, setSkinTones)} colors={colors} wrap />
            </Field>
            <Field label="Products Used">
              <div className="space-y-2">
                {products.map((p, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input type="text" value={p.name} onChange={(e) => updateProduct(i, "name", e.target.value)} placeholder="Product name" className="input-field flex-1" />
                    <input type="text" value={p.brand || ""} onChange={(e) => updateProduct(i, "brand", e.target.value)} placeholder="Brand" className="input-field w-24" />
                    <input type="text" value={p.shade || ""} onChange={(e) => updateProduct(i, "shade", e.target.value)} placeholder="Shade" className="input-field w-24" />
                    <button onClick={() => removeProduct(i)} className="text-red-400 hover:text-red-500">
                      <CloseOutlined sx={{ fontSize: 16 }} />
                    </button>
                  </div>
                ))}
                <button onClick={addProduct} className="text-xs font-medium" style={{ color: colors.fourth }}>
                  + Add Product
                </button>
              </div>
            </Field>
          </Card>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={saving || uploading}
          className="w-full py-3 rounded-xl text-white font-medium text-sm transition-opacity disabled:opacity-50"
          style={{ backgroundColor: colors.fourth }}
        >
          {uploading ? "Uploading images..." : saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      <style>{`
        .input-field {
          width: 100%;
          @apply bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm;
        }
        .input-field:focus {
          outline: none;
          border-color: ${colors.fourth};
        }
      `}</style>
    </div>
  );
};

// ─── Shared Sub-components ──────────────────────────────────────────────────

const Card = ({ title, children }) => (
  <div className="bg-white dark:bg-dark-primary rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
    <h3 className="text-sm font-semibold text-gray-900 dark:text-dark-text mb-4">{title}</h3>
    <div className="space-y-4">{children}</div>
  </div>
);

const Field = ({ label, children }) => (
  <div>
    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">{label}</p>
    {children}
  </div>
);

const PillGroup = ({ options, selected, onSelect, colors, wrap }) => (
  <div className={`flex gap-1.5 ${wrap ? "flex-wrap" : "overflow-x-auto"}`}>
    {options.map((opt) => (
      <button
        key={opt}
        onClick={() => onSelect(selected === opt ? "" : opt)}
        className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
          selected === opt ? "text-white" : "text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800"
        }`}
        style={selected === opt ? { backgroundColor: colors.fourth } : {}}
      >
        {opt}
      </button>
    ))}
  </div>
);

const PillGroupMulti = ({ options, selected, onToggle, colors, wrap }) => (
  <div className={`flex gap-1.5 ${wrap ? "flex-wrap" : "overflow-x-auto"}`}>
    {options.map((opt) => (
      <button
        key={opt}
        onClick={() => onToggle(opt)}
        className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
          selected.includes(opt) ? "text-white" : "text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800"
        }`}
        style={selected.includes(opt) ? { backgroundColor: colors.fourth } : {}}
      >
        {opt}
      </button>
    ))}
  </div>
);

export default ItemCatalogEditForm;
