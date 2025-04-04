import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  ColorLensOutlined, 
  Check, 
  TextFields,
  FormatSize,
  Palette,
  DarkMode,
  LightMode,
  Computer,
  SaveOutlined,
  Add,
  Close
} from '@mui/icons-material';
import { CircularProgress } from '@mui/material';
import SettingTemplate from '../SettingTemplate';

// Predefined color options
const colorOptions = [
  { name: 'Green', value: '#059212' },
  { name: 'Blue', value: '#0288d1' },
  { name: 'Purple', value: '#7b1fa2' },
  { name: 'Red', value: '#d32f2f' },
  { name: 'Orange', value: '#ed6c02' },
  { name: 'Teal', value: '#009688' },
  { name: 'Pink', value: '#d81b60' },
  { name: 'Indigo', value: '#3f51b5' },
];

function ThemeSettings() {
  const dispatch = useDispatch();
  const { 
    theme, 
    loading, 
    error, 
    saveInProgress, 
    saveError,
    dirtyFields 
  } = useSelector(state => state.settings);
  
  const [customColor, setCustomColor] = useState('');
  const [newFont, setNewFont] = useState('');
  const [activeTab, setActiveTab] = useState('appearance');
  
  // Fetch theme settings when component mounts
  useEffect(() => {
    dispatch(fetchThemeSettingsThunk());
  }, [dispatch]);
  
  // Apply theme mode to document for preview
  useEffect(() => {
    const applyThemeToDocument = () => {
      const rootElement = document.documentElement;
      
      if (theme.mode === 'dark') {
        rootElement.classList.add('dark');
        rootElement.classList.remove('light');
      } else if (theme.mode === 'light') {
        rootElement.classList.add('light');
        rootElement.classList.remove('dark');
      } else {
        // Handle system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
          rootElement.classList.add('dark');
          rootElement.classList.remove('light');
        } else {
          rootElement.classList.add('light');
          rootElement.classList.remove('dark');
        }
      }
      
      // Apply primary color as CSS variable
      if (theme.primaryColor) {
        rootElement.style.setProperty('--primary-color', theme.primaryColor);
      }
      
      // Apply font size
      const fontSizeValues = {
        small: '0.875rem',
        medium: '1rem',
        large: '1.125rem'
      };
      
      rootElement.style.setProperty('--base-font-size', fontSizeValues[theme.fontSize] || '1rem');
    };
    
    applyThemeToDocument();
  }, [theme]);
  
  const handleModeChange = (mode) => {
    dispatch(setThemeMode(mode));
  };
  
  const handleColorSelect = (color) => {
    dispatch(setPrimaryColor(color));
  };
  
  const handleFontSizeChange = (size) => {
    dispatch(setFontSize(size));
  };
  
  const handleCustomColorChange = (e) => {
    setCustomColor(e.target.value);
  };
  
  const applyCustomColor = () => {
    if (customColor && /^#([0-9A-F]{3}){1,2}$/i.test(customColor)) {
      dispatch(setPrimaryColor(customColor));
      setCustomColor('');
    }
  };
  
  const handleAddCustomFont = () => {
    if (newFont.trim()) {
      dispatch(addCustomFont(newFont.trim()));
      setNewFont('');
    }
  };
  
  const handleRemoveFont = (font) => {
    dispatch(removeCustomFont(font));
  };
  
  const handleSaveChanges = () => {
    dispatch(updateThemeSettingsThunk(theme));
  };
  
  const hasChanges = dirtyFields.length > 0;
  
  if (loading) {
    return (
      <SettingTemplate title="Theme Settings" icon={<ColorLensOutlined />}>
        <div className="flex justify-center items-center h-64">
          <CircularProgress color="primary" />
        </div>
      </SettingTemplate>
    );
  }
  
  if (error) {
    return (
      <SettingTemplate title="Theme Settings" icon={<ColorLensOutlined />}>
        <div className="p-4 bg-red-100 text-red-700 rounded-md">
          <p>Error loading theme settings: {error}</p>
          <button 
            onClick={() => dispatch(fetchThemeSettingsThunk())}
            className="mt-2 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </SettingTemplate>
    );
  }
  
  return (
    <SettingTemplate title="Theme Settings" icon={<ColorLensOutlined />}>
      <div className="pb-20 relative">
        {/* Settings tabs */}
        <div className="mb-6 flex border-b border-gray-200 dark:border-gray-700">
          <button
            className={`px-4 py-2 relative ${activeTab === 'appearance' 
              ? 'text-primary-600 dark:text-primary-400 font-medium' 
              : 'text-gray-600 dark:text-gray-300'
            }`}
            onClick={() => setActiveTab('appearance')}
          >
            Appearance
            {activeTab === 'appearance' && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary-500"></span>
            )}
          </button>
          <button
            className={`px-4 py-2 relative ${activeTab === 'typography' 
              ? 'text-primary-600 dark:text-primary-400 font-medium' 
              : 'text-gray-600 dark:text-gray-300'
            }`}
            onClick={() => setActiveTab('typography')}
          >
            Typography
            {activeTab === 'typography' && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary-500"></span>
            )}
          </button>
        </div>

        {/* Appearance settings */}
        {activeTab === 'appearance' && (
          <div className="space-y-8">
            {/* Theme mode */}
            <div>
              <h3 className="text-lg font-medium mb-4 flex items-center">
                <DarkMode className="mr-2" /> 
                Display Mode
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div 
                  className={`p-4 rounded-lg cursor-pointer transition-all
                    ${theme.mode === 'light' 
                      ? 'ring-2 ring-primary-500 bg-white dark:bg-gray-100 shadow-lg' 
                      : 'bg-gray-100 dark:bg-gray-800 hover:bg-white dark:hover:bg-gray-700'
                    }`}
                  onClick={() => handleModeChange('light')}
                >
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                      <LightMode className="text-yellow-500" fontSize="large" />
                    </div>
                    <span className="text-center font-medium">Light</span>
                    {theme.mode === 'light' && (
                      <Check className="text-green-500 mt-2" />
                    )}
                  </div>
                </div>
                
                <div 
                  className={`p-4 rounded-lg cursor-pointer transition-all
                    ${theme.mode === 'dark' 
                      ? 'ring-2 ring-primary-500 bg-white dark:bg-gray-100 shadow-lg' 
                      : 'bg-gray-100 dark:bg-gray-800 hover:bg-white dark:hover:bg-gray-700'
                    }`}
                  onClick={() => handleModeChange('dark')}
                >
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-3">
                      <DarkMode className="text-blue-300" fontSize="large" />
                    </div>
                    <span className="text-center font-medium">Dark</span>
                    {theme.mode === 'dark' && (
                      <Check className="text-green-500 mt-2" />
                    )}
                  </div>
                </div>
                
                <div 
                  className={`p-4 rounded-lg cursor-pointer transition-all
                    ${theme.mode === 'system' 
                      ? 'ring-2 ring-primary-500 bg-white dark:bg-gray-100 shadow-lg' 
                      : 'bg-gray-100 dark:bg-gray-800 hover:bg-white dark:hover:bg-gray-700'
                    }`}
                  onClick={() => handleModeChange('system')}
                >
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-gradient-to-r from-gray-50 to-gray-800 rounded-full flex items-center justify-center mb-3">
                      <Computer className="text-purple-400" fontSize="large" />
                    </div>
                    <span className="text-center font-medium">System</span>
                    {theme.mode === 'system' && (
                      <Check className="text-green-500 mt-2" />
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Color theme */}
            <div>
              <h3 className="text-lg font-medium mb-4 flex items-center">
                <Palette className="mr-2" /> 
                Primary Color
              </h3>
              <div className="grid grid-cols-4 gap-4 mb-4 md:grid-cols-8">
                {colorOptions.map((option) => (
                  <div 
                    key={option.value}
                    className={`relative rounded-full w-12 h-12 cursor-pointer transition-transform hover:scale-110
                      ${theme.primaryColor === option.value ? 'ring-4 ring-offset-2 ring-gray-300 scale-110' : ''}
                    `}
                    style={{ backgroundColor: option.value }}
                    onClick={() => handleColorSelect(option.value)}
                    title={option.name}
                  >
                    {theme.primaryColor === option.value && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Check className="text-white drop-shadow-md" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="flex mt-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={customColor}
                    onChange={handleCustomColorChange}
                    placeholder="#HEX Color"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-l-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                  />
                  {customColor && (
                    <div 
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 w-6 h-6 rounded-full border border-gray-300"
                      style={{ backgroundColor: customColor }}
                    ></div>
                  )}
                </div>
                <button
                  onClick={applyCustomColor}
                  className="px-4 py-2 bg-primary-500 text-white rounded-r-md hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"
                  disabled={!customColor || !/^#([0-9A-F]{3}){1,2}$/i.test(customColor)}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}

               {/* Typography settings */}
               {activeTab === 'typography' && (
          <div className="space-y-8">
            {/* Font size */}
            <div>
              <h3 className="text-lg font-medium mb-4 flex items-center">
                <FormatSize className="mr-2" /> 
                Font Size
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div 
                  className={`p-4 rounded-lg cursor-pointer transition-all
                    ${theme.fontSize === 'small' 
                      ? 'ring-2 ring-primary-500 bg-white dark:bg-gray-100 shadow-lg' 
                      : 'bg-gray-100 dark:bg-gray-800 hover:bg-white dark:hover:bg-gray-700'
                    }`}
                  onClick={() => handleFontSizeChange('small')}
                >
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3 text-xs">
                      <span className="text-xl">A</span>
                    </div>
                    <span className="text-center font-medium">Small</span>
                    {theme.fontSize === 'small' && (
                      <Check className="text-green-500 mt-2" />
                    )}
                  </div>
                </div>
                
                <div 
                  className={`p-4 rounded-lg cursor-pointer transition-all
                    ${theme.fontSize === 'medium' 
                      ? 'ring-2 ring-primary-500 bg-white dark:bg-gray-100 shadow-lg' 
                      : 'bg-gray-100 dark:bg-gray-800 hover:bg-white dark:hover:bg-gray-700'
                    }`}
                  onClick={() => handleFontSizeChange('medium')}
                >
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3">
                      <span className="text-2xl">A</span>
                    </div>
                    <span className="text-center font-medium">Medium</span>
                    {theme.fontSize === 'medium' && (
                      <Check className="text-green-500 mt-2" />
                    )}
                  </div>
                </div>
                
                <div 
                  className={`p-4 rounded-lg cursor-pointer transition-all
                    ${theme.fontSize === 'large' 
                      ? 'ring-2 ring-primary-500 bg-white dark:bg-gray-100 shadow-lg' 
                      : 'bg-gray-100 dark:bg-gray-800 hover:bg-white dark:hover:bg-gray-700'
                    }`}
                  onClick={() => handleFontSizeChange('large')}
                >
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3">
                      <span className="text-3xl">A</span>
                    </div>
                    <span className="text-center font-medium">Large</span>
                    {theme.fontSize === 'large' && (
                      <Check className="text-green-500 mt-2" />
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Custom Fonts */}
            <div>
              <h3 className="text-lg font-medium mb-4 flex items-center">
                <TextFields className="mr-2" /> 
                Custom Fonts
              </h3>
              
              <div className="mb-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  Add custom fonts to use in the application. These fonts need to be installed on your system.
                </p>
                <div className="flex mt-2">
                  <input
                    type="text"
                    value={newFont}
                    onChange={(e) => setNewFont(e.target.value)}
                    placeholder="Enter font name (e.g., Roboto, Arial)"
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-l-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                  />
                  <button
                    onClick={handleAddCustomFont}
                    disabled={!newFont.trim()}
                    className="px-4 py-2 bg-primary-500 text-white rounded-r-md hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 flex items-center"
                  >
                    <Add fontSize="small" className="mr-1" /> Add
                  </button>
                </div>
              </div>
              
              {/* Custom font list */}
              {theme.customFonts && theme.customFonts.length > 0 ? (
                <div className="space-y-2">
                  {theme.customFonts.map((font) => (
                    <div 
                      key={font}
                      className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-md"
                    >
                      <span style={{ fontFamily: font }}>{font}</span>
                      <button
                        onClick={() => handleRemoveFont(font)}
                        className="p-1 text-gray-500 hover:text-red-500 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                      >
                        <Close fontSize="small" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
                  <p className="text-gray-500 dark:text-gray-400">No custom fonts added yet.</p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Save button */}
        <div className="fixed bottom-4 right-4 left-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div>
            {hasChanges && (
              <span className="text-sm text-primary-600 dark:text-primary-400">
                You have unsaved changes
              </span>
            )}
            {saveError && (
              <span className="text-sm text-red-600 dark:text-red-400">
                Error: {saveError}
              </span>
            )}
          </div>
          <button
            onClick={handleSaveChanges}
            disabled={!hasChanges || saveInProgress}
            className="px-6 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 flex items-center"
          >
            {saveInProgress ? (
              <CircularProgress size={20} color="inherit" className="mr-2" />
            ) : (
              <SaveOutlined className="mr-2" />
            )}
            Save Changes
          </button>
        </div>
      </div>
    </SettingTemplate>
  );
}

export default ThemeSettings;