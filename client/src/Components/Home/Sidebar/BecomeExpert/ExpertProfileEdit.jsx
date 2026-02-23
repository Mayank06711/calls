import { useEffect, useState, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { ArrowBack, Save, CloudUpload, Close, Instagram, Language, LinkedIn } from "@mui/icons-material";
import { CircularProgress, IconButton } from "@mui/material";
import { useSubscriptionColors, toRgba } from "../../../../utils/getSubscriptionColors";
import { showNotification } from "../../../../redux/actions";
import { makeRequest } from "../../../../utils/apiHandlers";
import { uploadFile } from "../../../../utils/cloudinaryUtils";
import { ENDPOINTS, HTTP_METHODS } from "../../../../constants/apiEndpoints";
import { SPECIALIZATIONS } from "../../../../constants/expertConstants";

function ExpertProfileEdit() {
  const colors = useSubscriptionColors();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isExpert = useSelector((s) => s.auth.userInfo?.isExpert);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expert, setExpert] = useState(null);
  const [form, setForm] = useState({
    bio: "",
    specializations: [],
    portfolioUrls: [],
    socialLinks: { instagram: "", linkedin: "", website: "" },
  });
  const [dirty, setDirty] = useState(false);
  const [initialForm, setInitialForm] = useState(null);
  const [newPortfolioFiles, setNewPortfolioFiles] = useState([]);

  useEffect(() => {
    if (!isExpert) { navigate("/chats", { replace: true }); return; }
    (async () => {
      const { data, error } = await makeRequest(HTTP_METHODS.GET, ENDPOINTS.EXPERT.PROFILE);
      if (error || !data?.data?.expert) {
        dispatch(showNotification(error?.message || "Failed to load profile", "error"));
        setLoading(false);
        return;
      }
      const e = data.data.expert;
      setExpert(e);
      const formData = {
        bio: e.bio || "",
        specializations: e.specializations || [],
        portfolioUrls: e.portfolioUrls || [],
        socialLinks: {
          instagram: e.socialLinks?.instagram || "",
          linkedin: e.socialLinks?.linkedin || "",
          website: e.socialLinks?.website || "",
        },
      };
      setForm(formData);
      setInitialForm(JSON.parse(JSON.stringify(formData)));
      setLoading(false);
    })();
  }, [isExpert, navigate, dispatch]);

  const updateForm = useCallback((field, value) => {
    setForm((f) => {
      const next = { ...f, [field]: value };
      setDirty(true);
      return next;
    });
  }, []);

  const updateSocialLink = useCallback((field, value) => {
    setForm((f) => {
      const next = { ...f, socialLinks: { ...f.socialLinks, [field]: value } };
      setDirty(true);
      return next;
    });
  }, []);

  const toggleSpecialization = useCallback((spec) => {
    setForm((f) => {
      const current = f.specializations;
      const next = current.includes(spec)
        ? current.filter((s) => s !== spec)
        : current.length < 5 ? [...current, spec] : current;
      setDirty(true);
      return { ...f, specializations: next };
    });
  }, []);

  const removePortfolioUrl = useCallback((index) => {
    setForm((f) => {
      const next = f.portfolioUrls.filter((_, i) => i !== index);
      setDirty(true);
      return { ...f, portfolioUrls: next };
    });
  }, []);

  const uploadSingleFile = async (file) => {
    const { data, error } = await makeRequest(HTTP_METHODS.POST, ENDPOINTS.WARDROBE.GENERATE_UPLOAD_URL, {
      fileName: file.name,
      contentType: file.type,
    });
    if (error || !data) throw new Error(error?.message || "Failed to get upload URL");
    const url = await uploadFile(file, data);
    return url;
  };

  const handleSave = async () => {
    if (!dirty && newPortfolioFiles.length === 0) return;
    if (form.specializations.length === 0) {
      dispatch(showNotification("Select at least 1 specialization", "error"));
      return;
    }
    setSaving(true);
    try {
      let portfolioUrls = [...form.portfolioUrls];

      // Upload new portfolio files
      if (newPortfolioFiles.length > 0) {
        const uploaded = await Promise.all(newPortfolioFiles.map((f) => uploadSingleFile(f)));
        portfolioUrls = [...portfolioUrls, ...uploaded].slice(0, 5);
      }

      const payload = {
        bio: form.bio,
        specializations: form.specializations,
        portfolioUrls,
        socialLinks: form.socialLinks,
      };

      const { data, error } = await makeRequest(HTTP_METHODS.PUT, ENDPOINTS.EXPERT.PROFILE, payload);
      if (error) {
        dispatch(showNotification(error.message || "Update failed", "error"));
        return;
      }
      dispatch(showNotification("Profile updated", "success"));
      const updated = data?.data?.expert;
      if (updated) {
        const formData = {
          bio: updated.bio || "",
          specializations: updated.specializations || [],
          portfolioUrls: updated.portfolioUrls || [],
          socialLinks: {
            instagram: updated.socialLinks?.instagram || "",
            linkedin: updated.socialLinks?.linkedin || "",
            website: updated.socialLinks?.website || "",
          },
        };
        setForm(formData);
        setInitialForm(JSON.parse(JSON.stringify(formData)));
      }
      setNewPortfolioFiles([]);
      setDirty(false);
    } catch (err) {
      dispatch(showNotification(err.message || "Something went wrong", "error"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <CircularProgress size={28} style={{ color: colors.fourth }} />
      </div>
    );
  }

  if (!expert) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-6">
        <p className="text-sm dark:text-dark-text/60 text-light-text/60">Expert profile not found</p>
        <button onClick={() => navigate(-1)} className="text-sm underline" style={{ color: colors.fourth }}>Go back</button>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3 dark:bg-dark-primary bg-light-secondary border-b dark:border-dark-text/10 border-light-text/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <IconButton onClick={() => navigate(-1)} size="small">
              <ArrowBack style={{ color: colors.fourth }} />
            </IconButton>
            <div>
              <h2 className="text-lg font-semibold dark:text-dark-text text-light-text">Edit Expert Profile</h2>
              <p className="text-xs dark:text-dark-text/50 text-light-text/50">
                Update your bio, specializations, and portfolio
              </p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={(!dirty && newPortfolioFiles.length === 0) || saving}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-1.5 hover:opacity-90 transition-all disabled:opacity-40"
            style={{ backgroundColor: colors.fourth }}
          >
            {saving ? (
              <CircularProgress size={14} style={{ color: "#fff" }} />
            ) : (
              <Save style={{ fontSize: 16 }} />
            )}
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* Form content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-5">
        {/* Read-only info */}
        <div className="p-3 rounded-lg border" style={{ borderColor: toRgba(colors.fourth, 0.15), backgroundColor: toRgba(colors.fourth, 0.03) }}>
          <p className="text-[10px] uppercase tracking-wider font-medium dark:text-dark-text/40 text-light-text/40 mb-2">Profile Info (read-only)</p>
          <div className="grid grid-cols-2 gap-2 text-xs dark:text-dark-text/60 text-light-text/60">
            <div>
              <span className="font-medium">Name:</span> {expert.user?.fullName || "—"}
            </div>
            <div>
              <span className="font-medium">Experience:</span> {expert.experienceInYears} years
            </div>
            <div>
              <span className="font-medium">Qualification:</span> {expert.qualification}
            </div>
            <div>
              <span className="font-medium">Degree Verified:</span>{" "}
              <span className={expert.degree?.isVerified ? "text-green-500" : "text-yellow-500"}>
                {expert.degree?.isVerified ? "Yes" : "Pending"}
              </span>
            </div>
          </div>
        </div>

        {/* Bio */}
        <div>
          <label className="text-xs font-medium dark:text-dark-text/70 text-light-text/70 mb-1 block">Bio</label>
          <textarea
            value={form.bio}
            onChange={(e) => updateForm("bio", e.target.value)}
            className="ep-input min-h-[100px] resize-none"
            placeholder="Tell clients about your styling philosophy, experience, and what makes you unique..."
            maxLength={500}
          />
          <span className={`text-[10px] mt-0.5 block ${form.bio.length > 450 ? "text-yellow-500" : "dark:text-dark-text/30 text-light-text/30"}`}>
            {form.bio.length}/500
          </span>
        </div>

        {/* Specializations */}
        <div>
          <label className="text-xs font-medium dark:text-dark-text/70 text-light-text/70 mb-1 block">
            Specializations <span style={{ color: colors.fourth }}>*</span>
          </label>
          <p className="text-[10px] dark:text-dark-text/40 text-light-text/40 mb-2">Select 1-5 areas of expertise</p>
          <div className="flex flex-wrap gap-1.5">
            {SPECIALIZATIONS.map((spec) => {
              const active = form.specializations.includes(spec);
              return (
                <button
                  key={spec}
                  type="button"
                  onClick={() => toggleSpecialization(spec)}
                  className="px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all"
                  style={{
                    backgroundColor: active ? toRgba(colors.fourth, 0.15) : "transparent",
                    borderColor: active ? colors.fourth : toRgba(colors.fourth, 0.2),
                    color: active ? colors.fourth : undefined,
                  }}
                >
                  <span className={!active ? "dark:text-dark-text/50 text-light-text/50" : ""}>{spec}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Portfolio */}
        <div>
          <label className="text-xs font-medium dark:text-dark-text/70 text-light-text/70 mb-1 block">Portfolio</label>
          <p className="text-[10px] dark:text-dark-text/40 text-light-text/40 mb-2">Up to 5 work samples showcasing your styling</p>
          <div className="flex flex-wrap gap-2">
            {form.portfolioUrls.map((url, i) => (
              <div key={i} className="w-20 h-20 rounded-lg overflow-hidden relative group border" style={{ borderColor: toRgba(colors.fourth, 0.2) }}>
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => removePortfolioUrl(i)}
                  className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Close style={{ fontSize: 12 }} />
                </button>
              </div>
            ))}
            {newPortfolioFiles.map((file, i) => (
              <div key={`new-${i}`} className="w-20 h-20 rounded-lg overflow-hidden relative group border border-dashed" style={{ borderColor: colors.fourth }}>
                <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => setNewPortfolioFiles((f) => f.filter((_, idx) => idx !== i))}
                  className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Close style={{ fontSize: 12 }} />
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[8px] text-center py-0.5">New</div>
              </div>
            ))}
            {form.portfolioUrls.length + newPortfolioFiles.length < 5 && (
              <label className="w-20 h-20 rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:opacity-80 transition-all gap-1"
                style={{ borderColor: toRgba(colors.fourth, 0.3) }}>
                <CloudUpload style={{ fontSize: 20, color: colors.fourth, opacity: 0.5 }} />
                <span className="text-[9px] dark:text-dark-text/40 text-light-text/40">Add</span>
                <input type="file" accept="image/*" className="hidden"
                  onChange={(e) => { if (e.target.files[0]) setNewPortfolioFiles((f) => [...f, e.target.files[0]]); }} />
              </label>
            )}
          </div>
        </div>

        {/* Social Links */}
        <div>
          <label className="text-xs font-medium dark:text-dark-text/70 text-light-text/70 mb-2 block">Social Links</label>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Instagram style={{ fontSize: 18, color: colors.fourth, opacity: 0.6 }} />
              <input
                type="url"
                value={form.socialLinks.instagram}
                onChange={(e) => updateSocialLink("instagram", e.target.value)}
                className="ep-input flex-1"
                placeholder="https://instagram.com/yourprofile"
              />
            </div>
            <div className="flex items-center gap-2">
              <LinkedIn style={{ fontSize: 18, color: colors.fourth, opacity: 0.6 }} />
              <input
                type="url"
                value={form.socialLinks.linkedin}
                onChange={(e) => updateSocialLink("linkedin", e.target.value)}
                className="ep-input flex-1"
                placeholder="https://linkedin.com/in/yourprofile"
              />
            </div>
            <div className="flex items-center gap-2">
              <Language style={{ fontSize: 18, color: colors.fourth, opacity: 0.6 }} />
              <input
                type="url"
                value={form.socialLinks.website}
                onChange={(e) => updateSocialLink("website", e.target.value)}
                className="ep-input flex-1"
                placeholder="https://yourwebsite.com"
              />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .ep-input {
          width: 100%;
          padding: 8px 10px;
          border-radius: 8px;
          border: 1px solid ${toRgba(colors.fourth, 0.2)};
          font-size: 13px;
          outline: none;
          transition: all 0.15s;
        }
        .ep-input:focus {
          border-color: ${colors.fourth};
          box-shadow: 0 0 0 1.5px ${toRgba(colors.fourth, 0.2)};
        }
        .dark .ep-input {
          background: rgba(255,255,255,0.05);
          color: var(--dark-text, #e5e5e5);
        }
      `}</style>
    </div>
  );
}

export default ExpertProfileEdit;
