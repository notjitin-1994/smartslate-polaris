# AI Report Editor Documentation

## Overview
The AI Report Editor is an intelligent assistant feature that helps users refine and improve their L&D needs analysis reports using Claude AI. It provides a conversation-style interface with edit tracking, undo/redo functionality, and database persistence.

## Features

### 🤖 AI-Powered Editing
- Uses Claude 3.5 Sonnet for intelligent report refinement
- Contextual understanding from original research reports
- Natural language edit requests
- Maintains report structure and consistency

### 💬 Conversation-Style UI
- Chat-like interface for intuitive interaction
- Real-time processing indicators
- Edit history visualization
- Quick action suggestions for common edits

### ↩️ Edit History & Undo/Redo
- Complete edit history tracking
- Undo/redo functionality for all AI edits
- Visual indicators for applied changes
- Persistent storage in database

### 🔒 Edit Limits & Control
- 3 edits per report per user (configurable)
- Clear edit counter display
- Database-backed limit enforcement
- Admin controls for limit management

## Components

### AIReportEditor
Basic AI editor component with local state management.

```tsx
import { AIReportEditor } from '@/components/AIReportEditor'

<AIReportEditor
  reportContent={content}
  greetingReport={greetingReport}
  orgReport={orgReport}
  requirementReport={requirementReport}
  maxEdits={3}
  onContentChange={handleChange}
  onSave={handleSave}
/>
```

### AIReportEditorEnhanced
Enhanced version with database persistence and advanced features.

```tsx
import { AIReportEditorEnhanced } from '@/components/AIReportEditorEnhanced'

<AIReportEditorEnhanced
  summaryId={summaryId}
  reportContent={content}
  greetingReport={greetingReport}
  orgReport={orgReport}
  requirementReport={requirementReport}
  maxEdits={3}
  onContentChange={handleChange}
  onSave={handleSave}
  readOnly={false}
/>
```

## Service Layer

### aiEditingService
Handles all AI editing operations and database interactions.

```typescript
import { aiEditingService } from '@/services/aiEditingService'

// Process an edit
const result = await aiEditingService.processEdit(
  currentContent,
  userRequest,
  { greetingReport, orgReport, requirementReport }
)

// Get edit history
const history = await aiEditingService.getEditHistory(summaryId)

// Check edit limits
const limits = await aiEditingService.getEditLimits(summaryId)
```

## Database Schema

### ai_edit_sessions Table
```sql
CREATE TABLE ai_edit_sessions (
  id UUID PRIMARY KEY,
  summary_id UUID REFERENCES polaris_summaries(id),
  user_id UUID REFERENCES auth.users(id),
  edit_history JSONB,
  total_edits INTEGER,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### Edit History Structure
```typescript
interface EditRequest {
  id: string
  userRequest: string
  aiResponse: string
  previousContent: string
  newContent: string
  timestamp: Date
  status: 'pending' | 'completed' | 'error'
  errorMessage?: string
}
```

## User Experience Flow

1. **Open Editor**: User clicks "Edit Report" to open the AI-enhanced editor
2. **Solara Lodestar Panel**: Toggle the Solara Lodestar panel from the toolbar
3. **Request Edit**: Type a natural language request describing desired changes
4. **Processing**: AI processes the request with visual feedback
5. **Review Changes**: AI explains changes and applies them to the report
6. **Undo/Redo**: Use toolbar buttons to undo or redo changes
7. **Save**: Save the final edited report to the database

## Edit Request Examples

### Good Edit Requests
- "Make the executive summary more concise"
- "Add specific metrics to the success criteria section"
- "Improve the clarity of the recommendations"
- "Make the language more formal and professional"
- "Add more detail to the timeline section"

### Tips for Best Results
- Be specific about what you want to change
- Reference specific sections when possible
- One change request at a time for clarity
- Review AI suggestions before accepting

## Configuration

### Environment Variables
```env
# Claude API Configuration
ANTHROPIC_API_KEY=your_api_key
ANTHROPIC_MODEL=claude-3-5-sonnet-latest
ANTHROPIC_MAX_TOKENS=12000  # Important: Set to 12000+ for complete report editing

# Also set for client-side if using Vite
VITE_ANTHROPIC_API_KEY=your_api_key
VITE_ANTHROPIC_MODEL=claude-3-5-sonnet-latest
VITE_ANTHROPIC_MAX_TOKENS=12000
```

### Customizing Edit Limits
Edit limits can be configured per summary in the database:
```sql
ALTER TABLE polaris_summaries 
ADD COLUMN max_ai_edits INTEGER DEFAULT 3;
```

## Security & Privacy

### Row Level Security (RLS)
- Users can only view/edit their own edit sessions
- Edit history is isolated per user
- Automatic cleanup of old sessions

### Data Protection
- All edits are stored encrypted in the database
- API calls use secure HTTPS connections
- No sensitive data is logged

## Troubleshooting

### Common Issues

#### Sections Disappearing After Edit
**Problem**: Executive Summary or other sections disappear after an AI edit.

**Solution**: 
1. Ensure `ANTHROPIC_MAX_TOKENS` is set to 12000 or higher
2. The AI is instructed to preserve all sections, but if this happens:
   - Use the Undo button to restore the previous version
   - Try a more specific edit request (e.g., "Improve the first paragraph of the executive summary" instead of "Improve the executive summary")
   - Check browser console for validation errors

**Prevention**:
- The system now validates that all required sections are present
- If sections are missing, the edit will be rejected with an error message
- Always review changes before saving

#### Edit Limit Reached
- Users have a maximum of 3 edits per report
- Contact admin to reset or increase limits
- Consider manual editing for additional changes

#### AI Response Errors
- Check API key configuration
- Verify network connectivity
- Review request format and content length
- Check that `ANTHROPIC_MAX_TOKENS` is set to at least 12000

#### Undo/Redo Not Working
- Ensure edit was completed successfully
- Check browser console for errors
- Refresh page to reload edit history

## Development

### Running Locally
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Add your ANTHROPIC_API_KEY

# Run database migrations
npm run migrate

# Start development server
npm run dev
```

### Testing AI Edits
```typescript
// Test edit processing
const testEdit = await aiEditingService.processEdit(
  "Test report content",
  "Make this more concise",
  {}
)
console.log(testEdit)
```

## Future Enhancements

### Planned Features
- [ ] Streaming responses for real-time feedback
- [ ] Multiple AI model support (GPT-4, Claude, etc.)
- [ ] Collaborative editing with team members
- [ ] Edit templates for common improvements
- [ ] Advanced analytics on edit patterns
- [ ] Voice-to-text edit requests
- [ ] Batch editing operations
- [ ] Custom AI prompts per organization

### Performance Optimizations
- [ ] Response caching for similar edits
- [ ] Incremental content updates
- [ ] Background processing queue
- [ ] Optimistic UI updates

## Support

For issues or questions about the AI Report Editor:
1. Check this documentation
2. Review error messages in the UI
3. Contact technical support
4. Submit a bug report with reproduction steps
