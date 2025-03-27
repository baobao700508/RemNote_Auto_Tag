import { 
  declareIndexPlugin, 
  ReactRNPlugin, 
  WidgetLocation, 
  AppEvents
} from '@remnote/plugin-sdk';
import '../style.css';
import '../App.css';

// Interface for storing content_sign tag and its timestamp
interface ContentSignInfo {
  taggedRemId: string;
  timestamp: number;
}

// For storing timer ID
let checkTagsStatusInterval: ReturnType<typeof setInterval> | null = null;

async function onActivate(plugin: ReactRNPlugin) {
  // Initialize plugin settings
  await plugin.storage.setSynced('content_sign_enabled', true);
  
  // Register content_sign powerup (using new API with object parameters)
  await plugin.app.registerPowerup({
    name: 'Content Structure Sign',
    code: 'content_structure_sign',
    description: 'Powerup tag for marking content structure',
    options: { slots: [] }
  });

  // Register a slash command to add content_sign tag
  await plugin.app.registerCommand({
    id: 'add-content-structure-sign',
    name: 'Add Content Structure Sign',
    action: async () => {
      const focusedRem = await plugin.focus.getFocusedRem();
      if (focusedRem) {
        const powerup = await plugin.powerup.getPowerupByCode('content_structure_sign');
        if (powerup) {
          await focusedRem.addTag(powerup._id);

          // Record the time and rem of tagging
          let contentSignInfos: ContentSignInfo[] = await plugin.storage.getSynced('content_sign_infos') || [];
          
          // Add new record
          contentSignInfos.push({
            taggedRemId: focusedRem._id,
            timestamp: Date.now()
          });
          
          // If more than 5, delete the earliest and remove the tag from that Rem
          if (contentSignInfos.length > 5) {
            contentSignInfos.sort((a, b) => a.timestamp - b.timestamp);
            
            // Get the oldest (first) record that we'll remove
            const oldestRecord = contentSignInfos.shift(); // Remove the first (earliest)
            
            // Also remove the tag from that Rem physically
            if (oldestRecord) {
              try {
                const oldestTaggedRem = await plugin.rem.findOne(oldestRecord.taggedRemId);
                if (oldestTaggedRem && powerup) {
                  // Remove the Content Structure Sign tag from this Rem
                  await oldestTaggedRem.removeTag(powerup._id);
                  console.log(`Removed Content Structure Sign tag from Rem ${oldestRecord.taggedRemId}`);
                  
                  // Show notification to user
                  await plugin.app.toast('Oldest Content Structure Sign tag removed automatically');
                }
              } catch (removeError) {
                console.error('Error removing tag from oldest Rem:', removeError);
              }
            }
          }
          
          // Save updated information
          await plugin.storage.setSynced('content_sign_infos', contentSignInfos);
          
          await plugin.app.toast('Content Structure Sign tag added');
        } else {
          await plugin.app.toast('Cannot find Content Structure Sign tag, please check if the plugin is loaded correctly');
        }
      } else {
        await plugin.app.toast('Please select a Rem first');
      }
    },
  });

  // Register widget in bottom left sidebar
  await plugin.app.registerWidget('content_sign_widget', WidgetLocation.LeftSidebar, {
    dimensions: { height: 'auto', width: '100%' },
    widgetTabIcon: 'https://cdn-icons-png.flaticon.com/512/1864/1864514.png',
    widgetTabTitle: 'AUTO TAG'
  });

  // Periodically check tag status to ensure no more added after tag removal
  const checkTagsStatus = async () => {
    try {
      // Get currently stored content_sign information
      let contentSignInfos: ContentSignInfo[] = await plugin.storage.getSynced('content_sign_infos') || [];
      if (contentSignInfos.length === 0) return;
      
      // Get powerup
      const powerup = await plugin.powerup.getPowerupByCode('content_structure_sign');
      if (!powerup) return;
      
      // Get all Rems with that tag
      const taggedRems = await powerup.taggedRem();
      const taggedRemIds = taggedRems.map(rem => rem._id);
      
      // Filter out rems that no longer have tags
      const updatedContentSignInfos = contentSignInfos.filter(info => 
        taggedRemIds.includes(info.taggedRemId)
      );
      
      // If there are changes, update storage
      if (updatedContentSignInfos.length !== contentSignInfos.length) {
        console.log(`Removed ${contentSignInfos.length - updatedContentSignInfos.length} rems that no longer have tags`);
        await plugin.storage.setSynced('content_sign_infos', updatedContentSignInfos);
      }
    } catch (error) {
      console.error('Error checking tag status:', error);
    }
  };
  
  // Set periodic checking of tag status
  checkTagsStatusInterval = setInterval(checkTagsStatus, 5000);
  
  // Set up event monitoring for automatic tagging
  checkTagsStatus();
  
  // Also check tag status when key events are triggered
  plugin.event.addListener(AppEvents.RemChanged, undefined, async (data: any) => {
    await checkTagsStatus();
    
    // Check if the feature is enabled
    const isEnabled = await plugin.storage.getSynced('content_sign_enabled');
    if (!isEnabled) return;

    const remId = data._id;
    if (!remId) return;

    try {
      // Get information about this Rem
      const rem = await plugin.rem.findOne(remId);
      if (!rem) return;

      // Get currently stored content_sign information
      let contentSignInfos: ContentSignInfo[] = await plugin.storage.getSynced('content_sign_infos') || [];
      if (contentSignInfos.length === 0) return;
      
      // Check if the currently modified Rem is a content_sign tagged rem
      const isContentSignRem = contentSignInfos.some(info => info.taggedRemId === remId);
      
      // If it is a content_sign tagged rem itself, skip
      if (isContentSignRem) return;

      // Get rem creation time - SDK has been updated, can now use createdAt property directly
      const remCreationTime = rem.createdAt;
      console.log('Rem creation time (createdAt):', remCreationTime);
      console.log('Rem creation time (formatted):', new Date(remCreationTime).toISOString());

      // Get all content_sign tag IDs
      const contentSignRemIds = contentSignInfos.map(info => info.taggedRemId);
      
      // Check if it already has any of these tags
      let alreadyHasAnyTag = false;
      for (const tagId of contentSignRemIds) {
        const tagRems = await rem.taggedRem();
        if (tagRems.some(tagRem => tagRem._id === tagId)) {
          alreadyHasAnyTag = true;
          break;
        }
      }
      
      // If already has tags, skip
      if (alreadyHasAnyTag) return;
      
      // Only rems created later than the tag addition time will be tagged
      // Iterate through all content_sign information, check time and add qualifying tags
      let addedAnyTag = false;
      for (const info of contentSignInfos) {
        try {
          // Key logic: Compare creation time and tag addition time
          if (remCreationTime > info.timestamp) {
            const taggedRem = await plugin.rem.findOne(info.taggedRemId);
            if (taggedRem) {
              console.log('Adding tag:', info.taggedRemId, 'to rem:', remId);
              console.log('  - Rem creation time:', new Date(remCreationTime).toISOString());
              console.log('  - Tag addition time:', new Date(info.timestamp).toISOString());
              await rem.addTag(info.taggedRemId);
              addedAnyTag = true;
            }
          } else {
            console.log('Skip adding tag because rem creation time is earlier than tag addition time:');
            console.log('  - Rem creation time:', new Date(remCreationTime).toISOString());
            console.log('  - Tag addition time:', new Date(info.timestamp).toISOString());
          }
        } catch (tagError) {
          console.error('Error adding tag:', tagError);
        }
      }
      
      // Only show prompts when tags are actually added
      if (addedAnyTag) {
        await plugin.app.toast(`Tags automatically added`);
      }
    } catch (error) {
      console.error('Error handling Rem change:', error);
    }
  });
  
  // Dedicated monitoring of newly created Rem events - using EditorTextEdited events may be more reliable
  plugin.event.addListener(AppEvents.EditorTextEdited, undefined, async () => {
    // First check tag status
    await checkTagsStatus();
    
    // Check if feature is enabled
    const isEnabled = await plugin.storage.getSynced('content_sign_enabled');
    if (!isEnabled) return;
    
    try {
      // Get currently focused rem
      const focusedRem = await plugin.focus.getFocusedRem();
      if (!focusedRem) return;
      
      // Get all content_sign information
      let contentSignInfos: ContentSignInfo[] = await plugin.storage.getSynced('content_sign_infos') || [];
      if (contentSignInfos.length === 0) return;
      
      // Check if the currently modified Rem is a content_sign tagged rem
      const isContentSignRem = contentSignInfos.some(info => info.taggedRemId === focusedRem._id);
      
      // If it is a content_sign tagged rem itself, skip
      if (isContentSignRem) return;
      
      // Get rem creation time - SDK has been updated, can now use createdAt property directly
      const remCreationTime = focusedRem.createdAt;
      console.log('Focused Rem creation time (createdAt):', remCreationTime);
      console.log('Focused Rem creation time (formatted):', new Date(remCreationTime).toISOString());
      
      // Check if it already has any content_sign tags
      let alreadyHasAnyTag = false;
      const tagRems = await focusedRem.taggedRem();
      
      // Only rems created later than the tag addition time will be tagged
      for (const info of contentSignInfos) {
        try {
          // Check if it already has this tag
          if (tagRems.some(tag => tag._id === info.taggedRemId)) {
            alreadyHasAnyTag = true;
            continue;
          }
          
          // Key logic: Compare creation time and tag addition time
          if (remCreationTime > info.timestamp) {
            console.log('Editor event - Adding tag:', info.taggedRemId, 'to rem:', focusedRem._id);
            console.log('  - Rem creation time:', new Date(remCreationTime).toISOString());
            console.log('  - Tag addition time:', new Date(info.timestamp).toISOString());
            await focusedRem.addTag(info.taggedRemId);
          } else {
            console.log('Editor event - Skip adding tag because rem creation time is earlier than tag addition time');
            console.log('  - Rem creation time:', new Date(remCreationTime).toISOString());
            console.log('  - Tag addition time:', new Date(info.timestamp).toISOString());
          }
        } catch (error) {
          console.error('Error adding tag:', error);
        }
      }
    } catch (error) {
      console.error('Error handling editor text edited event:', error);
    }
  });
}

async function onDeactivate(plugin: ReactRNPlugin) {
  // Cleanup code, remove event listeners
  plugin.event.removeListener(AppEvents.RemChanged, undefined, () => {});
  plugin.event.removeListener(AppEvents.EditorTextEdited, undefined, () => {});
  // Clear timer
  if (checkTagsStatusInterval) {
    clearInterval(checkTagsStatusInterval);
    checkTagsStatusInterval = null;
  }
}

declareIndexPlugin(onActivate, onDeactivate);
