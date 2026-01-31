import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createAxiosInstance } from "../../config/axios";
import { ENDPOINTS } from "../../constants/apiEndpoints";

const TermsAndConditions = () => {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchTerms = async () => {
      try {
        const api = createAxiosInstance();
        const res = await api.get(ENDPOINTS.LEGAL.TERMS);
        setContent(res.data?.data?.data);
      } catch (err) {
        setError("Failed to load terms and conditions.");
      } finally {
        setLoading(false);
      }
    };
    fetchTerms();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500 text-lg">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-red-500 text-lg">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full self-start overflow-y-auto bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
        >
          &larr; Back
        </button>
        <div
          className="bg-white rounded-lg shadow p-6 prose prose-sm max-w-none
            [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-gray-900 [&_h1]:mb-4
            [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-gray-800 [&_h2]:mt-6 [&_h2]:mb-2
            [&_p]:text-gray-600 [&_p]:leading-relaxed [&_p]:mb-3
            [&_a]:text-green-600 [&_a]:underline"
          dangerouslySetInnerHTML={{ __html: content?.html || "" }}
        />
        <div className="mt-6 text-center text-xs text-gray-400">
          Last updated: {content?.lastUpdated}
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditions;
