import { useEffect, useState, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { PersonOutline, Badge, Wc, CalendarMonth } from '@mui/icons-material';
import { CircularProgress } from '@mui/material';
import SettingTemplate from '../SettingTemplate';
import { useSubscriptionColors, toRgba } from '../../../../../../../utils/getSubscriptionColors';
import { updateUserInfoThunk } from '../../../../../../../redux/thunks/userInfo.thunks';
import { showNotification } from '../../../../../../../redux/actions';

const GENDER_OPTIONS = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Not to say', label: 'N/A' },
];

function AccountSettings() {
  const colors = useSubscriptionColors();
  const dispatch = useDispatch();
  const userInfo = useSelector(state => state.userInfo?.data || {});

  const [form, setForm] = useState({
    fullName: '',
    gender: '',
    dob: '',
  });
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const initialRef = useRef(null);

  useEffect(() => {
    if (userInfo) {
      const initial = {
        fullName: userInfo.fullName || '',
        gender: userInfo.gender || '',
        dob: userInfo.dob ? userInfo.dob.slice(0, 10) : '',
      };
      setForm(initial);
      initialRef.current = initial;
      setDirty(false);
    }
  }, [userInfo]);

  const handleChange = useCallback((field, value) => {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      setDirty(JSON.stringify(next) !== JSON.stringify(initialRef.current));
      return next;
    });
  }, []);

  const handleSave = async () => {
    if (!dirty || saving) return;
    if (form.fullName && form.fullName.trim().length < 2) {
      dispatch(showNotification('Name must be at least 2 characters', 'error'));
      return;
    }
    setSaving(true);
    try {
      const payload = {};
      for (const key of Object.keys(form)) {
        if (form[key] !== (initialRef.current?.[key] || '')) {
          payload[key] = form[key];
        }
      }
      if (Object.keys(payload).length > 0) {
        await dispatch(updateUserInfoThunk(payload));
        initialRef.current = { ...form };
        setDirty(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() - 14);
  const maxDateStr = maxDate.toISOString().split('T')[0];

  return (
    <SettingTemplate title="Account Settings" icon={<PersonOutline />}>
      <div>
        <h2 className="text-lg font-medium mb-1 dark:text-dark-text text-light-text">Personal Information</h2>
        <p className="dark:text-gray-400 text-gray-600 mb-5 text-sm">Update your name, gender, and date of birth</p>

        <div className="space-y-3">
          {/* Full Name */}
          <div className="flex items-center gap-3 p-3 rounded-lg dark:bg-gray-800/50 bg-white/5">
            <Badge style={{ color: colors.fourth, fontSize: 20 }} className="flex-shrink-0" />
            <span className="text-sm font-medium dark:text-dark-text/80 text-light-text/80 flex-shrink-0 w-20">Name</span>
            <input
              type="text"
              value={form.fullName}
              onChange={e => handleChange('fullName', e.target.value)}
              placeholder="Enter your name"
              className="acct-input flex-1 min-w-0 rounded-md border px-2.5 py-1.5 text-sm dark:bg-gray-700 dark:text-dark-text bg-white text-light-text focus:outline-none"
              style={{ borderColor: toRgba(colors.fourth, 0.25) }}
            />
          </div>

          {/* Gender */}
          <div className="flex items-center gap-3 p-3 rounded-lg dark:bg-gray-800/50 bg-white/5">
            <Wc style={{ color: colors.fourth, fontSize: 20 }} className="flex-shrink-0" />
            <span className="text-sm font-medium dark:text-dark-text/80 text-light-text/80 flex-shrink-0 w-20">Gender</span>
            <div className="flex gap-1.5">
              {GENDER_OPTIONS.map(opt => {
                const active = form.gender === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleChange('gender', opt.value)}
                    className="px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all"
                    style={active ? {
                      backgroundColor: toRgba(colors.fourth, 0.15),
                      borderColor: colors.fourth,
                      color: colors.fourth,
                    } : {
                      borderColor: toRgba(colors.fourth, 0.2),
                    }}
                  >
                    <span className={!active ? 'dark:text-dark-text/50 text-light-text/50' : ''}>
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date of Birth */}
          <div className="flex items-center gap-3 p-3 rounded-lg dark:bg-gray-800/50 bg-white/5">
            <CalendarMonth style={{ color: colors.fourth, fontSize: 20 }} className="flex-shrink-0" />
            <span className="text-sm font-medium dark:text-dark-text/80 text-light-text/80 flex-shrink-0 w-20">Born</span>
            <input
              type="date"
              value={form.dob}
              onChange={e => handleChange('dob', e.target.value)}
              max={maxDateStr}
              className="acct-input rounded-md border px-2.5 py-1.5 text-sm dark:bg-gray-700 dark:text-dark-text bg-white text-light-text focus:outline-none cursor-pointer"
              style={{ borderColor: toRgba(colors.fourth, 0.25), colorScheme: 'dark' }}
            />
          </div>

          {/* City & Country — will be auto-filled via IP */}
          {/* <div>City</div> */}
          {/* <div>Country</div> */}
        </div>

        {/* Save button */}
        <div className="mt-5 flex justify-end">
          <button
            onClick={handleSave}
            disabled={!dirty || saving}
            className="px-5 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-2 disabled:opacity-40 transition-all hover:opacity-90"
            style={{ backgroundColor: colors.fourth }}
          >
            {saving && <CircularProgress size={14} style={{ color: 'white' }} />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <style>{`
        .acct-input:focus {
          box-shadow: 0 0 0 1.5px ${colors.fourth};
        }
        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(0.5);
          cursor: pointer;
        }
      `}</style>
    </SettingTemplate>
  );
}

export default AccountSettings;
