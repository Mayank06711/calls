import { useEffect, useState, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { ArrowBack, ArrowForward, Check, CloudUpload, Close, Work } from "@mui/icons-material";
import { CircularProgress, IconButton } from "@mui/material";
import { useSubscriptionColors, toRgba } from "../../../../utils/getSubscriptionColors";
import { showNotification } from "../../../../redux/actions";
import { makeRequest } from "../../../../utils/apiHandlers";
import { uploadFile } from "../../../../utils/cloudinaryUtils";
import { ENDPOINTS, HTTP_METHODS } from "../../../../constants/apiEndpoints";
import { SPECIALIZATIONS, APPLICATION_STATUSES } from "../../../../constants/expertConstants";
import ApplicationStatus from "./ApplicationStatus";

const STEPS = ["Personal Info", "Professional", "Verification"];

const emptyForm = {
  personalInfo: { fullName: "", email: "", phone: "", city: "", country: "India", bio: "" },
  professionalInfo: { experienceInYears: 0, qualification: "", specializations: [], portfolioUrls: [], socialLinks: { instagram: "", linkedin: "", website: "" }, previousWork: "" },
  verification: { degreeFileUrl: "", idProofUrl: "", agreedToTerms: false },
};

function BecomeExpert() {
  const colors = useSubscriptionColors();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const userInfo = useSelector((s) => s.userInfo?.data || {});
  const isExpert = useSelector((s) => s.auth.userInfo?.isExpert);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [application, setApplication] = useState(null);
  const [errors, setErrors] = useState({});

  // File state for uploads (local File objects before upload)
  const [degreeFile, setDegreeFile] = useState(null);
  const [idProofFile, setIdProofFile] = useState(null);
  const [portfolioFiles, setPortfolioFiles] = useState([]);
  const [uploading, setUploading] = useState("");
  const [editing, setEditing] = useState(false);

  // Fetch existing application on mount
  useEffect(() => {
    if (isExpert) { navigate("/chats", { replace: true }); return; }
    (async () => {
      const { data, error } = await makeRequest(HTTP_METHODS.GET, ENDPOINTS.EXPERT_APPLICATION.MINE);
      if (data?.data?.application) {
        const app = data.data.application;
        setApplication(app);
        if (app.status === APPLICATION_STATUSES.APPROVED) {
          navigate("/chats", { replace: true });
          return;
        }
        if (app.status === APPLICATION_STATUSES.DRAFT) {
          setForm({
            personalInfo: { ...emptyForm.personalInfo, ...app.personalInfo },
            professionalInfo: { ...emptyForm.professionalInfo, ...app.professionalInfo, socialLinks: { ...emptyForm.professionalInfo.socialLinks, ...(app.professionalInfo?.socialLinks || {}) } },
            verification: { ...emptyForm.verification, ...app.verification },
          });
        }
      } else {
        // Pre-fill from user profile
        setForm((f) => ({
          ...f,
          personalInfo: {
            ...f.personalInfo,
            fullName: userInfo.fullName || "",
            email: userInfo.email || "",
            phone: userInfo.phone || "",
            city: userInfo.city || "",
          },
        }));
      }
      setLoading(false);
    })();
  }, [isExpert, navigate, userInfo]);

  const updateField = useCallback((section, field, value) => {
    setForm((f) => ({ ...f, [section]: { ...f[section], [field]: value } }));
    setErrors((e) => ({ ...e, [`${section}.${field}`]: undefined }));
  }, []);

  const updateSocialLink = useCallback((field, value) => {
    setForm((f) => ({
      ...f,
      professionalInfo: {
        ...f.professionalInfo,
        socialLinks: { ...f.professionalInfo.socialLinks, [field]: value },
      },
    }));
  }, []);

  const toggleSpecialization = useCallback((spec) => {
    setForm((f) => {
      const current = f.professionalInfo.specializations;
      const next = current.includes(spec) ? current.filter((s) => s !== spec) : current.length < 5 ? [...current, spec] : current;
      return { ...f, professionalInfo: { ...f.professionalInfo, specializations: next } };
    });
  }, []);

  // Validation per step
  const validateStep = (s) => {
    const errs = {};
    if (s === 0) {
      if (!form.personalInfo.fullName.trim()) errs["personalInfo.fullName"] = "Required";
      if (!form.personalInfo.email.trim()) errs["personalInfo.email"] = "Required";
      if (!form.personalInfo.city.trim()) errs["personalInfo.city"] = "Required";
      if (form.personalInfo.bio.trim().length < 50) errs["personalInfo.bio"] = "Min 50 characters";
    }
    if (s === 1) {
      if (!form.professionalInfo.qualification.trim()) errs["professionalInfo.qualification"] = "Required";
      if (form.professionalInfo.specializations.length === 0) errs["professionalInfo.specializations"] = "Select at least 1";
    }
    if (s === 2) {
      if (!form.verification.degreeFileUrl && !degreeFile) errs["verification.degreeFileUrl"] = "Required";
      if (!form.verification.agreedToTerms) errs["verification.agreedToTerms"] = "Must agree";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) setStep((s) => Math.min(s + 1, 2));
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  // Upload a single file and return its URL
  const uploadSingleFile = async (file) => {
    const { data, error } = await makeRequest(HTTP_METHODS.POST, ENDPOINTS.WARDROBE.GENERATE_UPLOAD_URL, {
      fileName: file.name,
      contentType: file.type,
    });
    if (error || !data) throw new Error(error?.message || "Failed to get upload URL");
    const url = await uploadFile(file, data);
    return url;
  };

  const handleSubmit = async () => {
    if (!validateStep(2)) return;
    setSubmitting(true);
    try {
      // Upload files if new ones selected
      let degreeUrl = form.verification.degreeFileUrl;
      let idProofUrl = form.verification.idProofUrl;
      let portfolioUrls = [...(form.professionalInfo.portfolioUrls || [])];

      if (degreeFile) {
        setUploading("Uploading degree certificate...");
        degreeUrl = await uploadSingleFile(degreeFile);
      }
      if (idProofFile) {
        setUploading("Uploading ID proof...");
        idProofUrl = await uploadSingleFile(idProofFile);
      }
      if (portfolioFiles.length > 0) {
        setUploading("Uploading portfolio...");
        const uploaded = await Promise.all(portfolioFiles.map((f) => uploadSingleFile(f)));
        portfolioUrls = [...portfolioUrls, ...uploaded].slice(0, 5);
      }

      setUploading("Submitting application...");

      const payload = {
        personalInfo: form.personalInfo,
        professionalInfo: { ...form.professionalInfo, portfolioUrls },
        verification: { ...form.verification, degreeFileUrl: degreeUrl, idProofUrl: idProofUrl || undefined },
      };

      // Clean empty social links
      const sl = payload.professionalInfo.socialLinks;
      if (!sl.instagram && !sl.linkedin && !sl.website) {
        delete payload.professionalInfo.socialLinks;
      }

      const isUpdate = application && [APPLICATION_STATUSES.DRAFT, APPLICATION_STATUSES.REVISIONS_REQUESTED].includes(application.status);
      const method = isUpdate ? HTTP_METHODS.PUT : HTTP_METHODS.POST;
      const url = isUpdate ? ENDPOINTS.EXPERT_APPLICATION.MINE : ENDPOINTS.EXPERT_APPLICATION.SUBMIT;

      const { data, error } = await makeRequest(method, url, payload);
      if (error) {
        dispatch(showNotification(error.message || "Submission failed", "error"));
        return;
      }
      dispatch(showNotification("Application submitted successfully!", "success"));
      setApplication(data?.data?.application || { ...application, status: APPLICATION_STATUSES.SUBMITTED });
      setEditing(false);
    } catch (err) {
      dispatch(showNotification(err.message || "Something went wrong", "error"));
    } finally {
      setSubmitting(false);
      setUploading("");
    }
  };

  // If not a draft and not actively editing → show status page
  if (!loading && application && application.status !== APPLICATION_STATUSES.DRAFT && !editing) {
    return (
      <ApplicationStatus
        application={application}
        onEdit={() => {
          if (application.status === APPLICATION_STATUSES.REVISIONS_REQUESTED) {
            // Pre-fill form with existing data and enter edit mode
            setForm({
              personalInfo: { ...emptyForm.personalInfo, ...application.personalInfo },
              professionalInfo: { ...emptyForm.professionalInfo, ...application.professionalInfo, socialLinks: { ...emptyForm.professionalInfo.socialLinks, ...(application.professionalInfo?.socialLinks || {}) } },
              verification: { ...emptyForm.verification, ...application.verification },
            });
            setStep(0);
            setEditing(true);
          } else {
            // Reapply from rejected/withdrawn — reset form for fresh submission
            setApplication(null);
            setForm({
              ...emptyForm,
              personalInfo: {
                ...emptyForm.personalInfo,
                fullName: userInfo.fullName || "",
                email: userInfo.email || "",
                phone: userInfo.phone || "",
                city: userInfo.city || "",
              },
            });
            setStep(0);
            setEditing(true);
          }
        }}
        onWithdraw={async () => {
          const { data, error } = await makeRequest(HTTP_METHODS.POST, ENDPOINTS.EXPERT_APPLICATION.WITHDRAW);
          if (error) {
            dispatch(showNotification(error.message, "error"));
            return;
          }
          dispatch(showNotification("Application withdrawn", "success"));
          setApplication(data?.data?.application || { ...application, status: APPLICATION_STATUSES.WITHDRAWN });
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <CircularProgress size={28} style={{ color: colors.fourth }} />
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3 dark:bg-dark-primary bg-light-secondary border-b dark:border-dark-text/10 border-light-text/10">
        <div className="flex items-center gap-3 mb-3">
          <IconButton onClick={() => navigate(-1)} size="small">
            <ArrowBack style={{ color: colors.fourth }} />
          </IconButton>
          <div>
            <h2 className="text-lg font-semibold dark:text-dark-text text-light-text">Become an Expert</h2>
            <p className="text-xs dark:text-dark-text/50 text-light-text/50">
              {application?.status === APPLICATION_STATUSES.REVISIONS_REQUESTED ? "Revisions requested — update and resubmit" : "Apply to join as a fashion consultant"}
            </p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2 flex-1">
              <button
                onClick={() => { if (i < step) setStep(i); }}
                className="flex items-center gap-1.5 flex-1"
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 transition-all"
                  style={{
                    backgroundColor: i <= step ? colors.fourth : toRgba(colors.fourth, 0.15),
                    color: i <= step ? "#fff" : colors.fourth,
                  }}
                >
                  {i < step ? <Check style={{ fontSize: 14 }} /> : i + 1}
                </div>
                <span className={`text-[11px] font-medium truncate ${i <= step ? "dark:text-dark-text text-light-text" : "dark:text-dark-text/40 text-light-text/40"}`}>
                  {label}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <div className="w-8 h-px flex-shrink-0" style={{ backgroundColor: i < step ? colors.fourth : toRgba(colors.fourth, 0.2) }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Form content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
        {/* Admin notes banner for revisions */}
        {application?.status === APPLICATION_STATUSES.REVISIONS_REQUESTED && application.adminNotes && (
          <div className="flex gap-2.5 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <span className="text-orange-500 text-base flex-shrink-0 mt-0.5">&#9888;</span>
            <div>
              <p className="text-xs font-semibold text-orange-500 mb-0.5">Admin Feedback</p>
              <p className="text-xs dark:text-dark-text/70 text-light-text/70">{application.adminNotes}</p>
            </div>
          </div>
        )}
        {step === 0 && (
          <PersonalInfoStep form={form} errors={errors} updateField={updateField} colors={colors} />
        )}
        {step === 1 && (
          <ProfessionalStep
            form={form}
            errors={errors}
            updateField={updateField}
            updateSocialLink={updateSocialLink}
            toggleSpecialization={toggleSpecialization}
            portfolioFiles={portfolioFiles}
            setPortfolioFiles={setPortfolioFiles}
            colors={colors}
          />
        )}
        {step === 2 && (
          <VerificationStep
            form={form}
            errors={errors}
            updateField={updateField}
            degreeFile={degreeFile}
            setDegreeFile={setDegreeFile}
            idProofFile={idProofFile}
            setIdProofFile={setIdProofFile}
            colors={colors}
          />
        )}
      </div>

      {/* Footer nav */}
      <div className="flex-shrink-0 px-4 py-3 border-t dark:border-dark-text/10 border-light-text/10 flex items-center justify-between">
        <button
          onClick={step === 0 ? () => navigate(-1) : handleBack}
          className="px-4 py-2 rounded-lg text-sm font-medium dark:text-dark-text/60 text-light-text/60 hover:opacity-80 transition-all"
        >
          {step === 0 ? "Cancel" : "Back"}
        </button>
        {step < 2 ? (
          <button
            onClick={handleNext}
            className="px-5 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-1.5 hover:opacity-90 transition-all"
            style={{ backgroundColor: colors.fourth }}
          >
            Next <ArrowForward style={{ fontSize: 16 }} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-5 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-1.5 hover:opacity-90 transition-all disabled:opacity-50"
            style={{ backgroundColor: colors.fourth }}
          >
            {submitting ? (
              <>
                <CircularProgress size={14} style={{ color: "#fff" }} />
                {uploading || "Submitting..."}
              </>
            ) : (
              <>Submit Application</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Step 1: Personal Info ────────────────────────────────────────────────────

function PersonalInfoStep({ form, errors, updateField, colors }) {
  const p = form.personalInfo;
  return (
    <div className="space-y-3">
      <FormField label="Full Name" error={errors["personalInfo.fullName"]} required colors={colors}>
        <input type="text" value={p.fullName} onChange={(e) => updateField("personalInfo", "fullName", e.target.value)}
          className="form-input" placeholder="Your full name" />
      </FormField>
      <FormField label="Email" error={errors["personalInfo.email"]} required colors={colors}>
        <input type="email" value={p.email} onChange={(e) => updateField("personalInfo", "email", e.target.value)}
          className="form-input" placeholder="your@email.com" />
      </FormField>
      <FormField label="Phone" colors={colors}>
        <input type="tel" value={p.phone} onChange={(e) => updateField("personalInfo", "phone", e.target.value)}
          className="form-input" placeholder="+91 ..." />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="City" error={errors["personalInfo.city"]} required colors={colors}>
          <input type="text" value={p.city} onChange={(e) => updateField("personalInfo", "city", e.target.value)}
            className="form-input" placeholder="Mumbai" />
        </FormField>
        <FormField label="Country" colors={colors}>
          <input type="text" value={p.country} onChange={(e) => updateField("personalInfo", "country", e.target.value)}
            className="form-input" placeholder="India" />
        </FormField>
      </div>
      <FormField label="Bio" error={errors["personalInfo.bio"]} required colors={colors}>
        <textarea value={p.bio} onChange={(e) => updateField("personalInfo", "bio", e.target.value)}
          className="form-input min-h-[100px] resize-none" placeholder="Tell us about yourself, your fashion philosophy, and what makes you a great stylist... (min 50 characters)"
          maxLength={500} />
        <span className={`text-[10px] mt-0.5 block ${p.bio.length < 50 ? "text-red-400" : "dark:text-dark-text/30 text-light-text/30"}`}>
          {p.bio.length}/500
        </span>
      </FormField>
    </div>
  );
}

// ─── Step 2: Professional Info ────────────────────────────────────────────────

function ProfessionalStep({ form, errors, updateField, updateSocialLink, toggleSpecialization, portfolioFiles, setPortfolioFiles, colors }) {
  const p = form.professionalInfo;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Experience (years)" colors={colors}>
          <input type="number" value={p.experienceInYears} min={0} max={50}
            onChange={(e) => updateField("professionalInfo", "experienceInYears", parseInt(e.target.value) || 0)}
            className="form-input" />
        </FormField>
        <FormField label="Qualification" error={errors["professionalInfo.qualification"]} required colors={colors}>
          <input type="text" value={p.qualification} onChange={(e) => updateField("professionalInfo", "qualification", e.target.value)}
            className="form-input" placeholder="e.g. Fashion Design Diploma" />
        </FormField>
      </div>

      <FormField label="Specializations" error={errors["professionalInfo.specializations"]} required colors={colors}>
        <p className="text-[10px] dark:text-dark-text/40 text-light-text/40 mb-2">Select 1-5 areas of expertise</p>
        <div className="flex flex-wrap gap-1.5">
          {SPECIALIZATIONS.map((spec) => {
            const active = p.specializations.includes(spec);
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
      </FormField>

      <FormField label="Portfolio Images" colors={colors}>
        <p className="text-[10px] dark:text-dark-text/40 text-light-text/40 mb-2">Upload up to 5 work samples</p>
        <div className="flex flex-wrap gap-2">
          {/* Existing portfolio URLs */}
          {(p.portfolioUrls || []).map((url, i) => (
            <div key={i} className="w-16 h-16 rounded-lg overflow-hidden relative group border" style={{ borderColor: toRgba(colors.fourth, 0.2) }}>
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => updateField("professionalInfo", "portfolioUrls", p.portfolioUrls.filter((_, idx) => idx !== i))}
                className="absolute top-0 right-0 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Close style={{ fontSize: 10 }} />
              </button>
            </div>
          ))}
          {/* New local files */}
          {portfolioFiles.map((file, i) => (
            <div key={`new-${i}`} className="w-16 h-16 rounded-lg overflow-hidden relative group border" style={{ borderColor: toRgba(colors.fourth, 0.2) }}>
              <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => setPortfolioFiles((f) => f.filter((_, idx) => idx !== i))}
                className="absolute top-0 right-0 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Close style={{ fontSize: 10 }} />
              </button>
            </div>
          ))}
          {/* Add button */}
          {(p.portfolioUrls || []).length + portfolioFiles.length < 5 && (
            <label className="w-16 h-16 rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer hover:opacity-80 transition-all"
              style={{ borderColor: toRgba(colors.fourth, 0.3) }}>
              <CloudUpload style={{ fontSize: 20, color: colors.fourth, opacity: 0.5 }} />
              <input type="file" accept="image/*" className="hidden"
                onChange={(e) => { if (e.target.files[0]) setPortfolioFiles((f) => [...f, e.target.files[0]]); }} />
            </label>
          )}
        </div>
      </FormField>

      <FormField label="Previous Work" colors={colors}>
        <textarea value={p.previousWork || ""} onChange={(e) => updateField("professionalInfo", "previousWork", e.target.value)}
          className="form-input min-h-[80px] resize-none" placeholder="Describe your past work experience, clients, or projects... (optional)"
          maxLength={1000} />
      </FormField>

      <div className="space-y-2">
        <p className="text-xs font-medium dark:text-dark-text/70 text-light-text/70">Social Links (optional)</p>
        <input type="url" value={p.socialLinks?.instagram || ""} onChange={(e) => updateSocialLink("instagram", e.target.value)}
          className="form-input" placeholder="Instagram URL" />
        <input type="url" value={p.socialLinks?.linkedin || ""} onChange={(e) => updateSocialLink("linkedin", e.target.value)}
          className="form-input" placeholder="LinkedIn URL" />
        <input type="url" value={p.socialLinks?.website || ""} onChange={(e) => updateSocialLink("website", e.target.value)}
          className="form-input" placeholder="Website URL" />
      </div>
    </div>
  );
}

// ─── Step 3: Verification ─────────────────────────────────────────────────────

function VerificationStep({ form, errors, updateField, degreeFile, setDegreeFile, idProofFile, setIdProofFile, colors }) {
  const v = form.verification;
  return (
    <div className="space-y-4">
      <FormField label="Degree / Certificate" error={errors["verification.degreeFileUrl"]} required colors={colors}>
        <p className="text-[10px] dark:text-dark-text/40 text-light-text/40 mb-2">Upload your fashion-related degree, diploma, or certificate</p>
        {(v.degreeFileUrl || degreeFile) ? (
          <div className="flex items-center gap-2 p-2 rounded-lg border" style={{ borderColor: toRgba(colors.fourth, 0.2) }}>
            <Check style={{ fontSize: 16, color: "#22c55e" }} />
            <span className="text-xs dark:text-dark-text/60 text-light-text/60 truncate flex-1">
              {degreeFile ? degreeFile.name : "Previously uploaded"}
            </span>
            <button onClick={() => { setDegreeFile(null); updateField("verification", "degreeFileUrl", ""); }}
              className="text-red-400 hover:text-red-500">
              <Close style={{ fontSize: 14 }} />
            </button>
          </div>
        ) : (
          <label className="flex items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed cursor-pointer hover:opacity-80 transition-all"
            style={{ borderColor: toRgba(colors.fourth, 0.3) }}>
            <CloudUpload style={{ fontSize: 20, color: colors.fourth, opacity: 0.5 }} />
            <span className="text-xs dark:text-dark-text/50 text-light-text/50">Choose file (PDF, image)</span>
            <input type="file" accept="image/*,.pdf" className="hidden"
              onChange={(e) => { if (e.target.files[0]) setDegreeFile(e.target.files[0]); }} />
          </label>
        )}
      </FormField>

      <FormField label="Government ID (optional)" colors={colors}>
        <p className="text-[10px] dark:text-dark-text/40 text-light-text/40 mb-2">For identity verification (Aadhaar, PAN, Passport, etc.)</p>
        {(v.idProofUrl || idProofFile) ? (
          <div className="flex items-center gap-2 p-2 rounded-lg border" style={{ borderColor: toRgba(colors.fourth, 0.2) }}>
            <Check style={{ fontSize: 16, color: "#22c55e" }} />
            <span className="text-xs dark:text-dark-text/60 text-light-text/60 truncate flex-1">
              {idProofFile ? idProofFile.name : "Previously uploaded"}
            </span>
            <button onClick={() => { setIdProofFile(null); updateField("verification", "idProofUrl", ""); }}
              className="text-red-400 hover:text-red-500">
              <Close style={{ fontSize: 14 }} />
            </button>
          </div>
        ) : (
          <label className="flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed cursor-pointer hover:opacity-80 transition-all"
            style={{ borderColor: toRgba(colors.fourth, 0.3) }}>
            <CloudUpload style={{ fontSize: 18, color: colors.fourth, opacity: 0.4 }} />
            <span className="text-xs dark:text-dark-text/50 text-light-text/50">Choose file</span>
            <input type="file" accept="image/*,.pdf" className="hidden"
              onChange={(e) => { if (e.target.files[0]) setIdProofFile(e.target.files[0]); }} />
          </label>
        )}
      </FormField>

      <div className="flex items-start gap-2 p-3 rounded-lg" style={{ backgroundColor: toRgba(colors.fourth, 0.05) }}>
        <input
          type="checkbox"
          checked={v.agreedToTerms}
          onChange={(e) => updateField("verification", "agreedToTerms", e.target.checked)}
          className="mt-0.5 accent-current"
          style={{ accentColor: colors.fourth }}
        />
        <div>
          <p className="text-xs dark:text-dark-text/70 text-light-text/70">
            I agree to the Expert Terms of Service and confirm that all information provided is accurate.
          </p>
          {errors["verification.agreedToTerms"] && (
            <p className="text-[10px] text-red-400 mt-0.5">{errors["verification.agreedToTerms"]}</p>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="mt-4 p-3 rounded-lg border" style={{ borderColor: toRgba(colors.fourth, 0.15) }}>
        <p className="text-xs font-medium dark:text-dark-text/70 text-light-text/70 mb-2">Application Summary</p>
        <div className="space-y-1 text-[11px] dark:text-dark-text/50 text-light-text/50">
          <p><span className="font-medium">Name:</span> {form.personalInfo.fullName}</p>
          <p><span className="font-medium">Email:</span> {form.personalInfo.email}</p>
          <p><span className="font-medium">City:</span> {form.personalInfo.city}, {form.personalInfo.country}</p>
          <p><span className="font-medium">Experience:</span> {form.professionalInfo.experienceInYears} years</p>
          <p><span className="font-medium">Qualification:</span> {form.professionalInfo.qualification}</p>
          <p><span className="font-medium">Specializations:</span> {form.professionalInfo.specializations.join(", ") || "None selected"}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Shared form field wrapper ────────────────────────────────────────────────

function FormField({ label, error, required, children, colors }) {
  return (
    <div>
      <label className="text-xs font-medium dark:text-dark-text/70 text-light-text/70 mb-1 block">
        {label} {required && <span style={{ color: colors.fourth }}>*</span>}
      </label>
      {children}
      {error && <p className="text-[10px] text-red-400 mt-0.5">{error}</p>}

      <style>{`
        .form-input {
          width: 100%;
          padding: 8px 10px;
          border-radius: 8px;
          border: 1px solid ${toRgba(colors.fourth, 0.2)};
          font-size: 13px;
          outline: none;
          transition: all 0.15s;
        }
        .form-input:focus {
          border-color: ${colors.fourth};
          box-shadow: 0 0 0 1.5px ${toRgba(colors.fourth, 0.2)};
        }
        .dark .form-input {
          background: rgba(255,255,255,0.05);
          color: var(--dark-text, #e5e5e5);
        }
        .form-input[type="number"]::-webkit-inner-spin-button,
        .form-input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .form-input[type="number"] {
          -moz-appearance: textfield;
        }
      `}</style>
    </div>
  );
}

export default BecomeExpert;
