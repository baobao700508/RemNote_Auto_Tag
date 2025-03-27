import { usePlugin, renderWidget, useTracker } from '@remnote/plugin-sdk';
import { useState, useEffect } from 'react';

// Define ContentSignInfo interface to ensure type consistency
interface ContentSignInfo {
  taggedRemId: string;
  timestamp: number;
}

// Current version number
const VERSION = "0.0.6";

// Declare extended Window interface
declare global {
  interface Window {
    _remnote_extension_helper?: any;
  }
}

function ContentSignWidget() {
  const plugin = usePlugin();
  const [isEnabled, setIsEnabled] = useState(true);
  const [tagCount, setTagCount] = useState(0);
  const [taggedRems, setTaggedRems] = useState<Array<{id: string, text: string}>>([]);
  
  // Use useTracker to monitor storage state changes, which is better than useEffect for monitoring sync storage
  const enabled = useTracker(async () => 
    await plugin.storage.getSynced('content_sign_enabled')
  );
  
  // Use useEffect to monitor tag count changes and get tagged Rem content
  useEffect(() => {
    const fetchTaggedRems = async () => {
      const infos = await plugin.storage.getSynced('content_sign_infos') || [];
      if (!Array.isArray(infos)) return;

      setTagCount(infos.length);
      
      // Get the content of each tagged Rem
      const remsData = [];
      for (let i = 0; i < Math.min(infos.length, 5); i++) {
        try {
          const rem = await plugin.rem.findOne(infos[i].taggedRemId);
          if (rem) {
            // Get the actual text content of Rem
            let remText = "";
            if (rem.text) {
              remText = await plugin.richText.toString(rem.text);
            }
            remsData.push({
              id: infos[i].taggedRemId,
              text: remText || `Tagged Rem #${i+1}`
            });
          }
        } catch (e) {
          // Handle possible errors, such as Rem not existing
          console.error("Error getting Rem content:", e);
        }
      }
      setTaggedRems(remsData);
    };
    
    // Get it immediately once
    fetchTaggedRems();
    
    // Set timer, check tag changes every second
    const intervalId = setInterval(fetchTaggedRems, 1000);
    
    // Cleanup function
    return () => clearInterval(intervalId);
  }, [plugin.storage, plugin.rem]);
  
  // Update local state when storage value changes
  useEffect(() => {
    if (enabled !== undefined) {
      setIsEnabled(!!enabled);
    }
  }, [enabled]);

  // Toggle switch state
  const handleToggle = async () => {
    const newState = !isEnabled;
    setIsEnabled(newState);
    await plugin.storage.setSynced('content_sign_enabled', newState);
  };

  // Handle button click, jump to corresponding Rem
  const handleButtonClick = async (remId: string) => {
    try {
      await plugin.app.toast(`Navigating to tagged Rem...`);
      
      // Check if Rem exists
      const rem = await plugin.rem.findOne(remId);
      if (!rem) {
        await plugin.app.toast("Cannot find this Rem");
        return;
      }
      
      // Use RemNote API to open Rem
      try {
        // First try to open in current context
        await rem.openRemInContext();
        await plugin.app.toast("Opened Rem in context");
        return;
      } catch (inContextError) {
        console.error("Failed to open in context:", inContextError);
        
        try {
          // If opening in context fails, try opening as a page
          await rem.openRemAsPage();
          await plugin.app.toast("Opened Rem as page");
          return;
        } catch (asPageError) {
          console.error("Failed to open as page:", asPageError);
          
          // If both methods fail, provide feedback to the user
          await plugin.app.toast("Cannot open this Rem, please check permissions or try again later");
        }
      }
    } catch (e) {
      console.error("Error handling button click:", e);
      await plugin.app.toast("Cannot perform operation, please try again later");
    }
  };

  // Render tagged Rem buttons
  const renderTaggedRemButtons = () => {
    // Create 5 button slots
    const buttons = [];
    for (let i = 0; i < 5; i++) {
      const rem = taggedRems[i];
      buttons.push(
        <button
          key={i}
          onClick={() => rem && handleButtonClick(rem.id)}
          style={{
            display: 'block',
            width: '100%',
            padding: '0.5rem',
            marginBottom: '0.5rem',
            borderRadius: '0.375rem',
            backgroundColor: rem ? '#f0fdf4' : '#f3f4f6', 
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: rem ? '#86efac' : '#e5e7eb',
            color: rem ? '#166534' : '#9ca3af',
            textAlign: 'left',
            fontSize: '0.75rem',
            transition: 'all 0.2s ease-in-out',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            cursor: rem ? 'pointer' : 'default',
          }}
          disabled={!rem}
          aria-label={rem ? `Jump to: ${rem.text}` : 'Empty slot'}
          tabIndex={rem ? 0 : -1}
          onKeyDown={(e) => {
            if (rem && (e.key === 'Enter' || e.key === ' ')) {
              handleButtonClick(rem.id);
            }
          }}
          title={rem ? rem.text : 'Empty slot'}
        >
          {rem ? rem.text : 'Empty slot'}
        </button>
      );
    }
    return buttons;
  };

  return (
    <div className="p-4 flex flex-col gap-3 bg-white dark:bg-gray-800 rounded-lg shadow">
      <div 
        className="font-bold text-lg" 
        style={{ 
          background: 'linear-gradient(to right, #10b981, #3b82f6)', 
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}
      >
        AUTO TAG
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Automatic Tagging</span>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {isEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
        
        <button 
          onClick={handleToggle} 
          style={{
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            height: '1.5rem',
            borderRadius: '9999px',
            width: '2.75rem',
            transition: 'all 0.3s ease-in-out',
            backgroundColor: isEnabled ? '#10b981' : '#d1d5db'
          }}
          aria-label={isEnabled ? 'Disable automatic tagging' : 'Enable automatic tagging'}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleToggle();
            }
          }}
        >
          <span 
            style={{
              display: 'inline-block',
              width: '1.25rem',
              height: '1.25rem',
              transform: isEnabled ? 'translateX(1.25rem)' : 'translateX(0.25rem)',
              borderRadius: '9999px',
              backgroundColor: 'white',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
              transition: 'transform 0.3s ease-in-out'
            }}
          />
        </button>
      </div>
      
      <div className="text-xs text-gray-600 dark:text-gray-400 mt-2 border-t border-gray-200 dark:border-gray-700 pt-2">
        <p>When enabled, newly created Rems will be automatically tagged.</p>
        <p>Currently there are <span className="font-bold">{tagCount}</span> active tags.</p>
        <p className="text-xs text-gray-500 mt-1">Version {VERSION}</p>
      </div>

      <div className="mt-2">
        {renderTaggedRemButtons()}
      </div>
    </div>
  );
}

renderWidget(ContentSignWidget); 